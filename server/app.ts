import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { sqlite } from './db/connection';
import { authRoutes } from './modules/auth/routes';
import { requireStaff } from './modules/auth/service';
import { adminCatalog, publicCatalog } from './modules/catalog/routes';
import { ApiError, errorHandler } from './lib/errors';

export const app=express();
app.disable('x-powered-by');
app.set('trust proxy','loopback');
app.use(helmet());
app.use((req,res,next)=>{
  res.setHeader('Cache-Control','no-store');
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.get('origin')!==config.APP_ORIGIN)return next(new ApiError(403,'CSRF_REJECTED','مبدأ درخواست معتبر نیست.'));
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&!req.is('application/json'))return next(new ApiError(415,'UNSUPPORTED_MEDIA_TYPE','درخواست JSON لازم است.'));
  const start=Date.now();res.on('finish',()=>console.log(JSON.stringify({method:req.method,status:res.statusCode,durationMs:Date.now()-start})));next();
});
app.use(express.json({limit:'256kb'}));app.use(cookieParser());
app.get('/api/health',(_req,res)=>{try{sqlite.prepare('select 1').get();res.json({status:'ok',version:config.APP_VERSION,database:'connected',timestamp:new Date().toISOString()});}catch{res.status(503).json({status:'unavailable',version:config.APP_VERSION,database:'unavailable',timestamp:new Date().toISOString()});}});
app.use('/api/v1/auth',authRoutes());
app.use('/api/v1/admin/auth',authRoutes(true));
app.use('/api/v1/admin',requireStaff,adminCatalog);
app.use('/api/v1',publicCatalog);
app.use((_req,_res,next)=>next(new ApiError(404,'NOT_FOUND','مسیر یافت نشد.')));
app.use(errorHandler);
