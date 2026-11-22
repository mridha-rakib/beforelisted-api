import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { errorHandler } from "../src/middlewares/error-handler.middleware.js";
import { MonthlyReport } from "../src/modules/monthly-report/monthly-report.model.js";
import { MonthlyReportRepository } from "../src/modules/monthly-report/monthly-report.repository.js";
import reportRouter from "../src/modules/monthly-report/monthly-report.route.js";
import { MonthlyReportService } from "../src/modules/monthly-report/monthly-report.service.js";

afterEach(() => vi.restoreAllMocks());

describe("latest public report", () => {
  it("queries only active records ordered by original creation date", async () => {
    const lean = vi.fn().mockResolvedValue([]);
    const sort = vi.fn().mockReturnValue({ lean });
    const find = vi.spyOn(MonthlyReport, "find").mockReturnValue({ sort } as never);
    await new MonthlyReportRepository().getActiveReportsByCreationDate();
    expect(find).toHaveBeenCalledWith({ isActive: true });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
  });
  it("selects the first usable link from creation-date ordered active reports", async () => {
    vi.spyOn(MonthlyReportRepository.prototype, "getActiveReportsByCreationDate").mockResolvedValue([
      { link: "javascript:alert(1)" },
      { link: "https://beforelisted.com/Market-Reports/new.pdf" },
      { link: "https://beforelisted.com/Market-Reports/old.pdf" },
    ] as never);
    expect(await new MonthlyReportService().getLatestReportLink()).toBe("https://beforelisted.com/Market-Reports/new.pdf");
  });
  it("updates the result when a newer record is added and returns 404 for no usable links", async () => {
    const reports = vi.spyOn(MonthlyReportRepository.prototype, "getActiveReportsByCreationDate");
    reports.mockResolvedValueOnce([{ link: "https://beforelisted.com/Market-Reports/old.pdf" }] as never)
      .mockResolvedValueOnce([{ link: "https://beforelisted.com/Market-Reports/new.pdf" }, { link: "https://beforelisted.com/Market-Reports/old.pdf" }] as never)
      .mockResolvedValueOnce([{ link: "http://example.invalid/report" }] as never);
    const app = express();
    app.use(reportRouter, errorHandler);
    const old = await request(app).get("/latest");
    const latest = await request(app).get("/latest");
    const missing = await request(app).get("/latest");
    expect(old.body.data.link).toBe("https://beforelisted.com/Market-Reports/old.pdf");
    expect(latest.body.data.link).toBe("https://beforelisted.com/Market-Reports/new.pdf");
    expect(latest.headers["cache-control"]).toBe("no-store");
    expect(missing.status).toBe(404);
  });
  it("requires authentication for report updates", async () => {
    const app = express();
    app.use(express.json(), reportRouter, errorHandler);
    expect((await request(app).put("/admin/507f1f77bcf86cd799439011").send({ link: "https://example.invalid" })).status).toBe(401);
  });
  it("preserves listing and historical lookups while edits do not reorder creation time", async () => {
    const older = { _id: "old", link: "https://beforelisted.com/Market-Reports/old.pdf", month: 12, year: 2025, isActive: true, createdAt: new Date("2025-12-01"), updatedAt: new Date("2026-05-01") };
    const newer = { _id: "new", link: "https://beforelisted.com/Market-Reports/new.pdf", month: 1, year: 2025, isActive: true, createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01") };
    const repository = MonthlyReportRepository.prototype;
    vi.spyOn(repository, "getActiveReportsByCreationDate").mockResolvedValue([newer, older] as never);
    vi.spyOn(repository, "getAllActiveReports").mockResolvedValue([older, newer] as never);
    vi.spyOn(repository, "getReportById").mockResolvedValue(older as never);
    const service = new MonthlyReportService();
    expect(await service.getLatestReportLink()).toBe(newer.link);
    expect((await service.getAllPublicReports()).map(report => report.link)).toEqual([older.link, newer.link]);
    expect((await service.getReportById("old")).link).toBe(older.link);
  });
  it.each([
    "http://beforelisted.com/Market-Reports/a.pdf",
    "https://www.beforelisted.com/Market-Reports/a.pdf",
    "https://beforelisted.com.evil.invalid/Market-Reports/a.pdf",
    "https://evil.invalid/Market-Reports/a.pdf",
    "https://user@beforelisted.com/Market-Reports/a.pdf",
    "https://beforelisted.com:8443/Market-Reports/a.pdf",
    "https://beforelisted.com/Market-Reports/../a.pdf",
    "https://beforelisted.com/Market-Reports/%2e%2e%2fa.pdf",
    "https://beforelisted.com/Market-Reports/%252e%252e.pdf",
    "https://beforelisted.com/Market-Reports/a%5cb.pdf",
    "https://beforelisted.com/Market-Reports/a.pdf?url=evil",
    "https://beforelisted.com/Market-Reports/a.pdf#x",
    "https://beforelisted.com/Market-Reports/a.html",
    "https://beforelisted.com/report/latest",
    "not a url",
  ])("rejects unapproved latest destination %s", async (link) => {
    vi.spyOn(MonthlyReportRepository.prototype, "getActiveReportsByCreationDate").mockResolvedValue([{ link }] as never);
    await expect(new MonthlyReportService().getLatestReportLink()).rejects.toThrow("No report available");
  });
});
