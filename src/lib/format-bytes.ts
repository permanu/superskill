// SPDX-License-Identifier: Apache-2.0

const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

export interface FormatBytesOptions {
  /** Returned for null, undefined, or non-finite input. Defaults to "unknown". */
  nullLabel?: string;
  /** Largest unit to display; larger values stay expressed in it. Defaults to "TB". */
  maxUnit?: Exclude<(typeof SIZE_UNITS)[number], "B">;
  /** Round to whole bytes/units at >= 100 and drop trailing zeros (hygiene report style). Defaults to false. */
  compact?: boolean;
}

export function formatBytes(
  bytes: number | null | undefined,
  options: FormatBytesOptions = {},
): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) {
    return options.nullLabel ?? "unknown";
  }

  const maxIndex = SIZE_UNITS.indexOf(options.maxUnit ?? "TB");

  if (options.compact === true) {
    if (bytes <= 0) return "0 B";
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < maxIndex) {
      value /= 1024;
      unit += 1;
    }
    const rounded = unit === 0 || value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
    return `${rounded} ${SIZE_UNITS[unit]}`;
  }

  if (bytes < 1024) return `${bytes} B`;
  let value = bytes / 1024;
  let unit = 1;
  while (value >= 1024 && unit < maxIndex) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${SIZE_UNITS[unit]}`;
}
