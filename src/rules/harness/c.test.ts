// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { compileC } from "./c.js";

describe("compileC", () => {
  it("compiles POSIX APIs under strict -std=c23", async () => {
    const result = await compileC(`#include <string.h>

int main(void) {
    char *save = 0;
    char buf[] = "a,b,c";
    return strtok_r(buf, ",", &save) == 0;
}`);
    if (result.skipped) return;
    expect(result.ok, result.output).toBe(true);
  }, 60_000);

  it("compiles C23 constexpr constants", async () => {
    const result = await compileC(`constexpr int MAX_ITEMS = 64;

int max_items(void) {
    return MAX_ITEMS;
}`);
    if (result.skipped) return;
    expect(result.ok, result.output).toBe(true);
  }, 60_000);
});
