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

  for (const path of paths) {
    const section = manifest.sections[path]
    if (!section) continue

    if (options.updatedAfter && section.lastUpdated < options.updatedAfter) continue

    const contentPath = resolve(baseDir, section.contentFile)
    if (!existsSync(contentPath)) continue

    const content = readFileSync(contentPath, 'utf-8')
    results.push({ ...section, content })
  }

  return results
}
