// vite.config.ts
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'assets/**/*'], // 音や画像もキャッシュする
      manifest: {
        name: '霧隠の侍',
        short_name: '霧隠',
        description: '侍アクションゲーム',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone', // ブラウザのバーを消して全画面アプリにする設定
        orientation: 'landscape', // 横画面固定（対応ブラウザのみ）
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // 画像や音声ファイル(mp3)もキャッシュ対象にする
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MBまで許容
      }
    })
  ]
});