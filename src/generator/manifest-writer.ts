import type { TreeNode } from '../indexer/types.js'

export interface ManifestSection {
  path: string
  title: string
  description: string
  tokenCount: number
  lastUpdated: string
  contentFile: string
  children: string[]
}

export interface Manifest {
  version: '1.0'
  generatedAt: string
  site: {
    name: string
    url: string
    description: string
  }
  totalTokens: number
  totalPages: number
  fetchEndpoint: string
  sections: Record<string, ManifestSection>
}

export function buildManifest(
  root: TreeNode,
  siteUrl: string,
  siteName: string,
  siteDescription: string,
  fetchEndpoint: string,
): Manifest {
  const sections: Record<string, ManifestSection> = {}
  flattenTree(root, sections)

  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    site: {
      name: siteName,
      url: siteUrl,
      description: siteDescription,
    },
    totalTokens: root.tokenCount,
    totalPages: Object.values(sections).filter(s => s.contentFile).length,
    fetchEndpoint,
    sections,
  }
}

function flattenTree(node: TreeNode, sections: Record<string, ManifestSection>): void {
  if (node.contentFile) {
    sections[node.path] = {
      path: node.path,
      title: node.title,
      description: node.description,
      tokenCount: node.tokenCount,
      lastUpdated: node.lastUpdated,
      contentFile: `content/${node.contentFile}`,
      children: node.children.map(c => c.path),
    }
  }

  for (const child of node.children) {
    flattenTree(child, sections)
  }
}
