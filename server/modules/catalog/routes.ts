import { Router } from 'express';
import { z } from 'zod';
import { catalogSnapshot, publicProducts, saveCategory, saveProduct, saveVariant, productSchema, categorySchema, variantSchema } from './service';
import { allowRoles } from '../auth/service';
import { adjustStock } from '../inventory/service';
import { asyncRoute, ApiError } from '../../lib/errors';
const idSchema=z.string().uuid();
export const publicCatalog=Router();
publicCatalog.get('/products',asyncRoute((req,res)=>{res.json({products:publicProducts(req.query),categories:catalogSnapshot(true).categories.filter(c=>c.status==='active')});}));
publicCatalog.get('/products/:slug',asyncRoute((req,res)=>{const product=publicProducts({}).find(p=>p.slug===req.params.slug);if(!product)throw new ApiError(404,'NOT_FOUND','محصول یافت نشد.');res.json({product});}));
publicCatalog.get('/categories',asyncRoute((_req,res)=>{res.json({categories:catalogSnapshot(true).categories.filter(c=>c.status==='active')});}));
export const adminCatalog=Router();
const catalogWrite=allowRoles('owner','store_manager');
const inventoryWrite=allowRoles('owner','store_manager','inventory');
adminCatalog.post('/catalog/import',catalogWrite,asyncRoute((req,res)=>{
  const rows=z.array(z.record(z.string(),z.string())).min(1).max(100).parse(req.body.rows);
  const errors:string[]=[];let importedCount=0;
  rows.forEach((row,index)=>{
    try {
      const name=(row.name||row['نام محصول']||row.title||'').trim();
      const rawPrice=row.basePriceTomans||row['قیمت پایه']||row.price||'';
      const slug=(row.slug||row.id||row['کد شناسایی']||'').trim();
      const category=(row.category||row['دسته‌بندی']||'calligraphy').trim();
      saveProduct({name,slug,category,basePriceTomans:Number(rawPrice.replaceAll(',','')),status:'draft',description:row.description||row['توضیحات']||'',fabricSpecs:row.fabricSpecs||row['جنس پارچه']||'',skuPrefix:row.skuPrefix||row['پیش‌وند']||slug.toUpperCase()});
      importedCount++;
    } catch(error) {
      errors.push(`ردیف ${index+1}: ${error instanceof z.ZodError?'اطلاعات نامعتبر است.':error instanceof ApiError?error.message:'محصول ذخیره نشد؛ شناسه تکراری یا اطلاعات نامعتبر است.'}`);
    }
  });
  res.json({success:importedCount>0,importedCount,errors});
}));
adminCatalog.get('/catalog/snapshot',asyncRoute((_req,res)=>{res.json(catalogSnapshot());}));
for(const resource of ['products','categories','variants'] as const){
  adminCatalog.get('/'+resource,asyncRoute((_req,res)=>{res.json({[resource]:catalogSnapshot()[resource]});}));
  adminCatalog.get('/'+resource+'/:id',asyncRoute((req,res)=>{const id=idSchema.parse(req.params.id);const item=catalogSnapshot()[resource].find(item=>item.id===id);if(!item)throw new ApiError(404,'NOT_FOUND','رکورد یافت نشد.');res.json({[resource.slice(0,-1)]:item});}));
  const save=resource==='products'?saveProduct:resource==='categories'?saveCategory:saveVariant;
  adminCatalog.post('/'+resource,resource==='variants'?inventoryWrite:catalogWrite,asyncRoute((req,res)=>{res.status(201).json({item:save(req.body,undefined,req.principal!.id)});}));
  adminCatalog.patch('/'+resource+'/:id',resource==='variants'?inventoryWrite:catalogWrite,asyncRoute((req,res)=>{
    const id=idSchema.parse(req.params.id);const old=catalogSnapshot()[resource].find(item=>item.id===id);if(!old)throw new ApiError(404,'NOT_FOUND','رکورد یافت نشد.');
    const input={...old,...req.body};
    if(resource==='variants' && Object.hasOwn(req.body,'priceTomans') && !Object.hasOwn(req.body,'priceAdjustmentTomans'))delete input.priceAdjustmentTomans;
    res.json({item:save(input,id,req.principal!.id)});
  }));
}
adminCatalog.get('/inventory',asyncRoute((_req,res)=>{res.json({inventory:catalogSnapshot().variants});}));
adminCatalog.get('/inventory/:sku',asyncRoute((req,res)=>{const item=catalogSnapshot().variants.find(v=>v.sku===req.params.sku);if(!item)throw new ApiError(404,'NOT_FOUND','کد کالا یافت نشد.');res.json({inventory:item});}));
adminCatalog.get('/inventory/:sku/movements',asyncRoute((req,res)=>{res.json({movements:catalogSnapshot().stockMovements.filter(m=>m.sku===req.params.sku)});}));
adminCatalog.post('/inventory/:sku/adjustments',inventoryWrite,asyncRoute(async(req,res)=>{res.json(await adjustStock(String(req.params.sku),req.body,req.principal!.id));}));
