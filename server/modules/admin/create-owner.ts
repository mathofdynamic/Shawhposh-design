import { randomBytes } from 'node:crypto';
import { writeFileSync, chmodSync, unlinkSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import { db,sqlite } from '../../db/connection';
import { staffUsers } from '../../db/schema';
import { hashPassword,normalizeEmail } from '../auth/service';
const existing=db.select().from(staffUsers).where(eq(staffUsers.role,'owner')).get();
if(existing){console.log('حساب مالک از قبل وجود دارد؛ تغییری انجام نشد.');sqlite.close();process.exit(0);}
const email=normalizeEmail(process.env.OWNER_EMAIL||`owner-${randomBytes(4).toString('hex')}@shawhposh.ir`);
const password=process.env.OWNER_PASSWORD||randomBytes(24).toString('base64url');
const output=process.env.OWNER_CREDENTIAL_FILE;
if(!process.env.OWNER_PASSWORD&&!output)throw new Error('برای ساخت اطلاعات ورود، متغیر OWNER_CREDENTIAL_FILE الزامی است.');
const passwordHash=await hashPassword(password);
let credentialCreated=false;
try {
  if(output){writeFileSync(output,JSON.stringify({email,password},null,2),{mode:0o600,flag:'wx'});chmodSync(output,0o600);credentialCreated=true;}
  db.insert(staffUsers).values({email,fullName:process.env.OWNER_NAME||'مدیر شاه‌پوش',passwordHash,role:'owner'}).run();
} catch(error) {
  if(credentialCreated && output) unlinkSync(output);
  throw error;
}
console.log('حساب مالک ساخته شد؛ اطلاعات ورود در گزارش ثبت نمی‌شود.');sqlite.close();
