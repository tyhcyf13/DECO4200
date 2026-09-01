import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/DECO4200/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
