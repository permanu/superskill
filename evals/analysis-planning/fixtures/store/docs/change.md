# Bounded store specification

Extend createStore(journal, options) with an optional positive-integer capacity.
Default capacity is 64. Existing createStore(journal) calls keep working.
Keep put(store, id, value) and get(store, id) signatures unchanged.
Replacing an existing key is allowed even at capacity.
A new key at capacity throws RangeError before changing values or appending to the journal.
Invalid capacities (zero, negative, fractional, non-finite) throw RangeError at construction.
Successful puts keep the existing journal behavior and return value.
Do not change the existing behavior when journal.append throws.
Only src/store.mjs and test/store.test.mjs may change. No dependencies or new storage abstraction.
Verification: node --test test/store.test.mjs.
Rollback: revert this change; stored values are in memory and no persisted format changes.
