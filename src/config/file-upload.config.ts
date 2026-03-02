import { extname } from 'path';
import { diskStorage } from 'multer';

/**
 * Image Upload Configuration
 *
 * Weight/Size Limits:
 * - Plants: 5MB per image (main plant photo)
 * - Plant History: 5MB per image (history timeline photos, max 10 photos per entry)
 * - Shelves: 5MB per image (shelf cover photo)
 * - Wishlist: 5MB per image (wishlist item photo)
 *
 * Supported Formats: JPG, JPEG, PNG, GIF, WebP
 *
 * IMPORTANT: These limits apply at the server-side validation layer.
 * Ensure frontend also implements client-side validation for better UX.
 */

export const FILE_UPLOAD_CONFIG = {
  // Maximum file size: 5MB (in bytes)
  MAX_FILE_SIZE: 5 * 1024 * 1024,

  // Allowed MIME types for images
  ALLOWED_MIME_TYPES: /\/(jpg|jpeg|png|gif|webp)$/,

  // Upload directories
  UPLOAD_DIRS: {
    PLANTS: './uploads/plants',
    PLANT_HISTORY: './uploads/plant-history',
    SHELVES: './uploads/shelves',
    WISHLIST: './uploads/wishlist',
  },

  // File naming prefixes for different upload types
  FILE_PREFIXES: {
    PLANTS: 'plant',
    PLANT_HISTORY: 'history',
    SHELVES: 'shelf',
    WISHLIST: 'wishlist',
  },
};

/**
 * Creates a multer file storage configuration for disk uploads
 * @param destination - The directory where files will be saved
 * @param prefix - The prefix for the generated filename
 */
export function createDiskStorage(destination: string, prefix: string) {
  return diskStorage({
    destination,
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      callback(null, `${prefix}-${uniqueSuffix}${ext}`);
    },
  });
}

/**
 * Creates a multer file filter for validating image files
 * Only allows specified image MIME types
 */
export function createImageFileFilter() {
  return (req: any, file: Express.Multer.File, callback: Function) => {
    if (!file.mimetype.match(FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES)) {
      return callback(
        new Error('Only image files (JPG, JPEG, PNG, GIF, WebP) are allowed!'),
        false,
      );
    }
    callback(null, true);
  };
}

/**
 * Creates a complete multer options object for image file uploads
 * @param destination - The directory where files will be saved
 * @param prefix - The prefix for the generated filename
 */
export function createImageUploadOptions(destination: string, prefix: string) {
  return {
    storage: createDiskStorage(destination, prefix),
    fileFilter: createImageFileFilter(),
    // limits: {
    //   fileSize: FILE_UPLOAD_CONFIG.MAX_FILE_SIZE, // 5MB max per file
    // },
  };
}
