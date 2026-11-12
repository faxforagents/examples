<p align="center">
  <a href="https://faxforagents.com"><img src="https://faxforagents.com/brand/logo-512.png" width="88" alt="Fax for Agents"></a>
</p>

<h1 align="center">Fax for Agents examples</h1>

<p align="center">Runnable examples against the sandbox of <a href="https://faxforagents.com">Fax for Agents</a>, the fax API built for AI agents.</p>

<p align="center">
  <a href="https://faxforagents.com">Website</a> ·
  <a href="https://faxforagents.com/docs/quickstart/">Quickstart</a> ·
  <a href="https://faxforagents.com/docs/api/">API reference</a> ·
  <a href="https://faxforagents.com/docs/sdks/">SDKs</a> ·
  <a href="https://faxforagents.com/mcp/">MCP</a> ·
  <a href="https://app.faxforagents.com">Dashboard</a> ·
  <a href="https://faxforagents.com/pricing/">Pricing</a> ·
  <a href="https://faxforagents.com/changelog/">Changelog</a> ·
  <a href="https://gitlab.com/faxforagents/examples">GitLab</a>
</p>

<p align="center">
  <a href="https://github.com/faxforagents/examples/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/faxforagents/examples/ci.yml?branch=main&label=ci" alt="CI"></a>
  <a href="https://github.com/faxforagents/examples/blob/main/LICENSE"><img src="https://img.shields.io/badge/licence-MIT-1f6feb" alt="MIT licence"></a>
  <a href="https://faxforagents.com/docs/sandbox/"><img src="https://img.shields.io/badge/sandbox-no%20cost-2ea043" alt="Sandbox, no cost"></a>
</p>

Fax for Agents is a fax API, a hosted MCP server and SDKs built so AI agents can send and receive
faxes. It is made by JSB Holdings LLC and built by [Synapse](https://synapsereality.io/).

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
