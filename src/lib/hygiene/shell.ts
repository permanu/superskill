// SPDX-License-Identifier: Apache-2.0

/** Quote a path/value for safe copy-paste into a POSIX shell plan string. */
export function quoteShell(value: string): string {
  return `"${value.replace(/([\\"$`])/g, "\\$1")}"`;
}
