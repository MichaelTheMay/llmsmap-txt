import { Command } from 'commander'
import { writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import chalk from 'chalk'

export const initCommand = new Command('init')
  .description('Initialize llmsmap-txt configuration')
  .option('--url <url>', 'Site URL to map')
  .option('--key <key>', 'Firecrawl API key')
  .action(async (opts: { url?: string; key?: string }) => {
    const configPath = resolve(process.cwd(), 'llmsmap.config.json')

    if (existsSync(configPath)) {
      console.log(chalk.yellow('Config file already exists: llmsmap.config.json'))
      return
    }

    const config: Record<string, unknown> = {}

    if (opts.url) {
      config.url = opts.url
    } else {
      console.log(chalk.red('--url is required. Usage: llmsmap-txt init --url https://example.com'))
      process.exit(1)
    }

    if (opts.key) {
      config.firecrawlApiKey = opts.key
    }

    config.outputDir = '.llmsmap'
    config.exclude = ['/admin/*', '/api/*', '/login*']
    config.maxPages = 100

    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
    console.log(chalk.green('Created llmsmap.config.json'))
    console.log(chalk.dim('Next: llmsmap-txt generate'))
  })
