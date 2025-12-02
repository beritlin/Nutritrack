import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // 這行非常重要：讓原本程式碼中的 process.env.API_KEY 可以讀取到 Vercel 的環境變數
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env': process.env
    }
  }
})