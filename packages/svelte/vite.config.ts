import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        NodeModulesPolyfillPlugin(), // supports the use of Node.js built-in modules in the browser
      ],
    },
  },
  plugins: [
    svelte(),
  ],
  resolve: {
    alias: {
      // https://stackoverflow.com/questions/69286329/
      // Possible alternative: https://github.com/FredKSchott/rollup-plugin-polyfill-node
      'node:events': 'rollup-plugin-node-polyfills/polyfills/events',
    },
  },
  server: {
    port: 5171,
  },
});
