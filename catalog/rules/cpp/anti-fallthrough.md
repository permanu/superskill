---
id: cpp-anti-fallthrough
lang: cpp
prefix: anti
title: State intentional switch fallthrough with the attribute
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [switch, fallthrough, attributes]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [switch]
related: [cpp-anti-complicated-expression, cpp-macro-no-program-text]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - switch statement
    url: https://en.cppreference.com/w/cpp/language/switch
---
> Reaching the next case without a break is a bug until the attribute says otherwise.

## Why

ES.78 asks not to rely on implicit fallthrough in switch statements. The switch reference describes the mechanics: case labels do not alter the flow of control by themselves, so reaching the next label without a break is silent — and compilers may warn on it unless the attribute `[[fallthrough]]` appears immediately before the case label to mark the fallthrough as intentional. The attribute turns an accident the reader must reconstruct into a statement the compiler and the reader can both see.

## Bad

```cpp
int classify(int code) {
    int result = 0;
    switch (code) {
        case 1:
            result = 1;
        case 2: // falls through silently
            result += 2;
            break;
        default:
            break;
    }
    return result;
}

int main() {
    return classify(1) == 3 ? 0 : 1;
}
```

## Good

```cpp
int classify(int code) {
    int result = 0;
    switch (code) {
        case 1:
            result = 1;
            [[fallthrough]]; // the intent is stated
        case 2:
            result += 2;
            break;
        default:
            break;
    }
    return result;
}

int main() {
    return classify(1) == 3 ? 0 : 1;
}
```

## See Also

- [cpp-anti-complicated-expression](anti-complicated-expression.md) - control flow the reader must simulate
- [cpp-macro-no-program-text](macro-no-program-text.md) - the macro version of implicit flow
