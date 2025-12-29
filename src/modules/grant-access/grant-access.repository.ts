// file: src/modules/grant-access/grant-access.repository.ts

import { GRANT_ACCESS_CONFIG } from "@/config/pre-market.config";
import { BaseRepository } from "@/modules/base/base.repository";
import { Types, type FilterQuery } from "mongoose";
import {
  GrantAccessRequestModel,
  type IGrantAccessRequest,
} from "./grant-access.model";

type GrantAccessStatus = (typeof GRANT_ACCESS_CONFIG.STATUSES)[number];
type GrantAccessPaymentStatus =
  (typeof GRANT_ACCESS_CONFIG.PAYMENT_STATUSES)[number];

type PaymentDeletionHistory = {
  payment?: {
    isDeleted?: boolean;
    deletedAt?: Date | null;
    deletedBy?: Types.ObjectId | string | null;
  };
};

type PopulatedAgent = {
  _id: Types.ObjectId;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
};

type PopulatedPreMarketRequest = {
  _id: Types.ObjectId;
  requestId?: string;
  requestName?: string;
  description?: string;
  movingDateRange?: unknown;
  priceRange?: unknown;
  locations?: Array<{ borough?: string }>;
  bedrooms?: unknown;
  bathrooms?: unknown;
  unitFeatures?: unknown;
  buildingFeatures?: unknown;
  petPolicy?: unknown;
  guarantorRequired?: unknown;
  preferences?: unknown;
  status?: string;
  isActive?: boolean;
  createdAt?: Date;
  renterId?: Types.ObjectId | string;
};

type GrantAccessPaymentDoc = Omit<
  IGrantAccessRequest,
  "agentId" | "preMarketRequestId"
> & {
  agentId: Types.ObjectId | string | PopulatedAgent;
  preMarketRequestId: Types.ObjectId | string | PopulatedPreMarketRequest;
};

export class GrantAccessRepository extends BaseRepository<IGrantAccessRequest> {
  constructor() {
    super(GrantAccessRequestModel);
  }

  async create(
    data: Partial<IGrantAccessRequest>
  ): Promise<IGrantAccessRequest> {
    return this.model.create(data);
  }

  async findOne(
    filter: FilterQuery<IGrantAccessRequest> = {}
  ): Promise<IGrantAccessRequest | null> {
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
    return this.model
      .find({ agentId })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as unknown as Promise<IGrantAccessRequest[]>;
  }

  async findByAgentIdAndRequestIds(
    agentId: string,
    requestIds: Array<string | Types.ObjectId>
  ): Promise<IGrantAccessRequest[]> {
    if (!requestIds || requestIds.length === 0) {
      return [];
    }

    return this.model
      .find({
        agentId,
        preMarketRequestId: { $in: requestIds },
      })
      .lean()
      .exec() as unknown as Promise<IGrantAccessRequest[]>;
  }

  async findByPreMarketRequestId(
    preMarketRequestId: string | Types.ObjectId
  ): Promise<IGrantAccessRequest[]> {
    return this.model
      .find({ preMarketRequestId })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as unknown as Promise<IGrantAccessRequest[]>;
  }

  async findPending(): Promise<IGrantAccessRequest[]> {
    return this.model
      .find({ status: "pending" })
      .sort({ createdAt: 1 })
      .lean()
      .exec() as unknown as Promise<IGrantAccessRequest[]>;
  }

  async updateById(
    id: string,
    data: Partial<IGrantAccessRequest>
  ): Promise<IGrantAccessRequest | null> {
    return this.model
      .findByIdAndUpdate(id, data, { new: true })
      .lean() as Promise<IGrantAccessRequest | null>;
  }

  async updateStatus(id: string, status: GrantAccessStatus): Promise<void> {
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

  async countByStatus(status: string | GrantAccessStatus): Promise<number> {
    return this.model.countDocuments({ status });
  }

  async countByPaymentStatus(
    paymentStatus: string | GrantAccessPaymentStatus
  ): Promise<number> {
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
      agentId: string | Types.ObjectId;
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
    status: "pending" | "approved" | "free" | "rejected" | "paid"
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

  async findByAgentIdAndStatuses(
    agentId: string,
    statuses: Array<"pending" | "approved" | "free" | "rejected" | "paid">
  ): Promise<IGrantAccessRequest[]> {
    if (!statuses || statuses.length === 0) {
      return [];
    }

    return this.model
      .find({
        agentId,
        status: { $in: statuses },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as unknown as Promise<IGrantAccessRequest[]>;
  }

  async getAllWithPaymentInfo(filters?: {
    paymentStatus?: GrantAccessPaymentStatus;
    accessStatus?: GrantAccessStatus;
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

    const query: FilterQuery<IGrantAccessRequest> = {};

    if (filters?.paymentStatus) {
      query["payment.paymentStatus"] = filters.paymentStatus;
    }

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
      data: data as unknown as IGrantAccessRequest[],
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

    const stats = await this.model.aggregate<{
      _id: null;
      totalPaid: number;
      totalPending: number;
      totalFailed: number;
      totalRevenue: number;
      averagePayment: number;
    }>([
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

    const statusStats = await this.model.aggregate<{
      _id: GrantAccessPaymentStatus | null;
      count: number;
    }>([
      {
        $group: {
          _id: "$payment.paymentStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    const accessStatusStats = await this.model.aggregate<{
      _id: GrantAccessStatus | null;
      count: number;
    }>([
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

    const result = stats[0] || {
      totalPaid: 0,
      totalPending: 0,
      totalFailed: 0,
      totalRevenue: 0,
      averagePayment: 0,
    };

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

  async getPaymentDeletionHistory(
    paymentId: string
  ): Promise<PaymentDeletionHistory | null> {
    return (await this.model
      .findById(paymentId)
      .select("payment.isDeleted payment.deletedAt payment.deletedBy")
      .lean()
      .exec()) as unknown as Promise<PaymentDeletionHistory | null>;
  }

  async getMonthlyIncome(year?: number): Promise<any[]> {
    const startYear = year || new Date().getFullYear();
    const startDate = new Date(`${startYear}-01-01`);
    const endDate = new Date(`${startYear}-12-31T23:59:59`);

    const results = await this.model.aggregate([
      {
        $match: {
          "payment.paymentStatus": "succeeded",
          "payment.succeededAt": { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$payment.succeededAt" },
            month: { $month: "$payment.succeededAt" },
          },
          totalRevenue: { $sum: "$payment.amount" },
          paymentCount: { $sum: 1 },
          averagePayment: { $avg: "$payment.amount" },
        },
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 },
      },
    ]);

    return results.map((item: any) => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
      monthName: new Date(item._id.year, item._id.month - 1).toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
      ),
      totalRevenue: item.totalRevenue,
      paymentCount: item.paymentCount,
      averagePayment: Math.round(item.averagePayment * 100) / 100,
      currency: "USD",
    }));
  }

  async getMonthlyIncomeDetail(year: number, month: number): Promise<any> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const monthlyData = await this.model.aggregate([
      {
        $match: {
          "payment.paymentStatus": "succeeded",
          "payment.succeededAt": { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$payment.amount" },
          paymentCount: { $sum: 1 },
          averagePayment: { $avg: "$payment.amount" },
        },
      },
    ]);

    const dailyData = await this.model.aggregate([
      {
        $match: {
          "payment.paymentStatus": "succeeded",
          "payment.succeededAt": { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$payment.succeededAt" },
          },
          revenue: { $sum: "$payment.amount" },
          paymentCount: { $sum: 1 },
          agentCount: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const data = monthlyData[0] || {
      totalRevenue: 0,
      paymentCount: 0,
      averagePayment: 0,
    };

    return {
      month: `${year}-${String(month).padStart(2, "0")}`,
      monthName: new Date(year, month - 1).toLocaleDateString("en-US", {
        month: "long",
      }),
      totalRevenue: data.totalRevenue,
      paymentCount: data.paymentCount,
      averagePayment: Math.round(data.averagePayment * 100) / 100,
      currency: "USD",
      details: dailyData,
    };
  }

  /**
   * Get income for date range
   */
  async getIncomeByDateRange(startDate: Date, endDate: Date): Promise<any> {
    const results = await this.model.aggregate([
      {
        $match: {
          "payment.paymentStatus": "succeeded",
          "payment.succeededAt": { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$payment.succeededAt" },
            month: { $month: "$payment.succeededAt" },
          },
          totalRevenue: { $sum: "$payment.amount" },
          paymentCount: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    const totalRevenue = results.reduce(
      (sum: number, item: any) => sum + item.totalRevenue,
      0
    );

    return {
      startDate,
      endDate,
      totalRevenue,
      totalPayments: results.reduce(
        (sum: number, item: any) => sum + item.paymentCount,
        0
      ),
      monthCount: results.length,
      averagePerMonth:
        results.length > 0
          ? Math.round((totalRevenue / results.length) * 100) / 100
          : 0,
      months: results.map((item: any) => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
        monthName: new Date(
          item._id.year,
          item._id.month - 1
        ).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        totalRevenue: item.totalRevenue,
        paymentCount: item.paymentCount,
      })),
    };
  }

  /**
   * Get yearly income breakdown
   */
  async getYearlyIncome(year: number): Promise<any> {
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31T23:59:59`);

    const yearlyData = await this.model.aggregate([
      {
        $match: {
          "payment.paymentStatus": "succeeded",
          "payment.succeededAt": { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$payment.amount" },
          paymentCount: { $sum: 1 },
        },
      },
    ]);

    const monthlyData = await this.getMonthlyIncome(year);

    const data = yearlyData[0] || { totalRevenue: 0, paymentCount: 0 };

    return {
      year,
      totalRevenue: data.totalRevenue,
      totalPayments: data.paymentCount,
      monthlyBreakdown: monthlyData,
    };
  }

  async getPaymentDetailsById(paymentId: string): Promise<any> {
    try {
      const payment = (await this.model
        .findById(paymentId)
        .populate({
          path: "preMarketRequestId",
          select:
            "requestId requestName description movingDateRange priceRange locations bedrooms bathrooms unitFeatures buildingFeatures petPolicy guarantorRequired preferences status isActive createdAt renterId",
        })
        .populate({
          path: "agentId",
          select: "fullName email phoneNumber",
        })
        .lean()
        .exec()) as GrantAccessPaymentDoc | null;

      if (!payment) {
        return null;
      }

      const AgentProfileRepository =
        require("../agent/agent.repository").AgentProfileRepository;
      const agentProfileRepo = new AgentProfileRepository();

      const RenterRepository =
        require("../renter/renter.repository").RenterRepository;
      const renterRepo = new RenterRepository();

      const UserRepository = require("../user/user.repository").UserRepository;
      const userRepo = new UserRepository();

      const resolveObjectId = (value: unknown): string | null => {
        if (!value) return null;
        if (typeof value === "string") return value;
        if (value instanceof Types.ObjectId) return value.toString();
        if (typeof value === "object" && "_id" in value) {
          const id = (value as { _id?: Types.ObjectId | string })._id;
          return id ? id.toString() : null;
        }
        return null;
      };

      const isPopulatedAgent = (
        value: GrantAccessPaymentDoc["agentId"]
      ): value is PopulatedAgent =>
        typeof value === "object" && value !== null && "_id" in value;

      const isPopulatedRequest = (
        value: GrantAccessPaymentDoc["preMarketRequestId"]
      ): value is PopulatedPreMarketRequest =>
        typeof value === "object" && value !== null && "_id" in value;

      const agentUserId = resolveObjectId(payment.agentId);
      const agentInfo = isPopulatedAgent(payment.agentId)
        ? payment.agentId
        : null;
      const agentProfile = agentUserId
        ? await agentProfileRepo.findByUserId(agentUserId)
        : null;

      const preMarketRequest = isPopulatedRequest(payment.preMarketRequestId)
        ? payment.preMarketRequestId
        : null;

      let renterInfo = null;

      if (preMarketRequest) {
        const renterId = resolveObjectId(preMarketRequest.renterId);
        if (renterId) {
          const renter = await renterRepo.findRenterWithReferrer(renterId);

          if (renter) {
            let referrerInfo = null;

            if (renter.referredByAgentId) {
              const referrerId = resolveObjectId(renter.referredByAgentId);
              const referrer = referrerId
                ? await userRepo.findById(referrerId)
                : null;
              if (referrer) {
                referrerInfo = {
                  referrerId: referrer._id?.toString(),
                  referrerName: referrer.fullName,
                  referrerRole: "Agent",
                  referralType: "agent_referral",
                };
              }
            } else if (renter.referredByAdminId) {
              const referrer = await userRepo.findById(
                renter.referredByAdminId._id || renter.referredByAdminId
              );
              if (referrer) {
                referrerInfo = {
                  referrerId: referrer._id?.toString(),
                  referrerName: referrer.fullName,
                  referrerRole: "Admin",
                  referralType: "admin_referral",
                };
              }
            }

            renterInfo = {
              renterId: renter._id?.toString(),
              userId: renter.userId?.toString(),
              name: renter.fullName,
              email: renter.email,
              phone: renter.phoneNumber,
              registrationType: renter.registrationType,
              referrer: referrerInfo,
              accountStatus: renter.accountStatus,
            };
          }
        }
      }

      return {
        id: payment._id.toString(),
        paymentId: payment._id.toString(),
        status: payment.status,
        payment: {
          amount: payment.payment?.amount || 0,
          currency: payment.payment?.currency || "USD",
          paymentStatus: payment.payment?.paymentStatus || "pending",
          stripePaymentIntentId: payment.payment?.stripePaymentIntentId || null,
          failureCount: payment.payment?.failureCount || 0,
          failedAt: payment.payment?.failedAt || [],
          succeededAt: payment.payment?.succeededAt || null,
        },
        adminDecision: payment.adminDecision
          ? {
              decidedBy: payment.adminDecision.decidedBy?.toString(),
              decidedAt: payment.adminDecision.decidedAt,
              chargeAmount: payment.adminDecision.chargeAmount,
              isFree: payment.adminDecision.isFree,
              notes: payment.adminDecision.notes,
            }
          : null,

        preMarketRequest: preMarketRequest
          ? {
              id: preMarketRequest._id?.toString(),
              requestId: preMarketRequest.requestId,
              requestName: preMarketRequest.requestName,
              description: preMarketRequest.description,
              movingDateRange: preMarketRequest.movingDateRange,
              priceRange: preMarketRequest.priceRange,
              locations: preMarketRequest.locations,
              bedrooms: preMarketRequest.bedrooms,
              bathrooms: preMarketRequest.bathrooms,
              unitFeatures: preMarketRequest.unitFeatures,
              buildingFeatures: preMarketRequest.buildingFeatures,
              petPolicy: preMarketRequest.petPolicy,
              guarantorRequired: preMarketRequest.guarantorRequired,
              preferences: preMarketRequest.preferences,
              status: preMarketRequest.status,
              isActive: preMarketRequest.isActive,
              createdAt: preMarketRequest.createdAt,
            }
          : null,

        agent: {
          userId: agentUserId || "",
          name: agentInfo?.fullName || "Agent",
          email: agentInfo?.email || "",
          phone: agentInfo?.phoneNumber || "",
          brokerageName: agentProfile?.brokerageName || null,
          licenseNumber: agentProfile?.licenseNumber || null,
          yearsOfExperience: agentProfile?.yearsOfExperience || null,
          hasGrantAccess: agentProfile?.hasGrantAccess || false,
          accountStatus: agentProfile?.accountStatus || "pending",
          role: "Agent",
        },
        renter: renterInfo,

        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      };
    } catch (error) {
      throw error;
    }
  }
}
