import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { loadConfig } from '../../core/config-loader.js'
import { generate } from '../../generator/output.js'

export const generateCommand = new Command('generate')
  .description('Crawl site and generate llmsmap output')
  .option('--url <url>', 'Site URL to map')
  .option('--key <key>', 'Firecrawl API key')
  .option('--output <dir>', 'Output directory', '.llmsmap')
  .option('--include <patterns...>', 'URL patterns to include')
  .option('--exclude <patterns...>', 'URL patterns to exclude')
  .option('--max-pages <n>', 'Maximum pages to crawl', (v: string) => parseInt(v, 10))
  .option('--config <path>', 'Config file path')
  .action(async (opts) => {
    try {
      const config = await loadConfig({
        url: opts.url,
        key: opts.key,
        output: opts.output,
        include: opts.include,
        exclude: opts.exclude,
        maxPages: opts.maxPages,
        config: opts.config,
      })

      if (!config.firecrawlApiKey) {
        console.log(chalk.red('Firecrawl API key required. Use --key or set FIRECRAWL_API_KEY'))
        process.exit(1)
      }

      console.log(chalk.bold(`\nllmsmap-txt generate`))
      console.log(chalk.dim(`URL: ${config.url}`))
      console.log(chalk.dim(`Output: ${config.outputDir}\n`))

      const spinner = ora('Crawling site...').start()

      await generate(config, {
        onCrawlProgress(status, completed, total) {
          spinner.text = `Crawling site... ${completed}/${total} pages (${status})`
        },
        onCrawlComplete(count) {
          spinner.succeed(`Crawled ${count} pages`)
          spinner.start('Building index...')
        },
        onComplete(stats) {
          spinner.succeed('Build complete')
          console.log('')
          console.log(chalk.green(`  llmsmap.txt:    ${stats.indexSize} bytes`))
          console.log(chalk.green(`  manifest.json:  ${stats.manifestSize} bytes`))
          console.log(chalk.green(`  content files:  ${stats.contentFiles}`))
          console.log(chalk.green(`  total tokens:   ${stats.totalTokens.toLocaleString()}`))
          console.log('')
          console.log(chalk.dim(`Output: ${config.outputDir}/`))
        },
      })
    } catch (err) {
      console.error(chalk.red(`\nError: ${err instanceof Error ? err.message : err}`))
      process.exit(1)
    }
  })
