# earthealth

An atlas prototype connecting humanitarian needs, anonymous donations, and transparent reporting.

## Getting started

Requires Node.js 22.13 or later. Run `npm install`, then `npm run dev`. To validate the project, run `npm test`, `npm run typecheck`, and `npm run build`.

On macOS, double-click **Open in browser.command**. It installs missing dependencies on the first run and opens the site in your default browser. Keep the Terminal open while using the site; press Ctrl+C to stop it. If you downloaded the project as a ZIP and the file is not executable, run `bash "Open in browser.command"` from the project folder.

On Windows, double-click **Open in browser.bat** after extracting the project folder. It requires Node.js 22.13 or later, installs missing dependencies, and opens your default browser. Keep the window open while using the site; press Ctrl+C to stop it.

## Features

- An orthographic globe with dragging, keyboard navigation, zoom, and search.
- 177 Natural Earth geographic boundaries, with continent, country, and city views.
- 44 country scenarios and 12 demo cities. City circles indicate approximate project areas, **not administrative boundaries**. White means data is missing.
- Five categories: water, nutrition, health, shelter, and education, with links to official external donation channels.
- An anonymous profile and **local, simulated donations**, stored in the current browser’s localStorage.
- Downloadable reports and a four-stage journey that users explicitly advance as a simulation.
- A leaderboard with six illustrative profiles and the optional local profile. Example ledgers reconcile with geographic totals.
- An aid heatmap, donation aggregation by category, and a geographic hierarchy.
- English interface text, country names, reports, and date and number formatting. Currency remains EUR. Previously saved demo donations are retained and their destination names are updated when loaded.

## Prototype limitations

This prototype does not collect money or create server-side accounts. It is not a community shared across devices. It does not certify needs, purchases, beneficiaries, impact, or completed deliveries. Figures are synthetic and do not come from the organizations. Official donation pages are external, with no tracking or affiliation. Kit estimates are arithmetic examples with explicit unit costs and unallocated remainders.

An operational version would require verified, dated territorial data, municipal boundaries, pseudonymous identities with account recovery, server-side storage, and agreed integrations for payments and organizational documentation.

## Geography and sources

- Natural Earth / World Atlas, public-domain cartographic data: https://github.com/topojson/world-atlas
- Country metadata and continents: https://github.com/mledoze/countries (ODbL-1.0). The derived selection is in `public/data/countries.json`. Names have been translated into English, using the bundled World Atlas names where available. The three `map-*` identifiers are internal, not ISO codes.
- Official donation channels consulted on September 6, 2026: https://www.wateraid.org/uk/donate?v=1, https://www.wfp.org/support-us, https://www.msf.org/donate, https://www.unhcr.org/get-involved/ways-give, https://www.unicef.org/take-action.

## Validation

Automated tests cover fundraising reconciliation, aggregation without double counting, amount validation, estimates and remainders, profile reloads, migration of previously saved destinations, geographic integrity, and atlas preparation through the same code used by the browser. The globe regression test reproduced `objects.forEach is not a function` before the `topojson.merge` call was corrected. The project also includes TypeScript checks and a build for Cloudflare Workers.

When supported, the site registers only the WebMCP tool `navigate_earthhealth_territory`. It opens a territory in the same interface and does not create donations. After the missing-globe report, sphere rendering and navigation to Africa were verified in the browser preview. WebMCP registration, valid navigation, and rejection of a nonexistent territory without changing the selected location were also verified. Those earlier targeted checks do not cover every donation flow or touch gesture.
