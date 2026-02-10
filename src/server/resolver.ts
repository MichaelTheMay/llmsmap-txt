import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Manifest, ManifestSection } from '../generator/manifest-writer.js'

export interface ResolvedSection extends ManifestSection {
  content: string
}

export function loadManifest(baseDir: string): Manifest {
  const manifestPath = resolve(baseDir, 'manifest.json')
  if (!existsSync(manifestPath)) {
    throw new Error('manifest.json not found in ' + baseDir)
  }
  return JSON.parse(readFileSync(manifestPath, 'utf-8')) as Manifest
}

export function resolveSections(
  manifest: Manifest,
  baseDir: string,
  paths: string[],
  options: {
    updatedAfter?: string
  } = {},
): ResolvedSection[] {
  const results: ResolvedSection[] = []
  const seen = new Set<string>()

  for (const pattern of paths) {
    // Expand wildcards: /docs/* matches all sections under /docs/
    const matchingPaths = expandPattern(pattern, Object.keys(manifest.sections))

    for (const path of matchingPaths) {
      if (seen.has(path)) continue
      seen.add(path)

      const section = manifest.sections[path]
      if (!section) continue

      if (options.updatedAfter && section.lastUpdated < options.updatedAfter) continue

      const contentPath = resolve(baseDir, section.contentFile)
      if (!existsSync(contentPath)) continue

      const content = readFileSync(contentPath, 'utf-8')
      results.push({ ...section, content })
    }
  }

  return results
}

/**
 * Search all sections for a keyword and return matching sections.
 */
export function searchSections(
  manifest: Manifest,
  baseDir: string,
  query: string,
  options: {
    updatedAfter?: string
    limit?: number
  } = {},
): ResolvedSection[] {
  const queryLower = query.toLowerCase()
  const limit = options.limit ?? 10

  // Score and rank results instead of returning first N matches
  const scored: Array<{ section: ResolvedSection; score: number }> = []

  for (const [path, section] of Object.entries(manifest.sections)) {
    // Skip root page and very large pages (feeds, aggregates) — they match everything
    if (path === '/') continue
    if (section.tokenCount > 50000) continue

    if (options.updatedAfter && section.lastUpdated < options.updatedAfter) continue

    const contentPath = resolve(baseDir, section.contentFile)
    if (!existsSync(contentPath)) continue

    const content = readFileSync(contentPath, 'utf-8')

    // Score: path/title matches rank higher than content-only matches
    let score = 0
    if (path.toLowerCase().includes(queryLower)) score += 10
    if (section.title.toLowerCase().includes(queryLower)) score += 8
    if (section.description.toLowerCase().includes(queryLower)) score += 5
    if (content.toLowerCase().includes(queryLower)) {
      // Count occurrences for relevance ranking
      const occurrences = content.toLowerCase().split(queryLower).length - 1
      score += Math.min(occurrences, 20) // cap at 20 to avoid huge pages dominating
    }

    if (score > 0) {
      scored.push({ section: { ...section, content }, score })
    }
  }

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(s => s.section)
}

/**
 * Expand a path pattern with wildcards into matching manifest paths.
 * /docs/* → all paths starting with /docs/
 * /docs → exact match only
 */
function expandPattern(pattern: string, allPaths: string[]): string[] {
  if (!pattern.includes('*')) {
    return [pattern]
  }

  const regex = new RegExp(
    '^' + pattern.replace(/\*/g, '.*') + '$'
  )

  return allPaths.filter(p => regex.test(p)).sort()
}
