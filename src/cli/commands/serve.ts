import { Command } from 'commander'
import chalk from 'chalk'
import { startDevServer } from '../../server/dev-server.js'

export const serveCommand = new Command('serve')
  .description('Start local dev server for testing')
  .option('--port <n>', 'Port number', (v: string) => parseInt(v, 10), 3456)
  .option('--output <dir>', 'Output directory', '.llmsmap')
  .action(async (opts: { port: number; output: string }) => {
    console.log(chalk.bold(`\nllmsmap-txt serve`))
    console.log(chalk.dim(`Directory: ${opts.output}`))
    console.log(chalk.dim(`Port: ${opts.port}\n`))

    try {
      await startDevServer(opts.output, opts.port)
    } catch (err) {
      console.error(chalk.red(`\nError: ${err instanceof Error ? err.message : err}`))
      process.exit(1)
    }
  })
