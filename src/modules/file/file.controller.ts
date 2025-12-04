// file: src/modules/file/file.controller.ts

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { FileService } from "@/services/file.service";
import { BadRequestException } from "@/utils/app-error.utils";
import { ApiResponse } from "@/utils/response.utils";
import type { NextFunction, Request, Response } from "express";

/**
 * File Controller
 * Handles file upload endpoints for profile images and documents
 */
export class FileController {
  private fileService: FileService;

  constructor() {
    this.fileService = new FileService();
  }

  /**
   * AUTHENTICATED: Upload profile image
   * POST /file/upload-profile-image
   * Body: multipart/form-data with 'image' field
   * Returns: { url, fileName }
   */
  uploadProfileImage = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;

      // Check if file exists
      if (!req.file) {
        throw new BadRequestException(
          "No file provided. Please upload an image."
        );
      }

      const { buffer, originalname, mimetype } = req.file;

      // Upload to S3
      const result = await this.fileService.uploadProfileImage(
        userId,
        buffer,
        originalname,
        mimetype
      );

      ApiResponse.success(
        res,
        {
          profileImageUrl: result.profileImageUrl,
          fileName: result.fileName,
        },
        "Profile image uploaded successfully"
      );
    }
  );

  /**
   * AUTHENTICATED: Delete profile image
   * DELETE /file/profile-image
   * Returns: { message }
   */
  deleteProfileImage = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;

      await this.fileService.deleteProfileImage(userId);

      ApiResponse.success(
        res,
        { message: "Profile image deleted successfully" },
        "Profile image removed"
      );
    }
  );

  /**
   * AUTHENTICATED: Upload Excel file
   * POST /file/upload-excel
   * Body: multipart/form-data with 'file' field
   * Optional body param: folder (default: uploads/documents/excel)
   * Returns: { url, fileName }
   */
  uploadExcelFile = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      if (!req.file) {
        throw new BadRequestException(
          "No file provided. Please upload an Excel file."
        );
      }

      const { buffer, originalname, mimetype } = req.file;
      const folder = req.body.folder || "uploads/documents/excel";

      const result = await this.fileService.uploadExcelFile(
        buffer,
        originalname,
        mimetype,
        folder
      );

      ApiResponse.success(
        res,
        {
          fileUrl: result.fileUrl,
          fileName: result.fileName,
        },
        "Excel file uploaded successfully"
      );
    }
  );

  /**
   * AUTHENTICATED: Upload PDF file
   * POST /file/upload-pdf
   * Body: multipart/form-data with 'file' field
   * Optional body param: folder (default: uploads/documents/pdf)
   * Returns: { url, fileName }
   */
  uploadPdfFile = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      if (!req.file) {
        throw new BadRequestException(
          "No file provided. Please upload a PDF file."
        );
      }

      const { buffer, originalname, mimetype } = req.file;
      const folder = req.body.folder || "uploads/documents/pdf";

      const result = await this.fileService.uploadPdfFile(
        buffer,
        originalname,
        mimetype,
        folder
      );

      ApiResponse.success(
        res,
        {
          fileUrl: result.fileUrl,
          fileName: result.fileName,
        },
        "PDF file uploaded successfully"
      );
    }
  );
}
