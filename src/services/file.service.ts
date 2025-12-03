// file: src/services/file.service.ts
// ✅ File Service for profile images and document uploads

import { logger } from "@/middlewares/pino-logger";
import { UserRepository } from "@/modules/user/user.repository";
import { BadRequestException } from "@/utils/app-error.utils";
import { randomBytes } from "crypto";
import { extname } from "path";
import { S3Service } from "./s3.service";

/**
 * File Service
 * Handles file uploads to S3 and database updates
 * Supports profile images, Excel files, and PDFs
 */
export class FileService {
  private s3Service: S3Service;
  private userRepository: UserRepository;

  // File type and size constraints
  private ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  private MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

  private ALLOWED_EXCEL_TYPES = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  private MAX_EXCEL_SIZE = 10 * 1024 * 1024; // 10MB

  private ALLOWED_PDF_TYPES = ["application/pdf"];
  private MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB

  constructor() {
    this.s3Service = new S3Service();
    this.userRepository = new UserRepository();
  }

  /**
   * Upload profile image for user (Admin, Agent, or Renter)
   * @param userId - User ID
   * @param fileBuffer - Image file buffer
   * @param originalFileName - Original file name
   * @param mimeType - MIME type
   * @returns { url, fileName }
   */
  async uploadProfileImage(
    userId: string,
    fileBuffer: Buffer,
    originalFileName: string,
    mimeType: string
  ): Promise<{ profileImageUrl: string; fileName: string }> {
    try {
      // Validate file type
      if (!this.ALLOWED_IMAGE_TYPES.includes(mimeType)) {
        throw new BadRequestException(
          "Invalid file type. Only JPEG, PNG, and WebP formats are allowed"
        );
      }

      // Validate file size
      if (fileBuffer.length > this.MAX_IMAGE_SIZE) {
        throw new BadRequestException(
          `File size must not exceed ${this.MAX_IMAGE_SIZE / 1024 / 1024}MB`
        );
      }

      // Get file extension
      const extension = extname(originalFileName).toLowerCase();

      // Generate unique filename with user ID and random hash
      const uniqueFileName = `${userId}_${randomBytes(8).toString("hex")}${extension}`;

      logger.info(
        { userId, fileName: uniqueFileName },
        "Starting profile image upload"
      );

      // Upload to S3 - returns { url, key }
      const { url: profileImageUrl, key: imageKey } =
        await this.s3Service.uploadFile(
          fileBuffer,
          uniqueFileName,
          mimeType,
          `uploads/profiles/${userId}`
        );

      // Delete old profile image if exists
      try {
        const user = await this.userRepository.findById(userId);

        if (user?.profileImageUrl) {
          logger.info(
            { userId, oldImageUrl: user.profileImageUrl },
            "Deleting old profile image"
          );

          // Extract key from URL
          const oldImageKey = `uploads/profiles/${userId}/${user.profileImageUrl.split("/").pop()}`;

          try {
            await this.s3Service.deleteFile(oldImageKey);
            logger.info({ userId }, "Old profile image deleted successfully");
          } catch (deleteError) {
            logger.warn(
              { userId, error: deleteError },
              "Failed to delete old profile image - continuing anyway"
            );
          }
        }
      } catch (error) {
        logger.warn(
          { userId, error },
          "Failed to retrieve user for old image cleanup"
        );
      }

      // Update user with new profile image URL
      await this.userRepository.updateById(userId, {
        profileImageUrl,
      });

      logger.info(
        { userId, fileName: uniqueFileName },
        "Profile image uploaded successfully"
      );

      return {
        profileImageUrl,
        fileName: uniqueFileName,
      };
    } catch (error) {
      logger.error({ userId, error }, "Profile image upload failed");
      throw error;
    }
  }

  /**
   * Delete profile image for user
   * @param userId - User ID
   */
  async deleteProfileImage(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);

      if (!user?.profileImageUrl) {
        throw new BadRequestException("No profile image found for this user");
      }

      logger.info(
        { userId, imageUrl: user.profileImageUrl },
        "Starting profile image deletion"
      );

      // Extract key from URL
      const imageKey = `uploads/profiles/${userId}/${user.profileImageUrl.split("/").pop()}`;

      // Delete from S3
      await this.s3Service.deleteFile(imageKey);

      // Update user to remove profile image reference
      await this.userRepository.updateById(userId, {
        profileImageUrl: null,
      });

      logger.info({ userId }, "Profile image deleted successfully");
    } catch (error) {
      logger.error({ userId, error }, "Profile image deletion failed");
      throw error;
    }
  }

  /**
   * Upload Excel file (for future use)
   * @param fileBuffer - Excel file buffer
   * @param originalFileName - Original file name
   * @param mimeType - MIME type
   * @param folder - Folder path in S3
   * @returns { url, fileName }
   */
  async uploadExcelFile(
    fileBuffer: Buffer,
    originalFileName: string,
    mimeType: string,
    folder: string = "uploads/documents/excel"
  ): Promise<{ fileUrl: string; fileName: string }> {
    try {
      // Validate file type
      if (!this.ALLOWED_EXCEL_TYPES.includes(mimeType)) {
        throw new BadRequestException(
          "Invalid file type. Only Excel (.xlsx, .xls) files are allowed"
        );
      }

      // Validate file size
      if (fileBuffer.length > this.MAX_EXCEL_SIZE) {
        throw new BadRequestException(
          `File size must not exceed ${this.MAX_EXCEL_SIZE / 1024 / 1024}MB`
        );
      }

      const extension = extname(originalFileName).toLowerCase();
      const uniqueFileName = `${Date.now()}_${randomBytes(4).toString("hex")}${extension}`;

      logger.info(
        { fileName: uniqueFileName, folder },
        "Starting Excel file upload"
      );

      const { url: fileUrl } = await this.s3Service.uploadFile(
        fileBuffer,
        uniqueFileName,
        mimeType,
        folder
      );

      logger.info(
        { fileName: uniqueFileName, folder },
        "Excel file uploaded successfully"
      );

      return { fileUrl, fileName: uniqueFileName };
    } catch (error) {
      logger.error(
        { fileName: originalFileName, error },
        "Excel file upload failed"
      );
      throw error;
    }
  }

  /**
   * Upload PDF file (for future use)
   * @param fileBuffer - PDF file buffer
   * @param originalFileName - Original file name
   * @param mimeType - MIME type
   * @param folder - Folder path in S3
   * @returns { url, fileName }
   */
  async uploadPdfFile(
    fileBuffer: Buffer,
    originalFileName: string,
    mimeType: string,
    folder: string = "uploads/documents/pdf"
  ): Promise<{ fileUrl: string; fileName: string }> {
    try {
      // Validate file type
      if (!this.ALLOWED_PDF_TYPES.includes(mimeType)) {
        throw new BadRequestException(
          "Invalid file type. Only PDF files are allowed"
        );
      }

      // Validate file size
      if (fileBuffer.length > this.MAX_PDF_SIZE) {
        throw new BadRequestException(
          `File size must not exceed ${this.MAX_PDF_SIZE / 1024 / 1024}MB`
        );
      }

      const extension = extname(originalFileName).toLowerCase();
      const uniqueFileName = `${Date.now()}_${randomBytes(4).toString("hex")}${extension}`;

      logger.info(
        { fileName: uniqueFileName, folder },
        "Starting PDF file upload"
      );

      const { url: fileUrl } = await this.s3Service.uploadFile(
        fileBuffer,
        uniqueFileName,
        mimeType,
        folder
      );

      logger.info(
        { fileName: uniqueFileName, folder },
        "PDF file uploaded successfully"
      );

      return { fileUrl, fileName: uniqueFileName };
    } catch (error) {
      logger.error(
        { fileName: originalFileName, error },
        "PDF file upload failed"
      );
      throw error;
    }
  }

  /**
   * Get signed URL for private file access
   * @param key - File key in S3
   * @param expiresIn - Expiration time in seconds
   * @returns Signed URL
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      return await this.s3Service.getSignedUrl(key, expiresIn);
    } catch (error) {
      logger.error({ key, error }, "Failed to generate signed URL");
      throw error;
    }
  }
}
