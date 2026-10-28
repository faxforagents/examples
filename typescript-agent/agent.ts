#!/usr/bin/env node
/**
 * An agent loop that faxes a document on the sandbox with the TypeScript SDK.
 *
 *   npm install
 *   export FAXFORAGENTS_API_KEY=ffa_test_...
 *   npx tsx agent.ts --to +15550000001 --text "Hello from an agent."
 *
 * Prepare, quote, get authority when the quote asks for it, send, poll. Nothing here resends an
 * unknown or partial fax: that is a human decision.
 */
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { APIError, FaxForAgents } from 'faxforagents';

const { values: args } = parseArgs({
  options: {
    to: { type: 'string', default: '+15550000001' },
    text: { type: 'string' },
    file: { type: 'string' },
    'cover-subject': { type: 'string' },
    'approval-wait': { type: 'string', default: '600' },
  },
});

const ffa = new FaxForAgents();

/** Files that go through the upload path. The SDK reads the content type from the name. */
const UPLOAD_SUFFIXES = ['.pdf', '.png', '.jpg', '.jpeg', '.tif', '.tiff'];

async function prepare() {
  if (args.file) {
    const name = args.file.toLowerCase();
    if (UPLOAD_SUFFIXES.some((suffix) => name.endsWith(suffix))) {
      return ffa.documents.upload(new Uint8Array(readFileSync(args.file)), { filename: args.file });
    }
    if (name.endsWith('.html') || name.endsWith('.htm')) {
      return ffa.documents.create({ html: readFileSync(args.file, 'utf8'), filename: args.file });
    }
    return ffa.documents.create({ text: readFileSync(args.file, 'utf8'), filename: args.file });
  }
  return ffa.documents.create({ text: args.text ?? 'Hello from an agent.', filename: 'agent' });
}

/** The approval id when a person is needed and has approved, null when the send is free to go. */
async function authority(quoteId: string, waitMs: number): Promise<string | null> {
  const quote = await ffa.quotes.get(quoteId);
  if (!quote.authorization_required) return null;
  const evaluation = await ffa.policies.evaluate({ quote_id: quoteId });
  if (evaluation.decision === 'allow') {
    console.log(`policy ${evaluation.policy_name} version ${evaluation.version} allows the send`);
    return null;
  }
  console.log(`a person has to approve: ${evaluation.reason}`);
  let request = await ffa.approvals.request(quoteId);
  console.log(`approval request ${request.id} is ${request.status}, waiting up to ${waitMs / 1000}s`);
  request = await ffa.approvals.wait(request.id, { timeoutMs: waitMs });
  if (request.status !== 'approved') {
    throw new Error(`the request is ${request.status}: ${request.reason ?? 'no reason given'}`);
  }
  return request.id;
}

async function main(): Promise<number> {
  const me = await ffa.me();
  console.log(`key ${me.key_prefix} on the ${me.environment} environment, scopes ${me.scopes.join(', ')}`);

  const doc = await prepare();
  console.log(`document ${doc.id}: ${doc.page_count} page(s), sha256 ${doc.sha256.slice(0, 12)}...`);

  const cover = args['cover-subject'] ? { subject: args['cover-subject'] } : undefined;
  const quote = await ffa.quotes.create({ document_id: doc.id, to: args.to!, cover });
  console.log(
    `quote ${quote.id}: ${quote.billable_pages} billable page(s) to ${quote.to} for ${quote.amount_micro} micro ` +
      `($${(quote.amount_micro / 1_000_000).toFixed(3)}), expires ${quote.expires_at}`,
  );

  let approvalId: string | null;
  try {
    approvalId = await authority(quote.id, Number(args['approval-wait']) * 1000);
  } catch (err) {
    console.error(`cannot get authority: ${err instanceof APIError ? `${err.code}: ${err.message}` : String(err)}`);
    return 2;
  }

  const key = `agent-${crypto.randomUUID()}`;
  let fax;
  try {
    fax = await ffa.faxes.create({ quote_id: quote.id, approval_id: approvalId }, { idempotencyKey: key });
  } catch (err) {
    if (err instanceof APIError) {
      console.error(`send refused: ${err.code}: ${err.message} (correlation ${err.correlationId})`);
      return 2;
    }
    throw err;
  }
  console.log(`fax ${fax.id} is ${fax.state} (idempotency key ${key})`);

  fax = await ffa.faxes.wait(fax.id, { timeoutMs: 300_000, intervalMs: 2000 });
  if (fax.state === 'delivered' && fax.evidence) {
    console.log(`delivered: ${fax.pages_sent} page(s), ${fax.captured_micro} micro captured, evidence ${JSON.stringify(fax.evidence)}`);
    return 0;
  }
  if (fax.state === 'partial') {
    console.log(`partial: ${fax.pages_sent} of ${fax.billable_pages} page(s) arrived. A person decides whether to resend.`);
    return 1;
  }
  if (fax.state === 'unknown') {
    console.log('unknown: the carrier gave no outcome. The fax may have arrived. Do not resend. Ask a person.');
    await ffa.approvals.requestHelp(`Fax ${fax.id} ended unknown. Please reconcile.`, { faxJobId: fax.id });
    return 1;
  }
  console.log(`${fax.state}: ${fax.failure_code ?? 'no reason given'}`);
  return 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(2);
  },
);
