#!/bin/sh
# The raw send flow against the sandbox, with curl and python3 (for JSON). Nothing else.
#
#   export FAXFORAGENTS_API_KEY=ffa_test_...
#   sh flow.sh [+15550000001]
#
# document -> quote -> send (Idempotency-Key) -> poll -> receipt. The send answers queued, never
# delivered. A fax is delivered only when the carrier's evidence is on the attempt.
set -eu

API="${FAXFORAGENTS_API_URL:-https://api.faxforagents.com}"
KEY="${FAXFORAGENTS_API_KEY:?set FAXFORAGENTS_API_KEY to a test key (ffa_test_...)}"
TO="${1:-+15550000001}"

auth="Authorization: Bearer $KEY"
json="Content-Type: application/json"
field() { python3 -c 'import json,sys; d=json.load(sys.stdin); print(d'"$1"')'; }

echo "1. document from text"
doc=$(curl -sS "$API/v1/documents" -H "$auth" -H "$json" -H "Idempotency-Key: curl-doc-$$" \
  -d '{"text":"Hello from curl.","filename":"curl"}')
DOC_ID=$(printf '%s' "$doc" | field '["id"]')
printf '%s\n' "$doc" | field '["id"], d["page_count"], "page(s)", d["sha256"][:12]'

echo "2. quote to $TO"
quote=$(curl -sS "$API/v1/fax-quotes" -H "$auth" -H "$json" -H "Idempotency-Key: curl-quote-$$" \
  -d "{\"document_id\":\"$DOC_ID\",\"to\":\"$TO\"}")
QUOTE_ID=$(printf '%s' "$quote" | field '["id"]')
printf '%s\n' "$quote" | field '["id"], d["billable_pages"], "page(s)", d["amount_micro"], "micro, approval required:", d["authorization_required"]'

echo "3. send (the answer is queued, never delivered)"
IDEM="curl-send-$$"
fax=$(curl -sS "$API/v1/faxes" -H "$auth" -H "$json" -H "Idempotency-Key: $IDEM" \
  -d "{\"quote_id\":\"$QUOTE_ID\"}")
FAX_ID=$(printf '%s' "$fax" | field '["id"]')
printf '%s\n' "$fax" | field '["id"], d["state"]'

echo "3b. the same Idempotency-Key returns the same fax"
curl -sS "$API/v1/faxes" -H "$auth" -H "$json" -H "Idempotency-Key: $IDEM" -d "{\"quote_id\":\"$QUOTE_ID\"}" \
  -D - -o /dev/null | grep -i '^idempotent-replayed' || true

echo "4. poll until a terminal state"
i=0
while [ $i -lt 60 ]; do
  job=$(curl -sS "$API/v1/faxes/$FAX_ID" -H "$auth")
  STATE=$(printf '%s' "$job" | field '["state"]')
  case "$STATE" in
    delivered|partial|failed|unknown) break ;;
  esac
  i=$((i + 1))
  sleep 2
done
printf '%s\n' "$job" | field '["id"], d["state"], "pages_sent", d["pages_sent"], "failure_code", d["failure_code"], "evidence", d["evidence"]'

echo "5. receipt"
curl -sS "$API/v1/faxes/$FAX_ID/receipt" -H "$auth" | field '["state"], d["provider"], d["captured_micro"], "micro captured;", d["note"]'

case "$STATE" in
  delivered) echo "done: delivered with evidence" ;;
  partial) echo "done: partial. A person decides whether to resend." ; exit 1 ;;
  unknown) echo "done: unknown. The fax may have arrived. Do not resend. A person reconciles." ; exit 1 ;;
  *) echo "done: $STATE" ; exit 1 ;;
esac
