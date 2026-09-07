# Hundstallet — A second chance, together

An independent hackathon prototype for engaging supporters in care, rehabilitation, and rehoming for vulnerable dogs. A Sweden-only map is the main interface: explore Swedish shelter locations, meet fictional dogs, follow their stories, and understand an illustrative contribution allocation.

## Run locally

Requires Node.js 22.13 or later. Run `npm ci`, then `npm run dev`.

- **macOS:** double-click `Open in browser.command`, or run `bash "Open in browser.command"` from the extracted project folder.
- **Windows:** double-click `Open in browser.bat` after extracting the project folder.

Both launchers install missing dependencies and open your browser. Keep the terminal open; press Ctrl+C to stop the server.

## Prototype experience

- **Explore shelters:** a draggable, zoomable map showing only Sweden, with detailed 1:10 million coastlines, islands, 21 county boundaries, lakes, rivers, and city labels, with approximate city-level markers for Stockholm, Alingsås, and Örkelljunga. Choose a shelter directly, pan and zoom up to 6×, or reset to show all of Sweden. Geographic labels appear progressively and avoid shelter callouts.
- **Follow a dog:** three fictional stories connect care, rehabilitation, and rehoming. Bookmark a journey and read example care updates. The next-chapter control is an explicit demo action; donating does not advance rehabilitation or guarantee adoption.
- **Try a contribution:** simulate SEK 10–25,000. Amounts are stored as integer öre and allocated without rounding losses across veterinary care (40%), food and daily care (30%), training and rehabilitation (20%), and rehoming support (10%). These are proposed demo percentages, not Hundstallet’s accounts.
- **My impact:** see your simulated contributions, allocations, followed dogs, and downloadable JSON receipts.
- **The pack:** earn one-time local badges for following a story, reading an update, and trying a contribution. The community challenge combines explicitly fictional sample participation with your local activity. Rewards are not tradable, and there are no spending rankings.
- **Receipt integrity:** each receipt contains a SHA-256 fingerprint of its fields and the previous receipt hash. The app validates the local chain on reload and on request.

## Honest boundaries

This is not an official Hundstallet product. There are no real payments, server accounts, live case updates, connected shelter systems, or shared community activity. Dogs, stories, funding totals, rewards, and allocations are illustrative. The Luna portrait is AI-generated. Milo and Bella use symbolic artwork, not photographs of actual shelter dogs.

Receipts are **local hash-linked records, not blockchain transactions**. They can detect edits to a record or broken links, but a fully rewritten chain or removed suffix cannot be detected without an independent anchor. They are not proof of expenditure, dog outcomes, delivery, or tax-deductible giving.

Following a particular dog does not earmark a real gift for that dog. Real donations must be made on [Hundstallet’s official website](https://hundstallet.se/stod-oss/). Actual care includes staffing and overhead; the prototype allocation is not a claim about real costs.

The new experience uses `hundstallet.prototype.v1` in localStorage. Existing EarthHealth records remain untouched under their original key. The former humanitarian components and tests are retained for reference, but are not the active homepage.

## Production path

1. Connect an authorized payment provider, server-side donation records, refunds, and reconciliation.
2. Integrate consented dog-care records and staff-approved updates, with evidence links, timestamps, and correction history.
3. Replace illustrative allocation with reconciled organizational accounting and explicit shared-cost rules.
4. If blockchain is required, anchor batched receipt proofs on a selected network and expose independently verifiable transaction references. Keep personal and case-sensitive data off-chain. An anchor proves record integrity, not whether an expense or outcome is true.
5. Add account recovery, consent-based notifications, moderation, and privacy controls before enabling a live community.

## Sources

Consulted September 7, 2026:

- [Hundstallet’s mission and shelter locations](https://hundstallet.se/var-verksamhet/)
- [How Hundstallet uses donations](https://hundstallet.kb.kundo.se/guide/vad-anvands-mina-pengar-till?category=gavor-och-donationer)
- [Official giving page](https://hundstallet.se/stod-oss/)
- [Natural Earth 1:10 million](https://www.naturalearthdata.com/downloads/10m-physical-vectors/) and [county boundaries](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/): public-domain geography pinned to source revision `ca96624a56bd078437bca8184e78163e5039ad19`. These are cartographic context rather than cadastral or navigation-grade boundaries.
- [Natural Earth / World Atlas](https://github.com/topojson/world-atlas): retained public-domain globe assets.
- [Country metadata](https://github.com/mledoze/countries): ODbL-1.0. The derived selection is in `public/data/countries.json`; three `map-*` identifiers are internal rather than ISO codes.

## Validation and code

Run `npm test`, `npm run typecheck`, and `npm run build`. Tests cover contribution validation, exact allocation, local receipt integrity, persistence, badge eligibility, shelter totals, and the retained globe and original donation model.

- `components/hundstallet.tsx`: active map, stories, donation flow, dashboard, community, and dialogs.
- `lib/hundstallet-data.ts`: locations, fictional dogs, stages, and proposed allocations.
- `lib/hundstallet-model.ts`: currency validation, allocation, local receipts, reload validation, and badges.
- `components/sweden-map.tsx` and `lib/sweden-map.ts`: Sweden-only projection, panning, zooming, and accessible shelter markers.
- `public/data/sweden.json`: detailed Natural Earth 1:10 million Sweden boundary.
- `public/data/sweden-details.json`: 21 counties, regional lake and river features, and Swedish city points. Hydrology is clipped to Sweden during rendering.
- `public/data/sweden-sources.json`: pinned source URLs, revision, source SHA-256 checksums, license, and processing notes.
- `scripts/build-sweden-map.mjs`: repeatable extraction; download the source files listed in the manifest as `<name>.json` and run `node scripts/build-sweden-map.mjs /path/to/source-directory`.
- `components/earth-globe.tsx`: retained original globe implementation; not used by the active homepage.

Automated tests and builds do not establish that every browser interaction, touch gesture, or Windows launcher works. Live payments, blockchain integration, and real-time shelter data are not implemented.
