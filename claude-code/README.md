# Claude Code

Connect Claude Code to the hosted MCP server and send a sandbox fax from a prompt.

```bash
export FAXFORAGENTS_API_KEY=ffa_test_...        # created at https://app.faxforagents.com
cd examples/claude-code
claude                                          # picks up .mcp.json in this directory
```

Claude Code asks once whether to trust the project's `.mcp.json`. The file points at
`https://mcp.faxforagents.com/mcp/` (the trailing slash matters). It sends your key as a bearer header
read from the environment, so nothing secret is in the file.

Then paste the contents of [`PROMPT.md`](PROMPT.md). The expected run is `prepare_fax`, `quote_fax`,
`send_approved_fax`, a few `get_fax_status` calls, `get_delivery_evidence`, and a four line report
that says `delivered` only because the evidence is there.

Prefer the key to stay on your machine? Use the stdio package instead.

```bash
claude mcp add faxforagents -e FAXFORAGENTS_API_KEY=ffa_test_... -- npx -y faxforagents-mcp
```

Try the other outcomes by changing the destination in the prompt: `+15550000003` is partial,
`+15550000005` is unknown. In both the right answer is to stop and ask a person.
