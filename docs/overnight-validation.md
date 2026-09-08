# Overnight implementation — 8 September 2026

Local worktree: /Users/ale/Documents/ChatGPT/HundstalletHackathon
Branch: codex/hundstallet-hackathon
Preview: http://127.0.0.1:3001/
Staff: http://127.0.0.1:3001/staff

## Final changes

- Donor experience reduced to live shelter, donation balances, transaction history and spending statistics.
- Central garden, connected areas, five upgrade levels in eight families; 40 generated transparent assets.
- One virtual companion per 500 SEK actually used; deterministic selection from 41 individual public profiles. Pending and hypothetical donations preview future growth.
- Day/night, automatic paths and dwell times, hopping, independent naps, overnight sleep, full pause and reduced motion.
- Whole-product allocation with feasible alternative assignments, exact integer-öre accounting, no donor overdraft or silent redistribution.
- Simple receipt ingestion/review/allocation and product-photo attachment with dog selection.
- Current-receipt verification, portable proofs, original-file checks and staff-only Sepolia submission controls.
- Imported baseline fingerprints and visible reversals. The old explore route redirects to the shelter.

## Validation completed

- Full test suite: **133/133 passed**.
- TypeScript, platform lint, production build and git diff whitespace check passed.
- HTTP integration on a separate QA database passed: OCR text, file hashes, retries, concurrent conflicts, product assignment, category/dog photo links, origin boundaries, correction history and fingerprint chain.
- Browser workflows passed: document review/save/allocation, current-receipt verification, photo upload with two dogs, donor evidence, staff-only wallet controls, exported-proof verification and exact original-document match.
- Browser motion checks passed: daytime travel, stable pause, pause across a night boundary, overnight sleeping, preview bounds and reduced motion.
- Desktop and 390 px mobile rendered without runtime errors or page overflow. Map pan is available by drag and keyboard controls; fit shows the whole shelter.
- Baseline registration added **101 local snapshots** in the preview; gifts, product amounts, ownership and balances were compared before/after and remained unchanged.

## Delivery boundaries

No push or deployment. No real payment, production staff connection or wallet transaction. There are **zero blockchain anchors** in the preview: local fingerprints are labelled as such. Missing original receipts remain missing and explicitly disclosed.

The test server on port 3002 is stopped. Its data lives only in /private/tmp/hundstallet-growth-qa-state. The user preview on 3001 remains running. The temporary overnight automation is paused after completion.

The saved public dog directory is dated 7 September 2026. Virtual progression is a prototype rule, not a claim about actual individual dog-care costs. Existing beneficiary evidence remains separate from random virtual companions.
