import React,{createContext,useContext,useEffect,useState,useCallback,useMemo} from 'react';
import {api,post,patch} from '../../api/client';
import {useAdminRepository} from '../domain/useAdminRepository';
import type {AdminProduct,ProductVariant,AdminCategory,StockMovement} from '../domain/types';
type Variant=ProductVariant&{id:string};
type Snapshot={products:AdminProduct[];variants:Variant[];categories:AdminCategory[];stockMovements:StockMovement[]};
const Context=createContext<{snapshot:Snapshot;reload:()=>Promise<void>}|null>(null);
export function CatalogProvider({children}:{children:React.ReactNode}){
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const reload=useCallback(async()=>{const result=await api<Snapshot>('/v1/admin/catalog/snapshot');setSnapshot(result);setError('');},[]);
  useEffect(()=>{void reload().catch(e=>setError(e.message));},[reload]);
  const retry=async()=>{setBusy(true);try{await reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  if(error)return <div role="alert" className="p-8 text-stone-200"><p>{error}</p><button disabled={busy} onClick={retry} className="mt-4 border border-white/20 rounded-xl p-3">تلاش دوباره</button></div>;
  if(!snapshot)return <div role="status" className="p-8 text-stone-300">در حال دریافت اطلاعات سرور…</div>;
  return <Context.Provider value={{snapshot,reload}}>{children}</Context.Provider>;
}
export function useCatalogAdmin(){
  const demo=useAdminRepository();const context=useContext(Context);if(!context)throw new Error('CatalogProvider missing');const {snapshot,reload}=context;
  const mutate=async(path:string,data:unknown,method:'POST'|'PATCH'='POST')=>{try{const result=await(method==='PATCH'?patch:post)<{item?:{id:string}}>(path,data);await reload();return {success:true,error:undefined,id:result.item?.id,updatedCount:1};}catch(e){return {success:false,error:(e as Error).message,id:undefined,updatedCount:0};}};
  const state=useMemo(()=>({...demo.state,...snapshot}),[demo.state,snapshot]);
  const variantId=(sku:string)=>{const v=snapshot.variants.find(v=>v.sku===sku);if(!v)throw new Error('تنوع یافت نشد.');return v.id;};
  return {...demo,state,
    getProducts:(filters?:{search?:string;status?:string;category?:string})=>snapshot.products.filter(p=>(!filters?.search||p.name.includes(filters.search))&&(!filters?.status||filters.status==='all'||p.status===filters.status)&&(!filters?.category||filters.category==='all'||p.category===filters.category)),
    getProductById:(id:string)=>snapshot.products.find(p=>p.id===id),
    getVariants:()=>snapshot.variants,getCategories:()=>snapshot.categories,
    createProduct:(p:Partial<AdminProduct>)=>mutate('/v1/admin/products',p),
    updateProduct:(id:string,p:Partial<AdminProduct>)=>mutate('/v1/admin/products/'+id,p,'PATCH'),
    deleteProduct:(id:string)=>mutate('/v1/admin/products/'+id,{status:'archived'},'PATCH'),
    bulkUpdateProductStatus:async(ids:string[],status:string)=>{let updatedCount=0;for(const id of ids){const result=await mutate('/v1/admin/products/'+id,{status},'PATCH');if(!result.success)return {...result,updatedCount};updatedCount++;}return {success:true,error:undefined,updatedCount};},
    createVariant:(v:ProductVariant)=>mutate('/v1/admin/variants',v),
    updateVariant:(sku:string,v:Partial<ProductVariant>)=>mutate('/v1/admin/variants/'+variantId(sku),v,'PATCH'),
    deleteVariant:(sku:string)=>mutate('/v1/admin/variants/'+variantId(sku),{isEnabled:false},'PATCH'),
    createCategory:(c:Partial<AdminCategory>)=>mutate('/v1/admin/categories',c),
    updateCategory:(id:string,c:Partial<AdminCategory>)=>mutate('/v1/admin/categories/'+id,c,'PATCH'),
    deleteCategory:(id:string)=>mutate('/v1/admin/categories/'+id,{status:'archived'},'PATCH'),
    updateVariantStock:async(sku:string,newQuantity:number,_actor:string,reason:string)=>(await mutate('/v1/admin/inventory/'+encodeURIComponent(sku)+'/adjustments',{newQuantity,reason})).success,
    recordStockAdjustment:(sku:string,delta:number,_actor:string,reason:string,_type?:string)=>mutate('/v1/admin/inventory/'+encodeURIComponent(sku)+'/adjustments',{delta,reason}),
    goodsReceipt:(sku:string,delta:number,_actor:string,_supplier:string,_reference?:string,reason?:string)=>mutate('/v1/admin/inventory/'+encodeURIComponent(sku)+'/adjustments',{delta,reason:reason||'رسید دستی انبار'}),
    getStockMovements:(sku?:string)=>snapshot.stockMovements.filter(m=>!sku||m.sku===sku),
    importProductsCsv:async(rows:unknown[])=>{try{const result=await post<{success:boolean;importedCount:number;errors:string[]}>('/v1/admin/catalog/import',{rows});await reload();return result;}catch(e){return {success:false,importedCount:0,errors:[(e as Error).message]};}},
  };
}
