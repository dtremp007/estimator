import { reactRouter } from '@react-router/dev/vite'
import { defineConfig } from 'vite'

const MODE = process.env.NODE_ENV

export default defineConfig({
	build: {
		cssMinify: MODE === 'production',

		rollupOptions: {
			external: [/node:.*/, 'stream', 'crypto', 'fsevents'],
		},

		sourcemap: true,
	},
	plugins: [reactRouter()],
})
