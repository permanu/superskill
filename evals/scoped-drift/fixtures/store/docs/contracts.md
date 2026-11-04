# Store contracts

Current: put is idempotent, has no external side effects, and rolls back memory if journal.append throws.
Current: get(store, id) returns undefined for a missing key.
Current reference: src/legacy-store.mjs exports lookup.
Proposed: Create src/bounded-store.mjs to add optional capacity; it is not implemented yet.
The injected journal and external plugin callers are outside this document's evidence.
