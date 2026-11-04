# Store component

Current contract: put is idempotent and never changes a value after its first insertion.
It has no externally visible side effects. Journal errors roll back the insertion.

Proposed, not implemented: create src/bounded-store.mjs for optional bounded storage.
The current implementation is src/store.mjs; tests are test/store.test.mjs.
