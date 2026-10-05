import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      // Client code imports bare '@deepseek-ai/*' externals that the DSH
      // loader supplies at runtime; tests run on node so map them to local
      // stubs that only exercise our own code paths.
      { find: /^@deepseek-ai\/dsh-typert-protocol$/, replacement: `${root}tests/stubs/typert-protocol.ts` },
      { find: /^@deepseek-ai\/cordis$/, replacement: `${root}tests/stubs/cordis.ts` },
      { find: /^@deepseek-ai\/schemastery$/, replacement: `${root}tests/stubs/schemastery.ts` },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
    testTimeout: 20_000,
  },
})
