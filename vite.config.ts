import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import {resolve} from 'path'

export default defineConfig({
    plugins: [
        react(),
        dts({
            tsconfigPath: resolve(__dirname, 'tsconfig.app.json'),
            entryRoot: resolve(__dirname, 'src'),
            exclude: [
                'src/main.tsx',
                'src/app.tsx',
                'src/**/*.test.ts',
                'src/**/*.test.tsx',
                'src/test-utils/**',
            ],
        }),
    ],
    publicDir: false,
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'EvadePlayerReact',
            formats: ['es'],
            fileName: 'evade-player.react',
        },
        rollupOptions: {
            external: [
                'react',
                'react-dom',
                'react/jsx-runtime',
                'lucide-react',
                '@videojs/react',
                '@videojs/react/video',
                '@videojs/react/media/hls-video',
                '@videojs/react/icons',
            ],
        },
    },
})
