import { Command } from 'commander'
import { initCommand } from './cli/commands/init.js'
import { generateCommand } from './cli/commands/generate.js'
import { serveCommand } from './cli/commands/serve.js'

const program = new Command()

program
  .name('llmsmap-txt')
  .description('Composable context for LLM-readable websites')
  .version('0.1.0')

program.addCommand(initCommand)
program.addCommand(generateCommand)
program.addCommand(serveCommand)

program.parse()
