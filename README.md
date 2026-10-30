# Fax for Agents examples

Runnable examples against the sandbox of Fax for Agents, <https://faxforagents.com>.

Fax for Agents is a fax API, a hosted MCP server and SDKs built so AI agents can send and receive
faxes. It is made by JSB Holdings LLC and built by [Synapse](https://synapsereality.io/).
The repository is mirrored on [GitLab](https://gitlab.com/faxforagents/examples).

Every example needs a test key (`ffa_test_...`), created at <https://app.faxforagents.com>, in
`FAXFORAGENTS_API_KEY`. A test API key reaches the sandbox only. No carrier, no cost, the destination
number picks the outcome.

| Example | What it shows |
|---|---|
| [`python-agent/`](python-agent/) | An agent loop with the Python SDK: prepare, quote, approval when needed, send, poll |
| [`typescript-agent/`](typescript-agent/) | The same loop with the TypeScript SDK |
| [`claude-code/`](claude-code/) | A `.mcp.json` for the hosted MCP server and a prompt that sends a sandbox fax |
| [`n8n/`](n8n/) | A workflow: inbound webhook, signature check on the raw body, notify |
| [`curl/`](curl/) | The raw flow in five calls |

## Sandbox destinations

| Destination | Outcome |
|---|---|
| `+15550000001` | `delivered` |
| `+15550000002` | busy on attempt 1, `delivered` on attempt 2 |
| `+15550000003` | `partial` after 3 pages |
| `+15550000004` | no answer on all 3 attempts, `failed` |
| `+15550000005` | accepted, no outcome, `unknown` |
| `+15550000006` | provider timeout, `unknown` |
| `+15550000007` | `failed` with `invalid_number` |
| any other `+1` number | `delivered` |

## The one rule every example keeps

A fax is `delivered` only when the carrier's evidence is on the attempt. `partial` and `unknown`
never retransmit on their own. Every example stops there and asks a person.

## Licence

MIT. See [LICENSE](LICENSE). Security reports go to hello@faxforagents.com, see [SECURITY.md](SECURITY.md).
