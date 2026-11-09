import { chmodSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { eq, sql } from 'drizzle-orm';
import { config } from '../../config';
import { db } from '../../db/connection';
import { products, productMedia } from '../../db/schema';
import { ApiError } from '../../lib/errors';

const maxBytes = 5 * 1024 * 1024;
const maxPixels = 12_000_000;
const storageRoot = resolve(dirname(resolve(config.DATABASE_PATH)), 'product-media');

export async function storeProductImage(productId: string, input: Buffer, claimedMimeType: string, altText: string) {
  if (input.length === 0 || input.length > maxBytes) throw new ApiError(413, 'PRODUCT_IMAGE_SIZE_INVALID', 'حجم هر تصویر باید حداکثر ۵ مگابایت باشد.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(claimedMimeType)) throw new ApiError(422, 'PRODUCT_IMAGE_TYPE_INVALID', 'فقط تصویرهای PNG، JPEG و WebP پذیرفته می‌شوند.');
  if (!db.select({ id: products.id }).from(products).where(eq(products.id, productId)).get()) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'محصول پیدا نشد.');

  let webp: Buffer;
  try {
    const source = sharp(input, { limitInputPixels: maxPixels, failOn: 'error' });
    const metadata = await source.metadata();
    const detectedMime = metadata.format === 'jpeg' ? 'image/jpeg' : metadata.format === 'png' ? 'image/png' : metadata.format === 'webp' ? 'image/webp' : '';
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > maxPixels || detectedMime !== claimedMimeType) {
      throw new ApiError(422, 'PRODUCT_IMAGE_CONTENT_INVALID', 'محتوای فایل با قالب تصویر اعلام‌شده سازگار نیست.');
    }
    webp = await sharp(input, { limitInputPixels: maxPixels, failOn: 'error' }).rotate().webp({ quality: 86, effort: 4 }).toBuffer();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, 'PRODUCT_IMAGE_CONTENT_INVALID', 'فایل ارسال‌شده تصویر معتبر و قابل پردازش نیست.');
  }
  if (webp.length === 0 || webp.length > maxBytes) throw new ApiError(413, 'PRODUCT_IMAGE_SIZE_INVALID', 'حجم تصویر پس از پردازش از حد مجاز بیشتر است.');

  const id = randomUUID();
  const path = resolve(storageRoot, `${id}.webp`);
  if (!path.startsWith(storageRoot + sep)) throw new ApiError(500, 'PRODUCT_IMAGE_STORAGE_ERROR', 'ذخیره تصویر انجام نشد.');
  mkdirSync(storageRoot, { recursive: true, mode: 0o750 });
  chmodSync(storageRoot, 0o750);
  try {
    writeFileSync(path, webp, { flag: 'wx', mode: 0o640 });
    chmodSync(path, 0o640);
    const displayOrder = db.select({ next: sql<number>`coalesce(max(${productMedia.displayOrder}), -1) + 1` })
      .from(productMedia).where(eq(productMedia.productId, productId)).get()!.next;
    const url = `/api/v1/product-media/${id}`;
    const image = db.insert(productMedia).values({ id, productId, url, altText: altText.trim().slice(0, 500), displayOrder }).returning().get();
    return { id: image.id, url: image.url, altText: image.altText };
  } catch {
    try { unlinkSync(path); } catch { /* the failed upload is already unavailable */ }
    throw new ApiError(503, 'PRODUCT_IMAGE_STORAGE_ERROR', 'تصویر ذخیره نشد. فضا یا دسترسی پوشه ذخیره‌سازی را بررسی کنید.');
  }
}

export function readProductImage(id: string) {
  const record = db.select({ id: productMedia.id }).from(productMedia).where(eq(productMedia.id, id)).get();
  if (!record) throw new ApiError(404, 'PRODUCT_IMAGE_NOT_FOUND', 'تصویر پیدا نشد.');
  const path = resolve(storageRoot, `${record.id}.webp`);
  if (!path.startsWith(storageRoot + sep)) throw new ApiError(404, 'PRODUCT_IMAGE_NOT_FOUND', 'تصویر پیدا نشد.');
  try { return readFileSync(path); }
  catch { throw new ApiError(404, 'PRODUCT_IMAGE_NOT_FOUND', 'فایل تصویر در دسترس نیست.'); }
}
