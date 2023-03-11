import path from 'node:path';

import reactPlugin from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactPlugin()],
  resolve: {
    alias: {
      '~api': path.resolve(__dirname, '../api/src'),
    },
  },
  server: {
    port: 5176,
  },
});
