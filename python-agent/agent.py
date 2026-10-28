#!/usr/bin/env python3
"""An agent loop that faxes a document on the sandbox with the Python SDK.

The loop is the one the product is built around. Prepare a document, get an exact quote, ask for
authority when the quote says so, send, then poll until the carrier's evidence arrives. Nothing in
the loop decides on its own to spend more or to resend an `unknown` fax: those are human decisions.

    pip install faxforagents
    export FAXFORAGENTS_API_KEY=ffa_test_...
    python agent.py --to +15550000001 --text "Hello from an agent."
    python agent.py --to +15550000003 --file letter.pdf      # the partial scenario

With a test key nothing leaves the sandbox and nothing is charged. With a live key a quote carries
`authorization_required=True` unless a delegated policy allows the send, and the loop then opens an
approval request and waits for a person.
"""

from __future__ import annotations

import argparse
import sys
import uuid
from pathlib import Path

from faxforagents import APIError, Client

TERMINAL = {"delivered", "partial", "failed", "unknown"}


#: Files that go through the upload path. The SDK reads the content type from the name.
UPLOAD_SUFFIXES = {".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff"}


def prepare(ffa: Client, text: str | None, file: Path | None):
    if file is not None:
        suffix = file.suffix.lower()
        if suffix in UPLOAD_SUFFIXES:
            return ffa.documents.upload(file)
        if suffix in (".html", ".htm"):
            return ffa.documents.create(html=file.read_text("utf-8"), filename=file.stem)
        return ffa.documents.create(text=file.read_text("utf-8"), filename=file.stem)
    return ffa.documents.create(text=text or "Hello from an agent.", filename="agent")


def authority(ffa: Client, quote_id: str, wait_s: float) -> str | None:
    """Return an approval id when a person is needed and has approved, None when the send is free to go."""
    quote = ffa.quotes.get(quote_id)
    if not quote.authorization_required:
        return None
    evaluation = ffa.policies.evaluate(quote_id=quote_id)
    if evaluation.decision == "allow":
        print(f"policy {evaluation.policy_name} version {evaluation.version} allows the send")
        return None
    print(f"a person has to approve: {evaluation.reason}")
    request = ffa.approvals.request(quote_id)
    print(f"approval request {request.id} is {request.status}, waiting up to {wait_s:.0f}s")
    request = ffa.approvals.wait(request.id, timeout=wait_s)
    if request.status != "approved":
        raise SystemExit(f"the request is {request.status}: {request.reason or 'no reason given'}")
    return request.id


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--to", default="+15550000001", help="E.164 destination (+15550000001 is delivered on the sandbox)")
    ap.add_argument("--text", help="plain text to render to a one page PDF")
    ap.add_argument("--file", type=Path, help="a .pdf, .png, .jpg, .tiff, .html or .txt to send instead of --text")
    ap.add_argument("--cover-subject", help="adds a cover page, which is billable")
    ap.add_argument("--approval-wait", type=float, default=600.0, help="seconds to wait for a person")
    args = ap.parse_args()

    with Client() as ffa:
        me = ffa.me()
        print(f"key {me.key_prefix} on the {me.environment} environment, scopes {', '.join(me.scopes)}")

        doc = prepare(ffa, args.text, args.file)
        print(f"document {doc.id}: {doc.page_count} page(s), sha256 {doc.sha256[:12]}...")

        cover = {"subject": args.cover_subject} if args.cover_subject else None
        quote = ffa.quotes.create(document_id=doc.id, to=args.to, cover=cover)
        print(
            f"quote {quote.id}: {quote.billable_pages} billable page(s) to {quote.to} for "
            f"{quote.amount_micro} micro (${quote.amount_micro / 1_000_000:.3f}), expires {quote.expires_at}"
        )

        try:
            approval_id = authority(ffa, quote.id, args.approval_wait)
        except APIError as exc:
            print(f"cannot get authority: {exc.code}: {exc.message}", file=sys.stderr)
            return 2

        key = f"agent-{uuid.uuid4()}"
        try:
            fax = ffa.faxes.create(quote_id=quote.id, approval_id=approval_id, idempotency_key=key)
        except APIError as exc:
            print(f"send refused: {exc.code}: {exc.message} (correlation {exc.correlation_id})", file=sys.stderr)
            return 2
        print(f"fax {fax.id} is {fax.state} (idempotency key {key})")

        fax = ffa.faxes.wait(fax.id, timeout=300, interval=2)
        if fax.state == "delivered" and fax.evidence:
            print(f"delivered: {fax.pages_sent} page(s), {fax.captured_micro} micro captured, evidence {fax.evidence}")
            return 0
        if fax.state == "partial":
            print(f"partial: {fax.pages_sent} of {fax.billable_pages} page(s) arrived. A person decides whether to resend.")
            return 1
        if fax.state == "unknown":
            print("unknown: the carrier gave no outcome. The fax may have arrived. Do not resend. Ask a person.")
            ffa.approvals.request_help(f"Fax {fax.id} ended unknown. Please reconcile.", fax_job_id=fax.id)
            return 1
        print(f"{fax.state}: {fax.failure_code or 'no reason given'}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
