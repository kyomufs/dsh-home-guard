/**
 * esbuild bundling for the two runtime faces, then `tsc` declaration emit.
 * The DSH loader supplies the runtime externals below from the core package
 * tree — plugin node_modules cannot resolve them, so they MUST stay external.
 */
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const external = [
  // Host ESM: cordis + every dsh-* service package are loader-provided.
  // react* are never imported by the host face but stay external for safety.
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-*',
  'react',
  'react-dom',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'scheduler',
]

mkdirSync('lib', { recursive: true })

// Host face: ESM, node22. zod + @deepseek-ai/schemastery are BUNDLED
// (the Loader validates exports.Config against the schema at call time).
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  external,
  logLevel: 'warning',
})

// Typert manifest face: tiny ESM file the loader reads via the './typert' export.
await build({
  entryPoints: ['src/typert.host.ts'],
  outfile: 'lib/typert.host.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  external,
  logLevel: 'warning',
})

// Client face: CJS for the browser shell's ModuleLoader (banner/footer mirror
// the dsh-notification client bundle). react + @deepseek-ai/* are
// loader-provided; the app code itself is bundled.
await build({
  entryPoints: ['src/client/index.ts'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  external,
  jsx: 'automatic',
  banner: {
    js: "window.__ModuleLoader__.load({ id: 'dsh-home-guard', factory: (require) => { var module = { exports: {} }; var exports = module.exports;",
  },
  footer: {
    js: 'return module.exports; } });',
  },
  logLevel: 'warning',
})

// Declaration emit for the './exports' types path.
execFileSync('node', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], { stdio: 'inherit' })

console.log('dsh-home-guard build complete: lib/index.js + lib/typert.host.js + lib/client.js + lib/types/')
