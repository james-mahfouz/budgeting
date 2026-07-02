import { describe, expect, it } from "vitest";
import { nextScheduledRun } from "./recurring.js";

describe("nextScheduledRun", () => {
  it("schedules the selected monthly day in the current month when still ahead", () => {
    const next = nextScheduledRun(new Date("2026-07-02T09:00:00.000Z"), "month", 1, 15);

    expect(next.toISOString()).toBe("2026-07-15T09:00:00.000Z");
  });

  it("schedules the selected monthly day in the next month when already passed", () => {
    const next = nextScheduledRun(new Date("2026-07-20T09:00:00.000Z"), "month", 1, 15);

    expect(next.toISOString()).toBe("2026-08-15T09:00:00.000Z");
  });

  it("schedules the selected weekday", () => {
    const next = nextScheduledRun(new Date("2026-07-02T09:00:00.000Z"), "week", 1, 1);

    expect(next.toISOString()).toBe("2026-07-06T09:00:00.000Z");
  });
});

