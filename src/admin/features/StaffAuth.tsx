import React,{createContext,useContext,useEffect,useState} from 'react';
import {api,post} from '../../api/client';
import type {StaffRole} from '../domain/types';
export type Staff={id:string;name:string;email:string;role:StaffRole};
const Context=createContext<{staff:Staff;logout:()=>Promise<void>}|null>(null);
export const useStaff=()=>useContext(Context);
export function StaffAuth({children}:{children:React.ReactNode}){
 const [staff,setStaff]=useState<Staff|null>(null);const [loading,setLoading]=useState(true);const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');
 useEffect(()=>{api<{user:Staff|null}>('/v1/admin/auth/me').then(r=>setStaff(r.user)).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 const login=async(e:React.FormEvent)=>{e.preventDefault();setLoading(true);setError('');try{const result=await post<{user:Staff}>('/v1/admin/auth/login',{identifier:email,password});setStaff(result.user);setPassword('');}catch(e){setError((e as Error).message);}finally{setLoading(false);}};
 useEffect(()=>{const expired=()=>{setStaff(null);setError('نشست شما پایان یافته است؛ دوباره وارد شوید.');};window.addEventListener('shawhposh:staff-session-expired',expired);return()=>window.removeEventListener('shawhposh:staff-session-expired',expired);},[]);
 const logout=async()=>{try{await post('/v1/admin/auth/logout',{});setStaff(null);setError('');}catch(e){setError((e as Error).message);}};
 if(!staff)return <main dir="rtl" className="min-h-screen bg-[#0e0d0c] flex items-center justify-center p-6 text-stone-100"><form onSubmit={login} className="w-full max-w-sm space-y-5"><h1 className="text-xl font-bold">ورود کارکنان شاه‌پوش</h1><label className="block">ایمیل<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} className="block w-full mt-2 p-3 rounded-xl bg-white/5 border border-white/20"/></label><label className="block">رمز عبور<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="block w-full mt-2 p-3 rounded-xl bg-white/5 border border-white/20"/></label>{error&&<p role="alert" className="text-red-300">{error}</p>}<button disabled={loading} className="w-full p-3 rounded-xl bg-[#ba8d3d] text-black disabled:opacity-50">{loading?'در حال بررسی…':'ورود'}</button><a href="/" className="block text-sm text-stone-400">بازگشت به فروشگاه</a></form></main>;
 return <Context.Provider value={{staff,logout}}><>{error&&<div role="alert" className="fixed bottom-4 right-4 z-50 p-3 rounded-xl bg-black text-red-300">{error}<button onClick={()=>void logout()} className="mr-3 underline">تلاش دوباره</button></div>}{children}</></Context.Provider>;
}
