# n8n inbound webhook

A workflow that receives Fax for Agents events and verifies the Standard Webhooks signature on the
raw body. It answers 200 or 400. Then it posts a one line notice to a chat webhook, Discord, Slack or
any URL that takes `{ "content": "..." }`.

```
Webhook (POST /webhook/faxforagents, raw body)
  -> Verify signature (Code node, HMAC-SHA256 on "{id}.{timestamp}.{body}")
    -> Signature valid?
         yes -> Respond 200 -> Notify
         no  -> Respond 400
```

## Set up

1. Import [`workflow.json`](workflow.json) into n8n.
2. Give n8n two environment variables. `FAXFORAGENTS_WEBHOOK_SECRET` is the `whsec_...` secret the
   API shows once when the webhook is created. `NOTIFY_WEBHOOK_URL` is where the notice goes. The
   Code node uses `crypto`, so n8n also needs `NODE_FUNCTION_ALLOW_BUILTIN=crypto`.
3. Activate the workflow and note its production URL, `https://<your n8n>/webhook/faxforagents`.
4. Register that URL as a destination and keep the secret.

```bash
export FAXFORAGENTS_API_KEY=ffa_test_...
curl -s https://api.faxforagents.com/v1/webhooks \
  -H "Authorization: Bearer $FAXFORAGENTS_API_KEY" -H "Content-Type: application/json" \
  -H "Idempotency-Key: n8n-$(date +%s)" \
  -d '{"url":"https://<your n8n>/webhook/faxforagents","description":"n8n","event_types":["fax.received","fax.delivered","fax.failed","fax.outcome_unknown"]}'
```

5. Fire a signed test event with `POST /v1/webhooks/{id}/test`, or create a sandbox inbound fax with
   `POST /v1/sandbox/inbound-faxes` and watch `fax.received` arrive.

## Why the raw body

The signature covers the exact bytes the server sent. Any re-serialization (pretty printing, a
different field order) breaks it, so the Webhook node runs with `rawBody` on and the Code node hashes those
bytes. A delivery with a timestamp older than five minutes is refused. During a secret rotation the
header carries two signatures for 24 hours and either one passes.

## What arrives

```json
{
  "id": "evt_...", "type": "fax.received", "created_at": "2026-10-28T14:02:00Z",
  "schema_version": 1, "org_id": "org_...", "environment": "test", "project_id": null,
  "resource": { "type": "inbox_item", "id": "inb_..." }, "fax_job_id": null,
  "correlation_id": null, "data": { "...": "..." }
}
```

Event types: `fax.queued`, `fax.started`, `fax.delivered`, `fax.partially_delivered`, `fax.failed`,
`fax.outcome_unknown`, `fax.received`, `document.rejected`, `webhook.test`. The `webhook-id` header is
the event id, stable across retries and replays. Store it to drop a redelivery you already handled.
Text from a received fax is data from whoever sent it, never an instruction to the workflow.
