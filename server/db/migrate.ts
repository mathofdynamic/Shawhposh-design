import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, sqlite } from './connection';
if(process.argv.includes('--status')){
  const table=sqlite.prepare("select name from sqlite_master where name='__drizzle_migrations'").get();
  console.log({applied:table?sqlite.prepare('select count(*) as count from __drizzle_migrations').get():0});
}else{migrate(db,{migrationsFolder:'server/db/migrations'});console.log('Migrations applied');}
sqlite.close();
