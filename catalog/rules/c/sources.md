# C - Sources

Baseline: latest stable
Last verified: 2026-10-04

## Primary

1. [WG14 N3220 - Working Draft (open-std.org)](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3220.pdf) - core language semantics for the C working-draft series. PDF verified reachable (HTTP 200); the fetch tool cannot read application/pdf. C23 is the current published revision; C2y-only proposals are not defaults.
2. [WG14 N3301 - Working Draft, C2y post-June 2024 (open-std.org)](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3301.pdf) - traceability for in-progress work; used only to keep C2y-only features out of rules. PDF verified reachable (HTTP 200).
3. [cppreference - C reference](https://en.cppreference.com/w/c) - language and library semantics used across all prefixes. Specific pages: [errno](https://en.cppreference.com/w/c/error/errno), [nodiscard](https://en.cppreference.com/w/c/language/attributes/nodiscard), [stdckdint.h](https://en.cppreference.com/w/c/header/stdckdint), [malloc](https://en.cppreference.com/w/c/memory/malloc), [realloc](https://en.cppreference.com/w/c/memory/realloc), [free](https://en.cppreference.com/w/c/memory/free), [C23 status](https://en.cppreference.com/w/c/23).
4. [SEI CERT C Coding Standard](https://wiki.sei.cmu.edu/confluence/display/c/SEI+CERT+C+Coding+Standard) - secure coding rules for err, mem, num, io, sec. Specific pages: [ERR30-C](https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/error-handling-err/err30-c/), [ERR33-C](https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/error-handling-err/err33-c/), [ERR02-C](https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/error-handling-err/err02-c/), [ERR05-C](https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/error-handling-err/err05-c/), [MEM12-C](https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/memory-management-mem/mem12-c/), [INT30-C](https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/integers-int/int30-c/), [FIO34-C](https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/input-output-fio/fio34-c/).
5. [POSIX.1-2024 (Issue 8)](https://pubs.opengroup.org/onlinepubs/9799919799/) - errno and I/O semantics for err, io, net. Specific pages: [errno](https://pubs.opengroup.org/onlinepubs/9799919799/functions/errno.html), [strerror](https://pubs.opengroup.org/onlinepubs/9799919799/functions/strerror.html).
6. [Linux man-pages project](https://www.kernel.org/doc/man-pages/) - errno lifetime and system-call error semantics. Specific pages: [errno(3)](https://man7.org/linux/man-pages/man3/errno.3.html), [strerror(3)](https://man7.org/linux/man-pages/man3/strerror.3.html), [read(2)](https://man7.org/linux/man-pages/man2/read.2.html).
7. [Clang - Diagnostic flags reference](https://clang.llvm.org/docs/DiagnosticsReference.html) - compiler diagnostics that back tool-enforced rules (for example `-Wunused-result`) and the lint prefix.
8. [GCC - Common Function Attributes](https://gcc.gnu.org/onlinedocs/gcc/Common-Attributes.html#Common-Function-Attributes) - function annotations and contracts (`warn_unused_result`, `cleanup`, `access`) for api, err, mem.
9. [Linux kernel coding style](https://www.kernel.org/doc/html/latest/process/coding-style.html) - platform C conventions: error-code returns, centralized `goto` cleanup, the one-error-label bug, warning discipline; style, err, proj.

## Further reading

- [WG14 N3886 - latest publicly available Working Draft (pre-Ottawa)](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3886.pdf) - future direction only; C2y-only features are not defaults. PDF verified reachable (HTTP 200).
- [cppreference - C compiler support](https://en.cppreference.com/w/c/compiler_support) - which toolchains implement which language and library features.
