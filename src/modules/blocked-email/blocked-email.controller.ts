import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  createBlockedEmailSchema,
  listBlockedEmailSchema,
  unblockEmailSchema,
} from "./blocked-email.schema";
import { BlockedEmailService } from "./blocked-email.service";

export class BlockedEmailController {
  private readonly service = new BlockedEmailService();

  list = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(listBlockedEmailSchema, req);
    const blockedEmails = await this.service.list(validated.query.status);

    ApiResponse.success(res, blockedEmails, "Blocked emails retrieved");
  });

  block = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createBlockedEmailSchema, req);
    const blockedEmail = await this.service.block(
      validated.body,
      req.user!.userId,
      req.ip || req.socket.remoteAddress,
    );

    ApiResponse.created(res, blockedEmail, "Email blocked successfully");
  });

  unblock = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(unblockEmailSchema, req);
    const blockedEmail = await this.service.unblock(
      validated.params.id,
      req.user!.userId,
      req.ip || req.socket.remoteAddress,
    );

    ApiResponse.success(res, blockedEmail, "Email unblocked successfully");
  });
}
