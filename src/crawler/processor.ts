import type { ScrapedPage, ProcessedPage } from './types.js'
import { countTokens } from '../utils/tokens.js'

export function processPages(pages: ScrapedPage[], baseUrl: string): ProcessedPage[] {
  return pages.map(page => processPage(page, baseUrl))
}

function processPage(page: ScrapedPage, baseUrl: string): ProcessedPage {
  const path = urlToPath(page.url, baseUrl)
  const markdown = cleanMarkdown(page.markdown)
  const rawTitle = page.title ?? extractTitle(markdown) ?? pathToTitle(path)
  const title = cleanTitle(rawTitle)
  // Prefer content-extracted description over meta description
  // (meta description is often the same site-wide OG description)
  const description = extractDescription(markdown) ?? page.description ?? ''

  return {
    url: page.url,
    path,
    title,
    description,
    markdown,
    tokenCount: countTokens(markdown),
    lastUpdated: new Date().toISOString().split('T')[0],
  }
}

function urlToPath(url: string, baseUrl: string): string {
  const base = new URL(baseUrl)
  const page = new URL(url)

  // Get relative path from base
  let path = page.pathname
  if (path === '/' || path === '') return '/'

  // Remove trailing slash
  if (path.endsWith('/') && path.length > 1) {
    path = path.slice(0, -1)
  }

  return path
}

function cleanMarkdown(markdown: string): string {
  return markdown
    // Remove excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    // Remove common navigation artifacts
    .replace(/^\[Skip to .*?\]\(.*?\)\n*/m, '')
    .trim()
}

function extractTitle(markdown: string): string | null {
  const match = markdown.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

function extractDescription(markdown: string): string | null {
  // Look for first paragraph after any heading
  const lines = markdown.split('\n')
  let foundHeading = false
  for (const line of lines) {
    if (line.startsWith('#')) {
      foundHeading = true
      continue
    }
    if (foundHeading && line.trim() && !line.startsWith('#') && !line.startsWith('!') && !line.startsWith('[')) {
      const desc = line.trim()
      if (desc.length > 10 && desc.length < 300) {
        return desc
      }
    }
  }
  return null
}

function pathToTitle(path: string): string {
  if (path === '/') return 'Home'
  const segment = path.split('/').filter(Boolean).pop() ?? ''
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Strip common site-name suffixes from page titles.
 * "Getting Started | Vercel Docs" → "Getting Started"
 * "Home - My Site" → "Home"
 */
function cleanTitle(title: string): string {
  return title
    .replace(/\s*[|–—-]\s*[^|–—-]+$/, '')
    .trim() || title
}
