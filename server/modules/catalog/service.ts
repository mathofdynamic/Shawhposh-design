import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection';
import { categories, products, productMedia, productVariants, inventory, stockMovements, staffUsers } from '../../db/schema';
import { adjustStock } from '../inventory/service';
import { ApiError } from '../../lib/errors';

const money = z.number().int().min(0).max(2000000000);
const mediaUrl = z.string().max(2048).refine(v => /^https:\/\//.test(v) || /^\/(?!\/)/.test(v));
export const categorySchema = z.object({ nameFa: z.string().trim().min(1).max(120), slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/), description: z.string().max(5000).default(''), nameEn: z.string().max(120).default(''), image: mediaUrl.optional(), displayOrder: z.number().int().min(0).default(0), isFeatured: z.boolean().default(false), status: z.enum(['active','archived']).default('active') });
export const variantSchema = z.object({ productId: z.string().uuid(), sku: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/), colorName: z.string().trim().min(1).max(100), colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/), size: z.enum(['S','M','L','XL','XXL']), priceTomans: money.nullable().optional(), minStockThreshold: z.number().int().min(0).max(100000).default(3), isEnabled: z.boolean().default(true), fit: z.enum(['oversize','classic','slim','oversized','regular','crop']).default('oversize'), material:z.string().max(1000).optional(), warehouseLocation: z.string().max(200).optional(), priceAdjustmentTomans: z.number().int().min(-2000000000).max(2000000000).optional(), onHandStock:z.number().int().min(0).max(1000000).optional(), inventoryReason:z.string().trim().min(3).max(1000).optional(), weightGrams: z.number().int().min(0).max(100000).nullable().optional() });
export const productSchema = z.object({ inventoryReason:z.string().trim().min(3).max(1000).optional(), name: z.string().trim().min(1).max(200), slug: z.string().trim().min(1).max(150).regex(/^[a-z0-9-]+$/), description: z.string().max(20000).default(''), category: z.string().min(1).max(120), basePriceTomans: money, status: z.enum(['active','draft','archived']).default('draft'), isLive: z.boolean().optional(), isCustomizable: z.boolean().default(false), featured: z.boolean().default(false), primaryImage:mediaUrl.optional(), images: z.array(mediaUrl).max(30).default([]), imageAlts: z.record(z.string(),z.string().max(500)).default({}), skuPrefix: z.string().max(100).default(''), fabricSpecs: z.string().max(5000).default(''), tags: z.array(z.string().max(100)).max(50).default([]), details: z.array(z.string().max(5000)).max(30).optional(), productType: z.enum(['finished','customizable_blank']).default('finished'), printingMethod: z.string().max(200).optional(), careInstructions: z.string().max(5000).optional(), measurements: z.string().max(5000).optional(), cut: z.string().max(200).optional(), nameEn: z.string().max(200).optional(), seoTitle: z.string().max(200).optional(), seoMetaDescription: z.string().max(1000).optional(), permittedPrintAreas:z.array(z.string().max(50)).max(20).optional(), baseGarmentSku:z.string().max(100).optional(), printingTechnique:z.string().max(100).optional(), variants: z.array(variantSchema.omit({productId:true}).extend({ id: z.string().uuid().optional(), onHandStock:z.number().optional(), reservedStock:z.number().optional(), priceAdjustmentTomans:z.number().optional() })).max(200).optional() });

export function catalogSnapshot(publicOnly = false) {
  const cats = db.select().from(categories).orderBy(asc(categories.displayOrder)).all();
  const media = db.select().from(productMedia).orderBy(asc(productMedia.displayOrder)).all();
  const productRows = db.select().from(products).all();
  const stocks = db.select().from(inventory).all();
  const variants = db.select().from(productVariants).all().map(v => {
    const stock = stocks.find(s => s.variantId === v.id);
    return { ...v.presentation, id: v.id, sku:v.sku, productId:v.productId, colorName:v.colorName,colorHex:v.colorHex,size:v.size,priceTomans:v.priceTomans,priceAdjustmentTomans:v.priceTomans===null?0:v.priceTomans-(productRows.find(p=>p.id===v.productId)?.basePriceTomans||0),minStockThreshold:v.lowStockThreshold,isEnabled:v.status==='active',onHandStock:stock?.onHand||0,reservedStock:stock?.reserved||0,damaged:stock?.damaged||0,available:(stock?.onHand||0)-(stock?.reserved||0),fit:v.presentation.fit||'oversize',status:v.status };
  });
  const categoryDtos = cats.map(c => ({...c.presentation,id:c.id,nameFa:c.name,nameEn:c.presentation.nameEn||'',slug:c.slug,description:c.description,descriptionFa:c.description,displayOrder:c.displayOrder,isFeatured:!!c.presentation.isFeatured,status:c.status}));
  const productDtos = productRows.filter(p => !publicOnly || (p.status==='active' && cats.some(c=>c.id===p.categoryId&&c.status==='active'))).map(p => {
    const category=cats.find(c=>c.id===p.categoryId)!;
    const images=media.filter(m=>m.productId===p.id).map(m=>m.url);
    const pv=variants.filter(v=>v.productId===p.id&&(!publicOnly||v.isEnabled));
    return {...p.presentation,id:p.id,name:p.name,slug:p.slug,description:p.description,category:category.slug,categoryId:category.id,basePriceTomans:p.basePriceTomans,status:p.status,isLive:p.status==='active',isCustomizable:p.customizable,featured:p.featured,images,imageAlts:Object.fromEntries(media.filter(m=>m.productId===p.id).map(m=>[m.url,m.altText])),primaryImage:images[0],variants:pv,createdAt:p.createdAt.toISOString(),updatedAt:p.updatedAt.toISOString(),tags:p.presentation.tags||[],fabricSpecs:p.presentation.fabricSpecs||'',skuPrefix:p.presentation.skuPrefix||''};
  });
  const staffNames = new Map(db.select().from(staffUsers).all().map(staff => [staff.id, staff.fullName]));
  return {products:productDtos,categories:categoryDtos,variants:variants.filter(v=>!publicOnly||productDtos.some(p=>p.id===v.productId)),stockMovements:publicOnly?[]:db.select().from(stockMovements).all().map(m=>{const v=variants.find(v=>v.id===m.variantId);return {id:m.id,timestamp:m.createdAt.toISOString(),sku:v?.sku??'Unknown SKU',productId:v?.productId??'',type:m.movementType,quantityChange:m.quantityDelta,fieldAffected:'onHand',previousOnHand:m.onHandBefore,newOnHand:m.onHandAfter,previousReserved:0,newReserved:0,reason:m.reason,actorId:m.actorStaffId,actorName:m.actorStaffId?staffNames.get(m.actorStaffId)??'Former staff':'System'};})};
}
export function publicProducts(query: Record<string,unknown>) {
  let list=catalogSnapshot(true).products.map(p=>({id:p.id,slug:p.slug,name:p.name,description:p.description,category:p.category,price:p.basePriceTomans,images:p.images,details:((p as Record<string,unknown>).details||[]) as string[],variants:p.variants.map(v=>({id:v.id,sku:v.sku,colorHex:v.colorHex,colorName:v.colorName,size:v.size,priceTomans:v.priceTomans,available:v.available})),colors:[...new Map(p.variants.map(v=>[v.colorHex,{name:v.colorName,hex:v.colorHex}])).values()],sizes:[...new Set(p.variants.map(v=>v.size))]}));
  if(typeof query.category==='string') list=list.filter(p=>p.category===query.category);
  if(typeof query.search==='string') {const q=query.search.toLowerCase();list=list.filter(p=>p.name.toLowerCase().includes(q)||p.description.toLowerCase().includes(q));}
  if(query.sort==='price-asc') list.sort((a,b)=>a.price-b.price);
  if(query.sort==='price-desc') list.sort((a,b)=>b.price-a.price);
  return list;
}
export function saveCategory(input:unknown,id?:string) {
  const data=categorySchema.parse(input);const values={name:data.nameFa,slug:data.slug,description:data.description,status:data.status,displayOrder:data.displayOrder,presentation:{nameEn:data.nameEn,image:data.image,isFeatured:data.isFeatured},updatedAt:new Date()};
  if(id){const row=db.update(categories).set(values).where(eq(categories.id,id)).returning().get();if(!row)throw new ApiError(404,'NOT_FOUND','دسته یافت نشد.');return row;}
  return db.insert(categories).values(values).returning().get();
}
export function saveVariant(input:unknown,id?:string,actorId?:string) {
  const data=variantSchema.parse(input);if(!db.select().from(products).where(eq(products.id,data.productId)).get())throw new ApiError(404,'NOT_FOUND','محصول یافت نشد.');
  if(id){const previous=db.select().from(productVariants).where(eq(productVariants.id,id)).get();if(previous&&previous.productId!==data.productId)throw new ApiError(409,'VARIANT_PRODUCT_CONFLICT','انتقال تنوع موجود به محصول دیگر مجاز نیست.');}
  const base=db.select().from(products).where(eq(products.id,data.productId)).get()!.basePriceTomans;
  const effectivePrice=data.priceAdjustmentTomans!==undefined?(data.priceAdjustmentTomans?base+data.priceAdjustmentTomans:null):(data.priceTomans??null);
  if(effectivePrice!==null)money.parse(effectivePrice);
  const values={productId:data.productId,sku:data.sku,colorName:data.colorName,colorHex:data.colorHex,size:data.size,priceTomans:effectivePrice,status:data.isEnabled?'active':'archived',lowStockThreshold:data.minStockThreshold,weightGrams:data.weightGrams,presentation:{fit:data.fit,warehouseLocation:data.warehouseLocation,material:data.material},updatedAt:new Date()};
  return db.transaction(()=>{
    const row=id?db.update(productVariants).set(values).where(eq(productVariants.id,id)).returning().get():db.insert(productVariants).values(values).returning().get();
    if(!row)throw new ApiError(404,'NOT_FOUND','تنوع یافت نشد.');
    if(!id)db.insert(inventory).values({variantId:row.id}).run();
    const stock=db.select().from(inventory).where(eq(inventory.variantId,row.id)).get()!;
    if(data.onHandStock!==undefined && data.onHandStock!==stock.onHand){
      if(!actorId || !data.inventoryReason)throw new ApiError(422,'VALIDATION_ERROR','دلیل تغییر موجودی الزامی است.');
      adjustStock(row.sku,{newQuantity:data.onHandStock,reason:data.inventoryReason},actorId);
    }
    return row;
  });
}
export function saveProduct(input:unknown,id?:string,actorId?:string) {
  const data=productSchema.parse(input);const category=db.select().from(categories).where(eq(categories.slug,data.category)).get()||db.select().from(categories).where(eq(categories.id,data.category)).get();
  if(!category)throw new ApiError(422,'VALIDATION_ERROR','دسته معتبر انتخاب کنید.');
  return db.transaction(()=>{
    const {variants,images,imageAlts,...presentation}=data;
    const values={name:data.name,slug:data.slug,description:data.description,status:data.status,categoryId:category.id,basePriceTomans:data.basePriceTomans,customizable:data.isCustomizable,featured:data.featured,presentation,updatedAt:new Date()};
    const row=id?db.update(products).set(values).where(eq(products.id,id)).returning().get():db.insert(products).values(values).returning().get();
    if(!row)throw new ApiError(404,'NOT_FOUND','محصول یافت نشد.');
    db.delete(productMedia).where(eq(productMedia.productId,row.id)).run();
    const orderedImages=data.primaryImage&&images.includes(data.primaryImage)?[data.primaryImage,...images.filter(url=>url!==data.primaryImage)]:images;
    for(const [displayOrder,url] of orderedImages.entries())db.insert(productMedia).values({productId:row.id,url,altText:imageAlts[url]||data.name,displayOrder}).run();
    if(variants){const existing=db.select().from(productVariants).where(eq(productVariants.productId,row.id)).all();for(const v of variants){const old=v.id?existing.find(x=>x.id===v.id):existing.find(x=>x.sku===v.sku);if(v.id&&!old)throw new ApiError(422,'VALIDATION_ERROR','شناسه تنوع به این محصول تعلق ندارد.');saveVariant({...v,productId:row.id,inventoryReason:data.inventoryReason},old?.id,actorId);}for(const old of existing)if(!variants.some(v=>v.id===old.id||v.sku===old.sku))db.update(productVariants).set({status:'archived'}).where(eq(productVariants.id,old.id)).run();}
    return row;
  });
}
