# Hundstallet — A second chance, together

An independent hackathon prototype for engaging supporters in care, rehabilitation, and rehoming for vulnerable dogs. A Sweden-only map connects real published dog profiles to a simple, simulated giving journey: one donation action, pixel icons for care, and a photo timeline.

## Run locally

Requires Node.js 22.13 or later. Run `npm ci`, then `npm run dev`.

- **macOS:** double-click `Open in browser.command`, or run `bash "Open in browser.command"` from the extracted project folder.
- **Windows:** double-click `Open in browser.bat` after extracting the project folder.

Both launchers install missing dependencies and open your browser. Keep the terminal open; press Ctrl+C to stop the server.

## Prototype experience

The homepage puts giving first: the overall donated amount and spending bars at the top, a scrollable row of pixel dog avatars below, one donation button, and the black Sweden map alongside. Selecting a dog changes the map and photo journey without changing the donor’s total.

- Browse **Åke, Koby, and Ove** in the helped-dog carousel or select a map marker. Their names appear beneath generated breed avatars; selection keeps the map and photo journey in sync. These are real public profiles checked on 7 September 2026; pins indicate cities, not live dog locations.
- Press **Donate 250 SEK** to simulate a contribution to shared shelter care. The overall balance, food/vet/daily-care bars, and the indirectly helped dogs update together. Each category is divided equally among the three demo beneficiaries, with whole-öre remainders assigned in a stable order. Map amounts and category totals reconcile exactly.
- The illustrative split is **50% food / 30% vet care / 20% daily care**, stored as integer öre without rounding loss. The initial 500 SEK is a labeled shared-care example. Reloading migrates only the old built-in example; previous user-created demo gifts keep their amounts, dates, and original recipients.
- Browse photos published on each dog's Hundstallet profile. New demo gifts add a dated entry; the final card reserves space for a future organization-posted care update.
- The detailed map retains Sweden's coastline, islands, counties, lakes, rivers, city labels, pan, zoom, and reset controls. Dashboard tabs, rewards pages, filters, and multiple donation actions have been removed from the active experience.

## Data and prototype boundaries

This is an independent shell, not an official Hundstallet service. Public names, profile summaries, city locations, and photographs are a manually imported snapshot. All financial amounts, allocations, and donation events are simulated. Åke's profile mentions allergy food; the app does not claim that a purchase was made for him or that Hundstallet earmarks donations to particular dogs.

Photo order is gallery order, not a verified care chronology. The original photos have no asserted event dates and do not prove expenditure, delivery, or outcomes. The next-update card is visibly a placeholder; donations do not generate organization updates or advance a dog's rehabilitation. Photo sources, original URLs, and hashes are recorded in `public/dogs/hundstallet/sources.json`. Copyright remains with the original rights holders.

The 25 AI-generated breed illustrations are a reusable asset library, not 25 invented shelter profiles. The carousel currently uses three avatars matching the existing profiles. Ove is listed as mixed breed and uses an approximate spaniel-style illustration; this does not assert his ancestry. The real profile-photo carousel remains below the map.

Demo records are saved only in this browser under `hundstallet.donation-shell.v1`. If storage is unavailable, the shell works for the current session and says so. There are no payments, blockchain transactions, server accounts, or live integrations. Real giving is available on [Hundstallet's official website](https://hundstallet.se/stod-oss/).

Previous EarthHealth and Hundstallet flows and their local records are retained for reference and are not used by the active homepage.

## Production path

1. Connect an authorized payment provider, server-side donation records, refunds, and reconciliation.
2. Integrate consented dog-care records and staff-approved updates, with evidence links, timestamps, and correction history.
3. Replace illustrative allocation with reconciled organizational accounting and explicit shared-cost rules.
4. If blockchain is required, anchor batched receipt proofs on a selected network and expose independently verifiable transaction references. Keep personal and case-sensitive data off-chain. An anchor proves record integrity, not whether an expense or outcome is true.
5. Add account recovery, consent-based notifications, moderation, and privacy controls before enabling a live community.

## Sources

Consulted September 7, 2026:

- [Åke](https://hundstallet.se/hundar/ake/), [Koby](https://hundstallet.se/hundar/koby/), and [Ove](https://hundstallet.se/hundar/ove/): public profiles and photo galleries.
- [Hundstallet’s mission and shelter locations](https://hundstallet.se/var-verksamhet/)
- [How Hundstallet uses donations](https://hundstallet.kb.kundo.se/guide/vad-anvands-mina-pengar-till?category=gavor-och-donationer)
- [Official giving page](https://hundstallet.se/stod-oss/)
- [Natural Earth 1:10 million](https://www.naturalearthdata.com/downloads/10m-physical-vectors/) and [county boundaries](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/): public-domain geography pinned to source revision `ca96624a56bd078437bca8184e78163e5039ad19`. These are cartographic context rather than cadastral or navigation-grade boundaries.
- [Natural Earth / World Atlas](https://github.com/topojson/world-atlas): retained public-domain globe assets.
- [Country metadata](https://github.com/mledoze/countries): ODbL-1.0. The derived selection is in `public/data/countries.json`; three `map-*` identifiers are internal rather than ISO codes.

## Validation and code

Run `npm test`, `npm run typecheck`, and `npm run build`. Tests cover exact allocations, per-dog isolation, reload validation, sourced photo availability, map projection, and the retained earlier models.

- `components/donation-shell.tsx`: active simplified map, contribution, and photo timeline.
- `lib/donation-shell.ts`: sourced profiles, demo allocation, and local records.
- `components/pixel-care-icon.tsx`: shared pixel icons for amounts and map markers.
- `public/dogs/pixel-breeds/`: original 5 × 5 atlas, 25 individually cropped transparent PNGs, and breed manifest.
- `assets/pixel-dog-breeds/generation.md`: complete built-in image generation prompt and processing notes.
- `scripts/crop-dog-breeds.py`: repeatable cropping and alpha validation using Pillow.
- `public/dogs/hundstallet/`: original profile photos with a source manifest.
- `components/hundstallet.tsx`: retained earlier prototype, no longer the homepage.
- `lib/hundstallet-data.ts`: locations, fictional dogs, stages, and proposed allocations.
- `lib/hundstallet-model.ts`: currency validation, allocation, local receipts, reload validation, and badges.
- `components/sweden-map.tsx` and `lib/sweden-map.ts`: Sweden-only projection, panning, zooming, and accessible shelter markers.
- `public/data/sweden.json`: detailed Natural Earth 1:10 million Sweden boundary.
- `public/data/sweden-details.json`: 21 counties, regional lake and river features, and Swedish city points. Hydrology is clipped to Sweden during rendering.
- `public/data/sweden-sources.json`: pinned source URLs, revision, source SHA-256 checksums, license, and processing notes.
- `scripts/build-sweden-map.mjs`: repeatable extraction; download the source files listed in the manifest as `<name>.json` and run `node scripts/build-sweden-map.mjs /path/to/source-directory`.
- `components/earth-globe.tsx`: retained original globe implementation; not used by the active homepage.

Automated tests and builds do not establish that every browser interaction, touch gesture, or Windows launcher works. Live payments, blockchain integration, and real-time shelter data are not implemented.
