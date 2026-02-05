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
            secure: false,
            rewrite: (path) => path.replace(/^\/api\/qt/, ''),
            headers: { 
                'Referer': 'https://qt.gtimg.cn',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.361'
            }
        },
        '/api/em/mob': {
            target: 'https://fundmobapi.eastmoney.com',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/api\/em\/mob/, ''),
            headers: { 
                'Referer': 'https://fundmobapi.eastmoney.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        },
        '/api/em/f10': {
            target: 'https://fundf10.eastmoney.com',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/api\/em\/f10/, ''),
            headers: { 
                'Referer': 'https://fundf10.eastmoney.com',
                'Origin': 'https://fundf10.eastmoney.com',
                'Host': 'fundf10.eastmoney.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        },
        '/api/em/gz': {
            target: 'http://fundgz.1234567.com.cn',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/api\/em\/gz/, ''),
            headers: { 
                'Referer': 'http://fundgz.1234567.com.cn',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }
    }
  }
})
