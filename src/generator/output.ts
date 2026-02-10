import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Config } from '../core/config.js'
import { crawlSite } from '../crawler/mapper.js'
import { processPages } from '../crawler/processor.js'
import { buildTree } from '../indexer/tree-builder.js'
import { aggregateTree } from '../indexer/aggregator.js'
import { writeContentFiles } from './content-writer.js'
import { buildManifest } from './manifest-writer.js'
import { writeIndexFile } from './index-writer.js'
import { writeFetchHandlers } from './fetch-handler.js'

export interface GenerateCallbacks {
  onCrawlProgress?(status: string, completed: number, total: number): void
  onCrawlComplete?(count: number): void
  onComplete?(stats: GenerateStats): void
}

export interface GenerateStats {
  indexSize: number
  manifestSize: number
  contentFiles: number
  totalTokens: number
  totalPages: number
}

export async function generate(
  config: Config,
  callbacks: GenerateCallbacks = {},
): Promise<GenerateStats> {
  const outputDir = resolve(process.cwd(), config.outputDir)
  mkdirSync(outputDir, { recursive: true })

  // 1. Crawl site (discovers + scrapes in one step)
  const scraped = await crawlSite(
    config.firecrawlApiKey!,
    config,
    callbacks.onCrawlProgress,
  )
  callbacks.onCrawlComplete?.(scraped.length)

  // 2. Process pages
  const pages = processPages(scraped, config.url)

  // 3. Build tree
  let tree = buildTree(pages)
  tree = aggregateTree(tree)

  // 4. Write content files
  const contentFiles = writeContentFiles(pages, outputDir)

  // 5. Write manifest
  const siteName = config.siteName ?? tree.title
  const siteDesc = config.siteDescription ?? tree.description
  const fetchPath = config.fetchEndpoint.path
  const manifest = buildManifest(tree, config.url, siteName, siteDesc, fetchPath)
  const manifestJson = JSON.stringify(manifest, null, 2)
  writeFileSync(resolve(outputDir, 'manifest.json'), manifestJson, 'utf-8')
  const manifestSize = Buffer.byteLength(manifestJson, 'utf-8')

  // 6. Write llmsmap.txt index
  const indexSize = writeIndexFile(tree, outputDir, {
    siteName,
    siteDescription: siteDesc,
    fetchEndpoint: `${config.url}${fetchPath}`,
    siteUrl: config.url,
  })

  // 7. Write fetch handlers
  writeFetchHandlers(outputDir, fetchPath)

  const stats: GenerateStats = {
    indexSize,
    manifestSize,
    contentFiles,
    totalTokens: tree.tokenCount,
    totalPages: pages.length,
  }

  callbacks.onComplete?.(stats)

  return stats
}
