import grayMatter from "gray-matter";

const MAX_FRONTMATTER_BYTES = 256 * 1024;

function rejectExecutableEngine(): never {
  throw new Error("Frontmatter must use a data-only YAML or JSON engine");
}

function parseMatter(input: string, _options?: object): grayMatter.GrayMatterFile<string> {
  const normalized = input.replace(/^\uFEFF/, "");
  if (normalized.startsWith("---") && normalized[3] !== "-") {
    const firstLineEnd = normalized.indexOf("\n");
    const language = normalized.slice(3, firstLineEnd === -1 ? normalized.length : firstLineEnd).trim().toLowerCase();
    if (language !== "" && language !== "yaml" && language !== "yml" && language !== "json") rejectExecutableEngine();
    const end = normalized.indexOf("\n---", firstLineEnd);
    const header = normalized.slice(0, end === -1 ? normalized.length : end);
    if (Buffer.byteLength(header, "utf8") > MAX_FRONTMATTER_BYTES) throw new Error("Frontmatter exceeds the parsing byte budget");
  }
  const parsed = grayMatter(input, {
    engines: { javascript: rejectExecutableEngine, js: rejectExecutableEngine },
  });
  if (parsed.data === null || typeof parsed.data !== "object" || Array.isArray(parsed.data)) {
    throw new Error("Frontmatter must contain an object");
  }
  return parsed;
}

const matter = Object.assign(parseMatter, {
  stringify(input: string | { content: string }, data: object): string {
    return grayMatter.stringify(parseMatter(typeof input === "string" ? input : input.content), data, {
      engines: { javascript: rejectExecutableEngine, js: rejectExecutableEngine },
    });
  },
});

export default matter;
