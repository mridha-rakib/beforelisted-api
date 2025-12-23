// src/services/excel.service.ts

import { logger } from "@/middlewares/pino-logger";
import { AgentProfileRepository } from "@/modules/agent/agent.repository";
import { PreMarketRepository } from "@/modules/pre-market/pre-market.repository";
import { RenterRepository } from "@/modules/renter/renter.repository";
import ExcelJS from "exceljs";
import { S3Service } from "./s3.service";

export class ExcelService {
  private s3Service: S3Service;
  private preMarketRepository: PreMarketRepository;
  private agentRepository: AgentProfileRepository;
  private renterRepository: RenterRepository;

  constructor() {
    this.s3Service = new S3Service();
    this.preMarketRepository = new PreMarketRepository();
    this.agentRepository = new AgentProfileRepository();
    this.renterRepository = new RenterRepository();
  }

  /**
   * Generate single Excel file with ALL pre-market requests
   */
  async generateConsolidatedPreMarketExcel(): Promise<Buffer> {
    try {
      logger.info("Starting consolidated Excel generation");

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("All Requests", {
        pageSetup: {
          paperSize: 9,
          orientation: "landscape",
        },
      });

      const headers = [
        "Request ID",
        "Renter Name",
        "Email",
        "Phone",
        "Move Date (From)",
        "Move Date (To)",
        "Price Min",
        "Price Max",
        "Borough",
        "Neighborhoods",
        "Bedrooms",
        "Bathrooms",
        "Unit Features",
        "Building Features",
        "Pet Policy",
        "Guarantor Required",
        "Preferences",
        "Status",
        "Created Date",
      ];

      // Add header row with styling
      const headerRow = worksheet.addRow(headers);

      headerRow.font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
        size: 11,
      };

      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF208094" },
      };

      headerRow.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };

      // Freeze header row
      worksheet.views = [
        {
          state: "frozen",
          ySplit: 1,
          activeCell: "A2",
          showGridLines: true,
        },
      ];

      // Fetch ALL active requests from database
      const requests = await this.preMarketRepository.findAll();

      logger.info(
        { totalRequests: requests.length },
        "Fetched requests for Excel"
      );

      // Add data rows
      let rowCount = 1;
      for (const request of requests) {
        const dataRow = worksheet.addRow([
          request.requestId || "N/A",
          this.getRenterName(request),
          this.getRenterEmail(request),
          this.getRenterPhone(request),
          this.formatDate(request.movingDateRange?.earliest),
          this.formatDate(request.movingDateRange?.latest),
          request.priceRange?.min || 0,
          request.priceRange?.max || 0,
          this.getBorough(request),
          this.getNeighborhoods(request),
          request.bedrooms || "N/A",
          request.bathrooms || "N/A",
          this.serializeObject(request.unitFeatures),
          this.serializeObject(request.buildingFeatures),
          request.petPolicy || "N/A",
          request.guarantorRequired ? "Yes" : "No",
          request.preferences || "N/A",
          request.status || "unknown",
          this.formatDate(request.createdAt),
        ]);

        // Alternate row colors
        if (rowCount % 2 === 0) {
          dataRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF5F5F5" },
          };
        }

        // Center align status and dates
        dataRow.getCell(18).alignment = { horizontal: "center" };
        dataRow.getCell(19).alignment = { horizontal: "center" };

        rowCount++;
      }

      // Set column widths
      const columnWidths = [
        18, // Request ID
        15, // Renter Name
        20, // Email
        15, // Phone
        15, // Move From
        15, // Move To
        12, // Price Min
        12, // Price Max
        15, // Borough
        25, // Neighborhoods
        10, // Bedrooms
        10, // Bathrooms
        20, // Unit Features
        20, // Building Features
        12, // Pet Policy
        15, // Guarantor
        20, // Preferences
        12, // Status
        15, // Created Date
      ];

      worksheet.columns = columnWidths.map((width) => ({
        width,
      }));

      // FIX #1: Check if requests exist before setting autoFilter
      // Check worksheet properties exist
      if (requests.length > 0 && worksheet.autoFilter) {
        worksheet.autoFilter.from = "A1";
        worksheet.autoFilter.to = `S${requests.length + 1}`;
      }

      // FIX #2: Proper Buffer conversion - assert type as unknown first
      const buffer = await workbook.xlsx.writeBuffer();
      const typedBuffer = buffer as unknown as Buffer;

      logger.info(
        { size: typedBuffer.length, rows: requests.length },
        "Excel buffer generated successfully"
      );

      return typedBuffer;
    } catch (error) {
      logger.error({ error }, "Failed to generate consolidated Excel");
      throw error;
    }
  }

  /**
   * Generate Excel with multiple sheets organized by month
   * Better for large datasets
   */
  async generateConsolidatedPreMarketExcelByMonth(): Promise<Buffer> {
    try {
      logger.info("Starting monthly consolidated Excel generation");

      const workbook = new ExcelJS.Workbook();

      const requests = await this.preMarketRepository.findAll();

      // Group requests by month
      const requestsByMonth = this.groupByMonth(requests);

      // Create sheet for each month
      for (const [monthKey, monthRequests] of requestsByMonth) {
        const worksheet = workbook.addWorksheet(monthKey, {
          pageSetup: { paperSize: 9, orientation: "landscape" },
        });

        // Add headers
        const headers = [
          "Request ID",
          "Renter Name",
          "Email",
          "Phone",
          "Move Date (From)",
          "Move Date (To)",
          "Price Min",
          "Price Max",
          "Borough",
          "Neighborhoods",
          "Bedrooms",
          "Bathrooms",
          "Unit Features",
          "Building Features",
          "Pet Policy",
          "Guarantor Required",
          "Preferences",
          "Status",
          "Created Date",
        ];

        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF208094" },
        };

        // Add requests for this month
        for (const request of monthRequests) {
          worksheet.addRow([
            request.requestId || "N/A",
            this.getRenterName(request),
            this.getRenterEmail(request),
            this.getRenterPhone(request),
            this.formatDate(request.movingDateRange?.earliest),
            this.formatDate(request.movingDateRange?.latest),
            request.priceRange?.min || 0,
            request.priceRange?.max || 0,
            this.getBorough(request),
            this.getNeighborhoods(request),
            request.bedrooms || "N/A",
            request.bathrooms || "N/A",
            this.serializeObject(request.unitFeatures),
            this.serializeObject(request.buildingFeatures),
            request.petPolicy || "N/A",
            request.guarantorRequired ? "Yes" : "No",
            request.preferences || "N/A",
            request.status || "unknown",
            this.formatDate(request.createdAt),
          ]);
        }

        // Set column widths
        worksheet.columns = [
          18, 15, 20, 15, 15, 15, 12, 12, 15, 25, 10, 10, 20, 20, 12, 15, 20,
          12, 15,
        ].map((width) => ({ width }));
      }

      // Add summary sheet
      const summarySheet = workbook.addWorksheet("Summary");
      summarySheet.addRow(["Summary Statistics"]);
      summarySheet.addRow(["Total Requests", requests.length]);
      summarySheet.addRow(["Requests by Month"]);

      let row = 4;
      for (const [monthKey, monthRequests] of requestsByMonth) {
        summarySheet.addRow([monthKey, monthRequests.length]);
        row++;
      }

      // FIX #2: Proper Buffer conversion
      const buffer = await workbook.xlsx.writeBuffer();
      const typedBuffer = buffer as unknown as Buffer;

      logger.info({ size: typedBuffer.length }, "Monthly Excel generated");
      return typedBuffer;
    } catch (error) {
      logger.error({ error }, "Failed to generate monthly Excel");
      throw error;
    }
  }

  /**
   * Upload consolidated Excel to S3
   */
  async uploadConsolidatedExcel(
    buffer: Buffer
  ): Promise<{ url: string; fileName: string }> {
    try {
      // Generate filename with date
      const date = new Date();
      const dateStr = date.toISOString().split("T")[0];
      const timestamp = Math.floor(date.getTime() / 1000);
      const fileName = `pre_market_requests_${dateStr}_${timestamp}.xlsx`;
      const folder = "uploads/pre-market/excel/master";

      logger.info({ fileName, folder }, "Uploading consolidated Excel to S3");

      const url = await this.s3Service.uploadFile(
        buffer,
        fileName,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        folder
      );

      logger.info(
        { url, fileName },
        "Consolidated Excel uploaded successfully"
      );

      return { url, fileName } as any;
    } catch (error) {
      logger.error({ error }, "Failed to upload Excel to S3");
      throw error;
    }
  }

  private getRenterName(request: any): string {
    // Check renterInfo from aggregation $lookup
    if (request.renterInfo?.fullName) {
      return request.renterInfo.fullName;
    }
    // Check if renterId is a populated Renter document
    if (
      request.renterId &&
      typeof request.renterId === "object" &&
      request.renterId.fullName
    ) {
      return request.renterId.fullName;
    }
    // Fallback to legacy fields
    if (request.renterName) return request.renterName;
    return "N/A";
  }

  private getRenterEmail(request: any): string {
    // Check renterInfo from aggregation $lookup
    if (request.renterInfo?.email) {
      return request.renterInfo.email;
    }
    // Check if renterId is a populated Renter document
    if (
      request.renterId &&
      typeof request.renterId === "object" &&
      request.renterId.email
    ) {
      return request.renterId.email;
    }
    // Fallback to legacy fields
    if (request.renterEmail) return request.renterEmail;
    return "N/A";
  }

  private getRenterPhone(request: any): string {
    if (request.renterInfo?.phoneNumber) {
      return request.renterInfo.phoneNumber;
    }

    if (
      request.renterId &&
      typeof request.renterId === "object" &&
      request.renterId.phoneNumber
    ) {
      return request.renterId.phoneNumber;
    }

    if (request.renterPhone) return request.renterPhone;
    return "N/A";
  }

  private getBorough(request: any): string {
    if (!request.locations) return "N/A";
    if (Array.isArray(request.locations)) {
      const boroughs = request.locations
        .map((loc: any) => loc.borough)
        .filter(Boolean);
      return boroughs.length > 0 ? boroughs.join(", ") : "N/A";
    }
    // Fallback for single object structure
    return request.locations.borough || "N/A";
  }

  private getNeighborhoods(request: any): string {
    if (!request.locations) return "N/A";

    if (Array.isArray(request.locations)) {
      const allNeighborhoods: string[] = [];
      for (const loc of request.locations) {
        if (loc.neighborhoods && Array.isArray(loc.neighborhoods)) {
          allNeighborhoods.push(...loc.neighborhoods);
        }
      }
      return allNeighborhoods.length > 0 ? allNeighborhoods.join(", ") : "N/A";
    }
    return request.locations.neighborhoods?.join(", ") || "N/A";
  }

  async generateConsolidatedRenterExcel(): Promise<Buffer> {
    try {
      logger.info("Starting consolidated Renter Excel generation");

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("All Renters", {
        pageSetup: {
          paperSize: 9,
          orientation: "landscape",
        },
      });

      // Define headers
      const headers = [
        "Full Name",
        "Email",
        "Phone",
        "Registration Type",
        "Registered Date",
        "Account Status",
      ];

      const headerRow = worksheet.addRow(headers);
      headerRow.font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
        size: 11,
      };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF208094" },
      };
      headerRow.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };

      // Freeze header row
      worksheet.views = [
        {
          state: "frozen",
          ySplit: 1,
          activeCell: "A2",
          showGridLines: true,
        },
      ];

      const renters = await this.renterRepository.findAll();

      logger.info(
        { totalRenters: renters.length },
        "Fetched renters for Excel"
      );

      let rowCount = 1;
      for (const renter of renters) {
        const dataRow = worksheet.addRow([
          renter.fullName || "N/A",
          renter.email || "N/A",
          renter.phoneNumber || "N/A",
          this.formatRegistrationType(renter.registrationType),
          this.formatDate(renter.createdAt),
          renter.accountStatus || "N/A",
        ]);

        // Alternate row colors
        if (rowCount % 2 === 0) {
          dataRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF5F5F5" },
          };
        }

        rowCount++;
      }

      // Set column widths
      const columnWidths = [18, 20, 15, 18, 15, 15];

      worksheet.columns = columnWidths.map((width) => ({
        width,
      }));

      if (renters.length > 0 && worksheet.autoFilter) {
        worksheet.autoFilter.from = "A1";
        worksheet.autoFilter.to = `I${renters.length + 1}`;
      }

      // Convert to buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const typedBuffer = buffer as unknown as Buffer;

      logger.info(
        { size: typedBuffer.length, rows: renters.length },
        "Renter Excel buffer generated successfully"
      );

      return typedBuffer;
    } catch (error) {
      logger.error({ error }, "Failed to generate Renter Excel");
      throw error;
    }
  }

  async uploadConsolidatedRenterExcel(
    buffer: Buffer
  ): Promise<{ url: string; fileName: string }> {
    try {
      const date = new Date();
      const dateStr = date.toISOString().split("T")[0];
      const timestamp = Math.floor(date.getTime() / 1000);
      const fileName = `renters_${dateStr}_${timestamp}.xlsx`;
      const folder = "uploads/renters/excel/master";

      logger.info({ fileName, folder }, "Uploading Renter Excel to S3");

      const url = await this.s3Service.uploadFile(
        buffer,
        fileName,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        folder
      );

      logger.info({ url, fileName }, "Renter Excel uploaded successfully");

      return { url, fileName } as any;
    } catch (error) {
      logger.error({ error }, "Failed to upload Renter Excel to S3");
      throw error;
    }
  }

  async generateConsolidatedAgentExcel(): Promise<{
    buffer: Buffer;
    fileName: string;
  }> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("All Agents");

      worksheet.pageSetup = {
        paperSize: 9,
        orientation: "landscape",
      };

      // Headers: 9 columns
      const headers = [
        "Full Name",
        "Email",
        "Phone",
        "License Number",
        "Brokerage Name",
        "Referral Code",
        "Join Date",
        "Verification status",
        "Active Status",
        "Total Referrals",
      ];

      const headerRow = worksheet.addRow(headers);

      headerRow.font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
        size: 11,
      };

      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF208094" },
      };

      headerRow.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };

      worksheet.views = [
        {
          state: "frozen",
          ySplit: 1,
          activeCell: "A2",
          showGridLines: true,
        },
      ];

      // Fetch agents with user data from repository
      const agents = await this.agentRepository.findAll();

      logger.info({ agentCount: agents.length }, "Fetched agents for Excel");

      let rowCount = 1;

      for (const agent of agents) {
        // Extract user info from populated userId
        const userInfo = agent.userId as any;

        const dataRow = worksheet.addRow([
          userInfo?.fullName || "N/A",
          userInfo?.email || "N/A",
          userInfo?.phoneNumber || "N/A",
          agent.licenseNumber || "N/A",
          agent.brokerageName || "N/A",
          userInfo?.referralCode || "N/A",
          agent.createdAt
            ? new Date(agent.createdAt).toLocaleDateString()
            : "N/A",
          userInfo?.emailVerified ? "Verified" : "Not Verified",
          agent.isActive ? "Active" : "Inactive",
          agent.totalRentersReferred || 0,
        ]);

        // Alternating row colors
        if (rowCount % 2 === 0) {
          dataRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF5F5F5" },
          };
        }

        rowCount++;
      }

      worksheet.columns = [
        { width: 20 },
        { width: 28 },
        { width: 15 },
        { width: 18 },
        { width: 22 },
        { width: 15 },
        { width: 15 },
        { width: 12 },
        { width: 15 },
      ];

      if (agents.length > 0) {
        worksheet.autoFilter = {
          from: "A1",
          to: `I${agents.length + 1}`,
        };
      }

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const typedBuffer = buffer as unknown as Buffer;

      const date = new Date();
      const dateStr = date.toISOString().split("T")[0];
      const timestamp = Math.floor(date.getTime() / 1000);
      const fileName = `agents_${dateStr}_${timestamp}.xlsx`;

      logger.info(
        { fileName, agentCount: agents.length },
        "Generated agent Excel"
      );

      return { buffer: typedBuffer, fileName };
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        "Error generating agent Excel"
      );
      throw error;
    }
  }

  /**
   * ✅ Upload Agent Excel to S3
   */
  async uploadConsolidatedAgentExcel(
    buffer: Buffer
  ): Promise<{ url: string; fileName: string }> {
    try {
      const date = new Date();
      const dateStr = date.toISOString().split("T")[0];
      const timestamp = Math.floor(date.getTime() / 1000);
      const fileName = `agents_${dateStr}_${timestamp}.xlsx`;
      const folder = "uploads/agents/excel/master";

      logger.info({ fileName, folder }, "Uploading Agent Excel to S3");

      const url = await this.s3Service.uploadFile(
        buffer,
        fileName,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        folder
      );

      logger.info({ url, fileName }, "Agent Excel uploaded successfully");

      return { url, fileName } as any;
    } catch (error) {
      logger.error({ error }, "Failed to upload Agent Excel to S3");
      throw error;
    }
  }

  // ============================================
  // HELPER METHODS (Add to ExcelService)
  // ============================================

  /**
   * Format registration type for display
   */
  private formatRegistrationType(type: string): string {
    const types: Record<string, string> = {
      normal: "Direct Registration",
      agent_referral: "Agent Referral",
      admin_referral: "Admin Passwordless",
    };
    return types[type] || type;
  }

  /**
   * Helper: Format date for Excel
   */
  private formatDate(date: Date | undefined): string {
    if (!date) return "N/A";
    try {
      const d = new Date(date);
      return d.toISOString().split("T")[0];
    } catch {
      return "N/A";
    }
  }

  /**
   * Helper: Serialize objects to string
   */
  private serializeObject(obj: any): string {
    if (!obj) return "N/A";
    if (typeof obj === "string") return obj;
    if (typeof obj === "object") {
      if (Array.isArray(obj)) {
        return obj.join(", ");
      }
      return Object.values(obj).join(", ");
    }
    return String(obj);
  }

  /**
   * Helper: Group requests by month
   */
  private groupByMonth(requests: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();

    for (const request of requests) {
      const date = new Date(request.createdAt);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!grouped.has(monthKey)) {
        grouped.set(monthKey, []);
      }
      grouped.get(monthKey)!.push(request);
    }

    return new Map(
      [...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0]))
    );
  }

  async generatePreMarketListingsWithAgentsExcel(): Promise<Buffer> {
    try {
      logger.info("Starting Pre-Market Listings Excel generation with agents");

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("All Listings", {
        pageSetup: {
          paperSize: 9,
          orientation: "landscape",
        },
      });

      // Define headers
      const headers = [
        "Listing ID",
        "Request ID",
        "Request Name",
        "Renter Name",
        "Renter Email",
        "Renter Phone",
        "Price Min",
        "Price Max",
        "Bedrooms",
        "Bathrooms",
        "Locations",
        "Status",
        "Grant-Access Agents",
        "Free-Access Agents",
        "Paid-Access Agents",
        "Pending Requests",
        "Rejected Requests",
        "Total Access Count",
        "Created Date",
      ];

      // Add header row with styling
      const headerRow = worksheet.addRow(headers);
      headerRow.font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
        size: 11,
      };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF208094" },
      };
      headerRow.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };

      // Freeze header row
      worksheet.views = [
        {
          state: "frozen",
          ySplit: 1,
          activeCell: "A2",
          showGridLines: true,
        },
      ];

      // Fetch ALL listings with complete data including grant-access agents
      const listingsData =
        await this.preMarketRepository.getAllListingsWithAllData();

      logger.info(
        { totalListings: listingsData.length },
        "Fetched listings with agent data for Excel"
      );

      // Add data rows
      let rowCount = 1;
      for (const listingData of listingsData) {
        const listing = listingData.listing;
        const renter = listingData.renter;
        const breakdown = listingData.accessBreakdown;
        const agents = listingData.agents;

        const formatAgentDetails = (agentsList: any[]): string => {
          if (!agentsList || agentsList.length === 0) return "None";
          return agentsList
            .map((a: any) => {
              const parts = [];
              if (a.name) parts.push(a.name);
              if (a.email) parts.push(a.email);
              if (a.phone) parts.push(a.phone);
              if (a.licenseNumber) parts.push(`Lic: ${a.licenseNumber}`);
              if (a.brokerageName) parts.push(`Brokerage: ${a.brokerageName}`);
              return parts.join(" | ");
            })
            .join("\n");
        };

        const grantAccessAgents = agents.confirmed.filter(
          (a: any) => a.accessType === "grant_access"
        );
        const freeAccessAgents = agents.confirmed.filter(
          (a: any) => a.accessType === "free"
        );
        const paidAccessAgents = agents.confirmed.filter(
          (a: any) => a.accessType === "paid"
        );

        const grantAccessDetails = formatAgentDetails(grantAccessAgents);
        const freeAccessDetails = formatAgentDetails(freeAccessAgents);
        const paidAccessDetails = formatAgentDetails(paidAccessAgents);
        const pendingDetails = formatAgentDetails(agents.pending);
        const rejectedDetails = formatAgentDetails(agents.rejected);

        const dataRow = worksheet.addRow([
          listing.id || "N/A",
          listing.requestId || "N/A",
          listing.requestName || "N/A",
          renter?.name || "N/A",
          renter?.email || "N/A",
          renter?.phone || "N/A",
          listing.priceRange?.min || 0,
          listing.priceRange?.max || 0,
          listing.bedrooms || "N/A",
          listing.bathrooms || "N/A",
          this.serializeLocations(listing.locations),
          listing.status || "N/A",
          grantAccessDetails, // ← Now with FULL details
          freeAccessDetails, // ← Now with FULL details
          paidAccessDetails, // ← Now with FULL details
          pendingDetails, // ← Now with FULL details
          rejectedDetails,
          breakdown.totalConfirmed || 0,
          this.formatDate(listing.createdAt),
        ]);

        // Alternate row colors
        if (rowCount % 2 === 0) {
          dataRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF5F5F5" },
          };
        }

        rowCount++;
      }

      // Set column widths
      const columnWidths = [
        12, // Listing ID
        15, // Request ID
        18, // Request Name
        15, // Renter Name
        18, // Renter Email
        15, // Renter Phone
        10, // Price Min
        10, // Price Max
        10, // Bedrooms
        10, // Bathrooms
        20, // Locations
        12, // Status
        20, // Grant-Access Agents
        20, // Free-Access Agents
        20, // Paid-Access Agents
        18, // Pending Requests
        18, // Rejected Requests
        15, // Total Access Count
        15, // Created Date
      ];

      worksheet.columns = columnWidths.map((width) => ({ width }));

      // Add auto filter if data exists
      if (listingsData.length > 0 && worksheet.autoFilter) {
        worksheet.autoFilter.from = "A1";
        worksheet.autoFilter.to = `U${listingsData.length + 1}`;
      }

      // Create Summary Sheet
      const summarySheet = workbook.addWorksheet("Summary");

      summarySheet.addRow(["PRE-MARKET LISTINGS SUMMARY"]);
      summarySheet.addRow([]);

      summarySheet.addRow(["Total Listings", listingsData.length]);

      // Calculate totals
      let totalGrantAccess = 0;
      let totalFreeAccess = 0;
      let totalPaidAccess = 0;
      let totalPending = 0;
      let totalRejected = 0;

      for (const listing of listingsData) {
        totalGrantAccess += listing.accessBreakdown.grantAccessAgents || 0;
        totalFreeAccess += listing.accessBreakdown.freeAccess || 0;
        totalPaidAccess += listing.accessBreakdown.paidAccess || 0;
        totalPending += listing.accessBreakdown.pendingRequests || 0;
        totalRejected += listing.accessBreakdown.rejectedRequests || 0;
      }

      summarySheet.addRow([]);
      summarySheet.addRow(["AGENT ACCESS BREAKDOWN"]);
      summarySheet.addRow(["Grant-Access Agents", totalGrantAccess]);
      summarySheet.addRow(["Free-Access Agents", totalFreeAccess]);
      summarySheet.addRow(["Paid-Access Agents", totalPaidAccess]);
      summarySheet.addRow(["Pending Requests", totalPending]);
      summarySheet.addRow(["Rejected Requests", totalRejected]);

      summarySheet.addRow([]);
      summarySheet.addRow(["Report Generated", new Date().toLocaleString()]);

      // Set summary sheet column widths
      summarySheet.columns = [{ width: 25 }, { width: 15 }];

      // Format summary sheet header
      const headerCell = summarySheet.getCell("A1");
      headerCell.font = { bold: true, size: 14 };

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const typedBuffer = buffer as unknown as Buffer;

      logger.info(
        { size: typedBuffer.length, listings: listingsData.length },
        "Pre-Market Listings Excel buffer generated successfully"
      );

      return typedBuffer;
    } catch (error) {
      logger.error({ error }, "Failed to generate Pre-Market Listings Excel");
      throw error;
    }
  }

  /**
   * Upload Pre-Market Listings Excel to S3
   */
  async uploadPreMarketListingsExcel(
    buffer: Buffer
  ): Promise<{ url: string; fileName: string }> {
    try {
      // Generate filename with date and timestamp
      const date = new Date();
      const dateStr = date.toISOString().split("T")[0];
      const timestamp = Math.floor(date.getTime() / 1000);
      const fileName = `pre_market_listings_${dateStr}_${timestamp}.xlsx`;
      const folder = "uploads/pre-market/excel/listings";

      logger.info(
        { fileName, folder },
        "Uploading Pre-Market Listings Excel to S3"
      );

      const url = await this.s3Service.uploadFile(
        buffer,
        fileName,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        folder
      );

      logger.info(
        { url, fileName },
        "Pre-Market Listings Excel uploaded successfully"
      );

      return { url, fileName } as any;
    } catch (error) {
      logger.error(
        { error },
        "Failed to upload Pre-Market Listings Excel to S3"
      );
      throw error;
    }
  }

  /**
   * Helper: Serialize array to string
   */
  private serializeArray(arr: any): string {
    if (!arr) return "N/A";
    if (Array.isArray(arr)) {
      if (typeof arr[0] === "string") {
        return arr.join(", ");
      } else if (typeof arr[0] === "object" && arr[0].name) {
        return arr.map((item: any) => item.name).join(", ");
      }
    }
    return "N/A";
  }

  private serializeLocations(locations: any): string {
    if (!locations || locations.length === 0) return "N/A";

    return locations
      .map((loc: any) => {
        const parts: string[] = [];

        // Add borough name
        if (loc.borough) {
          parts.push(loc.borough);
        }

        // Add neighborhoods in parentheses
        if (
          loc.neighborhoods &&
          Array.isArray(loc.neighborhoods) &&
          loc.neighborhoods.length > 0
        ) {
          const neighborhoods = loc.neighborhoods.join(", ");
          parts.push(`(${neighborhoods})`);
        }

        return parts.join(" ");
      })
      .filter((item: string) => item.length > 0) // Remove empty entries
      .join("; "); // Separate multiple locations with semicolon
  }
}
