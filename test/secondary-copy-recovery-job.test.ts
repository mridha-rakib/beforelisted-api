import { describe, expect, it, vi } from "vitest";

import { startCrmOutboxRecoveryJob } from "../src/jobs/crm-outbox-recovery.job.js";
import { EmailService } from "../src/services/email.service.js";

const { schedule } = vi.hoisted(() => ({ schedule: vi.fn() }));
vi.mock("node-cron", () => ({ default: { schedule } }));

describe("outbox recovery job", () => {
  it("runs secondary recovery on startup and schedules it every ten seconds without overlap", async () => {
    const crm = vi.spyOn(EmailService.prototype, "dispatchReadyCrmOutbox").mockResolvedValue();
    const secondary = vi.spyOn(EmailService.prototype, "recoverSecondaryCopies").mockResolvedValue();
    startCrmOutboxRecoveryJob();
    expect(crm).toHaveBeenCalledOnce();
    expect(secondary).toHaveBeenCalledOnce();
    const scheduled = schedule.mock.calls.find(call => call[0] === "*/10 * * * * *");
    expect(scheduled?.[2]).toEqual({ noOverlap: true });
    await scheduled?.[1]();
    expect(secondary).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
  });
});
