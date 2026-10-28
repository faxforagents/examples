# TypeScript agent

An agent loop that faxes a document on the sandbox with the [TypeScript SDK](https://github.com/faxforagents/sdk-typescript).

```bash
npm install
export FAXFORAGENTS_API_KEY=ffa_test_...        # created at https://app.faxforagents.com
npx tsx agent.ts --to +15550000001 --text "Hello from an agent."
```

Until `faxforagents` is on npm, point the dependency at a checkout: `npm install ../../sdk-typescript`.

What it does, in order.

1. `documents.create` (or `documents.upload` for a PDF) turns the input into an immutable document
   with a sha256 and a page count.
2. `quotes.create` prices that document to that destination. The quote lives ten minutes.
3. When the quote says `authorization_required`, `policies.evaluate` is the dry run. If no policy
   allows the send, `approvals.request` opens a request and the loop waits for a person.
4. `faxes.create` queues the fax with an `Idempotency-Key`. The answer is `queued`, never delivered.
5. `faxes.wait` polls until `delivered`, `partial`, `failed` or `unknown`.

The exit code is 0 only for `delivered` with evidence. `partial` and `unknown` return 1 and the loop
never resends on its own. For `unknown` it opens a help request so a person reconciles.

Try the other sandbox outcomes with the destination: `+15550000003` is partial, `+15550000004` is no
answer, `+15550000005` is unknown.
