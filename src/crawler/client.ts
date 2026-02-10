import FirecrawlApp from '@mendable/firecrawl-js'

let cachedClient: FirecrawlApp | null = null

export function createFirecrawlClient(apiKey: string): FirecrawlApp {
  if (cachedClient) return cachedClient
  cachedClient = new FirecrawlApp({ apiKey })
  return cachedClient
}

export function resetClient(): void {
  cachedClient = null
}
