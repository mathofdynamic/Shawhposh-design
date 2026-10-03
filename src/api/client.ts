export class ApiClientError extends Error {
  constructor(public status:number,public code:string,message:string){super(message);}
}
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  let response:Response;
  try{response=await fetch('/api'+path,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...options.headers}});}catch{throw new ApiClientError(0,'OFFLINE','ارتباط با سرور برقرار نشد.');}
  const body=await response.json().catch(()=>null);
  if(!response.ok){
    if(response.status===401 && path.startsWith('/v1/admin/') && !path.startsWith('/v1/admin/auth/'))window.dispatchEvent(new Event('shawhposh:staff-session-expired'));
    throw new ApiClientError(response.status,body?.error?.code||'HTTP_ERROR',body?.error?.message||'درخواست انجام نشد.');
  }
  if(!body)throw new ApiClientError(response.status,'INVALID_RESPONSE','پاسخ سرور معتبر نیست.');
  return body as T;
}
export const post=<T>(path:string,body:unknown)=>api<T>(path,{method:'POST',body:JSON.stringify(body)});
export const patch=<T>(path:string,body:unknown)=>api<T>(path,{method:'PATCH',body:JSON.stringify(body)});
