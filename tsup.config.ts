import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      cli: 'src/cli.ts',
      'server/handler': 'src/server/handler.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'node18',
    banner: ({ format }) => {
      // Add shebang to CLI entry
      return {}
    },
    onSuccess: async () => {
      // Add shebang to CLI output
      const fs = await import('fs')
      const cliPath = './dist/cli.js'
      if (fs.existsSync(cliPath)) {
        const content = fs.readFileSync(cliPath, 'utf-8')
        if (!content.startsWith('#!/')) {
          fs.writeFileSync(cliPath, `#!/usr/bin/env node\n${content}`)
        }
      }
    },
  },
])
