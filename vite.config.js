import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages รัน Jekyll ซึ่งไม่เผยแพร่ไฟล์ที่ชื่อขึ้นต้นด้วย "_"
// (เช่น _commonjs-dynamic-modules ที่ rollup แยกออกมาเวลาทำ code splitting)
// -> ตัด "_" หน้าชื่อ chunk ออก กัน 404 บนเว็บ คู่กับ public/.nojekyll
const stripLeadingUnderscore = (name) => (name || 'chunk').replace(/^_+/, '') || 'chunk'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  base: '/EFT_TaskTrack/',
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: (chunk) => `assets/${stripLeadingUnderscore(chunk.name)}-[hash].js`,
      },
    },
  },
})
