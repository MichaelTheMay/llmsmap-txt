import { z } from 'zod'

export const FetchEndpointSchema = z.object({
  path: z.string().default('/llms/fetch'),
  cors: z.boolean().default(true),
})

export const ConfigSchema = z.object({
  url: z.string().url(),
  outputDir: z.string().default('.llmsmap'),
  firecrawlApiKey: z.string().optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).default(['/admin/*', '/api/*', '/login*', '/sitemap.xml', '/atom', '/feed', '/rss']),
  maxPages: z.number().default(500),
  maxDepth: z.number().default(5),
  tokenModel: z.enum(['cl100k_base', 'o200k_base']).default('cl100k_base'),
  siteName: z.string().optional(),
  siteDescription: z.string().optional(),
  fetchEndpoint: FetchEndpointSchema.default({}),
})

export type Config = z.infer<typeof ConfigSchema>
export type FetchEndpoint = z.infer<typeof FetchEndpointSchema>
