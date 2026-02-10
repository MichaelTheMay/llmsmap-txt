import type { TreeNode } from './types.js'

/**
 * Recursively aggregate token counts and dates up the tree.
 * Parent nodes get the sum of children tokens + own tokens,
 * and the most recent lastUpdated date.
 */
export function aggregateTree(node: TreeNode): TreeNode {
  if (node.children.length === 0) return node

  // Recurse first
  node.children = node.children.map(aggregateTree)

  // Sort children alphabetically by path
  node.children.sort((a, b) => a.path.localeCompare(b.path))

  // Aggregate tokens from children
  const childTokens = node.children.reduce((sum, c) => sum + c.tokenCount, 0)
  node.tokenCount = node.tokenCount + childTokens

  // Use most recent date
  const dates = [node.lastUpdated, ...node.children.map(c => c.lastUpdated)]
    .filter(Boolean)
    .sort()
    .reverse()
  if (dates.length > 0) {
    node.lastUpdated = dates[0]
  }

  return node
}
