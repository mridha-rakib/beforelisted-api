// file: src/modules/grant-access/grant-access.repository.ts

import { BaseRepository } from "@/modules/base/base.repository";
import { Types } from "mongoose";
import {
  GrantAccessRequestModel,
  type IGrantAccessRequest,
} from "./grant-access.model";

export class GrantAccessRepository extends BaseRepository<IGrantAccessRequest> {
  constructor() {
    super(GrantAccessRequestModel);
  }

  // CREATE
  async create(
    data: Partial<IGrantAccessRequest>
  ): Promise<IGrantAccessRequest> {
    return this.model.create(data);
  }

  // Read
  async findOne(filter: any): Promise<IGrantAccessRequest | null> {
    return this.model
      .findOne(filter)
      .lean() as Promise<IGrantAccessRequest | null>;
  }

  async findByAgentAndRequest(
    agentId: string,
    preMarketRequestId: string
  ): Promise<IGrantAccessRequest | null> {
    return this.model
      .findOne({
        agentId,
        preMarketRequestId,
      })
      .lean() as Promise<IGrantAccessRequest | null>;
  }

  async findByAgentId(agentId: string): Promise<IGrantAccessRequest[]> {
    return this.model.find({ agentId }).sort({ createdAt: -1 }).lean() as any;
  }

  async findByPreMarketRequestId(
    preMarketRequestId: string | Types.ObjectId
  ): Promise<IGrantAccessRequest[]> {
    return this.model
      .find({ preMarketRequestId })
      .sort({ createdAt: -1 })
      .lean() as any;
  }

  async findPending(): Promise<IGrantAccessRequest[]> {
    return this.model
      .find({ status: "pending" })
      .sort({ createdAt: 1 })
      .lean() as any;
  }

  // ============================================
  // UPDATE
  // ============================================

  async updateById(
    id: string,
    data: Partial<IGrantAccessRequest>
  ): Promise<IGrantAccessRequest | null> {
    return this.model
      .findByIdAndUpdate(id, data, { new: true })
      .lean() as Promise<IGrantAccessRequest | null>;
  }

  async updateStatus(
    id: string,
    status: "pending" | "approved" | "rejected" | "paid"
  ): Promise<void> {
    await this.model.findByIdAndUpdate(id, { status });
  }

  async recordPaymentFailure(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, {
      $inc: { "payment.failureCount": 1 },
      $push: { "payment.failedAt": new Date() },
      "payment.paymentStatus": "failed",
    });
  }

  async recordPaymentSuccess(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, {
      "payment.paymentStatus": "succeeded",
      "payment.succeededAt": new Date(),
      status: "paid",
    });
  }

  // ============================================
  // STATISTICS
  // ============================================

  async countByStatus(status: string): Promise<number> {
    return this.model.countDocuments({ status });
  }

  async countByPaymentStatus(paymentStatus: string): Promise<number> {
    return this.model.countDocuments({
      "payment.paymentStatus": paymentStatus,
    });
  }

  async getTotalRevenue(): Promise<number> {
    const result = await this.model.aggregate([
      { $match: { "payment.paymentStatus": "succeeded" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$payment.amount" },
        },
      },
    ]);

    return result[0]?.total || 0;
  }

  async getFailureStats(): Promise<
    {
      agentId: string;
      failureCount: number;
    }[]
  > {
    return this.model.aggregate([
      {
        $match: {
          "payment.failureCount": { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$agentId",
          failureCount: { $max: "$payment.failureCount" },
        },
      },
      {
        $project: {
          agentId: "$_id",
          failureCount: 1,
          _id: 0,
        },
      },
    ]);
  }

  async findByAgentIdAndStatus(
    agentId: string,
    status: "pending" | "approved" | "rejected" | "paid"
  ): Promise<IGrantAccessRequest[]> {
    return this.model
      .find({
        agentId,
        status,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as unknown as Promise<IGrantAccessRequest[]>;
  }
}
