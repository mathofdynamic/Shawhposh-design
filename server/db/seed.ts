import { eq } from 'drizzle-orm';
import { PRODUCTS } from '../../src/data';
import { db, sqlite } from './connection';
import { products, categories } from './schema';
import { saveCategory,saveProduct } from '../modules/catalog/service';
for(const [index,slug] of [...new Set(PRODUCTS.map(p=>p.category))].entries())if(!db.select().from(categories).where(eq(categories.slug,slug)).get())saveCategory({nameFa:{calligraphy:'کالیگرافی',graphic:'گرافیک',minimalist:'مینیمال',pod:'چاپ سفارشی'}[slug],slug,displayOrder:index});
for(const p of PRODUCTS){const slug=p.id;if(db.select().from(products).where(eq(products.slug,slug)).get())continue;
  saveProduct({name:p.name,slug,description:p.description,category:p.category,basePriceTomans:p.price,status:'active',isCustomizable:true,featured:!!p.isPopular,images:p.images,details:p.details,originalPriceTomans:p.originalPrice,discountPercent:p.discountPercent,skuPrefix:p.id.toUpperCase(),variants:p.colors.flatMap((c,ci)=>p.sizes.map(size=>({sku:`${p.id.toUpperCase()}-C${ci+1}-${size}`,colorName:c.name,colorHex:c.hex,size,priceTomans:null,minStockThreshold:3,isEnabled:true,fit:'oversize'})))});
}
console.log({products:db.select().from(products).all().length,categories:db.select().from(categories).all().length,initialInventory:'zero; owner must count stock'});sqlite.close();
