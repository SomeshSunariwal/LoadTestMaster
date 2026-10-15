# LoadMaster

A Windows desktop API load tester built with **Electrobun 2.0.2**, **React 19.3.1**, **TypeScript 7**, **Vite 8**, **Tailwind CSS 4**, and **React Icons**. The supplied designs guide the dashboard, collections, environments, and API editor. Dark mode uses charcoal surfaces anchored at `#292929`; the navigation bar switches between dark and light themes.

## Run the Windows app

The portable app is in **`build/portable/LoadMaster`**. Open **`bin/launcher.exe`** inside that directory. Keep the entire `LoadMaster` directory together, including `bin` and `Resources`.

For installation, extract **`artifacts/win-x64-LoadMaster-Setup.zip`** and run `LoadMaster-Setup.exe` from the extracted directory. Keep its hidden `.installer` directory in place. Windows requires Microsoft Edge WebView2 Runtime; it is normally included with Windows 11 and current Windows 10 installations. The local development build is unsigned.

## Develop

Use Node.js **22.12 or newer** (Node 24 was used here). Bun is included as a project dependency; no global Bun installation is needed.

```sh
npm ci
npm run prepare:desktop
npm run dev
```

Open `http://127.0.0.1:5173`. This starts both Vite and the real Bun backend. The development launcher generates a per-session token; Vite adds it when proxying requests to the loopback backend. Running `dev:web` by itself does not start the backend.

To build and launch a development desktop window:

```sh
npm run dev:desktop
```

To package the Windows release:

```sh
npm run build
```

Electrobun uses the pinned Hutch release to project its SDK into `.hutch/devkit`. Run `prepare:desktop` before TypeScript or Vite on a fresh checkout. The SDK and runtimes download on first use. The packaging helper gives Windows PowerShell its standard module search path so ZIP packaging also works from a PowerShell 7 development terminal.

## First test

1. Open **Environments** and configure `baseUrl` for your API server.
2. Select or create a collection in **Load Test Set**, add your endpoints, and choose the environment.
3. Adjust users, ramp up, duration, iterations, delays, rate limits, or think time.
4. Run the collection and watch live metrics. Pause freezes test time; already-started requests can finish. Stop cancels outstanding requests.
5. View completed results in **History**, and download endpoint metrics with **Export CSV**.

The Local environment defaults to `http://localhost:3000`; start your own server or replace this address. Staging and Production defaults use placeholder `example.com` addresses. The app does not start a demo API server. Previously generated local environments are migrated to normal editable Local environments, while custom URLs are preserved.

## Features

- Collection creation, renaming, deletion, API selection, and search.
- API creation and editing with GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS.
- Query parameters, headers, bearer/basic authentication, JSON, raw, URL-encoded form, and GraphQL payloads. For GraphQL, enter the server's expected request payload and content type in the body and headers.
- Nested `{{environmentVariables}}` throughout URLs, parameters, headers, authentication, and bodies. Missing or circular references fail before a test starts.
- Collection settings and per-API overrides; custom expected status and response-text assertions.
- Live requests/sec, bytes/sec, errors, latency, approximate P95/P99, request breakdown, and histograms.
- Up to four concurrent tests with separate dashboard tabs.
- The app opens on the main Dashboard welcome page. Run tabs open only when you start a test or select results from **History**; saved history is never opened automatically.
- Close dashboard tabs with their × control without stopping tests or deleting results. Closed tests are not listed on the dashboard; saved results remain available in **History**. Tab visibility lasts for the current app session.
- Move all six metric cards, all three graphs, and the request breakdown with their move handles. Resize only the graphs from the lower-right corner. The default arrangement matches the original board; **Reset layout** restores it. Preferences persist on this device, with separate layouts for different window widths.
- Resize the Collections, APIs, and Configuration columns using the two draggable dividers. Keyboard arrow keys also adjust divider widths.
- Resize the Environments list and variables panel with their divider; widths persist on this device.
- Drag History column dividers to adjust widths. Focus a divider and use the left/right arrow keys for 10 px changes, or Shift + arrow for 30 px. Column proportions persist on this device.
- Dashboard headings and run tabs stay fixed while results scroll. Collections, APIs, configuration, environment lists, variable rows, and History each scroll internally with their headers and actions kept visible.
- The API table shows **Global** for inherited collection settings and **Own API** for per-API overrides.
- Local workspace persistence and retained run history.
- System CPU, memory, platform, uptime, and in-flight request monitoring.
- Theme persistence, workspace JSON backup/restore, CSV reports, keyboard-accessible dialogs, and layouts that adapt to smaller windows.

## Source layout

```text
src/
  apis/           # Typed frontend client: desktop RPC or development HTTP
  backend/        # Desktop entry, service, load engine, storage
  components/     # Shared controls, layout, charts, API modal, form editors
  context/        # React provider and stable context identity for hot reloads
  hooks/          # React state, polling, serialized saving, and commands
  pages/          # Dashboard, Collections, Environments, History, Monitoring, Settings
  shared/         # Runtime validation, domain types, defaults, RPC contract, reports
  styles/         # Tailwind 4 import, theme variables, component and responsive styles
tests/            # Real loopback HTTP integration and persistence tests
scripts/          # Development process launcher and Windows packaging helper
```

React owns the UI. The only DOM lookup is the required `createRoot` bootstrap in `src/main.tsx`; components use React state and events, with no query selectors, manual element mutation, or direct DOM manipulation. Dialog behavior is provided by Radix's React dialog component. Pages are loaded on demand.

Browser right-click menus are disabled across the app, including dialogs. To explicitly enable a native menu for a future feature, wrap it in `<ContextMenuBoundary allowNative>`. Custom React context menus can handle the event and stop propagation inside the boundary.

To add a page, create a component in `pages`, add its page ID to `shared/schema.ts`, register its lazy import in `App.tsx`, and add navigation in `components/Layout.tsx`. To add a backend operation, extend `shared/rpc.ts`, the service, desktop handlers, development server, and `apis/client.ts`.

## Load and metric semantics

- A virtual user walks through selected APIs in order. For each API it performs the configured number of iterations. Each iteration issues `parallel` requests, followed by request delay and optional randomized think time.
- Ramp up introduces users over the configured interval. The collection duration is the overall ceiling; a per-API duration may end that API earlier. Runs also complete when all iteration counts are reached.
- A collection rate limit is shared across APIs inheriting collection settings. An API override gets its own rate limit. Limits count individual requests, including parallel requests. Zero disables the limit.
- Limits: **1,000 users per API**, **20 parallel requests per API iteration**, **200 in-flight requests across all runs**, **four simultaneous tests**. This is a single-machine HTTP load generator, not a distributed test service.
- Timings include receiving the full response body. Byte throughput measures received, decoded response-body bytes; it excludes HTTP/TLS headers and upload bytes.
- Default success means a status below 400. An explicit expected status replaces this rule; a response-text assertion can additionally fail the request. Response assertions search the first 1 MB. HTTPS certificate checks remain enabled.
- Percentiles are approximated with 5 ms buckets, with bounded per-run storage. Latency chart values are cumulative. The chart retains the latest 600 one-second samples; endpoint totals cover the full run.
- Requests cancelled by a final stop/duration cutoff are excluded from completed response metrics. In-flight completions during pause remain counted. The final requests/sec value is the run average; live values describe the latest update interval.
- History retention is configurable up to 100 runs. Workspace configuration is saved using Save actions; starting a run saves it first. API additions/edits, collection/environment creation, and theme changes save automatically.

## Data

Browser development stores data in `.data/`. Packaged apps use Electrobun's application-scoped user-data directory (under `%APPDATA%` on Windows). Development desktop and stable desktop channels use separate directories. Workspace and history use serialized atomic JSON file writes. Credentials and environment values are stored locally in plain text; exported workspace backups include them. Masking secret fields is a display feature.

Dashboard placement and column widths are UI preferences stored in the webview's local storage. They are independent of unsaved collection/environment edits and workspace JSON backups. If storage is unavailable, adjustments still work for the current session.

The Windows build uses `assets/loadmaster.ico` for the app and installer icon. It includes sizes from 16 to 256 px. Editable vector artwork is in `assets/loadmaster.svg`, with a 512 px PNG preview beside it; normal builds use the checked-in icon directly.

If a running portable app locks a changed executable, packaging creates a complete copy in `build/portable-ready-*/LoadMaster` and prints its launcher path. The running app is left open.

The development server listens on loopback only. Packaged UI uses typed Electrobun RPC directly; it does not depend on the Vite server or a fixed localhost port. All test HTTP requests execute in Bun, so browser CORS restrictions do not apply.

## Validation

```sh
npm run check
npm run format:check
```

Tests use only an ephemeral local HTTP server. They cover request preparation, nested/missing/circular variables, authentication, bodies, counts, failures, pause/resume/stop, per-API overrides, rate limiting, JSON persistence, and CSV escaping. Network-restricted execution sandboxes must allow loopback connections for integration tests.

`package-lock.json` records the latest stable dependency versions resolved during implementation. Update dependencies deliberately, then run validation and rebuild the desktop package.

Framework integration follows the official [Electrobun SDK and project ownership documentation](https://framework.blackboard.sh/electrobun/guides/project-ownership/) and [build configuration documentation](https://framework.blackboard.sh/electrobun/apis/cli/build-configuration/).
