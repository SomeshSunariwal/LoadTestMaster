# LoadMaster

A Windows desktop API load tester built with **Electrobun 2.0.2**, **React 19.3.1**, **TypeScript 7**, **Vite 8**, **Tailwind CSS 4**, and **React Icons**. The supplied designs guide the dashboard, collections, environments, and API editor. Dark mode uses charcoal surfaces anchored at `#292929`; the navigation bar switches between dark and light themes.

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
- Type `{{` in a text field to suggest enabled variables from the collection's environment (or the environment being edited). Type to filter, use arrow keys and Enter/Tab to insert, or click a suggestion. Escape dismisses the list. Variable values are not displayed in suggestions.
- Recognized `{{variableName}}` references are highlighted orange in fields and JSON editors. Password fields remain masked.
- Request body lives in the API editor's right column. JSON has synchronized **Text** and editable **Tree** views, including nested objects/arrays, key renaming, value/type editing, adding/removing entries, and collapsing branches. Invalid JSON stays editable in Text view until corrected. Commit a renamed key with Enter or by leaving the field.
- Response assertions remain available under **Advanced options → Response assertions**; the separate Assertions tab has been removed.
- Local workspace persistence and retained run history.
- System CPU, memory, platform, uptime, and in-flight request monitoring.
- Theme persistence, workspace JSON backup/restore, CSV reports, keyboard-accessible dialogs, and layouts that adapt to smaller windows.
