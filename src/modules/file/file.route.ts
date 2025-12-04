// file: src/modules/file/file.route.ts

import upload from "@/config/multer.config";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { FileController } from "./file.controller";

const router = Router();
const fileController = new FileController();

/**
 * POST /file/upload-profile-image
 * Upload profile image for authenticated user
 * Body: multipart/form-data with 'image' field
 */
router.post(
  "/upload-profile-image",
  authMiddleware.verifyToken,
  upload.single("image"),
  fileController.uploadProfileImage
);

/**
 * DELETE /file/profile-image
 * Delete profile image for authenticated user
 */
router.delete(
  "/profile-image",
  authMiddleware.verifyToken,
  fileController.deleteProfileImage
);

/**
 * POST /file/upload-excel
 * Upload Excel file
 * Body: multipart/form-data with 'file' field
 * Optional: folder parameter for custom folder path
 */
router.post(
  "/upload-excel",
  authMiddleware.verifyToken,
  upload.single("file"),
  fileController.uploadExcelFile
);

/**
 * POST /file/upload-pdf
 * Upload PDF file
 * Body: multipart/form-data with 'file' field
 * Optional: folder parameter for custom folder path
 */
router.post(
  "/upload-pdf",
  authMiddleware.verifyToken,
  upload.single("file"),
  fileController.uploadPdfFile
);

export default router;
