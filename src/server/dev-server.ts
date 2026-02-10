import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import chalk from 'chalk'
import { createHandler } from './handler.js'

export async function startDevServer(outputDir: string, port: number): Promise<void> {
  const baseDir = resolve(process.cwd(), outputDir)

  if (!existsSync(resolve(baseDir, 'manifest.json'))) {
    throw new Error(`No manifest.json found in ${outputDir}. Run 'llmsmap-txt generate' first.`)
  }

  const handler = createHandler(baseDir)

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`)
    const pathname = url.pathname

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      })
      res.end()
      return
    }

    // Serve llmsmap.txt
    if (pathname === '/llmsmap.txt') {
      const filePath = resolve(baseDir, 'llmsmap.txt')
      if (existsSync(filePath)) {
        res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
        res.end(readFileSync(filePath, 'utf-8'))
        return
      }
    }

    // Serve manifest.json
    if (pathname === '/manifest.json') {
      const filePath = resolve(baseDir, 'manifest.json')
      if (existsSync(filePath)) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
        res.end(readFileSync(filePath, 'utf-8'))
        return
      }
    }

    // Fetch endpoint
    if (pathname === '/llms/fetch') {
      const params = {
        sections: url.searchParams.get('sections') ?? undefined,
        format: url.searchParams.get('format') ?? undefined,
        updated_after: url.searchParams.get('updated_after') ?? undefined,
      }

      const result = handler(params)
      res.writeHead(result.status, result.headers)
      res.end(result.body)
      return
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  })

  return new Promise((resolvePromise) => {
    server.listen(port, () => {
      console.log(chalk.green(`\n  Server running at http://localhost:${port}\n`))
      console.log(chalk.dim(`  Endpoints:`))
      console.log(chalk.dim(`    GET /llmsmap.txt`))
      console.log(chalk.dim(`    GET /manifest.json`))
      console.log(chalk.dim(`    GET /llms/fetch?sections=/path1,/path2`))
      console.log('')
    })
  })
}
