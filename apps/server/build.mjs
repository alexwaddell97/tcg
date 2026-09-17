import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'

const { dependencies } = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'))

// Bundle the shared game rules; keep normal server dependencies in node_modules.
// This also resolves their .ts imports without emitting files into shared/src.
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: Object.keys(dependencies).filter(name => name !== '@tcg/shared'),
  sourcemap: true,
  logLevel: 'info',
})
