import { loadManifest, resolveSections, searchSections } from './resolver.js'
import { formatResponse, type Format } from './formats.js'
import type { Manifest } from '../generator/manifest-writer.js'

export interface FetchRequest {
  sections?: string
  search?: string
  format?: string
  updated_after?: string
  limit?: string
}

export interface FetchResponse {
  status: number
  headers: Record<string, string>
  body: string
}

/**
 * Platform-agnostic fetch handler.
 * Use this in any runtime by providing the base directory.
 */
export function createHandler(baseDir: string) {
  let manifest: Manifest | null = null

  return function handleFetch(params: FetchRequest): FetchResponse {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    }

    if (!params.sections && !params.search) {
      return {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'sections or search parameter required' }),
      }
    }

    // Lazy-load manifest
    if (!manifest) {
      try {
        manifest = loadManifest(baseDir)
      } catch {
        return {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'manifest.json not found' }),
        }
      }
    }

    const format = (params.format ?? 'md') as Format
    const updatedAfter = params.updated_after

    let sections

    if (params.search) {
      // Search mode
      const limit = params.limit ? parseInt(params.limit, 10) : 10
      sections = searchSections(manifest, baseDir, params.search, {
        updatedAfter,
        limit,
      })
    } else {
      // Section fetch mode (supports wildcards)
      const paths = params.sections!.split(',').map(s => s.trim())
      sections = resolveSections(manifest, baseDir, paths, {
        updatedAfter,
      })
    }

    const { body, contentType } = formatResponse(sections, format)

    return {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': contentType },
      body,
    }
  }
}
