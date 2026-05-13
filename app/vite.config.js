import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { fileURLToPath } from 'node:url'

const resolveModule = (path) => fileURLToPath(new URL(path, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    alias: [
      { find: /^buffer\/?$/, replacement: resolveModule("./node_modules/buffer/index.js") },
      { find: /^process\/?$/, replacement: resolveModule("./node_modules/process/browser.js") },
      { find: /^util\/?$/, replacement: resolveModule("./node_modules/util/util.js") },
      { find: "stream", replacement: resolveModule("./node_modules/stream-browserify/index.js") },
      { find: "crypto", replacement: resolveModule("./node_modules/crypto-browserify/index.js") },
      { find: "fs", replacement: resolveModule("./src/shims/empty.js") },
      { find: "vm", replacement: resolveModule("./src/shims/empty.js") },
    ],
  },
  define: {
    global: "globalThis",
    "process.browser": "true",
    "process.version": "\"v18.0.0\"",
    "process.env": {},
  },
})
