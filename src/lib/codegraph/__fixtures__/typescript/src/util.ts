export function normalize(input: string): "error" | "warn" {
  return input.length > 0 ? "warn" : "error";
}

export default normalize;
