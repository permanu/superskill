import { helper } from "./beta.js";

export function alpha(x: number): number {
  return helper(x) + 1;
}

function internal(): number {
  return 0;
}
