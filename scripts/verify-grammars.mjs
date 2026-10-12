#!/usr/bin/env node
// Post-build smoke check: every language the codegraph advertises must resolve
// to a vendored grammar wasm inside dist/ — not to node_modules, and not to
// nothing. This catches a skipped vendoring step before publishing.

import { LANGUAGES } from "../dist/lib/codegraph/types.js";
import { supportedFor } from "../dist/lib/codegraph/grammars.js";

const problems = [];
for (const language of LANGUAGES) {
  const support = supportedFor(language);
  if (!support.supported) {
    problems.push(`${language}: no grammar resolved (${support.reason ?? "unknown"})`);
  } else if (support.source !== "vendored") {
    problems.push(`${language}: resolved from "${support.source}" instead of the vendored wasm — run npm run build`);
  }
}

if (problems.length > 0) {
  console.error(`[verify-grammars] ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`[verify-grammars] ${LANGUAGES.length} languages resolve to vendored grammars`);
