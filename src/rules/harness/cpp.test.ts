// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { compileCpp } from "./cpp.js";

describe("compileCpp", () => {
  it("compiles std::expected snippets", async () => {
    const result = await compileCpp(`#include <expected>
#include <system_error>

std::expected<int, std::error_code> parse_int(const char *text) {
    if (text == nullptr)
        return std::unexpected(std::make_error_code(std::errc::invalid_argument));
    return 0;
}`);
    if (result.skipped) return;
    expect(result.ok, result.output).toBe(true);
  }, 60_000);
});
