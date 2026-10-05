---
id: cpp-unsafe-goto
lang: cpp
prefix: unsafe
title: Avoid goto; express the exit in the control flow
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [goto, control-flow, structured-programming]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [goto]
related: [cpp-raii-scope-guard, cpp-unsafe-return-local-address]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - goto statement
    url: https://en.cppreference.com/w/cpp/language/goto
---
> goto makes lifetimes and control flow implicit; break, flags, or functions make them visible.

## Why

ES.76 asks to avoid goto. The goto reference shows how much of the language the jump has to navigate: it cannot enter the scope of any automatic variable with an initializer or a non-trivial type at all, and leaving a scope runs destructors in reverse order — the compiler enforces what it can, and the reader reconstructs the rest. The nested-loop exit that goto is reached for is expressed by the loop condition, a flag, or a small function.

## Bad

```cpp
int main() {
    int total = 0;
    for (int i = 0; i < 4; ++i) {
        for (int j = 0; j < 4; ++j) {
            if (i * j > 4)
                goto done; // unstructured exit from nested loops
            total += i * j;
        }
    }
done:
    return total;
}
```

## Good

```cpp
int main() {
    int total = 0;
    bool done = false;
    for (int i = 0; i < 4 && !done; ++i) {
        for (int j = 0; j < 4 && !done; ++j) {
            if (i * j > 4)
                done = true; // condition-based exit
            else
                total += i * j;
        }
    }
    return total;
}
```

## See Also

- [cpp-raii-scope-guard](raii-scope-guard.md) - cleanup that replaces goto-style exits
- [cpp-unsafe-return-local-address](unsafe-return-local-address.md) - the other jump that outlives its target
