// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { compileRust } from "./rust.js";

const SERDE_SNIPPET = `use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Point {
    pub x: i32,
    pub y: i32,
}

pub fn roundtrip(point: &Point) -> Result<Point, serde_json::Error> {
    let text = serde_json::to_string(point)?;
    serde_json::from_str(&text)
}`;

const PROC_MACRO_SNIPPET = `use proc_macro::TokenStream;

#[proc_macro]
pub fn make_answer(_item: TokenStream) -> TokenStream {
    "fn answer() -> u32 { 42 }".parse().unwrap()
}`;

describe("compileRust", () => {
  it("uses the bare rustc fast path for plain snippets", async () => {
    const result = await compileRust("pub fn add(a: i32, b: i32) -> i32 {\n    a + b\n}");
    if (result.skipped) return;
    expect(result.ok, result.output).toBe(true);
    expect(result.compiler).toMatch(/^rustc /);
    expect(result.compiler).not.toContain("(cargo fixture)");
  }, 60_000);

  it("falls back to the cached cargo fixture for external crates", async () => {
    const result = await compileRust(SERDE_SNIPPET);
    if (result.skipped) return;
    expect(result.ok, result.output).toBe(true);
    expect(result.compiler).toContain("(cargo fixture)");
  }, 900_000);

  it("compiles proc-macro snippets in the proc-macro fixture", async () => {
    const result = await compileRust(PROC_MACRO_SNIPPET);
    if (result.skipped) {
      expect(result.output).toContain("fixture unavailable");
      return;
    }
    expect(result.ok, result.output).toBe(true);
    expect(result.compiler).toContain("(cargo fixture)");
  }, 900_000);

  it("fails without the fallback for snippets that do not compile", async () => {
    const result = await compileRust("pub fn broken( {");
    if (result.skipped) return;
    expect(result.ok).toBe(false);
    expect(result.compiler).not.toContain("(cargo fixture)");
  }, 60_000);
});
