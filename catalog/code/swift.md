---
name: swift
pack: code
langs: [swift]
triggers: [swift, swiftui, ios, macos]
---

# Swift (Apple platforms, this Mac)

- Swift 6 isolation: UI on the main actor; `@concurrent` only when measured. No data races.
- SwiftUI: state at the owner. Protocols for FS/network test seams.
- Persistence: actors if shared mutable. No WinUI/GTK — different machine.

## When
iOS/macOS apps, SwiftUI, `src-tauri` is still Rust — use the Rust pack there.

## Worktree & caches
- DerivedData is per worktree: pass `-derivedDataPath` (or set it in the build) — `build.db` is single-writer and concurrent `xcodebuild` runs error.
- Share only module caches: `MODULE_CACHE_DIR`, `CLANG_MODULE_CACHE_PATH`, and the content-addressed compilation cache (`COMPILATION_CACHE_CAS_PATH`).
- SwiftPM: share `--cache-path`, keep `--scratch-path` (`.build`) per worktree.
- Never share `.build`, `DerivedData`, or `build.db` across concurrent worktrees; treat them as single-writer state.
