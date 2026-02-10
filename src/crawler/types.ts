export interface ScrapedPage {
  url: string
  markdown: string
  title?: string
  description?: string
  statusCode?: number
}

export interface ProcessedPage {
  url: string
  path: string
  title: string
  description: string
  markdown: string
  tokenCount: number
  lastUpdated: string
}
