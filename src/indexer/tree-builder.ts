import type { ProcessedPage } from '../crawler/types.js'
import type { TreeNode } from './types.js'

export function buildTree(pages: ProcessedPage[]): TreeNode {
  // Sort pages by path depth (shallow first)
  const sorted = [...pages].sort((a, b) => {
    const aDepth = a.path.split('/').filter(Boolean).length
    const bDepth = b.path.split('/').filter(Boolean).length
    return aDepth - bDepth || a.path.localeCompare(b.path)
  })

  // Find root page
  const rootPage = sorted.find(p => p.path === '/')
  const root: TreeNode = {
    path: '/',
    title: rootPage?.title ?? 'Home',
    description: rootPage?.description ?? '',
    tokenCount: rootPage?.tokenCount ?? 0,
    lastUpdated: rootPage?.lastUpdated ?? new Date().toISOString().split('T')[0],
    children: [],
    contentFile: rootPage ? '_root.md' : undefined,
    depth: 0,
  }

  // Insert all non-root pages
  for (const page of sorted) {
    if (page.path === '/') continue
    insertNode(root, page)
  }

  return root
}

function insertNode(root: TreeNode, page: ProcessedPage): void {
  const segments = page.path.split('/').filter(Boolean)
  let current = root

  // Walk/create intermediate nodes
  for (let i = 0; i < segments.length - 1; i++) {
    const partialPath = '/' + segments.slice(0, i + 1).join('/')
    let child = current.children.find(c => c.path === partialPath)

    if (!child) {
      // Create intermediate node (no content)
      child = {
        path: partialPath,
        title: segmentToTitle(segments[i]),
        description: '',
        tokenCount: 0,
        lastUpdated: page.lastUpdated,
        children: [],
        depth: i + 1,
      }
      current.children.push(child)
    }

    current = child
  }

  // Create or update the leaf node
  const existing = current.children.find(c => c.path === page.path)
  if (existing) {
    existing.title = page.title
    existing.description = page.description
    existing.tokenCount = page.tokenCount
    existing.lastUpdated = page.lastUpdated
    existing.contentFile = pathToContentFile(page.path)
  } else {
    current.children.push({
      path: page.path,
      title: page.title,
      description: page.description,
      tokenCount: page.tokenCount,
      lastUpdated: page.lastUpdated,
      children: [],
      contentFile: pathToContentFile(page.path),
      depth: segments.length,
    })
  }
}

function segmentToTitle(segment: string): string {
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export function pathToContentFile(path: string): string {
  if (path === '/') return '_root.md'

  const segments = path.split('/').filter(Boolean)
  const last = segments.pop()!

  if (segments.length === 0) {
    return `${last}.md`
  }

  return `${segments.join('/')}/${last}.md`
}
