import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': '/Users/nickyprusty/Work/Prompt Wars/social-benefit-app/prompt-wars-social-benefit-app',
    },
  },
});
