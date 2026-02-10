import type { ScrapedPage } from './types.js'

const CONCURRENCY = 5
const FIRECRAWL_API = 'https://api.firecrawl.dev/v1/scrape'

export async function scrapePages(
  apiKey: string,
  urls: string[],
  onProgress?: (completed: number, total: number) => void,
): Promise<ScrapedPage[]> {
  const results: ScrapedPage[] = []
  const total = urls.length

  // Process in batches for concurrency control
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.allSettled(
      batch.map(url => scrapeSingle(apiKey, url)),
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value)
      }
    }

    onProgress?.(Math.min(i + CONCURRENCY, total), total)
  }

  return results
}

interface FirecrawlScrapeResponse {
  success: boolean
  data?: {
    markdown?: string
    metadata?: {
      title?: string
      description?: string
      statusCode?: number
    }
  }
  error?: string
}

async function scrapeSingle(
  apiKey: string,
  url: string,
): Promise<ScrapedPage | null> {
  try {
    const response = await fetch(FIRECRAWL_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    })

    if (!response.ok) return null

    const result = await response.json() as FirecrawlScrapeResponse

    if (!result.success || !result.data?.markdown) {
      return null
    }

    return {
      url,
      markdown: result.data.markdown,
      title: result.data.metadata?.title,
      description: result.data.metadata?.description,
      statusCode: result.data.metadata?.statusCode,
    }
  } catch {
    return null
  }
}
