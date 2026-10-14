# Retry policy fixture (synthetic, public test data)

- `GET` may be retried after a timeout when the caller's normal retry budget permits it.
- `POST` can create a new record or trigger another side effect. A timed-out `POST` without an idempotency key is not safe to replay automatically because the first attempt may already have succeeded.
- An idempotency key is useful only when the service enforces it for the operation being retried.
- If the service's behavior is unknown, ask its owner before recommending automatic retries.
