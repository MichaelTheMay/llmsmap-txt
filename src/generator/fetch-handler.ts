import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function writeFetchHandlers(outputDir: string, fetchPath: string): void {
  const fetchDir = resolve(outputDir, 'fetch')
  mkdirSync(fetchDir, { recursive: true })

  writeFileSync(resolve(fetchDir, 'vercel.js'), generateVercelHandler(fetchPath))
  writeFileSync(resolve(fetchDir, 'worker.js'), generateWorkerHandler())
  writeFileSync(resolve(fetchDir, 'express.js'), generateExpressHandler())
  writeFileSync(resolve(fetchDir, 'README.md'), generateDeployReadme(fetchPath))
}

function generateVercelHandler(fetchPath: string): string {
  return `// Vercel Serverless Function
// Deploy to: api${fetchPath}.js
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const BASE_DIR = resolve(process.cwd(), 'public', '.llmsmap')

export default function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { sections, format = 'md', updated_after } = req.query

  if (!sections) {
    return res.status(400).json({ error: 'sections parameter required' })
  }

  // Load manifest
  const manifestPath = resolve(BASE_DIR, 'manifest.json')
  if (!existsSync(manifestPath)) {
    return res.status(500).json({ error: 'manifest.json not found' })
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

  const paths = sections.split(',').map(s => s.trim())
  const results = []
  let totalTokens = 0

  for (const path of paths) {
    const section = manifest.sections[path]
    if (!section) continue

    if (updated_after && section.lastUpdated < updated_after) continue

    const contentPath = resolve(BASE_DIR, section.contentFile)
    if (!existsSync(contentPath)) continue

    const content = readFileSync(contentPath, 'utf-8')
    totalTokens += section.tokenCount

    results.push({ ...section, content })
  }

  if (format === 'json') {
    return res.json({ sections: results, totalTokens })
  }

  // Markdown format
  const lines = [\`<!-- llmsmap-txt fetch | \${results.length} sections | \${totalTokens} tokens -->\`]
  for (const r of results) {
    lines.push('')
    lines.push(\`--- section: \${r.path} ---\`)
    lines.push(\`title: \${r.title}\`)
    lines.push(\`tokens: \${r.tokenCount}\`)
    lines.push(\`lastUpdated: \${r.lastUpdated}\`)
    lines.push('---')
    lines.push('')
    lines.push(r.content)
  }

  res.setHeader('Content-Type', format === 'txt' ? 'text/plain' : 'text/markdown')
  res.send(lines.join('\\n'))
}
`
}

function generateWorkerHandler(): string {
  return `// Cloudflare Worker
// Reads from KV or R2 — adapt CONTENT_STORE to your binding
export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
      })
    }

    const sections = url.searchParams.get('sections')
    const format = url.searchParams.get('format') || 'md'
    const updatedAfter = url.searchParams.get('updated_after')

    if (!sections) {
      return new Response(JSON.stringify({ error: 'sections parameter required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Load manifest from KV/R2
    const manifestData = await env.CONTENT_STORE.get('.llmsmap/manifest.json')
    if (!manifestData) {
      return new Response(JSON.stringify({ error: 'manifest not found' }), { status: 500 })
    }
    const manifest = JSON.parse(manifestData)

    const paths = sections.split(',').map(s => s.trim())
    const results = []
    let totalTokens = 0

    for (const path of paths) {
      const section = manifest.sections[path]
      if (!section) continue
      if (updatedAfter && section.lastUpdated < updatedAfter) continue

      const content = await env.CONTENT_STORE.get('.llmsmap/' + section.contentFile)
      if (!content) continue

      totalTokens += section.tokenCount
      results.push({ ...section, content })
    }

    if (format === 'json') {
      return new Response(JSON.stringify({ sections: results, totalTokens }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const lines = [\`<!-- llmsmap-txt fetch | \${results.length} sections | \${totalTokens} tokens -->\`]
    for (const r of results) {
      lines.push('')
      lines.push(\`--- section: \${r.path} ---\`)
      lines.push(\`title: \${r.title}\`)
      lines.push(\`tokens: \${r.tokenCount}\`)
      lines.push(\`lastUpdated: \${r.lastUpdated}\`)
      lines.push('---')
      lines.push('')
      lines.push(r.content)
    }

    return new Response(lines.join('\\n'), {
      headers: {
        'Content-Type': format === 'txt' ? 'text/plain' : 'text/markdown',
        'Access-Control-Allow-Origin': '*',
      },
    })
  },
}
`
}

function generateExpressHandler(): string {
  return `// Express Middleware
// Usage: app.use('/llms/fetch', llmsmapFetch({ baseDir: '.llmsmap' }))
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export function llmsmapFetch({ baseDir = '.llmsmap' } = {}) {
  return (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    if (req.method === 'OPTIONS') return res.sendStatus(200)

    const sections = req.query.sections
    const format = req.query.format || 'md'
    const updatedAfter = req.query.updated_after

    if (!sections) {
      return res.status(400).json({ error: 'sections parameter required' })
    }

    const manifestPath = resolve(baseDir, 'manifest.json')
    if (!existsSync(manifestPath)) {
      return res.status(500).json({ error: 'manifest.json not found' })
    }
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

    const paths = sections.split(',').map(s => s.trim())
    const results = []
    let totalTokens = 0

    for (const path of paths) {
      const section = manifest.sections[path]
      if (!section) continue
      if (updatedAfter && section.lastUpdated < updatedAfter) continue

      const contentPath = resolve(baseDir, section.contentFile)
      if (!existsSync(contentPath)) continue

      const content = readFileSync(contentPath, 'utf-8')
      totalTokens += section.tokenCount
      results.push({ ...section, content })
    }

    if (format === 'json') {
      return res.json({ sections: results, totalTokens })
    }

    const lines = [\`<!-- llmsmap-txt fetch | \${results.length} sections | \${totalTokens} tokens -->\`]
    for (const r of results) {
      lines.push('')
      lines.push(\`--- section: \${r.path} ---\`)
      lines.push(\`title: \${r.title}\`)
      lines.push(\`tokens: \${r.tokenCount}\`)
      lines.push(\`lastUpdated: \${r.lastUpdated}\`)
      lines.push('---')
      lines.push('')
      lines.push(r.content)
    }

    res.type(format === 'txt' ? 'text/plain' : 'text/markdown')
    res.send(lines.join('\\n'))
  }
}
`
}

function generateDeployReadme(fetchPath: string): string {
  return `# Deploying the llmsmap-txt Fetch Handler

## Vercel

1. Copy \`vercel.js\` to \`api${fetchPath}.js\` in your project
2. Copy \`.llmsmap/\` to \`public/.llmsmap/\`
3. Deploy with \`vercel\`

## Cloudflare Workers

1. Create a KV namespace or R2 bucket
2. Upload \`.llmsmap/\` contents
3. Deploy \`worker.js\` with the binding

## Express

\`\`\`js
import express from 'express'
import { llmsmapFetch } from './fetch/express.js'

const app = express()
app.use('${fetchPath}', llmsmapFetch({ baseDir: '.llmsmap' }))
\`\`\`

## Static Files Only

If you can't deploy an endpoint, you can still serve \`llmsmap.txt\` and the \`content/\` files statically. The AI can construct direct file URLs from the map.
`
}
