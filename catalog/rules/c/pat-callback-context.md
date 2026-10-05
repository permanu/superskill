---
id: c-pat-callback-context
lang: c
prefix: pat
title: Give every callback a user context pointer
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [callback, context, void pointer, registration]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-pat-vtable, c-pat-dispatch-table]
sources:
  - title: cppreference - Pointer declaration
    url: https://en.cppreference.com/w/c/language/pointer
---
> Pass a `void *` context alongside the function pointer and convert it back to its real type inside.

## Why

Function pointers carry no state, so a callback that needs the object it belongs to must receive it. cppreference notes that interfaces such as `pthread_create` take a callback plus a `void *` for exactly this purpose, and that the caller converts the pointer back to the correct type. A context parameter keeps callbacks reusable and stateless instead of forcing globals.

## Bad

```c
typedef void (*event_fn)(int event);

void dispatch(event_fn fn, int event) {
    fn(event);   /* the callback has no way to reach its own state */
}
```

## Good

```c
typedef void (*event_fn)(void *ctx, int event);

void dispatch(event_fn fn, void *ctx, int event) {
    fn(ctx, event);   /* the callback carries its context explicitly */
}
```

## See Also

- [c-pat-vtable](pat-vtable.md) - the object that usually becomes the context
- [c-pat-dispatch-table](pat-dispatch-table.md) - tables of callbacks that need the same treatment
