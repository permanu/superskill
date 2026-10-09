import { resolve } from "node:path";
import type { SessionTrace } from "../types.js";

type Token = { text: string; literal?: boolean };

function tokens(source: string): Token[] {
  const result: Token[] = [];
  const pattern = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`|[A-Za-z_$][\w$]*|\d+|[^\s]/g;
  for (const match of source.matchAll(pattern)) {
    const text = match[0];
    if (text.startsWith("//") || text.startsWith("/*")) continue;
    if (/^["'`]/.test(text)) {
      if (text[0] === "`" && text.includes("${")) { result.push({ text: "dynamic" }); continue; }
      let value: string;
      try {
        value = text[0] === '"' ? JSON.parse(text) as string : text.slice(1, -1).replace(/\\(u[\da-fA-F]{4}|x[\da-fA-F]{2}|\r?\n|[\s\S])/g, (_, escape: string) => {
          if (/^[ux]/.test(escape)) return String.fromCharCode(parseInt(escape.slice(1), 16));
          return ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\v", "0": "\0", "\n": "", "\r\n": "" } as Record<string, string>)[escape] ?? escape;
        });
      } catch { result.push({ text: "invalid" }); continue; }
      result.push({ text: value, literal: true });
    } else result.push({ text });
  }
  return result;
}

export function nestedInputs(source: string): Array<{ name: string; input: unknown }> {
  const ts = tokens(source);
  const found: Array<{ name: string; input: unknown }> = [];
  for (let i = 0; i + 4 < ts.length; i++) {
    if (ts[i].literal || ts[i].text !== "tools" || ts[i + 1].text !== "." || ts[i + 3].text !== "(") continue;
    const name = ts[i + 2].text;
    const first = ts[i + 4];
    if (first.literal && ts[i + 5]?.text === ")") { found.push({ name, input: first.text }); continue; }
    if (first.text !== "{") continue;
    const input: Record<string, string> = {};
    let depth = 1;
    for (let j = i + 5; j < ts.length && depth > 0; j++) {
      const t = ts[j];
      if (!t.literal && ["{", "[", "("].includes(t.text)) depth++;
      if (!t.literal && ["}", "]", ")"].includes(t.text)) depth--;
      if (depth === 1 && ts[j + 1]?.text === ":" && ts[j + 2]?.literal && [",", "}"].includes(ts[j + 3]?.text)) input[t.text] = ts[j + 2].text;
    }
    found.push({ name, input });
  }
  return found;
}

function shellFiles(command: string, trace: SessionTrace, cwd?: string): void {
  const retained: string[] = [];
  let delimiter: string | undefined;
  for (const line of command.split("\n")) {
    if (delimiter !== undefined) {
      if (line.trim() === delimiter) delimiter = undefined;
      continue;
    }
    const here = /<<-?\s*(['"]?)([\w]+)\1/.exec(line);
    if (here) delimiter = here[2];
    retained.push(line);
  }
  const words = retained.join("\n").match(/"(?:\\.|[^"\\])*"|'[^']*'|&&|\|\||[;|\n]|\d*>>?|[^\s;|<>]+/g) ?? [];
  let reader = "";
  let skip = 0;
  let start = true;
  const path = (word: string) => {
    const clean = word.replace(/^(['"])(.*)\1$/, "$2");
    return !clean || /[$`*?\n]/.test(clean) || clean.startsWith("&") || clean === "-" ? undefined : cwd ? resolve(cwd, clean) : clean;
  };
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if ([";", "|", "&&", "||", "\n"].includes(word)) { start = true; reader = ""; skip = 0; continue; }
    if (/^\d*>>?$/.test(word)) { const p = path(words[++i] ?? ""); if (p) trace.filesWritten.push(p); continue; }
    if (start) { reader = /^(cat|head|tail|sed|rg|grep)$/.test(word) ? word : ""; skip = /^(sed|rg|grep)$/.test(reader) ? 1 : 0; start = false; continue; }
    if (!reader) continue;
    if (word.startsWith("-")) {
      if (["-n", "-c"].includes(word) && /^(head|tail)$/.test(reader)) i++;
      if (/^(rg|grep)$/.test(reader) && ["-g", "--glob", "-t", "--type", "-T", "--type-not", "--encoding", "-m", "--max-count", "-A", "-B", "-C", "--context"].includes(word)) i++;
      if (/^(rg|grep)$/.test(reader) && ["-e", "--regexp", "-f", "--file"].includes(word)) { i++; skip = 0; }
      continue;
    }
    if (skip > 0) { skip--; continue; }
    const p = path(word);
    if (p) trace.filesRead.push(p);
  }
}

export function recordInput(trace: SessionTrace, name: string, input: unknown): string | undefined {
  const shortName = name.split(".").at(-1) ?? name;
  const object = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const command = typeof object.cmd === "string" ? object.cmd : typeof object.command === "string" ? object.command : undefined;
  if (command !== undefined) {
    trace.commands.push(command.replace(/\s+/g, " ").trim().slice(0, 400));
    shellFiles(command, trace, typeof object.workdir === "string" ? object.workdir : undefined);
    return command;
  }
  if (shortName === "apply_patch" && typeof input === "string") {
    for (const match of input.matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm)) trace.filesWritten.push(match[1]);
    return input;
  }
  if (typeof input === "string") {
    const nested = nestedInputs(input);
    if (nested.length > 0) {
      const summaries = nested.map(call => recordInput(trace, call.name, call.input)).filter((value): value is string => value !== undefined);
      return summaries.length > 0 ? summaries.join("; ") : input;
    }
    if (["shell", "bash", "exec"].includes(shortName) && !/[{}();]/.test(input)) {
      trace.commands.push(input.split("\n")[0].trim().slice(0, 400));
      shellFiles(input, trace);
    }
    return input;
  }
  return undefined;
}
