import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
        '/api/qt': {
            target: 'https://qt.gtimg.cn',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/qt/, '')
        },
        '/api/em/mob': {
            target: 'https://fundmobapi.eastmoney.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/em\/mob/, '')
        },
        '/api/em/f10': {
            target: 'https://fundf10.eastmoney.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/em\/f10/, '')
        },
        '/api/em/gz': {
            target: 'http://fundgz.1234567.com.cn',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/em\/gz/, '')
        }
    }
  }
})
