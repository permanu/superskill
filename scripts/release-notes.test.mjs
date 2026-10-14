import assert from "node:assert/strict";
import { test } from "node:test";
import { parseReleaseTag, releaseBody } from "./release-notes.mjs";

test("release tags accept canonical SemVer including prerelease and build identifiers", () => {
  for (const version of ["0.0.0", "1.2.3", "1.2.3-rc.1", "1.2.3-beta+build.01"]) {
    assert.equal(parseReleaseTag(`v${version}`), version);
  }
});

test("release tags reject shell payloads, line breaks, and noncanonical SemVer", () => {
  for (const tag of ["", "1.2.3", "v01.2.3", "v1.02.3", "v1.2.03", "v1.2", "v1.2.3-01", "v1.2.3-", "v1.2.3\n", 'v1.2.3$(touch pwned)', 'v1.2.3"; exit 0; #', "v1.2.3\nTAG=evil"]) {
    assert.throws(() => parseReleaseTag(tag), /invalid release tag/);
  }
});

test("release notes match a version header literally rather than as a regular expression", () => {
  const changelog = "# Changes\n## [1x2x3]\nWrong\n## [1.2.3] - today\n\nRight\n## [1.2.2]\nOld\n";
  const body = releaseBody("v1.2.3", changelog, "v1.2.2");
  assert.match(body, /Right/);
  assert.doesNotMatch(body, /Wrong|Old/);
  assert.match(body, /compare\/v1\.2\.2\.\.\.v1\.2\.3/);
});

test("release notes fail closed for missing changelog entries and unsafe previous tags", () => {
  assert.throws(() => releaseBody("v1.2.3", "## [1.2.4]\nNew"), /changelog/);
  assert.throws(() => releaseBody("v1.2.3", "## [1.2.3]\nNew", "v1.2.2\nBAD=1"), /invalid release tag/);
  assert.doesNotMatch(releaseBody("v1.2.3", "## [1.2.3]\nNew"), /compare\//);
});
