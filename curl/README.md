# curl

The raw send flow with nothing but `curl` and `python3` for the JSON.

```bash
export FAXFORAGENTS_API_KEY=ffa_test_...        # created at https://app.faxforagents.com
sh flow.sh                                      # to +15550000001, delivered on the sandbox
sh flow.sh +15550000003                         # partial
```

The five calls, each one line of `curl`.

| Step | Call | Header that matters |
|---|---|---|
| 1 | `POST /v1/documents` with `{"text": ...}` | `Idempotency-Key` |
| 2 | `POST /v1/fax-quotes` with `{"document_id", "to"}` | `Idempotency-Key` |
| 3 | `POST /v1/faxes` with `{"quote_id"}` | `Idempotency-Key`, a repeat returns the same fax with `Idempotent-Replayed: true` |
| 4 | `GET /v1/faxes/{id}` until `delivered`, `partial`, `failed` or `unknown` | |
| 5 | `GET /v1/faxes/{id}/receipt` | |

`{"markdown": ...}` or `{"html": ...}` instead of `{"text": ...}` renders on the server the same way.
A file instead of text takes three more calls: `POST /v1/uploads` with its `content_type`
(`application/pdf`, `image/png`, `image/jpeg` or `image/tiff`), a `PUT` of the bytes to the signed
`upload_url`, `POST /v1/uploads/{id}/complete` with the sha256, then `POST /v1/documents` with
`{"upload_id"}`. An image becomes gray letter pages.

Every error is one envelope, `{"error": {"code", "message", "retryable", "correlation_id"}}`. The
script exits 0 only for `delivered` with evidence. The full contract is the
[OpenAPI document](https://github.com/faxforagents/openapi).
