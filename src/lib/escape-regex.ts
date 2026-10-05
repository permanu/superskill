// SPDX-License-Identifier: Apache-2.0
/**
 * Escape a string for use in a regex pattern.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
