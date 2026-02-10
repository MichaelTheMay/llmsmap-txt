import type FirecrawlApp from '@mendable/firecrawl-js'
import type { Config } from '../core/config.js'
import type { ScrapedPage } from './types.js'

const FIRECRAWL_API = 'https://api.firecrawl.dev/v1'

/**
 * Discover and scrape all pages using Firecrawl's crawl API.
 * This follows links to discover pages that sitemap-only map misses.
 * Returns already-scraped pages (crawl does both discovery + scraping).
 */
export async function crawlSite(
  apiKey: string,
  config: Config,
  onProgress?: (status: string, completed: number, total: number) => void,
): Promise<ScrapedPage[]> {
  // Start crawl
  const startResponse = await fetch(`${FIRECRAWL_API}/crawl`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url: config.url,
      limit: config.maxPages,
      maxDepth: config.maxDepth,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
      },
    }),
  })

  if (!startResponse.ok) {
    throw new Error(`Firecrawl crawl failed: ${startResponse.status}`)
  }

  const startData = await startResponse.json() as { success: boolean; id?: string; error?: string }
  if (!startData.success || !startData.id) {
    throw new Error(`Firecrawl crawl failed: ${startData.error ?? 'unknown error'}`)
  }

  const crawlId = startData.id

  // Poll for completion
  while (true) {
    await delay(2000)

    const statusResponse = await fetch(`${FIRECRAWL_API}/crawl/${crawlId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })

    const statusData = await statusResponse.json() as {
      status: string
      completed: number
      total: number
      data?: Array<{
        markdown?: string
        metadata?: {
          sourceURL?: string
          title?: string
          description?: string
          statusCode?: number
        }
      }>
    }

    onProgress?.(statusData.status, statusData.completed, statusData.total)

    if (statusData.status === 'completed') {
      const pages: ScrapedPage[] = []

      for (const item of statusData.data ?? []) {
        if (!item.markdown || !item.metadata?.sourceURL) continue

        const url = item.metadata.sourceURL
        // Apply include/exclude filters
        if (config.include?.length && !config.include.some(p => matchGlob(url, p, config.url))) continue
        if (config.exclude.some(p => matchGlob(url, p, config.url))) continue

        pages.push({
          url,
          markdown: item.markdown,
          title: item.metadata.title,
          description: item.metadata.description,
          statusCode: item.metadata.statusCode,
        })
      }

      return pages
    }

    if (statusData.status === 'failed') {
      throw new Error('Firecrawl crawl failed')
    }
  }
}

/**
 * Simple URL-only discovery via Firecrawl map API.
 * Falls back option if crawl is not needed.
 */
export async function mapSite(
  client: FirecrawlApp,
  config: Config,
): Promise<string[]> {
  const result = await client.mapUrl(config.url, {
    limit: config.maxPages,
  }) as { success: boolean; links?: string[]; error?: string }

  if (!result.success || !result.links) {
    throw new Error(`Firecrawl map failed: ${result.error ?? 'unknown error'}`)
  }

  let urls = result.links

  if (config.include?.length) {
    urls = urls.filter(url => config.include!.some(pattern => matchGlob(url, pattern, config.url)))
  }
  if (config.exclude?.length) {
    urls = urls.filter(url => !config.exclude.some(pattern => matchGlob(url, pattern, config.url)))
  }

  return urls
}

function matchGlob(url: string, pattern: string, baseUrl: string): boolean {
  try {
    const urlObj = new URL(url)
    const path = urlObj.pathname
    const regex = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
    return new RegExp(`^${regex}$`).test(path)
  } catch {
    return false
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
