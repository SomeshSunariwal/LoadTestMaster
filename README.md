# LoadMaster

LoadMaster is a Windows desktop application for API load testing. It sends real HTTP requests from your machine, simulates concurrent users, and shows how your APIs perform under load through live response times, throughput, and error metrics.

Organize endpoints into collections, reuse environment variables, configure traffic patterns, and review saved results without leaving the app. A browser development mode is also available.

## Tech stack

| Area                   | Technologies                                        | Purpose                                                                        |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Desktop application    | Electrobun 2                                        | Native window, application packaging, and typed RPC between the UI and backend |
| Frontend               | React 19, TypeScript 7                              | Application screens, state, and shared types                                   |
| Build tooling          | Vite 8                                              | Frontend development server and production builds                              |
| Styling and UI         | Tailwind CSS 4, custom CSS, Radix UI, React Icons   | Themes, layouts, dialogs, and icons                                            |
| Charts and layout      | Recharts, React Grid Layout, React Resizable Panels | Live charts, movable dashboard widgets, and resizable panels                   |
| Request editor         | CodeMirror 6, React CodeMirror                      | JSON editing, validation, and variable completion                              |
| Backend                | Bun, TypeScript, Fetch API                          | Load generation, metrics, and a local HTTP service for browser development     |
| Validation and storage | Zod, local JSON and gzip-compressed text logs        | Workspace validation, saved configuration, history, and request logs           |
| Quality tools          | Bun Test, TypeScript, Prettier                      | Automated tests, type checking, and formatting                                 |

Exact dependency versions and available commands are defined in [package.json](./package.json).

## How to use it

### 1. Install and launch

To run from source, use Windows with **Node.js 22.12 or newer** and **npm** installed. The project includes Bun and Electrobun as development dependencies.

From the project folder, install dependencies and prepare the desktop tooling:

```powershell
npm install
npm run prepare:desktop
```

Launch the desktop application:

```powershell
npm run dev:desktop
```

For browser development, start the frontend and local backend together:

```powershell
npm run dev
```

Then open [http://127.0.0.1:5173](http://127.0.0.1:5173). The backend listens on `127.0.0.1:4319` by default. The development launcher supplies the token used by the frontend proxy to authenticate backend requests.

### 2. Configure an environment

On a new installation, LoadMaster starts with an empty workspace: no environments, collections, APIs, or test history. Open **Environments**, create your first environment, and add a `baseUrl` variable with your API server's address. Add other variables such as `authToken` or `productId` as needed. New environments start with no variables.

Use variables in request fields with double braces:

```text
URL:          {{baseUrl}}/api/products/{{productId}}
Bearer token: {{authToken}}
```

Start your own API server and use its address. LoadMaster does not include sample collections, predefined environments, or a demo API server. The request examples above are documentation only.

### 3. Create a collection and add APIs

Open **Collections**, create a collection, and choose its environment. Add each API with a name, HTTP method, and URL. New APIs start with an empty URL, headers, parameters, and body.

Configure query parameters, headers, authentication, and the request body as needed. For example, a JSON POST body can contain environment variables:

```json
{
  "productId": "{{productId}}",
  "quantity": 1
}
```

For GraphQL, supply the request payload and headers expected by your server. Configure expected status codes and response-text checks under **Advanced options → Response assertions**. Save the API when finished.

### 4. Configure the load

Set the collection's load configuration, then save it. APIs inherit collection settings as **Global**. To apply individual overrides, turn off **Use collection configuration** in the API editor; the API table then shows **Own API**.

Choose **User-based** to simulate users sending batches and waiting for responses. Choose **Target TPS** to schedule request starts at a chosen rate independently of response completion. Existing saved configurations keep User-based mode.

In Target TPS mode, enter the target, ramp-up time, duration, and timeout. One transaction means one HTTP request. The target is shared across APIs inheriting this configuration; requests are distributed evenly between them. APIs with their own configurations run with their own mode and target. The collection duration remains the overall run limit.

Enable **Send parallel requests** to start one second of target traffic together. At 900 TPS with no ramp up, the app starts 900 requests concurrently, then schedules another 900 one second later even if earlier requests are still waiting. Each request still follows its own timeout. With the toggle off, requests are spaced individually. The app does not impose a fixed in-flight request cap; actual rates can still be affected by the computer, network, and target service. Missed starts after an event-loop stall are discarded instead of accumulated into a catch-up burst.

Target TPS ignores the User-based settings for virtual users, iterations, request delay, per-user parallelism, rate limit, and random pauses. Those settings are preserved when switching modes. The dashboard shows the target, actual request starts per second, and completed requests per second.

Live metrics and the request breakdown refresh every **100 ms**. Graphs refresh every **1 second**, with a final update when a run pauses or ends. Request rates use a rolling one-second window so faster refreshes do not inflate TPS for parallel batches. Recent history retains one-second samples; older history is compacted into 10-second, one-minute, and five-minute samples to preserve the full run while keeping dashboard updates small.

The four time-based graphs have a linked **1m | 5m | 30m | 1H | 3H | 8H | All** selector, defaulting to **All**. Changing it on any of them updates all four for the selected run. Time windows follow the latest test time, or the end of a completed run. **All** covers the entire recorded run. Response time distribution always shows all requests and has no time selector. The request breakdown table and summary cards also show run totals. Older saved runs retain only the history originally recorded.

Hover over any time-based graph to highlight the same timestamp and show its values across Requests per second, Response time, Outstanding Requests, and CPU Utilization.

The dashboard arranges reports in three rows: Requests per second and Response time; Outstanding Requests and CPU Utilization; Response time distribution and Request breakdown. Outstanding Requests counts requests waiting for a response in the selected run. CPU Utilization measures the machine generating the load. Both series are saved with run history; older runs without these measurements show no recorded data. Reports stack vertically on smaller screens and remain movable and resizable.

| Setting                      | Meaning                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| Virtual users                | Number of simulated users, up to 1,000                                                               |
| Ramp up                      | Time in seconds to bring users online                                                                |
| Duration                     | Maximum test duration in seconds; finite iterations may finish earlier                               |
| Iterations per user          | Request batches per user for each API; `-1` repeats until the duration ends                          |
| Request timeout              | Maximum wait for an individual response, in milliseconds; `1000` ms is one second                   |
| Request delay                | Fixed pause after each request batch, in milliseconds                                                |
| Parallel requests / API      | Requests each user sends simultaneously in a batch, from 1 to 20                                     |
| Rate limit                   | Maximum request-start rate in requests per second; `0` disables the cap                              |
| Random pause between batches | Optional random pause added to Request delay to simulate pauses between user actions; off by default |

The Global rate limit is shared by APIs using collection settings within a run. APIs with their own settings have separate rate limits. The engine does not impose a fixed cap on in-flight requests.

### 5. Run and inspect results

1. Choose **Run selected APIs** or **Run all APIs** in the collection.
2. Follow the run's Dashboard tab for live metrics, charts, and per-endpoint results.
3. Use **Pause**, **Resume**, or **Stop** to control the run. Pausing freezes test time while already-started requests can finish; stopping cancels outstanding requests.
4. Open an endpoint's **Logs** control to inspect recent request and response details.
5. Reopen completed or stopped results from **History**. Use **Export CSV** for endpoint metrics and the log download control for saved request logs after a run ends.

Up to **four tests** can run concurrently. Closing a Dashboard tab keeps its test running and preserves saved results. The app starts on the Dashboard welcome page; historical results open when you select them.

### 6. Save and restore your workspace

Collections, environments, settings, and retained test history are stored locally in `%APPDATA%\LoadMaster`. Development and packaged versions use the same data folder.

The app loads an existing workspace on subsequent launches. Packaging includes the application code and UI; it does not copy your saved workspace, credentials, history, or logs into the distribution. Each new Windows user starts with an empty workspace and creates their own data.

In **Settings**, use **Export workspace** to download a JSON backup or **Import workspace** to paste a backup and replace the current workspace. Backups include collections, environment variables, and settings. Test history and request log files are stored separately. History retention defaults to 30 runs and can be set from 1 to 100.

## Features

- **API collections:** Create, rename, delete, and search collections; choose individual APIs or run the entire collection.
- **HTTP request configuration:** GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS; query parameters, custom headers, bearer/basic authentication, and redirect control.
- **Request bodies:** JSON, XML, raw text, GraphQL payloads, and multipart forms with text fields and file uploads up to 512 KB per file, subject to the combined body-size limit.
- **JSON editing:** Syntax highlighting, live validation, formatting, text wrapping, and synchronized Text and editable Tree views for nested objects and arrays.
- **Reusable environments:** Nested `{{variable}}` references across URLs, parameters, headers, authentication, and bodies; autocomplete and highlighted references. Missing or circular references fail before a run starts.
- **Flexible traffic:** User-based and Target TPS modes, collection defaults, per-API overrides, paced or parallel batch scheduling, ramp up, duration, virtual users, iterations, timeouts, rate limits, delays, and optional random pauses between batches.
- **Response assertions:** Expected status codes and response-text checks to identify failed requests.
- **Live results:** Requests per second, bytes per second, success/error rates, average latency, approximate P95/P99 latency, response-time distributions, and endpoint breakdowns. Percentiles use 5 ms histogram buckets.
- **Concurrent testing:** Separate Dashboard tabs for up to four active tests, with pause, resume, and stop controls.
- **Request diagnostics:** Live request/response previews with sensitive headers masked. The viewer shows up to 100 requests per API within a 200-request run buffer and limits body previews to 4,096 characters. These previews last for the current app session; request/response pairs are also written to downloadable text log files.
- **History and reports:** Locally retained run results, CSV exports, and downloadable request logs. Desktop CSV and log downloads are saved to the user's Downloads folder.
- **System monitoring:** CPU utilization, system memory, platform, uptime, and in-flight requests from the machine running the backend.
- **Customizable workspace:** Dark/light themes, movable metric cards and charts, resizable graphs and panel dividers, adjustable History columns, and saved layout preferences. **Reset layout** restores the default dashboard arrangement.
- **Local persistence:** Workspace backup/restore, configurable history retention, and keyboard-accessible dialogs and resize controls.

## Development and packaging

| Command                | Purpose                                                                         |
| ---------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`          | Start the browser UI and local backend together                                 |
| `npm run dev:desktop`  | Prepare tooling, build the desktop UI, and launch the desktop app               |
| `npm run typecheck`    | Check TypeScript types                                                          |
| `npm test`             | Run the Bun test suite                                                          |
| `npm run check`        | Run type checking, tests, and a frontend production build                       |
| `npm run format:check` | Check formatting                                                                |
| `npm run build:view`   | Build the browser frontend into `dist/`                                         |
| `npm run build`        | Prepare tooling, check types, build the desktop UI, and package the application |

Windows release artifacts are generated in `artifacts/`. The build also prepares a portable application, normally launched with:

```powershell
.\build\portable\LoadMaster\bin\launcher.exe
```

If the existing portable app locks files needed by an update, packaging creates a separate `build/portable-ready-*` folder and prints the new launcher path.

The source is organized into `src/pages` and `src/components` for the UI, `src/backend` for the load engine and storage, `src/shared` for schemas and shared helpers, and `tests` for automated checks.
