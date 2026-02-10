import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import type { ProcessedPage } from '../crawler/types.js'
import { pathToContentFile } from '../indexer/tree-builder.js'

export function writeContentFiles(
  pages: ProcessedPage[],
  outputDir: string,
): number {
  const contentDir = resolve(outputDir, 'content')
  mkdirSync(contentDir, { recursive: true })

  let count = 0
  for (const page of pages) {
    const filename = pathToContentFile(page.path)
    const filePath = resolve(contentDir, filename)

    // Ensure parent directories exist
    mkdirSync(dirname(filePath), { recursive: true })

    writeFileSync(filePath, page.markdown, 'utf-8')
    count++
  }

  return count
}
