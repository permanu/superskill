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
