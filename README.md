# llmsmap-txt

**Composable context for LLM-readable websites.**

Turn any website into a structured, selectable content map that AI agents can read in 2 requests:

1. **Read the map** — a hierarchical index with token counts and descriptions
2. **Fetch exactly what's needed** — compose a single URL with the sections you want

No more dumping an entire site into one file. No more useless tables of contents. Just the content the AI actually needs.

## Quick Start

```bash
npx llmsmap-txt generate --url https://yoursite.com --key YOUR_FIRECRAWL_API_KEY
```

This crawls your site and produces a `.llmsmap/` directory:

```
.llmsmap/
├── llmsmap.txt          # The map (hierarchical index)
├── manifest.json        # Full metadata for all sections
├── content/             # Pre-rendered markdown per page
│   ├── _root.md
│   ├── docs.md
│   ├── docs/
│   │   ├── getting-started.md
│   │   └── api-reference.md
│   └── ...
└── fetch/               # Deployable endpoint handlers
    ├── vercel.js
    ├── worker.js
    ├── express.js
    └── README.md
```

## What the AI Sees

**Request 1 — Read the map:**

```
GET https://yoursite.com/llmsmap.txt
```

```markdown
# Your Site
> Description of your site.

> Fetch endpoint: https://yoursite.com/llms/fetch
> Usage: GET https://yoursite.com/llms/fetch?sections=/path1,/path2&format=md

> Total: ~45,000 tokens | 23 pages

---

## /docs/getting-started  ~3,000 tokens  Updated 2026-01-15
> Quickstart tutorials for integrating the platform.

## /docs/api-reference  ~18,000 tokens  Updated 2026-02-01
> Complete endpoint documentation with examples.
  ### /docs/api-reference/auth  ~5,000 tokens  Updated 2026-01-28
  > OAuth2 flows, API keys, and token management.
  ### /docs/api-reference/payments  ~8,000 tokens  Updated 2026-02-01
  > Creating charges, refunds, and payment intents.
```

**Request 2 — Fetch the sections it needs:**

```
GET https://yoursite.com/llms/fetch?sections=/docs/api-reference/auth,/docs/api-reference/payments&format=md
```

Returns the full markdown content for just those sections.

## Installation

```bash
npm install -g llmsmap-txt
```

Or use directly with npx:

```bash
npx llmsmap-txt generate --url https://example.com --key fc-your-key
```

## Commands

### `generate`

Crawl a site and produce the `.llmsmap/` output.

```bash
llmsmap-txt generate --url https://example.com --key YOUR_KEY
```

| Flag | Description | Default |
|------|-------------|---------|
| `--url <url>` | Site URL to crawl | from config |
| `--key <key>` | Firecrawl API key | `$FIRECRAWL_API_KEY` |
| `--output <dir>` | Output directory | `.llmsmap` |
| `--include <patterns...>` | URL patterns to include | all |
| `--exclude <patterns...>` | URL patterns to exclude | admin, api, login |
| `--max-pages <n>` | Maximum pages to crawl | 100 |
| `--config <path>` | Config file path | auto-detected |

### `init`

Create a config file interactively.

```bash
llmsmap-txt init --url https://example.com --key YOUR_KEY
```

### `serve`

Start a local dev server to test the output.

```bash
llmsmap-txt serve --port 3456
```

Endpoints:
- `GET /llmsmap.txt` — the index
- `GET /manifest.json` — full metadata
- `GET /llms/fetch?sections=/path1,/path2&format=md` — fetch content

## Configuration

Create `llmsmap.config.json` in your project root:

```json
{
  "url": "https://yoursite.com",
  "firecrawlApiKey": "fc-your-key",
  "outputDir": ".llmsmap",
  "exclude": ["/admin/*", "/api/*", "/login*", "/sitemap.xml"],
  "maxPages": 100,
  "maxDepth": 5,
  "siteName": "Your Site",
  "siteDescription": "What your site is about"
}
```

Also supports `llmsmap.config.js` and `llmsmap.config.mjs`.

**Resolution order:** CLI flags > environment variables > config file > defaults.

**Environment variables:**
- `FIRECRAWL_API_KEY` — Firecrawl API key
- `LLMSMAP_URL` — Site URL

## Fetch Endpoint API

```
GET /llms/fetch?sections=/docs/auth,/docs/payments&format=md&updated_after=2026-01-01
```

| Param | Type | Description |
|-------|------|-------------|
| `sections` | comma-separated paths | Sections to fetch (required) |
| `format` | `md` \| `txt` \| `json` | Output format (default: `md`) |
| `updated_after` | ISO date | Only return sections updated after this date |

### Response (markdown)

```markdown
<!-- llmsmap-txt fetch | 2 sections | 13000 tokens -->

--- section: /docs/auth ---
title: Authentication
tokens: 5000
lastUpdated: 2026-01-28
---

[full markdown content]

--- section: /docs/payments ---
title: Payments
tokens: 8000
lastUpdated: 2026-02-01
---

[full markdown content]
```

### Response (JSON)

```json
{
  "sections": [
    {
      "path": "/docs/auth",
      "title": "Authentication",
      "tokenCount": 5000,
      "lastUpdated": "2026-01-28",
      "content": "..."
    }
  ],
  "totalTokens": 5000
}
```

## Deploying the Fetch Endpoint

The `generate` command produces ready-to-deploy handlers in `.llmsmap/fetch/`.

### Vercel

1. Copy `.llmsmap/` to `public/.llmsmap/`
2. Copy `fetch/vercel.js` to `api/llms/fetch.js`
3. Deploy

### Cloudflare Workers

1. Upload `.llmsmap/` contents to KV or R2
2. Deploy `fetch/worker.js` with the storage binding

### Express

```js
import { llmsmapFetch } from './fetch/express.js'

app.use('/llms/fetch', llmsmapFetch({ baseDir: '.llmsmap' }))
```

### Static Only

No endpoint needed — serve `llmsmap.txt` and the `content/` files statically. The AI can construct direct file URLs from the map.

## Library API

```typescript
import { generate, loadConfig, crawlSite, buildTree, countTokens } from 'llmsmap-txt'

// Full pipeline
const config = await loadConfig({ url: 'https://example.com', key: 'fc-...' })
const stats = await generate(config)

// Or use individual modules
import { createHandler } from 'llmsmap-txt/handler'
const handler = createHandler('.llmsmap')
const response = handler({ sections: '/docs,/api', format: 'json' })
```

## How It Works

1. **Crawl** — Firecrawl's crawl API discovers all pages by following links and converts HTML to clean markdown
2. **Index** — URLs are organized into a hierarchical tree with token counts rolled up to parent nodes
3. **Generate** — Produces `llmsmap.txt` (the map), `manifest.json` (metadata), individual content files, and deployable fetch handlers
4. **Serve** — The fetch endpoint resolves requested sections to content files and returns composed markdown

## Requirements

- Node.js 18+
- [Firecrawl](https://firecrawl.dev) API key (free tier available)

## License

MIT
