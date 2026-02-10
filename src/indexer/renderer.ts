import type { TreeNode } from './types.js'

interface RenderOptions {
  siteName?: string
  siteDescription?: string
  fetchEndpoint?: string
  siteUrl?: string
}

/**
 * Render the tree to llmsmap.txt markdown format.
 */
export function renderIndex(root: TreeNode, options: RenderOptions = {}): string {
  const lines: string[] = []
  const title = options.siteName ?? root.title
  const siteUrl = options.siteUrl ?? ''
  const fetchEndpoint = options.fetchEndpoint ?? ''

  // === AI INSTRUCTIONS (top of file) ===
  if (fetchEndpoint) {
    lines.push('# INSTRUCTIONS FOR AI AGENTS')
    lines.push('')
    lines.push(`You are reading the structured content map for **${title}**${siteUrl ? ` (${siteUrl})` : ''}.`)
    lines.push('This file gives you a complete overview of every page on this site, organized hierarchically with token counts and timestamps.')
    lines.push('')
    lines.push('**Do NOT crawl this site page by page.** Instead, follow these steps:')
    lines.push('')
    lines.push('### Step 1: Identify Relevant Sections')
    lines.push('Scan the **Site Map** below. Each entry shows a page path, title, token count, and last-updated date.')
    lines.push('Identify which sections are relevant to the user\'s question or your current task.')
    lines.push('')
    lines.push('### Step 2: Compose a Single Fetch Request')
    lines.push('Use the fetch endpoint to retrieve the full markdown content of the sections you need:')
    lines.push('')
    lines.push('```')
    lines.push(`GET ${fetchEndpoint}?sections=/path1,/path2,/path3`)
    lines.push('```')
    lines.push('')
    lines.push('You can request **multiple sections in one call** by comma-separating the paths.')
    lines.push('')
    lines.push('### Step 3: Use Wildcards for Entire Directories')
    lines.push('To fetch all pages under a directory, use `*`:')
    lines.push('')
    lines.push('```')
    const exDir = collectFirstDir(root) || '/docs'
    lines.push(`GET ${fetchEndpoint}?sections=${exDir}/*`)
    lines.push('```')
    lines.push('')
    lines.push('### Step 4: Search by Keyword (when you don\'t know the exact path)')
    lines.push('If you\'re unsure which sections are relevant, search by keyword:')
    lines.push('')
    lines.push('```')
    lines.push(`GET ${fetchEndpoint}?search=your+keyword&limit=5`)
    lines.push('```')
    lines.push('')
    lines.push('This returns the top-scoring sections matching your query, ranked by relevance.')
    lines.push('')
    lines.push('### Full Parameter Reference')
    lines.push('')
    lines.push('| Parameter | Type | Default | Description |')
    lines.push('|-----------|------|---------|-------------|')
    lines.push('| `sections` | comma-separated paths | — | Exact paths from the site map. Supports `*` wildcards. |')
    lines.push('| `search` | string | — | Keyword search across all page content. Returns ranked results. |')
    lines.push('| `format` | `md` \\| `txt` \\| `json` | `md` | Response format. Use `md` for readable content, `json` for structured data. |')
    lines.push('| `updated_after` | `YYYY-MM-DD` | — | Only return sections updated after this date. |')
    lines.push('| `limit` | number | `10` | Maximum results for `search` queries. |')
    lines.push('')
    lines.push('> Use either `sections` OR `search` per request, not both.')
    lines.push('> Total cost: **2 HTTP requests** — (1) this map, (2) your fetch call.')
    lines.push('')

    // === Quick examples ===
    const examplePaths = collectLeafPaths(root, 3)
    if (examplePaths.length >= 2) {
      lines.push('### Quick Examples')
      lines.push('')
      lines.push(`Fetch two specific pages: \`${fetchEndpoint}?sections=${examplePaths[0]},${examplePaths[1]}\``)
      lines.push('')
      lines.push(`Fetch entire directory: \`${fetchEndpoint}?sections=${exDir}/*\``)
      lines.push('')
      lines.push(`Search for a topic: \`${fetchEndpoint}?search=getting+started&limit=3\``)
      lines.push('')
      lines.push(`Get everything: \`${fetchEndpoint}?sections=/*\``)
      lines.push('')
    }

    lines.push('---')
    lines.push('')
  }

  // === CREDITS ===
  lines.push(`# ${title}`)
  if (options.siteDescription ?? root.description) {
    lines.push(`> ${options.siteDescription ?? root.description}`)
  }
  lines.push('')
  lines.push(`> Built with [llmsmap-txt](https://github.com/MichaelTheMay/llmsmap-txt) by [Michael May](https://linkedin.com/in/michael-a-may) ([GitHub](https://github.com/MichaelTheMay))`)
  lines.push('')

  // === FOR HUMANS SECTION ===
  lines.push('---')
  lines.push('')
  lines.push('## What is llmsmap-txt?')
  lines.push('')
  lines.push('**llmsmap-txt** is an open-source tool that makes any website AI-readable using a two-step **Composable Context** model:')
  lines.push('')
  lines.push('1. **The Map** (this file): A hierarchical index of every page on the site with titles, descriptions, token counts, and timestamps.')
  lines.push('2. **The Fetch Endpoint**: An API that returns the full markdown content of any combination of pages in a single request.')
  lines.push('')
  lines.push('### Why is this better than crawling?')
  lines.push('')
  lines.push('When an AI agent needs information from a website, it typically has two bad options:')
  lines.push('')
  lines.push('- **Read `llms.txt`**: Gets a brief table of contents — not enough to answer detailed questions.')
  lines.push('- **Crawl page by page**: Slow, expensive, and wastes tokens on irrelevant pages.')
  lines.push('')
  lines.push('**llmsmap-txt solves this** by letting the AI see the entire site structure first, then surgically')
  lines.push('fetch only the exact pages it needs. Two HTTP requests total, regardless of site size.')
  lines.push('')
  lines.push('### For site owners')
  lines.push('')
  lines.push('Add llmsmap-txt to your site with one command:')
  lines.push('```')
  lines.push('npx llmsmap-txt generate --url https://yoursite.com --key YOUR_FIRECRAWL_KEY')
  lines.push('```')
  lines.push('Deploy the generated files and fetch endpoint to make your site AI-optimized.')
  lines.push('See the [GitHub repo](https://github.com/MichaelTheMay/llmsmap-txt) for full documentation.')
  lines.push('')
  lines.push('---')
  lines.push('')

  // === Site overview stats ===
  lines.push('## Site Map')
  lines.push('')
  lines.push(`> **${countLeaves(root)} pages** | **~${formatTokens(root.tokenCount)} tokens** total`)
  lines.push('')

  // === Hierarchical tree ===
  // Render root if it has content
  if (root.contentFile) {
    const ownTokens = root.tokenCount - childTokens(root)
    lines.push(`- **/** — ${root.title}  (~${formatTokens(ownTokens)} tokens, updated ${root.lastUpdated})`)
    if (root.description) {
      lines.push(`  > ${root.description}`)
    }
  }

  // Render all children as a clean tree
  for (const child of root.children) {
    renderNode(child, lines, 0)
  }

  lines.push('')
  return lines.join('\n')
}

function renderNode(node: TreeNode, lines: string[], indent: number): void {
  const pad = '  '.repeat(indent)
  const hasChildren = node.children.length > 0
  const isLeaf = !hasChildren && node.contentFile

  // Show token count: for directories show aggregate, for leaves show own
  const tokenStr = `~${formatTokens(node.tokenCount)} tokens`
  const bullet = hasChildren ? `${pad}- **${node.path}/**` : `${pad}- **${node.path}**`

  if (isLeaf) {
    lines.push(`${bullet} — ${node.title}  (${tokenStr}, updated ${node.lastUpdated})`)
  } else if (hasChildren) {
    lines.push(`${bullet} — ${node.title}  (${tokenStr} across ${countLeaves(node)} pages)`)
  } else {
    lines.push(`${bullet} — ${node.title}  (${tokenStr})`)
  }

  if (node.description) {
    lines.push(`${pad}  > ${node.description}`)
  }

  for (const child of node.children) {
    renderNode(child, lines, indent + 1)
  }
}

function formatTokens(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`.replace('.0k', 'k')
  }
  return count.toLocaleString()
}

function countLeaves(node: TreeNode): number {
  if (node.children.length === 0) return node.contentFile ? 1 : 0
  return node.children.reduce((sum, c) => sum + countLeaves(c), node.contentFile ? 1 : 0)
}

function childTokens(node: TreeNode): number {
  return node.children.reduce((sum, c) => sum + c.tokenCount, 0)
}

function collectLeafPaths(node: TreeNode, max: number, paths: string[] = []): string[] {
  if (paths.length >= max) return paths
  if (node.contentFile && node.path !== '/') {
    paths.push(node.path)
  }
  for (const child of node.children) {
    if (paths.length >= max) break
    collectLeafPaths(child, max, paths)
  }
  return paths
}

function collectFirstDir(node: TreeNode): string | null {
  for (const child of node.children) {
    if (child.children.length > 0) {
      return child.path
    }
  }
  return null
}
