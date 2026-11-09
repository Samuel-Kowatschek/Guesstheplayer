import { defineConfig } from 'vitest/config';

// GitHub Pages serves the site from /<repo-name>/. The workflow sets
// BASE_PATH; locally the app is served from the root.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
