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

  async getAllWithPaymentInfo(filters?: {
    paymentStatus?: "pending" | "succeeded" | "failed";
    accessStatus?: "pending" | "approved" | "rejected" | "paid";
    page?: number;
    limit?: number;
  }): Promise<{
    data: IGrantAccessRequest[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const query: any = {};

    // Filter by payment status
    if (filters?.paymentStatus) {
      query["payment.paymentStatus"] = filters.paymentStatus;
    }

    // Filter by access status
    if (filters?.accessStatus) {
      query.status = filters.accessStatus;
    }

    const total = await this.model.countDocuments(query);

    const data = await this.model
      .find(query)
      .populate("agentId", "fullName email phoneNumber")
      .populate("preMarketRequestId", "requestId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    return {
      data: data as IGrantAccessRequest[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentStats(): Promise<{
    totalRequests: number;
    totalPaid: number;
    totalPending: number;
    totalFailed: number;
    totalRevenue: number;
    averagePayment: number;
    paymentsByStatus: Record<string, number>;
    paymentsByAccessStatus: Record<string, number>;
  }> {
    const totalRequests = await this.model.countDocuments();

    const stats = await this.model.aggregate([
      {
        $group: {
          _id: null,
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ["$payment.paymentStatus", "succeeded"] }, 1, 0],
            },
          },
          totalPending: {
            $sum: {
              $cond: [{ $eq: ["$payment.paymentStatus", "pending"] }, 1, 0],
            },
          },
          totalFailed: {
            $sum: {
              $cond: [{ $eq: ["$payment.paymentStatus", "failed"] }, 1, 0],
            },
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$payment.paymentStatus", "succeeded"] },
                "$payment.amount",
                0,
              ],
            },
          },
          averagePayment: {
            $avg: {
              $cond: [
                { $eq: ["$payment.paymentStatus", "succeeded"] },
                "$payment.amount",
                0,
              ],
            },
          },
        },
      },
    ]);

    const statusStats = await this.model.aggregate([
      {
        $group: {
          _id: "$payment.paymentStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    const accessStatusStats = await this.model.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const paymentsByStatus: Record<string, number> = {};
    statusStats.forEach((stat) => {
      paymentsByStatus[stat._id || "unknown"] = stat.count;
    });

    const paymentsByAccessStatus: Record<string, number> = {};
    accessStatusStats.forEach((stat) => {
      paymentsByAccessStatus[stat._id || "unknown"] = stat.count;
    });

    const result = stats || {};

    return {
      totalRequests,
      totalPaid: result.totalPaid || 0,
      totalPending: result.totalPending || 0,
      totalFailed: result.totalFailed || 0,
      totalRevenue: result.totalRevenue || 0,
      averagePayment: result.averagePayment || 0,
      paymentsByStatus,
      paymentsByAccessStatus,
    };
  }

  async deletePayment(paymentId: string): Promise<IGrantAccessRequest | null> {
    const deleted = await this.model.findByIdAndDelete(paymentId).lean().exec();
    return deleted as IGrantAccessRequest | null;
  }

  async deleteMultiplePayments(paymentIds: string[]): Promise<number> {
    const result = await this.model.deleteMany({ _id: { $in: paymentIds } });
    return result.deletedCount || 0;
  }

  async softDeletePayment(
    paymentId: string,
    deletedBy: string,
    reason?: string
  ): Promise<IGrantAccessRequest | null> {
    const updated = await this.model
      .findByIdAndUpdate(
        paymentId,
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy,
            deleteReason: reason || "No reason provided",
            updatedAt: new Date(),
          },
        },
        { new: true }
      )
      .lean()
      .exec();
    return updated as IGrantAccessRequest | null;
  }

  async restorePayment(paymentId: string): Promise<IGrantAccessRequest | null> {
    const restored = await this.model
      .findByIdAndUpdate(
        paymentId,
        {
          $set: {
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
            deleteReason: null,
            updatedAt: new Date(),
          },
        },
        { new: true }
      )
      .lean()
      .exec();
    return restored as IGrantAccessRequest | null;
  }

  async getPaymentDeletionHistory(paymentId: string): Promise<any> {
    return await this.model
      .findById(paymentId)
      .select("isDeleted deletedAt deletedBy deleteReason")
      .lean()
      .exec();
  }
}
