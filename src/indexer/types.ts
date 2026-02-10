export interface TreeNode {
  path: string
  title: string
  description: string
  tokenCount: number
  lastUpdated: string
  children: TreeNode[]
  contentFile?: string
  depth: number
}
