import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ConfigSchema, type Config } from './config.js'

interface CLIFlags {
  url?: string
  key?: string
  output?: string
  include?: string[]
  exclude?: string[]
  maxPages?: number
  config?: string
}

export async function loadConfig(flags: CLIFlags = {}): Promise<Config> {
  // 1. Load config file if it exists
  let fileConfig: Record<string, unknown> = {}
  const configPath = flags.config ?? findConfigFile()
  if (configPath) {
    fileConfig = await loadConfigFile(configPath)
  }

  // 2. Merge: CLI flags > env vars > config file > defaults
  const raw: Record<string, unknown> = {
    ...fileConfig,
  }

  // Env vars
  if (process.env.LLMSMAP_URL) raw.url = process.env.LLMSMAP_URL
  if (process.env.FIRECRAWL_API_KEY) raw.firecrawlApiKey = process.env.FIRECRAWL_API_KEY

  // CLI flags override everything
  if (flags.url) raw.url = flags.url
  if (flags.key) raw.firecrawlApiKey = flags.key
  if (flags.output) raw.outputDir = flags.output
  if (flags.include) raw.include = flags.include
  if (flags.exclude) raw.exclude = flags.exclude
  if (flags.maxPages) raw.maxPages = flags.maxPages

  return ConfigSchema.parse(raw)
}

function findConfigFile(): string | null {
  const names = [
    'llmsmap.config.js',
    'llmsmap.config.mjs',
    'llmsmap.config.json',
  ]
  for (const name of names) {
    const fullPath = resolve(process.cwd(), name)
    if (existsSync(fullPath)) return fullPath
  }
  return null
}

async function loadConfigFile(filePath: string): Promise<Record<string, unknown>> {
  const resolved = resolve(filePath)

  if (resolved.endsWith('.json')) {
    const content = readFileSync(resolved, 'utf-8')
    return JSON.parse(content) as Record<string, unknown>
  }

  // JS/MJS — dynamic import
  const fileUrl = pathToFileURL(resolved).href
  const mod = await import(fileUrl) as { default?: Record<string, unknown> }
  return (mod.default ?? mod) as Record<string, unknown>
}
