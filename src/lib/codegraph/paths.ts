import { lstat, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export function isWithinRoot(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

export async function containedPath(root: string, rel: string): Promise<string> {
  const physicalRoot = await realpath(root);
  const abs = resolve(physicalRoot, rel);
  if (!isWithinRoot(physicalRoot, abs)) throw new Error("codegraph: path outside scan root");
  let current = physicalRoot;
  const segments = relative(physicalRoot, abs).split(sep).filter(Boolean);
  if (segments.length > 256) throw new Error("codegraph: invalid path depth");
  for (const segment of segments) {
    current = join(current, segment);
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error("codegraph: path outside scan root (symlink)");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ENOTDIR") break;
      if (code) console.error("[codegraph] path validation failed:", code);
      throw error;
    }
  }
  return abs;
}
