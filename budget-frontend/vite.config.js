import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Output folder relative to this config file
    outDir: path.resolve(__dirname, '../budget-backend/dist') // <-- parent directory
  }
})
