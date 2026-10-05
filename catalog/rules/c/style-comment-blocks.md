---
id: c-style-comment-blocks
lang: c
prefix: style
title: Write multi-line comments in the project's block style
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [comments, block style, asterisks, formatting]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-doc-what-not-how, c-proj-format]
sources:
  - title: Linux kernel coding style - Commenting
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Use the `/*` block with a leading asterisk column for multi-line comments.

## Why

Kernel style shows the preferred multi-line form: an opening line with only the delimiter, a column of asterisks down the left, and a closing line. The uniform shape makes comment boundaries obvious in a diff and keeps reflowing tools predictable. Mixed shapes make some comments look like code at a glance.

## Bad

```c
/*
  Multi-line comment without the
  preferred leading asterisk column.
*/
int value = 0;
```

## Good

```c
/*
 * Multi-line comment in the preferred style,
 * with a column of asterisks on the left.
 */
int value = 0;
```

## See Also

- [c-doc-what-not-how](doc-what-not-how.md) - what the comment should say
- [c-proj-format](proj-format.md) - formatting the comment mechanically
