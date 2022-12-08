import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import { resolve } from 'path'

export default defineConfig({
  server: {
    port: 3030
  },
  preview: {
    port: 8080
  },
  build: {
    lib: {
      entry: './lib/main.ts',
      name: 'ByfFaceSdk',
      formats: ['es'],
      fileName: 'byf-face-sdk'
    },
    // rollupOptions: {
    //   // 确保外部化处理那些你不想打包进库的依赖
    //   external: ['face-api.js'],
    //   output: {
    //     // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
    //     globals: {
    //       faceapi: 'faceapi'
    //     }
    //   }
    // }
  },
  plugins: [
    vue({
      // template: {
      //   compilerOptions: {
      //     // 将所有带短横线的标签名都视为自定义元素
      //     isCustomElement: (tag) => tag.includes('-')
      //   }
      // }
      reactivityTransform: true
    })
  ],
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})
