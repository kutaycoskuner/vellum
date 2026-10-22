import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

// personal data lives in .data/ (gitignored), placeholders in data.example/ (committed).
// /data/<path> is served from .data/<path> when that file exists, otherwise from
// data.example/<path>, so a fresh clone renders the examples. Nothing is created or copied
// here: .data/ is only made on request (pnpm data). Anything else falls through to static/;
// both folders are outside static/, so builds never include them.
function personalData(): Plugin {
	const dataDir = path.resolve('.data');
	const exampleDir = path.resolve('data.example');
	const types: Record<string, string> = {
		'.json': 'application/json',
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.svg': 'image/svg+xml',
		'.webp': 'image/webp'
	};

	// the file under `dir` for this url, or null (missing, a folder, or outside `dir`)
	const fileIn = (dir: string, url: string): string | null => {
		const file = path.resolve(dir, '.' + url);
		if (!file.startsWith(dir + path.sep)) return null;
		return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
	};

	return {
		name: 'personal-data',
		apply: 'serve',
		configureServer(server) {
			if (!fs.existsSync(dataDir)) {
				server.config.logger.info(
					'personal-data: no .data/ folder, pages show data.example/ (create your own with: pnpm data)'
				);
			}

			server.middlewares.use('/data', (req, res, next) => {
				const url = decodeURIComponent((req.url ?? '').split('?')[0]);
				const file = fileIn(dataDir, url) ?? fileIn(exampleDir, url);
				if (!file) return next();
				res.setHeader('Content-Type', types[path.extname(file).toLowerCase()] ?? 'text/plain');
				res.setHeader('Cache-Control', 'no-store');
				fs.createReadStream(file).pipe(res);
			});
		}
	};
}

export default defineConfig({
	plugins: [
		personalData(),
		tailwindcss(),
		sveltekit(),
		devtoolsJson()
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
