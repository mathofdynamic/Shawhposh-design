import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import sharp from 'sharp';
import { config } from '../../config';
import { ApiError } from '../../lib/errors';

const maxBytes = 5 * 1024 * 1024;
const maxPixels = 12_000_000;
const storageRoot = resolve(config.PAYMENT_RECEIPT_DIR);

export async function storeInvoiceImage(input: Buffer, claimedMimeType: string) {
  if (input.byteLength < 1 || input.byteLength > maxBytes) {
    throw new ApiError(413, 'INVOICE_IMAGE_SIZE_INVALID', 'حجم تصویر فاکتور باید حداکثر ۵ مگابایت باشد.');
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(claimedMimeType)) {
    throw new ApiError(422, 'INVOICE_IMAGE_TYPE_INVALID', 'فقط فایل تصویری JPEG، PNG یا WebP مجاز است.');
  }
  let image: Buffer;
  try {
    const source = sharp(input, { limitInputPixels: maxPixels, failOn: 'error' });
    const metadata = await source.metadata();
    const detectedMime = metadata.format === 'jpeg' ? 'image/jpeg'
      : metadata.format === 'png' ? 'image/png'
        : metadata.format === 'webp' ? 'image/webp' : '';
    if (detectedMime !== claimedMimeType || !metadata.width || !metadata.height || metadata.width * metadata.height > maxPixels) {
      throw new ApiError(422, 'INVOICE_IMAGE_CONTENT_INVALID', 'محتوای فایل با قالب تصویر مجاز سازگار نیست.');
    }
    image = await sharp(input, { limitInputPixels: maxPixels, failOn: 'error' }).rotate().webp({ quality: 84, effort: 4 }).toBuffer();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, 'INVOICE_IMAGE_CONTENT_INVALID', 'فایل انتخاب‌شده تصویر معتبر و قابل پردازش نیست.');
  }
  if (!image.length || image.length > maxBytes) {
    throw new ApiError(413, 'INVOICE_IMAGE_SIZE_INVALID', 'حجم تصویر پس از پردازش از حد مجاز بیشتر است.');
  }
  mkdirSync(storageRoot, { recursive: true, mode: 0o700 });
  chmodSync(storageRoot, 0o700);
  const storageKey = `invoice-${randomUUID()}.webp`;
  const path = resolve(storageRoot, storageKey);
  if (!path.startsWith(storageRoot + sep)) throw new ApiError(500, 'INVOICE_IMAGE_STORAGE_ERROR', 'ذخیره امن تصویر فاکتور انجام نشد.');
  try {
    writeFileSync(path, image, { flag: 'wx', mode: 0o600 });
    chmodSync(path, 0o600);
  } catch {
    throw new ApiError(503, 'INVOICE_IMAGE_STORAGE_UNAVAILABLE', 'ذخیره امن تصویر فاکتور در دسترس نیست.');
  }
  return { storageKey, sha256: createHash('sha256').update(image).digest('hex'), sizeBytes: image.length };
}

export function readInvoiceImage(storageKey: string) {
  if (!/^invoice-[0-9a-f-]{36}\.webp$/i.test(storageKey)) throw new ApiError(404, 'NOT_FOUND', 'تصویر فاکتور پیدا نشد.');
  const path = resolve(storageRoot, storageKey);
  if (!path.startsWith(storageRoot + sep)) throw new ApiError(404, 'NOT_FOUND', 'تصویر فاکتور پیدا نشد.');
  try { return readFileSync(path); }
  catch { throw new ApiError(404, 'INVOICE_IMAGE_MISSING', 'فایل تصویر فاکتور در دسترس نیست.'); }
}

export function removeInvoiceImage(storageKey: string) {
  if (!/^invoice-[0-9a-f-]{36}\.webp$/i.test(storageKey)) return;
  const path = resolve(storageRoot, storageKey);
  if (!path.startsWith(storageRoot + sep)) return;
  try { unlinkSync(path); } catch { /* Keep the original request result. */ }
}
