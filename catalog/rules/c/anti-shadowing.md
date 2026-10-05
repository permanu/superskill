---
id: c-anti-shadowing
lang: c
prefix: anti
title: Do not reuse a variable name in a nested scope
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [shadowing, scope, reuse, name]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-anti-abbreviations, c-doc-data-comments]
sources:
  - title: SEI CERT C - DCL01-C, do not reuse variable names in subscopes
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/declarations-and-initialization-dcl/dcl01-c/
---
> Give an inner variable a different name from any enclosing variable; reuse hides which object is being modified.

## Why

An inner declaration hides the outer one, so a write intended for the outer object updates the inner instead, and a bound check written against one size is applied to the other buffer. CERT's example is a local `msg` that hides a global `msg` and is then sized with the global's length. Distinct, descriptive names make the compiler enforce the distinction.

## Bad

```c
int adjust(int value) {
    int result = value;
    {
        int result = value * 2;   /* hides the outer result */
        result += 1;
        if (result > 100) {
            result = 100;
        }
    }
    return result;   /* the inner computation is lost */
}
```

## Good

```c
int adjust(int value) {
    int doubled = value * 2;
    doubled += 1;   /* one name per object: the update is visible */
    if (doubled > 100) {
        doubled = 100;   /* the clamp the Bad intended is now applied */
    }
    return doubled;
}
```

## See Also

- [c-anti-abbreviations](anti-abbreviations.md) - generic names are what invite reuse
- [c-doc-data-comments](doc-data-comments.md) - naming and documenting each object's role
