import { env } from "@/env";
import { S3Client } from "@aws-sdk/client-s3";
import { Request } from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/gif",
  "image/webp",
];

export const userImageUpload = multer({
  fileFilter: (req: Request, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, JPEG, PNG, GIF and WebP allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
  storage: multerS3({
    s3: s3 as any,
    bucket: env.AWS_PROFILE_IMAGES_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req: Request, file, cb) => {
      const userId = req.user?.userId || uuidv4();
      const ext = file.mimetype.split("/")[1];
      cb(null, `profile-images/${userId}-${Date.now()}.${ext}`);
    },
  }),
});

// import multer from "multer";

// const storage = multer.memoryStorage(); // keeps files in memory before uploading to S3

// export const upload = multer({ storage });
