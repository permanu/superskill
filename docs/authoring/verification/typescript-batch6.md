# Verification Report - TypeScript Batch 6 (`anti`, `style`)

- Verifier: independent adversarial subagent (fresh context; did not author these rules)
- Date: 2026-10-05
- Scope: 12 `anti-*.md` + 12 `style-*.md` (24 files, all entered as `status: draft`)
- Toolchain: Node.js v26.8.1; TypeScript 5.9.3 (`node /Users/arvee/Documents/superskill/node_modules/typescript/bin/tsc`)
- Compile command (exact harness): `tsc --noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext <file>`
- Scratch: `/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/ts6` (fetched pages, claim greps, tsc outputs, Node probes)

## Method

1. Fetched all 34 distinct cited URLs (14 ESLint core rule pages, 9 typescript-eslint rule pages including `no-array-constructor`, 10 MDN pages, Google TypeScript Style Guide). All returned HTTP 200 and were converted to text for claim-specific checks.
2. Extracted both fenced snippets from all 24 rules (48) and compiled each through the repo validator (`dist/rules/validate.js`, same flags as `src/rules/harness/typescript.ts`): 48/48 clean, zero diagnostics, tsc 5.9.3.
3. Ran bounded Node v26.8.1 behavior probes for every rule with runtime-observable behavior (coercion, var scoping, delete holes, for-in keys, arguments object, param reassignment, async executor settling, cond assign, hasOwn shadowing/null prototype, sort mutation, sparse array constructor, const reassignment, template interpolation, else-return equivalence, callback `this`, spread vs assign precedence, braceless-body trap, dot vs bracket access).
4. Mechanical checks through the repo validator on the 24 files: frontmatter, id/prefix, sections, fence count/language, summary length, hedging, elisions, `related` resolution; plus See Also link existence, version-number scan, and a token-Jaccard near-duplicate scan against the whole pack.
5. Pack-level `validatePack` run (compile off) confirmed no index or per-file issue for the 24 files. The pack was being extended by other batches during this verification (it grew from 146 to 165 rules); the INDEX.md verified counter is maintained outside this batch and was stale at report time.

## Task-note assessments

- `style-method-signature` follows the rule's default `property` direction: confirmed. The page's `defaultOptions: ['property']` and the Why matches the page: "methods are always bivariant in their arguments, while function properties are contravariant" under `strictFunctionTypes`. The Good is the default-enforced form.
- `style-naming-convention` tool claim is implementation-only: accepted. `@typescript-eslint/naming-convention` is a configurable meta-rule; the stated casing is expressible via `selector`/`format`, and the documented defaults already flag the Bad (function name `Get_User_Name` and local `UserName` both fail `camelCase`). Google's guide carries the UpperCamelCase/lowerCamelCase/CONSTANT_CASE table the rule states.
- `anti-sort-mutation` is review-only (MDN-sourced): accepted. There is no core rule for caller-array mutation, so `enforce: review` is correct; MDN documents both "sorts ... in place and returns the reference to the same array" and the Good's mechanism ("Alternatively, you can do a shallow copy before calling sort(), using the spread syntax"). `toSorted()` is another valid baseline option, but the Good is explicitly documented and idiomatic.
- Additional note (not flagged in the task): `style-array-type`'s direction (`T[]` simple / `Array<T>` compound) matches Google's guide exactly and requires the tool's documented `array-simple` option (the rule's default is `array`); accepted as a config-backed tool claim. By contrast, `anti-array-constructor`'s tool has no options and explicitly permits the Bad (rejected below).

## Source evidence (claim-specific)

- `anti-sort-mutation`: MDN `Array.prototype.sort` - "sorts the elements of an array in place and returns the reference to the same array"; spread-copy alternative documented on the same page. Probe: helper returns the same reference and mutates the caller; the spread copy does not.
- `anti-strict-equality`: ESLint `eqeqeq` - "Require the use of === and !=="; MDN strict equality - "if the operands are of different types, the `==` operator attempts to convert them to the same type before comparing"; strict equality returns false for different types. Probe: `0 == ""` -> true, `0 === ""` -> false, `"1" == 1` -> true.
- `anti-cond-assign`: ESLint `no-cond-assign` - "Disallow assignment operators in conditional expressions", with the "unintentional assignment" example (`if (x = 0)`). Probe: `if (input = "b")` takes the branch and rewrites `input`.
- `anti-array-delete`: typescript-eslint `no-array-delete` - "Disallow using the delete operator on array values"; MDN `delete` - "When you delete an array element, the array length is not affected ... that element is no longer [in the array]". Probe: `delete arr[1]` leaves length 3, index reads `undefined`, `1 in arr` false; `splice` leaves a dense length-2 array.
- `anti-nested-ternary`: ESLint `no-nested-ternary` - "Disallow nested ternary expressions". Both snippets compile; Good is the flat if-chain.
- `anti-for-in-array`: typescript-eslint `no-for-in-array` - "Disallow iterating over an array with a for-in loop"; MDN `for...in` - "iterates over all enumerable string properties ... including inherited enumerable properties". Probe: for-in yielded `["0","1","inheritedKey"]`, for-of yielded `[10,20]`.
- `anti-param-reassign`: ESLint `no-param-reassign` - "Disallow reassigning function parameters"; "Assignment to variables declared as function parameters can be misleading and lead to confusing behavior". Probe: caller's primitive is unaffected (`reassign(1)` -> 2, original stays 1), so the Why's "caller's value was replaced" reads loosely (the parameter binding is replaced); the readability rationale and decision are sound.
- `anti-has-own`: ESLint `no-prototype-builtins` - "Disallow calling some Object.prototype methods directly on objects"; MDN `Object.hasOwn` - "intended as a replacement for `Object.prototype.hasOwnProperty()`" with both failure examples (own `hasOwnProperty() { return false; }` and null-prototype TypeError). Probe reproduced both TypeErrors and `Object.hasOwn` correct results.
- `anti-no-var`: ESLint `no-var` - "Require let or const instead of var"; MDN `var` - "function-scoped or globally-scoped variables", hoisting. Probe: `var` leaks the block; the variable reads `undefined` before its assignment.
- `anti-array-constructor` [REJECTED]: the cited tool explicitly permits the Bad; see Rejects.
- `anti-arguments-object`: ESLint `prefer-rest-params` - "Require rest parameters instead of arguments"; MDN `arguments` - "array-like object ... doesn't have Array's built-in methods like forEach() or map()"; "available within all non-arrow functions". Probe: `arguments.map` undefined, rest array has `map`, `arguments` in an arrow throws ReferenceError.
- `anti-async-executor`: ESLint `no-async-promise-executor` - "Disallow using an async function as a Promise executor"; "If an async executor function throws an error, the error will be lost and won't cause the newly-constructed Promise to reject"; MDN `Promise()` - "The executor is called synchronously". Probe: constructed promise stays pending and the thrown error surfaces as an unhandled rejection ("boom") - matches the Why's "unhandled rejection" + "can hang".
- `style-object-spread`: ESLint `prefer-object-spread` - "Disallow using Object.assign with an object literal as the first argument and prefer the use of object spread instead". Probe: `Object.assign({}, a, b)` and `{...a, ...b}` produce identical precedence.
- `style-no-else-return`: ESLint `no-else-return` - "Disallow else blocks after return statements in if statements". Probe: both forms return identical results.
- `style-arrow-callbacks`: ESLint `prefer-arrow-callback` - "Require using arrow functions for callbacks"; `allowUnboundThis` (default true) allows callbacks that reference `this`, so the Bad's non-`this` callback is flagged; Google guide - "Do not use function expressions. Use arrow functions instead." and "Prefer passing arrow functions as callbacks". Probe: function-expression callback loses `this` (module scope: `undefined`), arrow keeps the enclosing receiver.
- `style-generic-constructors`: typescript-eslint `consistent-generic-constructors` - `defaultOptions: ['constructor']`; "'constructor' (default): type arguments that only appear on the type annotation are disallowed". The Bad is the flagged annotation form; the Good passes.
- `style-method-signature`: typescript-eslint `method-signature-style` - `defaultOptions: ['property']`; "methods are always bivariant in their arguments, while function properties are contravariant" under `strictFunctionTypes`. Good matches the default-enforced direction.
- `style-const-default`: ESLint `prefer-const` - "Require const declarations for variables that are never reassigned after declared"; Google guide - "Use const by default, unless a variable needs to be reassigned". Probe: reassigning a `const` throws TypeError.
- `style-dot-notation`: typescript-eslint `dot-notation` - "Enforce dot notation whenever possible". Probe: bracket and dot access return the same value.
- `style-curly-braces`: ESLint `curly` - "Enforce consistent brace style for all control statements" (default `"all"`). Probe: a braceless body's extent is invisible - the added second line runs outside the condition.
- `style-template-strings`: ESLint `prefer-template` - "Require template literals instead of string concatenation"; MDN template literals - "string interpolation with embedded expressions". Probe: both forms produce `"count: 3"`; `null` interpolates as `"null"`.
- `style-naming-convention`: typescript-eslint `naming-convention` - "Enforce naming conventions for everything across a codebase"; Google casing table (UpperCamelCase types, lowerCamelCase values, CONSTANT_CASE module constants). Bad fails the rule's documented default `camelCase` selectors; see task-note assessment.
- `style-member-ordering`: typescript-eslint `member-ordering` - default order lists fields, then static initialization, then constructors, then accessors/getters/setters, then methods; Bad (method before field) violates it, Good passes.
- `style-array-type`: typescript-eslint `array-type` documents `'array-simple'`: "Use T[] ... for simple types ... Use Array<T> ... for all other types"; Google guide - "For simple types ... use the syntax sugar for arrays, T[] ... For anything more complex, use the longer form Array<T>." Bad (`Array<string>`) is flagged by the default; the compound direction needs the documented `array-simple` option.

None of the 9 typescript-eslint pages carry a rule-level deprecation banner (the only "deprecated" matches are the `no-deprecated` nav entry); the ESLint core `eqeqeq` "deprecated" match is the `allow-null` option, not the rule.

## Compile results

- 48/48 snippets pass the exact harness command (24 rules x Bad/Good), TypeScript 5.9.3, zero diagnostics.
- The deterministic validator reports 0 errors and 0 warnings across the 24 files (before and after the status flips).
- Bad snippets are lint anti-patterns, not type errors: tsc accepts every Bad form, which is expected because the cited enforcement is ESLint, not the compiler.

## Behavior probe results (Node v26.8.1, bounded)

- eqeqeq: `0 == ""` -> true; `0 === ""` -> false; `"1" == 1` -> true; `null == undefined` -> true.
- var: leaks the block (`typeof leaked` -> "string"); reads `undefined` before assignment.
- delete/splice: length 3 with a hole and `undefined` index vs length 2 dense.
- for-in/for-of: keys `["0","1","inheritedKey"]` (prototype key included) vs values `[10,20]`.
- arguments: no `map`; rest array has `map`; `arguments` in an arrow -> ReferenceError.
- param reassign: caller's primitive unchanged.
- cond assign: `if (x = "b")` -> branch taken, `x` becomes `"b"`.
- hasOwn: shadowed and null-prototype `hasOwnProperty` both throw TypeError; `Object.hasOwn` returns true (own) / false (inherited).
- sort: returns the same reference and mutates the caller (`[3,1,2]` -> `[1,2,3]`); spread copy leaves the caller untouched.
- array ctor: `new Array(3)` -> length 3 with no index 0; `Array.from({length:3}, () => 0)` dense; `new Array(1,2)` -> `[1,2]`.
- const: reassignment -> TypeError.
- template: concat and template outputs identical; `null` -> `"null"`.
- else-return: with/without else return identical results.
- arrows: function-expression callback `this` is `undefined` (module scope); arrow callback keeps `this`.
- spread: `{...a, ...b}` precedence identical to `Object.assign({}, a, b)`.
- curly: the line added under a braceless `if` runs unconditionally.
- dot notation: bracket and dot access return the same value.
- async executor: constructed promise remains pending; thrown error becomes an unhandled rejection.

## Verdicts

| rule id | verdict | evidence |
|---|---|---|
| typescript-anti-sort-mutation | verified | MDN "in place ... same array" + documented spread-copy alternative; review-only correct; probe same-ref mutation vs copy |
| typescript-anti-strict-equality | verified | eqeqeq "Require the use of === and !=="; MDN conversion wording; probe `0 == ""`/`0 === ""` |
| typescript-anti-cond-assign | verified | no-cond-assign "Disallow assignment operators in conditional expressions"; probe branch + mutation |
| typescript-anti-array-delete | verified | no-array-delete "Disallow using the delete operator on array values"; MDN length/hole wording; probe |
| typescript-anti-nested-ternary | verified | no-nested-ternary "Disallow nested ternary expressions"; both snippets compile |
| typescript-anti-for-in-array | verified | no-for-in-array "for-in loop"; MDN "including inherited enumerable properties"; probe inherited key |
| typescript-anti-param-reassign | verified | no-param-reassign "misleading and lead to confusing behavior"; probe caller unaffected (Why wording note) |
| typescript-anti-has-own | verified | no-prototype-builtins; MDN hasOwn replacement + shadow/null-proto examples; probe both TypeErrors |
| typescript-anti-no-var | verified | no-var "Require let or const instead of var"; MDN function scope/hoisting; probe leak + undefined |
| typescript-anti-array-constructor | rejected | cited tool explicitly allows the Bad (`new Array(count)`); see Rejects |
| typescript-anti-arguments-object | verified | prefer-rest-params; MDN "array-like ... doesn't have ... map()", non-arrow only; probe |
| typescript-anti-async-executor | verified | no-async-promise-executor "error will be lost ... won't cause the newly-constructed Promise to reject"; probe pending + unhandled rejection |
| typescript-style-object-spread | verified | prefer-object-spread wording; probe identical precedence |
| typescript-style-no-else-return | verified | no-else-return "Disallow else blocks after return statements"; probe equivalence |
| typescript-style-arrow-callbacks | verified | prefer-arrow-callback + default `allowUnboundThis` semantics; Google "Do not use function expressions"; probe `this` |
| typescript-style-generic-constructors | verified | `defaultOptions: ['constructor']`; Bad is the disallowed annotation form |
| typescript-style-method-signature | verified | `defaultOptions: ['property']`; page bivariance wording; Good matches default direction |
| typescript-style-const-default | verified | prefer-const "never reassigned after declared"; Google "Use const by default"; probe TypeError |
| typescript-style-dot-notation | verified | dot-notation "Enforce dot notation whenever possible"; probe equal value |
| typescript-style-curly-braces | verified | curly "brace style for all control statements" (default all); probe braceless trap |
| typescript-style-template-strings | verified | prefer-template "instead of string concatenation"; MDN interpolation; probe equal output |
| typescript-style-naming-convention | verified | Google casing table; defaults flag the Bad; tool claim implementation-only (accepted, see note) |
| typescript-style-member-ordering | verified | member-ordering default order fields -> constructors -> methods; Bad violates it |
| typescript-style-array-type | verified | array-type `array-simple` + Google "simple types ... T[] ... more complex ... Array<T>"; config-backed (note) |

## Rejects (left `status: draft`)

1. `typescript-anti-array-constructor` - the rule's Bad is the single-numeric-argument form `new Array(count)`, and the cited tool explicitly permits exactly that. typescript-eslint `no-array-constructor` (fetched) lists "❌ Incorrect: `Array(0, 1, 2); new Array(0, 1, 2);`" and "✅ Correct: `Array<number>(0, 1, 2); new Array<Foo>(x, y, z); Array(500); new Array(someOtherArray.length);`" - the last two are the Bad's shape. The ESLint core page the rule extends lists the same correct examples (`Array(500); new Array(someOtherArray.length)`), and the rule has no options. So `enforce: tool` / `tool: "eslint:@typescript-eslint/no-array-constructor"` does not hold for the rule's decision. The Why is still MDN-supported (a single numeric argument creates a sparse array), so the fix is to drop `enforce: tool` to `review` (or re-scope the rule to the no-argument/multi-argument forms the tool does flag). No other batch-6 rule has this problem: every other `enforce: tool` Bad is flagged by its named rule (including `prefer-arrow-callback`, whose default `allowUnboundThis` only exempts `this`-using callbacks - the Bad uses none).

## Other checks

- No version numbers in any of the 24 files; `baseline: latest` on all.
- Summary <= 30 words, no hedging, no forbidden tokens/elisions; exactly one `## Bad`/`## Good` with a `typescript` fence each; snippets <= 25 lines.
- All `related` ids resolve and all See Also links exist.
- Near-duplicate scan (token Jaccard over the whole pack): the only pairs at/above 0.45 are cross-linked and semantically distinct - `anti-array-constructor` <-> `anti-array-delete` (0.480: construction vs deletion) and `anti-for-in-array` <-> `anti-has-own` (0.461: iteration vs own-property test); reviewed and not duplicates. No other pair reaches 0.45.
- Post-flip re-validation: 24/24 files clean, 48/48 snippets compile.
- Only the 24 batch files were edited (23 `status` flips); `INDEX.md`, `mod-no-require`, and `mod-node-builtin-prefix` were not touched.

## Counts

- Verified: 23/24 (flipped `status: draft` -> `status: verified`)
- Rejected: 1/24 (left `status: draft`: `typescript-anti-array-constructor`)

Addendum (2026-10-05): `typescript-anti-array-constructor` re-checked after the re-scope — Bad `new Array(1, 2, 3)`/`new Array()` are rejected by the cited rule (its Incorrect examples), Good `[1, 2, 3]` compiles (tsc 5.9.3), and the Why matches the core rule's "array literal notation ... single-argument pitfall ... exception for intentional sparse arrays" rationale and MDN's length/elements split; flipped to `verified` — final: verified 24/24, rejected 0.
