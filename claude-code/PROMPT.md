Send a one page test fax on the sandbox and report what happened.

Use the faxforagents MCP tools, in this order.

1. Call `guide` with section `send` and follow it.
2. Call `prepare_fax` with this text: "Test fax from Claude Code, nothing to action." Note the
   document id, the sha256 prefix and the page count.
3. Call `quote_fax` for that document to `+15550000001`. Note the amount in micro-units and whether
   an approval is required. With a test key there is none.
4. Call `send_approved_fax` with the quote id. The answer says queued. Do not call it delivered.
5. Call `get_fax_status` every few seconds until the state is `delivered`, `partial`, `failed` or
   `unknown`. Stop at the first terminal state.
6. Call `get_delivery_evidence` for the fax.

Then write a four line report: document id and pages, quote amount, final state, and the evidence
fields the carrier reported. Write "delivered" only if the evidence is present. If the state is
`unknown` or `partial`, say so, do not send again, and call `request_human_help` with one sentence.
