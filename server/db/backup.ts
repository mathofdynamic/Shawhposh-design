import { mkdirSync, readdirSync, statSync, unlinkSync, chmodSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { sqlite } from './connection';
const directory=process.env.BACKUP_DIRECTORY;
if(!directory)throw new Error('BACKUP_DIRECTORY required');
const base=resolve(directory);mkdirSync(base,{recursive:true,mode:0o700});
const destination=join(base,`shawhposh-${new Date().toISOString().replaceAll(':','-')}.sqlite`);
await sqlite.backup(destination);chmodSync(destination,0o600);sqlite.close();
const cutoff=Date.now()-14*86400000;
for(const name of readdirSync(base))if(/^shawhposh-[0-9T.Z-]+\.sqlite$/.test(name)){const path=join(base,name);if(statSync(path).mtimeMs<cutoff)unlinkSync(path);}
console.log('Database backup complete; retention 14 days');
