import { app } from './app';
import { config } from './config';
import { sqlite } from './db/connection';
try{sqlite.prepare('select count(*) from users').get();}catch{console.error('Database unavailable or migrations missing');process.exit(1);}
const server=app.listen(config.PORT,'127.0.0.1',()=>console.log(JSON.stringify({event:'started',version:config.APP_VERSION})));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(()=>{sqlite.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();});
