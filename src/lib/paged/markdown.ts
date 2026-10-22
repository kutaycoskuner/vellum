// markdown with frontmatter for the paged documents (/homework, /report)
import { marked } from 'marked';
import { parse as parseYaml } from 'yaml';

// "---\n<yaml>\n---\n<markdown>"; without frontmatter the whole file is the body
export function splitFrontmatter(text: string): { meta: Record<string, any>; body: string } {
	const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/);
	const meta = (match ? parseYaml(match[1]) : null) ?? {};
	return { meta, body: match ? match[2] : text };
}

// math is cut out before markdown runs (marked would eat its backslashes and underscores)
// and put back as \( \) / \[ \] for MathJax; code spans and blocks are left untouched.
// a line reading \newpage becomes <div class="page-break">, which paginate() obeys
export function renderMarkdown(source: string): string {
	const math: string[] = [];
	const keep = (tex: string, display: boolean) => {
		const escaped = tex.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		math.push(display ? `\\[${escaped}\\]` : `\\(${escaped}\\)`);
		return `%%MATH${math.length - 1}%%`;
	};

	const text = source
		.replace(/^[ \t]*\\newpage[ \t]*$/gm, '\n<div class="page-break"></div>\n')
		.replace(
			/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)|\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<!\\)\$([^$\n]+?)\$/g,
			(all, code, display, bracket, paren, inline) => {
				if (code) return code;
				if (display ?? bracket) return keep(display ?? bracket, true);
				return keep(paren ?? inline, false);
			}
		);

	const html = marked.parse(text, { async: false }) as string;
	return html.replace(/%%MATH(\d+)%%/g, (_, i) => math[Number(i)]);
}

// MathJax comes from the CDN script in +layout.svelte and may not have run yet
export async function typesetMath(el: HTMLElement) {
	const w = window as any;
	for (let i = 0; i < 50 && !w.MathJax?.startup?.promise; i++) {
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	if (!w.MathJax?.startup?.promise) {
		console.warn('MathJax not loaded, math stays as TeX source');
		return;
	}
	await w.MathJax.startup.promise;
	await w.MathJax.typesetPromise([el]);
}

// heights are only final once every image has loaded (or failed)
export async function waitForImages(el: HTMLElement): Promise<HTMLImageElement[]> {
	const images = [...el.querySelectorAll('img')];
	await Promise.all(
		images.map((img) =>
			img.complete
				? null
				: new Promise((resolve) => {
						img.addEventListener('load', resolve, { once: true });
						img.addEventListener('error', resolve, { once: true });
					})
		)
	);
	return images.filter((img) => !img.naturalWidth);
}
