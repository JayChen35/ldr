import { defineConfig } from 'vite';

// If deploying to https://<user>.github.io/ava/ keep base as '/ava/'.
// If you ever deploy this at the domain root, change to '/'.
export default defineConfig({
  base: '/ava/',
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: 0,
  },
  server: {
    host: true,
  },
});
