import { resolve } from "node:path";

export function resolveAssetPath(root, name) {
  return resolve(root, name);
}
