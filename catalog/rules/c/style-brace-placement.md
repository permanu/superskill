---
id: c-style-brace-placement
lang: c
prefix: style
title: Place braces K&R style with functions opening on the next line
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [braces, K&R, formatting, functions]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-style-braces-both-branches, c-proj-format]
sources:
  - title: Linux kernel coding style - Placing Braces and Spaces
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Open control-statement braces on the same line, function braces on the next, and keep the closing brace alone.

## Why

Kernel style follows K&R: `if`, `switch`, `for`, and `while` put the opening brace last on the line, while function definitions put it at the start of the next line. The uniform shape lets readers find block boundaries without counting, and it minimizes empty lines so more code fits on a screen. Mixed brace styles make the same construct look different in different files.

## Bad

```c
int classify(int value)
{
    if (value > 0)
    {
        return 1;
    }
    return 0;
}
```

## Good

```c
int classify(int value)
{
    if (value > 0) {
        return 1;
    }
    return 0;
}
```

## See Also

- [c-style-braces-both-branches](style-braces-both-branches.md) - when braces are required rather than optional
- [c-proj-format](proj-format.md) - enforcing one brace style mechanically
