import { defineConfig } from 'vitest/config';

// Testes das regras puras do backend e do app (sem banco, sem React Native).
export default defineConfig({
  test: {
    include: ['backend/src/**/__tests__/**/*.test.ts', 'mobile/src/**/__tests__/**/*.test.ts'],
    environment: 'node',
  },
});
