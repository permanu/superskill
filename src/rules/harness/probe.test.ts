import { expect, it } from "vitest";
import { probeTool } from "./common.js";

it("treats installed launcher stubs with failing version probes as unavailable", async () => {
  const result = await probeTool("failed-version-probe", process.execPath, ["-e", "process.stderr.write('runtime unavailable'); process.exit(1)"]);
  expect(result.available).toBe(false);
});

it("accepts a working compiler probe", async () => {
  const result = await probeTool("working-version-probe", process.execPath, ["--version"]);
  expect(result.available).toBe(true);
});
