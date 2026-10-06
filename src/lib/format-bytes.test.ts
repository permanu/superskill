// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { formatBytes } from "./format-bytes.js";

const KB = 1024;
const MB = 1024 ** 2;
const GB = 1024 ** 3;
const TB = 1024 ** 4;
const PB = 1024 ** 5;

describe("formatBytes default (fixed style, TB cap)", () => {
  it("labels null, undefined, and non-finite input", () => {
    expect(formatBytes(null)).toBe("unknown");
    expect(formatBytes(undefined)).toBe("unknown");
    expect(formatBytes(Number.NaN)).toBe("unknown");
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe("unknown");
    expect(formatBytes(Number.NEGATIVE_INFINITY)).toBe("unknown");
  });

  it("formats byte-scale values", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1023)).toBe("1023 B");
    expect(formatBytes(KB)).toBe("1.0 KB");
  });

  it("keeps one decimal below 10 and none at or above 10", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(2 * KB)).toBe("2.0 KB");
    expect(formatBytes(9.99 * KB)).toBe("10.0 KB");
    expect(formatBytes(10 * KB)).toBe("10 KB");
    expect(formatBytes(12.5 * KB)).toBe("13 KB");
    expect(formatBytes(100 * KB)).toBe("100 KB");
  });

  it("steps through KB, MB, GB, and TB", () => {
    expect(formatBytes(MB)).toBe("1.0 MB");
    expect(formatBytes(512 * MB)).toBe("512 MB");
    expect(formatBytes(1536 * MB)).toBe("1.5 GB");
    expect(formatBytes(GB)).toBe("1.0 GB");
    expect(formatBytes(100 * GB)).toBe("100 GB");
    expect(formatBytes(TB)).toBe("1.0 TB");
  });

  it("caps at TB by default", () => {
    expect(formatBytes(PB)).toBe("1024 TB");
  });
});

describe("formatBytes compact style (hygiene report and worktree audit)", () => {
  const compact = (bytes: number | null) => formatBytes(bytes, { compact: true, maxUnit: "PB" });

  it("mirrors the previous hygiene formatting", () => {
    expect(compact(null)).toBe("unknown");
    expect(compact(Number.NaN)).toBe("unknown");
    expect(compact(0)).toBe("0 B");
    expect(compact(512)).toBe("512 B");
    expect(compact(KB)).toBe("1 KB");
    expect(compact(1536)).toBe("1.5 KB");
    expect(compact(100 * MB)).toBe("100 MB");
    expect(compact(12.5 * GB)).toBe("12.5 GB");
  });

  it("drops trailing zeros and rounds to whole units at >= 100", () => {
    expect(compact(2 * KB)).toBe("2 KB");
    expect(compact(1234)).toBe("1.2 KB");
    expect(compact(99.5 * KB)).toBe("99.5 KB");
    expect(compact(100 * KB)).toBe("100 KB");
    expect(compact(9.99 * KB)).toBe("10 KB");
    expect(compact(10 * GB)).toBe("10 GB");
    expect(compact(GB)).toBe("1 GB");
  });

  it("floors zero and negative byte counts", () => {
    expect(compact(0)).toBe("0 B");
    expect(compact(-5)).toBe("0 B");
    expect(compact(-1.5 * GB)).toBe("0 B");
  });

  it("caps at the requested unit", () => {
    expect(compact(PB)).toBe("1 PB");
    expect(formatBytes(PB, { compact: true, maxUnit: "TB" })).toBe("1024 TB");
  });
});

describe("formatBytes options", () => {
  it("uses a custom nullLabel", () => {
    expect(formatBytes(null, { nullLabel: "unknown size" })).toBe("unknown size");
    expect(formatBytes(Number.NaN, { nullLabel: "unknown size" })).toBe("unknown size");
    expect(formatBytes(null, { nullLabel: "?" })).toBe("?");
    expect(formatBytes(undefined, { nullLabel: "?" })).toBe("?");
  });

  it("caps units with maxUnit", () => {
    expect(formatBytes(TB, { maxUnit: "GB" })).toBe("1024 GB");
    expect(formatBytes(PB, { maxUnit: "GB" })).toBe("1048576 GB");
    expect(formatBytes(PB, { maxUnit: "TB" })).toBe("1024 TB");
    expect(formatBytes(PB, { maxUnit: "PB" })).toBe("1.0 PB");
  });
});

describe("formatBytes call-site styles", () => {
  it("xcode probe: fixed style capped at TB", () => {
    expect(formatBytes(64 * KB, { maxUnit: "TB" })).toBe("64 KB");
    expect(formatBytes(1536 * MB, { maxUnit: "TB" })).toBe("1.5 GB");
    expect(formatBytes(2 * TB, { maxUnit: "TB" })).toBe("2.0 TB");
    expect(formatBytes(PB, { maxUnit: "TB" })).toBe("1024 TB");
  });

  it("caches probe: unknown size label, fixed style capped at TB", () => {
    expect(formatBytes(null, { nullLabel: "unknown size", maxUnit: "TB" })).toBe("unknown size");
    expect(formatBytes(Number.NaN, { nullLabel: "unknown size", maxUnit: "TB" })).toBe(
      "unknown size",
    );
    expect(formatBytes(3 * GB, { nullLabel: "unknown size", maxUnit: "TB" })).toBe("3.0 GB");
  });

  it("watchdog digest: fixed style capped at GB", () => {
    expect(formatBytes(2 * GB, { maxUnit: "GB" })).toBe("2.0 GB");
    expect(formatBytes(512, { maxUnit: "GB" })).toBe("512 B");
    expect(formatBytes(TB, { maxUnit: "GB" })).toBe("1024 GB");
  });
});
