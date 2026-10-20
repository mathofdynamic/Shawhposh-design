import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import sharp from 'sharp';
import type { OutputInfo } from 'sharp';
import { config } from '../../config';
import { ApiError } from '../../lib/errors';
import type { NormalizedReceipt } from './service';

const maxBytes = 5 * 1024 * 1024;
const maxPixels = 12_000_000;
const storageRoot = resolve(config.PAYMENT_RECEIPT_DIR);

export async function normalizeAndStoreReceipt(input: Buffer, claimedMimeType: string): Promise<NormalizedReceipt> {
  if (input.byteLength < 1 || input.byteLength > maxBytes) {
    throw new ApiError(413, 'RECEIPT_SIZE_INVALID', 'حجم تصویر رسید باید حداکثر ۵ مگابایت باشد.');
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(claimedMimeType)) {
    throw new ApiError(422, 'RECEIPT_TYPE_INVALID', 'بارگذاری فقط برای فایل تصویری مجاز است.');
  }
  let result: { data: Buffer; info: OutputInfo };
  try {
    const image = sharp(input, { limitInputPixels: maxPixels, failOn: 'error' });
    const metadata = await image.metadata();
    const detectedMime = metadata.format === 'jpeg' ? 'image/jpeg'
      : metadata.format === 'png' ? 'image/png'
        : metadata.format === 'webp' ? 'image/webp' : '';
    if (!detectedMime || detectedMime !== claimedMimeType || !metadata.width || !metadata.height
      || metadata.width * metadata.height > maxPixels) {
      throw new ApiError(422, 'RECEIPT_CONTENT_INVALID', 'محتوای تصویر با قالب مجاز سازگار نیست.');
    }
    result = await sharp(input, { limitInputPixels: maxPixels, failOn: 'error' })
      .rotate()
      .webp({ quality: 84, effort: 4 })
      .toBuffer({ resolveWithObject: true });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, 'RECEIPT_CONTENT_INVALID', 'فایل ارسال‌شده تصویر معتبر و قابل پردازش نیست.');
  }
  if (!result.data.length || result.data.length > maxBytes) {
    throw new ApiError(413, 'RECEIPT_SIZE_INVALID', 'حجم تصویر پس از پردازش از حد مجاز بیشتر است.');
  }
  mkdirSync(storageRoot, { recursive: true, mode: 0o700 });
  chmodSync(storageRoot, 0o700);
  const storageKey = `${randomUUID()}.webp`;
  const path = resolve(storageRoot, storageKey);
  if (!path.startsWith(storageRoot + sep)) throw new ApiError(500, 'RECEIPT_STORAGE_ERROR', 'ذخیره رسید انجام نشد.');
  try {
    writeFileSync(path, result.data, { flag: 'wx', mode: 0o600 });
    chmodSync(path, 0o600);
  } catch {
    throw new ApiError(503, 'RECEIPT_STORAGE_UNAVAILABLE', 'ذخیره امن رسید در دسترس نیست.');
  }
  return {
    storageKey,
    mimeType: 'image/webp',
    sizeBytes: result.data.length,
    sha256: createHash('sha256').update(result.data).digest('hex'),
    width: result.info.width,
    height: result.info.height,
  };
}

export function readStoredReceipt(storageKey: string) {
  if (!/^[0-9a-f-]{36}\.webp$/i.test(storageKey)) throw new ApiError(404, 'NOT_FOUND', 'رسید پیدا نشد.');
  const path = resolve(storageRoot, storageKey);
  if (!path.startsWith(storageRoot + sep)) throw new ApiError(404, 'NOT_FOUND', 'رسید پیدا نشد.');
  try {
    return readFileSync(path);
  } catch {
    throw new ApiError(404, 'RECEIPT_FILE_MISSING', 'فایل رسید در دسترس نیست.');
  }
}

export function removeStoredReceipt(storageKey: string) {
  if (!/^[0-9a-f-]{36}\.webp$/i.test(storageKey)) return;
  const path = resolve(storageRoot, storageKey);
  if (!path.startsWith(storageRoot + sep)) return;
  try { unlinkSync(path); } catch { /* Preserve the original request error. */ }
}
