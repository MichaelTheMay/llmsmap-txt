import type { TreeNode } from './types.js'

interface RenderOptions {
  siteName?: string
  siteDescription?: string
  fetchEndpoint?: string
}

/**
 * Render the tree to llmsmap.txt markdown format.
 */
export function renderIndex(root: TreeNode, options: RenderOptions = {}): string {
  const lines: string[] = []

  // Header
  const title = options.siteName ?? root.title
  lines.push(`# ${title}`)
  if (options.siteDescription ?? root.description) {
    lines.push(`> ${options.siteDescription ?? root.description}`)
  }
  lines.push('')

  // Fetch endpoint info
  if (options.fetchEndpoint) {
    lines.push(`> Fetch endpoint: ${options.fetchEndpoint}`)
    lines.push(`> Usage: GET ${options.fetchEndpoint}?sections=/path1,/path2&format=md`)
    lines.push('')
  }

  // Total stats
  lines.push(`> Total: ~${formatTokens(root.tokenCount)} tokens | ${countLeaves(root)} pages`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // Render root content entry if it exists
  if (root.contentFile) {
    lines.push(`## /  ~${formatTokens(root.tokenCount - childTokens(root))} tokens  Updated ${root.lastUpdated}`)
    if (root.description) {
      lines.push(`> ${root.description}`)
    }
    lines.push('')
  }

  // Render children
  for (const child of root.children) {
    renderNode(child, lines, 2)
  }

  return lines.join('\n')
}

function renderNode(node: TreeNode, lines: string[], headingLevel: number): void {
  const prefix = headingLevel <= 6 ? '#'.repeat(headingLevel) : '  '.repeat(headingLevel - 2) + '-'
  const indent = headingLevel > 2 ? '  '.repeat(headingLevel - 2) : ''

  lines.push(`${indent}${prefix} ${node.path}  ~${formatTokens(node.tokenCount)} tokens  Updated ${node.lastUpdated}`)

  if (node.description) {
    lines.push(`${indent}> ${node.description}`)
  }

  for (const child of node.children) {
    renderNode(child, lines, headingLevel + 1)
  }

  if (node.children.length > 0 || headingLevel === 2) {
    lines.push('')
  }
}

function formatTokens(count: number): string {
  if (count >= 1000) {
    return `${Math.round(count / 1000).toLocaleString()},000`
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
