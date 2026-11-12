import { describe, expect, it, vi } from "vitest";

import { GrantAccessService } from "../src/modules/grant-access/grant-access.service";
import {
  agentBulkMatchRequestSchema,
  agentMatchRequestSchema,
  requestAccessSchema,
} from "../src/modules/pre-market/pre-market.schema";
import { PreMarketService } from "../src/modules/pre-market/pre-market.service";
import { RENTER_BROKER_FEE_REQUIRED_MESSAGE } from "../src/utils/broker-fee.utils";

const requestId = "507f1f77bcf86cd799439011";
const fees = ["One Month Rent", "9% Annual Rent", "10% Annual Rent", "11% Annual Rent", "12% Annual Rent", "13% Annual Rent", "14% Annual Rent", "15% Annual Rent", "Talk to Renter First"];
const endpoints = [
  { name: "individual match", schema: agentMatchRequestSchema, params: { requestId }, body: {} },
  { name: "bulk match", schema: agentBulkMatchRequestSchema, params: undefined, body: { requestIds: [requestId] } },
  { name: "access request", schema: requestAccessSchema, params: undefined, body: { preMarketRequestId: requestId } },
];

describe.each(endpoints)("broker fee for $name", ({ schema, params, body }) => {
  it("rejects renter representation without a broker fee", () => {
    const result = schema.safeParse({ params, body: { ...body, representation_type: "renter_representation" } });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: ["body", "brokerFee"], message: RENTER_BROKER_FEE_REQUIRED_MESSAGE }),
    ]));
  });

  it.each(fees)("accepts renter representation with %s", (brokerFee) => {
    expect(schema.safeParse({ params, body: { ...body, representation_type: "renter_representation", brokerFee } }).success).toBe(true);
  });

  it("accepts owner representation without a broker fee", () => {
    expect(schema.safeParse({ params, body: { ...body, representation_type: "owner_representation" } }).success).toBe(true);
  });

  it("requires a fee when representation is omitted and defaults to renter", () => {
    expect(schema.safeParse({ params, body }).success).toBe(false);
  });

  it("rejects an empty or unsupported fee", () => {
    for (const brokerFee of ["", " ", "Unsupported fee"]) {
      expect(schema.safeParse({ params, body: { ...body, representation_type: "renter_representation", brokerFee } }).success).toBe(false);
    }
  });
});

it("does not bypass fee validation when the individual request body is absent", () => {
  expect(agentMatchRequestSchema.safeParse({ params: { requestId } }).success).toBe(false);
});

it("blocks direct renter matches before writing a match record", async () => {
  const service = Object.create(PreMarketService.prototype) as any;
  Object.assign(service, {
    agentRepository: { findByUserId: vi.fn().mockResolvedValue({ hasGrantAccess: true }) },
    preMarketRepository: { findByIdWithActivationStatus: vi.fn().mockResolvedValue({ scope: "Upcoming", isActive: true }) },
    grantAccessRepository: { findByAgentAndRequest: vi.fn().mockResolvedValue(null), create: vi.fn() },
    buildMatchCompatibilitySummary: vi.fn(),
    isRegisteredAgentForRequest: vi.fn().mockResolvedValue(false),
    ensureAgentCanViewRequest: vi.fn(),
    ensureAgentCanViewRequestVisibility: vi.fn(),
    ensureRegisteredAgentCanMatchRequest: vi.fn(),
  });
  await expect(service.matchRequestForAgent("agent-1", requestId, "renter_representation")).rejects.toThrow(RENTER_BROKER_FEE_REQUIRED_MESSAGE);
  expect(service.grantAccessRepository.create).not.toHaveBeenCalled();
});

it("blocks direct renter access requests before looking up or writing records", async () => {
  const service = Object.create(GrantAccessService.prototype) as any;
  service.preMarketRepository = { findByIdWithActivationStatus: vi.fn() };
  await expect(service.requestAccess("agent-1", requestId, "renter_representation")).rejects.toThrow(RENTER_BROKER_FEE_REQUIRED_MESSAGE);
  expect(service.preMarketRepository.findByIdWithActivationStatus).not.toHaveBeenCalled();
});
