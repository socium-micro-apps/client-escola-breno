import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    testTimeout: 20000,
    // Tests touch the DB; rodar em série evita corrida entre suites
    fileParallelism: false,
  },
});
