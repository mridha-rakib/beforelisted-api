// file: src/config/multer.config.ts

import multer from "multer";

/**
 * Multer Configuration
 * Stores files in memory (not on disk)
 * Uses S3 for persistent storage via FileService
 */

// Store file in memory (don't save to disk)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Allow all file types at multer level
  // Validation happens in FileService
  cb(null, true);
};

// Multer config
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
    // Service will validate specific limits per file type
  },
});

export default upload;
