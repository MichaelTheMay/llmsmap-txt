import type { ResolvedSection } from './resolver.js'

export type Format = 'md' | 'txt' | 'json'

export function formatResponse(
  sections: ResolvedSection[],
  format: Format,
): { body: string; contentType: string } {
  const totalTokens = sections.reduce((sum, s) => sum + s.tokenCount, 0)

  if (format === 'json') {
    return {
      body: JSON.stringify({ sections, totalTokens }),
      contentType: 'application/json',
    }
  }

  const lines: string[] = [
    `<!-- llmsmap-txt fetch | ${sections.length} sections | ${totalTokens} tokens -->`,
  ]

  for (const s of sections) {
    lines.push('')
    lines.push(`--- section: ${s.path} ---`)
    lines.push(`title: ${s.title}`)
    lines.push(`tokens: ${s.tokenCount}`)
    lines.push(`lastUpdated: ${s.lastUpdated}`)
    lines.push('---')
    lines.push('')
    lines.push(s.content)
  }

  return {
    body: lines.join('\n'),
    contentType: format === 'txt' ? 'text/plain' : 'text/markdown',
  }
}
