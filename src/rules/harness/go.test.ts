// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { compileGo, detectStdlibImports, wrapGoSource } from "./go.js";

describe("detectStdlibImports", () => {
  it("selects only the packages the snippet uses", () => {
    const imports = detectStdlibImports(
      'func greet(name string) string {\n\treturn fmt.Sprintf("hi %s", strings.ToUpper(name))\n}',
    );
    expect(imports).toEqual(["fmt", "strings"]);
  });

  it("ignores identifiers in comments and string literals", () => {
    const imports = detectStdlibImports('// model/user.go: package model\nfunc f() string {\n\treturn "fmt.Println"\n}');
    expect(imports).toEqual([]);
  });

  it("disambiguates crypto/rand from math/rand", () => {
    expect(detectStdlibImports("func token() string { return rand.Text() }")).toEqual(["crypto/rand"]);
    expect(detectStdlibImports("func roll() int { return rand.Intn(6) }")).toEqual(["math/rand"]);
  });

  it("disambiguates pprof packages by member", () => {
    expect(detectStdlibImports('func f() { pprof.Do(ctx, pprof.Labels("k", "v"), fn) }')).toEqual(["runtime/pprof"]);
    expect(
      detectStdlibImports('func f(m *http.ServeMux) { m.HandleFunc("/debug/pprof/", pprof.Index) }'),
    ).toEqual(["net/http", "net/http/pprof"]);
  });
});

describe("wrapGoSource", () => {
  it("prepends only used imports and a package clause", () => {
    const source = wrapGoSource('func greet(name string) string {\n\treturn fmt.Sprintf("hi %s", strings.ToUpper(name))\n}');
    expect(source).toContain("package main");
    expect(source).toContain('"fmt"');
    expect(source).toContain('"strings"');
    expect(source).not.toContain('"os"');
    expect(source).toContain("func main() {}");
  });

  it("adds no imports when the snippet declares its own", () => {
    const source = wrapGoSource('package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("hi")\n}\n');
    expect(source).not.toContain("import (");
    expect(source).toContain('import "fmt"');
  });

  it("does not add unused imports", () => {
    const source = wrapGoSource("func stop() {\n\tos.Exit(0)\n}");
    expect(source).toContain('"os"');
    expect(source).not.toContain('"fmt"');
    expect(source).not.toContain('"strings"');
  });
});

describe("compileGo with auto-imports", () => {
  it("compiles a stdlib snippet without imports", async () => {
    const result = await compileGo('func greet(name string) string {\n\treturn fmt.Sprintf("hi %s", strings.ToUpper(name))\n}');
    if (result.skipped) return;
    expect(result.ok, result.output).toBe(true);
  }, 60_000);

  it("keeps snippets with their own imports compiling", async () => {
    const result = await compileGo('package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("hi")\n}\n');
    if (result.skipped) return;
    expect(result.ok, result.output).toBe(true);
  }, 60_000);
});
