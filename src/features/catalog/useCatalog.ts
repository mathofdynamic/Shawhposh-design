import { useEffect,useState } from 'react';
import { api } from '../../api/client';
import type { Product } from '../../types';
import { storefrontProductImages } from '../../lib/productImage';
export function useCatalog(enabled=true){
  const [products,setProducts]=useState<Product[]>([]);const [categories,setCategories]=useState<{slug:string;nameFa:string}[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
  useEffect(()=>{if(!enabled){setLoading(false);return;}let active=true;let pending=false;const load=async()=>{if(pending || document.hidden)return;pending=true;try{const data=await api<{products:Product[];categories:{slug:string;nameFa:string}[]}>('/v1/products');if(active){setProducts(data.products.map(product=>({...product,images:storefrontProductImages(product.images)})));setCategories(data.categories);setError('');}}catch(e){if(active)setError(e instanceof Error?e.message:'خطای دریافت محصولات');}finally{pending=false;if(active)setLoading(false);}};void load();const timer=setInterval(load,2000);const focus=()=>void load();window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};},[enabled]);
  return {products,categories,loading,error};
}
