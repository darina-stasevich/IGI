import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,

        proxy: {
            // Все запросы, начинающиеся с /api, будут перенаправлены на бэкенд
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true, // Необходимо для виртуальных хостов
            },
            // Все запросы, начинающиеся с /uploads, тоже перенаправляем
            '/uploads': {
                target: 'http://localhost:5000',
                changeOrigin: true,
            }
        }
    }
})