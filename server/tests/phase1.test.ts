import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import Database from 'better-sqlite3';
import sharp from 'sharp';
const dir=mkdtempSync(join(tmpdir(),'shawhposh-test-'));
process.env.DATABASE_PATH=join(dir,'test.sqlite');process.env.APP_ORIGIN='http://localhost:3000';process.env.NODE_ENV='test';
const {db,sqlite}=await import('../db/connection');
const {migrate}=await import('drizzle-orm/better-sqlite3/migrator');
migrate(db,{migrationsFolder:'server/db/migrations'});
const {app}=await import('../app');
const {staffUsers}=await import('../db/schema');
const {hashPassword}=await import('../modules/auth/service');
const {saveCategory,saveProduct,catalogSnapshot}=await import('../modules/catalog/service');
const origin='http://localhost:3000';const password='Test-only-password-12345';
const owner=await db.insert(staffUsers).values({email:'owner@example.invalid',fullName:'Test owner',passwordHash:await hashPassword(password),role:'owner'}).returning();
await db.insert(staffUsers).values({email:'support@example.invalid',fullName:'Test support',passwordHash:await hashPassword(password),role:'support'});
await db.insert(staffUsers).values({email:'inventory@example.invalid',fullName:'Test inventory',passwordHash:await hashPassword(password),role:'inventory'});
saveCategory({nameFa:'Test category',slug:'test'});
saveProduct({name:'Test product',slug:'test-product',category:'test',basePriceTomans:100,status:'active',variants:[{sku:'TEST-SKU',colorName:'Black',colorHex:'#000000',size:'M'}]});
const staff=request.agent(app);const customer=request.agent(app);
test('customer registration, normalization, duplicate rejection, login, logout and session revocation',async()=>{
 let res=await customer.post('/api/v1/auth/register').set('Origin',origin).send({fullName:'Test customer',email:' Customer@Example.invalid ',phone:'09121234567',password});assert.equal(res.status,201);assert.equal(res.body.user.email,'customer@example.invalid');assert.equal(res.body.user.phone,'+989121234567');assert.equal(res.body.user.passwordHash,undefined);assert.match(res.headers['set-cookie'][0],/HttpOnly/);
 assert.equal((await customer.post('/api/v1/auth/register').set('Origin',origin).send({fullName:'Duplicate',email:'customer@example.invalid',password})).status,409);
 assert.equal((await customer.get('/api/v1/auth/me')).body.user.name,'Test customer');
 const cookie=res.headers['set-cookie'][0].split(';')[0];await customer.post('/api/v1/auth/logout').set('Origin',origin).send({});assert.equal((await request(app).get('/api/v1/auth/me').set('Cookie',cookie)).body.user,null);
 assert.equal((await customer.post('/api/v1/auth/login').set('Origin',origin).send({identifier:'customer@example.invalid',password:'incorrect'})).status,401);
 assert.equal((await customer.post('/api/v1/auth/login').set('Origin',origin).send({identifier:'customer@example.invalid',password})).status,200);
});
test('admin authentication, CSRF, role authorization and catalog persistence',async()=>{
 assert.equal((await request(app).get('/api/v1/admin/products')).status,401);
 assert.equal((await staff.post('/api/v1/admin/auth/login').set('Origin',origin).send({identifier:'owner@example.invalid',password})).status,200);
 const product=catalogSnapshot().products[0];
 const summary=(await staff.get('/api/v1/admin/dashboard/summary')).body;
 assert.deepEqual(summary.products,{total:1,active:1});
 assert.deepEqual(summary.variants,{total:1,active:1,lowStock:1});
 assert.deepEqual(summary.inventory,{onHand:0,reserved:0,available:0});
 assert.equal(summary.customers,1);
 assert.deepEqual(summary.orders,{total:0,awaitingPayment:0});
 assert.equal((await staff.patch('/api/v1/admin/products/'+product.id).send({name:'Rejected'})).status,403);
 assert.equal((await staff.patch('/api/v1/admin/products/'+product.id).set('Origin',origin).send({name:'Changed',basePriceTomans:250})).status,200);
 const publicProduct=(await request(app).get('/api/v1/products/test-product')).body.product;
 assert.equal(publicProduct.price,250);
 for (const key of ['rating','ratingScore','reviewCount','reviewsCount','originalPrice','originalPriceTomans','discountPercent','isPopular']) {
  assert.equal(Object.hasOwn(publicProduct,key),false,`public catalog must not claim ${key}`);
 }
 await staff.patch('/api/v1/admin/products/'+product.id).set('Origin',origin).send({status:'archived'});assert.equal((await request(app).get('/api/v1/products/test-product')).status,404);
 await staff.patch('/api/v1/admin/products/'+product.id).set('Origin',origin).send({status:'active'});
 const duplicate=await staff.post('/api/v1/admin/variants').set('Origin',origin).send({productId:product.id,sku:'TEST-SKU',colorName:'White',colorHex:'#FFFFFF',size:'L'});assert.equal(duplicate.status,409);
});
test('inventory atomic adjustment, movement record, negative rejection and RBAC',async()=>{
 const support=request.agent(app);await support.post('/api/v1/admin/auth/login').set('Origin',origin).send({identifier:'support@example.invalid',password});
 assert.equal((await support.post('/api/v1/admin/inventory/TEST-SKU/adjustments').set('Origin',origin).send({delta:5,reason:'Test adjustment'})).status,403);
 const inventoryUser=request.agent(app);await inventoryUser.post('/api/v1/admin/auth/login').set('Origin',origin).send({identifier:'inventory@example.invalid',password});
 const res=await inventoryUser.post('/api/v1/admin/inventory/TEST-SKU/adjustments').set('Origin',origin).send({newQuantity:5,reason:'Test count'});assert.equal(res.status,200);assert.equal(res.body.inventory.available,5);
 assert.equal((await staff.get('/api/v1/admin/inventory/TEST-SKU/movements')).body.movements.length,1);
 assert.equal((await staff.post('/api/v1/admin/inventory/TEST-SKU/adjustments').set('Origin',origin).send({delta:-6,reason:'Invalid adjustment'})).status,409);
 assert.equal((await staff.get('/api/v1/admin/inventory/TEST-SKU')).body.inventory.available,5);
 assert.equal((await inventoryUser.patch('/api/v1/admin/products/'+catalogSnapshot().products[0].id).set('Origin',origin).send({name:'Forbidden'})).status,403);
});
test('variant override prices, initial stock and reserved stock are validated atomically',async()=>{
 const variant=catalogSnapshot().variants[0];
 let result=await staff.patch('/api/v1/admin/variants/'+variant.id).set('Origin',origin).send({priceTomans:333});assert.equal(result.status,200);
 assert.equal((await request(app).get('/api/v1/products/test-product')).body.product.variants[0].priceTomans,333);
 result=await staff.patch('/api/v1/admin/variants/'+variant.id).set('Origin',origin).send({priceTomans:null});assert.equal(result.status,200);
 assert.equal((await request(app).get('/api/v1/products/test-product')).body.product.variants[0].priceTomans,null);
 const create={productId:variant.productId,sku:'INITIAL-STOCK',colorName:'Blue',colorHex:'#0000FF',size:'L',onHandStock:2};
 assert.equal((await staff.post('/api/v1/admin/variants').set('Origin',origin).send(create)).status,422);
 assert.ok(!catalogSnapshot().variants.some(v=>v.sku==='INITIAL-STOCK'));
 assert.equal((await staff.post('/api/v1/admin/variants').set('Origin',origin).send({...create,inventoryReason:'Initial physical count'})).status,201);
 assert.equal((await staff.get('/api/v1/admin/inventory/INITIAL-STOCK/movements')).body.movements.length,1);
 sqlite.prepare('update inventory set reserved=3 where variant_id=?').run(variant.id);
 assert.equal((await staff.post('/api/v1/admin/inventory/TEST-SKU/adjustments').set('Origin',origin).send({newQuantity:2,reason:'Invalid reserved reduction'})).status,409);
 assert.equal((await staff.patch('/api/v1/admin/variants/'+variant.id).set('Origin','https://evil.example').send({priceTomans:1})).status,403);
 const reader=new Database(join(dir,'test.sqlite'),{readonly:true});assert.equal((reader.prepare('select name from products where slug=?').get('test-product') as {name:string}).name,'Changed');reader.close();
});
test('apparel catalog supports automatic IDs, private stock, product images, offline customers and purchase accounting',async()=>{
 const ownerAgent=request.agent(app);
 await ownerAgent.post('/api/v1/admin/auth/login').set('Origin',origin).send({identifier:'owner@example.invalid',password}).expect(200);
 const createdProduct=await ownerAgent.post('/api/v1/admin/products').set('Origin',origin).send({name:'لباس تخفیف‌دار',category:'test',garmentType:'hoodie',discountPercent:25,basePriceTomans:1000,status:'active'}).expect(201);
 const product=createdProduct.body.item as {id:string;slug:string};
 assert.match(product.slug,/^apparel-[a-f0-9]{12}$/);
 const createdVariant=await ownerAgent.post('/api/v1/admin/variants').set('Origin',origin).send({productId:product.id,colorName:'مشکی',size:'XS',fit:'boxy',weightGrams:420,onHandStock:4,inventoryReason:'شمارش اولیه موجودی'}).expect(201);
 const variant=catalogSnapshot().variants.find(item=>item.id===createdVariant.body.item.id)!;
 assert.match(variant.sku,/^SH-XS-[A-F0-9]{8}$/);
 assert.equal(variant.weightGrams,420);
 assert.equal(variant.onHandStock,4);
 const publicProduct=(await request(app).get(`/api/v1/products/${product.slug}`).expect(200)).body.product;
 assert.equal(publicProduct.price,750);
 assert.equal(publicProduct.originalPriceTomans,1000);
 assert.equal(publicProduct.discountPercent,25);
 assert.equal(publicProduct.variants[0].inStock,true);
 assert.equal(Object.hasOwn(publicProduct.variants[0],'available'),false);
 assert.equal(Object.hasOwn(publicProduct.variants[0],'sku'),false);

 const offline=await ownerAgent.post('/api/v1/admin/customers').set('Origin',origin).send({name:'خریدار حضوری',phone:'09121234570',email:'offline@example.invalid',notes:'خرید حضوری'}).expect(201);
 assert.equal(offline.body.customer.source,'offline');
 const detail=await ownerAgent.get(`/api/v1/admin/customers/${offline.body.customer.id}`).expect(200);
 assert.equal(detail.body.customer.notes,'خرید حضوری');
 assert.equal(detail.body.orders.length,0);
 const directory=await ownerAgent.get('/api/v1/admin/customers?search=offline%40example.invalid').expect(200);
 assert.equal(directory.body.pagination.total,1);
 assert.equal(directory.body.customers[0].source,'offline');

 const invoice=await ownerAgent.post('/api/v1/admin/purchase-invoices').set('Origin',origin).send({supplierName:'کارگاه نمونه',productId:product.id,quantity:3,purchaseUnitPriceTomans:2000,saleUnitPriceTomans:5000,deliveryCostTomans:300,printingCostTomans:200,invoiceDate:'2026-11-03T12:00:00.000Z',notes:'فاکتور آزمون'}).expect(201);
 assert.equal(invoice.body.invoice.netProfitTomans,8500);
 const invoiceList=await ownerAgent.get('/api/v1/admin/purchase-invoices').expect(200);
 assert.equal(invoiceList.body.summary.projectedProfitTomans,8500);

 const png=await sharp({create:{width:2,height:2,channels:3,background:'#ba8d3d'}}).png().toBuffer();
 const upload=await ownerAgent.post(`/api/v1/admin/products/${product.id}/images`).set('Origin',origin).field('altText','نمای محصول').attach('image',png,{filename:'apparel.png',contentType:'image/png'}).expect(201);
 const imageResponse=await request(app).get(upload.body.image.url).expect(200);
 assert.match(imageResponse.headers['content-type'],/image\/webp/);
});

test('legacy Persian garment names resolve category filters without rewriting product presentation',()=>{
 const names=[['تیشرت پیشین','tshirt'],['تی‌شرت پیشین','tshirt'],['هودی پیشین','hoodie'],['نیم‌زیپ پیشین','halfzip']] as const;
 for(const [index,[name,garmentType]] of names.entries()){
  const product=saveProduct({name,slug:`legacy-garment-${index}`,category:'test',basePriceTomans:1000,status:'active'});
  const listed=catalogSnapshot().products.find(item=>item.id===product.id)!;
  assert.equal(listed.garmentType,garmentType);
  const stored=sqlite.prepare('select presentation from products where id=?').get(product.id) as {presentation:string};
  assert.equal(JSON.parse(stored.presentation).garmentType,undefined);
 }
});
after(()=>{sqlite.close();rmSync(dir,{recursive:true,force:true});});
