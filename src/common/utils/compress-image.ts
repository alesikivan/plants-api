import * as sharp from 'sharp';
import * as fs from 'fs';

/**
 * Compresses an image file in-place using sharp.
 * - Resizes to max 1920px on the longest side (without enlarging smaller images).
 * - JPEG/WebP → quality 85; PNG → compressionLevel 8.
 * - GIF is skipped (would lose animation).
 * - On any error the original file is left untouched.
 */
export async function compressImage(filePath: string): Promise<void> {
  const tempPath = filePath + '.tmp';
  try {
    const { format } = await sharp(filePath).metadata();

    if (!format || format === 'gif' || format === 'svg') return;

    const image = sharp(filePath).resize(1920, 1920, {
      fit: 'inside',
      withoutEnlargement: true,
    });

    if (format === 'png') {
      await image.png({ compressionLevel: 8 }).toFile(tempPath);
    } else if (format === 'webp') {
      await image.webp({ quality: 85 }).toFile(tempPath);
    } else {
      await image.jpeg({ quality: 85, progressive: true }).toFile(tempPath);
    }

    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.warn(`[compress-image] Failed for ${filePath}:`, err.message);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}
