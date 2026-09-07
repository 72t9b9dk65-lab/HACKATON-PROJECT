# Demo: from one gift to a real connection

The proposition: **Make care visible enough to bring supporters back, and simple enough for staff to keep it current.**

The virtual shelter is the memorable surface. The differentiator is the complete path beneath it: receipt → priced product → supporter contribution → photo → dog → next chapter.

## Three-minute walkthrough

Before presenting, run the local migrations, compile the OCR helper, and open the donor and staff views in two browser tabs. Stay on port 3001. This is a local prototype with sample accounts; make that explicit once at the start.

1. **0:00–0:35 — A reason to care.** Open Koby from the shelter. Show the real portrait, official profile and sample journey. Follow the dog. Explain that the dog is never an owned game item; the supporter follows a real life and a route toward a home.
2. **0:35–1:05 — Make a small gift understandable.** Open Donate, select 100 SEK, preview meals in the shelter. Show that ghosts are possibilities and confirmed care remains opaque. Briefly switch to monthly and expand the timeline, then record a demo gift. Available funds increase; no expenditure is invented.
3. **1:05–1:50 — Show the staff advantage.** In Staff, choose Add receipts or invoices → Try a sample receipt. Five purchased units are extracted, including differently priced products and a rehabilitation service. Check the fields and total, save, and review the allocation. Confirm: each donor's available balance changes by their actual contribution.
4. **1:50–2:20 — Close the loop.** In Today, choose a funded item awaiting a photo. Select Koby and use the explicitly labelled demo profile photo, or upload a permitted demonstration photo. The category is already inherited. Publish, return to the relevant contributor's shelter, and show the camera icon and the linked care record. A second browser reads the same local database within a few seconds.
5. **2:20–2:45 — Show trust and continuity.** Open the receipt's evidence view and recompute its fingerprint. If a Sepolia wallet and test ETH have already been prepared, explain or demonstrate the optional anchor; do not claim an anchor exists until the verification succeeds. Show how a correction returns funds while retaining the old record.
6. **2:45–3:00 — The outcome.** Publish a Home at last sample milestone, then show the keepsake and the shared care goal. Close with the planned measurement: repeat participation and staff time, not time spent keeping a virtual dog alive.

For a smooth short demo, use Staff → Supporters → Open their shelter for whichever sample supporter received the item. Allocation is deliberately not forced toward the presenter: the result follows the available balances.

## What the jury can inspect

| Claim | Working evidence |
|---|---|
| A receipt is made of real products | Five separate units, exact prices and contributor shares |
| Supporters are not charged twice | Command retry and concurrent-write checks; stable confirmed ownership |
| Staff control the story | Photo required, selected dogs, inherited category, scheduling and withdrawal |
| The shelter corresponds to recorded care | Financial support requires funded items plus published beneficiary evidence |
| A photo can outlive a live activity | One/two-hour window ends; the timeline remains |
| A record can be checked independently | Exported proof, receipt hash comparison, optional verified Sepolia transaction |
| A new family is a success | Homecoming remains in the supporter's story |

## Validation completed in this implementation

- 116 automated domain and regression tests passed.
- TypeScript check, focused lint and a complete production build.
- Real HTTP checks on an isolated database, including a photo larger than the framework's former 1 MB ceiling.
- Apple Vision/PDFKit compiled and read both PDF text and a supplied image containing text and amounts, on this Mac. OCR suggestions still require review.
- Local write requests in the tested sequence took approximately 5–9 ms after warm-up. This is one local run, not a production latency or staff-task-time result.
- 106 local picture previews generated at 320/960 px; originals retained.

Browser interaction, visual layout and assistive-technology testing remain a separate validation step. No blockchain transaction, real donation, external staff connection, push or deployment was performed.

## The first pilot with Hundstallet

Ask a staff member to process a typical receipt and publish its first update. Observe the workflow without coaching. Measure:

- Time from document selection to a reviewed allocation, including OCR corrections.
- Time from photo selection to publication, and the number of manual fields needed.
- Missing-photo queue size and age; the system should not create a demand to photograph every inexpensive object separately. One care photo can cover several purchased products and dogs.
- Donor conversion and first-to-second contribution, with a defined observation window; monthly continuation separately from one-time gifts.
- Whether users distinguish available money, recorded expenditure, estimated care and confirmed outcomes.

There are no invented uplift percentages. Start with a small authorized pilot, baseline the current donation flow, and compare a simpler care-story experience.

## Before a live launch

Validate pooled-gift and cost-attribution rules with Hundstallet. Put real donor and staff accounts behind scoped permissions. Add authorized payment capture, refunds and reconciliation, appropriate photo/document access, retention and consent controls, database backups and recovery tests. Move from the local snapshot to normalized persistent records and production deployment. A testnet hash is a prototype of evidence registration, not a replacement for accounting or staff accountability.
