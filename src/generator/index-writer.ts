import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { TreeNode } from '../indexer/types.js'
import { renderIndex } from '../indexer/renderer.js'

export function writeIndexFile(
  root: TreeNode,
  outputDir: string,
  options: {
    siteName?: string
    siteDescription?: string
    fetchEndpoint?: string
  },
): number {
  const content = renderIndex(root, options)
  const filePath = resolve(outputDir, 'llmsmap.txt')
  writeFileSync(filePath, content, 'utf-8')
  return Buffer.byteLength(content, 'utf-8')
}
