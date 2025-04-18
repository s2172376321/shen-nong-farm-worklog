import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter()
	},
	preprocess: vitePreprocess(),
	vite: {
		build: {
			sourcemap: true
		},
		optimizeDeps: {
			exclude: ['html5-qrcode']
		}
	}
};

export default config; 