// line and bar charts for the paged documents, drawn as SVG from a ```chart block (YAML):
//
//   type: line                 # line | bar
//   caption: What the figure shows.
//   x: { label: Pages, values: [1, 2, 4, 8] }
//   y: { label: Time (ms), min: 0 }   # min / max optional
//   series:
//     - { name: One column, values: [12, 20, 38, 75] }
//     - { name: Two columns, values: [14, 24, 45, 88] }
//
// sized for one text column (viewBox 1 unit ≈ 1 px at 96 dpi); a legend from two series on
import { parse as parseYaml } from 'yaml';

export interface ChartSpec {
	type?: 'line' | 'bar';
	caption?: string;
	x: { label?: string; values: (string | number)[] };
	y?: { label?: string; min?: number; max?: number };
	series: { name: string; values: number[] }[];
}

// categorical order, validated for adjacent series (dataviz reference palette, light surface)
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const INK = '#1a1a1a';
const MUTED = '#666666';
const GRID = '#e2e2e2';
const PAPER = '#fdfdfd';

const W = 320;
const H = 200;
const FONT = 9;

export function parseChart(source: string): ChartSpec {
	const spec = parseYaml(source) as ChartSpec;
	if (!spec?.x?.values?.length) throw new Error('x.values is missing');
	if (!spec.series?.length) throw new Error('series is missing');
	for (const s of spec.series) {
		if (s.values?.length !== spec.x.values.length) {
			throw new Error(`series "${s.name}" needs ${spec.x.values.length} values`);
		}
	}
	if (spec.series.length > SERIES.length) throw new Error(`at most ${SERIES.length} series`);
	return spec;
}

export function renderChart(spec: ChartSpec): string {
	const type = spec.type ?? 'line';
	const series = spec.series;
	const xs = spec.x.values;
	const values = series.flatMap((s) => s.values);

	const legend = series.length > 1;
	const top = legend ? 22 : 8;
	const left = 38;
	const right = 10;
	const bottom = spec.x.label ? 32 : 18;
	const plotW = W - left - right;
	const plotH = H - top - bottom;

	// bars grow from zero; lines span their data
	const low = spec.y?.min ?? (type === 'bar' ? Math.min(0, ...values) : Math.min(...values));
	const high = spec.y?.max ?? Math.max(...values);
	const ticks = niceTicks(low, high);
	const y0 = ticks[0];
	const y1 = ticks[ticks.length - 1];
	const y = (v: number) => top + plotH - ((v - y0) / (y1 - y0 || 1)) * plotH;

	// numeric x on a line chart is spaced by value, anything else evenly
	const numericX = type === 'line' && xs.every((v) => typeof v === 'number');
	const band = plotW / xs.length;
	const x = (i: number) =>
		numericX
			? left + (((xs[i] as number) - (xs[0] as number)) / ((xs[xs.length - 1] as number) - (xs[0] as number) || 1)) * plotW
			: type === 'bar'
				? left + band * (i + 0.5)
				: left + (xs.length > 1 ? (i / (xs.length - 1)) * plotW : plotW / 2);

	const parts: string[] = [];

	// grid and y ticks: recessive, behind the data
	for (const t of ticks) {
		parts.push(`<line x1="${left}" x2="${W - right}" y1="${r(y(t))}" y2="${r(y(t))}" stroke="${GRID}" stroke-width="1"/>`);
		parts.push(text(left - 5, y(t) + FONT / 3, formatTick(t), { anchor: 'end', fill: MUTED }));
	}
	xs.forEach((v, i) => parts.push(text(x(i), top + plotH + FONT + 4, String(v), { anchor: 'middle', fill: MUTED })));
	if (spec.x.label) parts.push(text(left + plotW / 2, H - 4, spec.x.label, { anchor: 'middle', fill: INK }));
	if (spec.y?.label) {
		parts.push(
			`<text transform="translate(9 ${r(top + plotH / 2)}) rotate(-90)" text-anchor="middle" font-size="${FONT}" fill="${INK}">${esc(spec.y.label)}</text>`
		);
	}

	if (type === 'bar') {
		// grouped bars, 2 px paper gap between neighbours, rounded at the data end only
		const gap = 2;
		const groupW = band * 0.72;
		const barW = (groupW - gap * (series.length - 1)) / series.length;
		const base = y(Math.max(y0, Math.min(0, y1)));
		series.forEach((s, k) => {
			s.values.forEach((v, i) => {
				const bx = x(i) - groupW / 2 + k * (barW + gap);
				parts.push(
					`<path d="${barPath(bx, base, barW, y(v))}" fill="${SERIES[k]}"><title>${esc(`${s.name}, ${xs[i]}: ${v}`)}</title></path>`
				);
			});
		});
	} else {
		series.forEach((s, k) => {
			const points = s.values.map((v, i) => `${r(x(i))},${r(y(v))}`).join(' ');
			parts.push(`<polyline points="${points}" fill="none" stroke="${SERIES[k]}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`);
			s.values.forEach((v, i) => {
				parts.push(
					`<circle cx="${r(x(i))}" cy="${r(y(v))}" r="3.5" fill="${SERIES[k]}" stroke="${PAPER}" stroke-width="1.5"><title>${esc(`${s.name}, ${xs[i]}: ${v}`)}</title></circle>`
				);
			});
		});
	}

	// baseline on top of the grid
	parts.push(`<line x1="${left}" x2="${W - right}" y1="${r(top + plotH)}" y2="${r(top + plotH)}" stroke="${MUTED}" stroke-width="1"/>`);

	if (legend) {
		let lx = left;
		series.forEach((s, k) => {
			parts.push(`<rect x="${r(lx)}" y="4" width="10" height="10" rx="2" fill="${SERIES[k]}"/>`);
			parts.push(text(lx + 14, 12.5, s.name, { fill: INK }));
			lx += 14 + s.name.length * FONT * 0.5 + 12;
		});
	}

	const label = `${type} chart${spec.caption ? `: ${spec.caption}` : ''}`;
	return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" font-size="${FONT}">${parts.join('')}</svg>`;
}

// about five round steps (1, 2, 2.5, 5 × 10^n) covering [low, high]
function niceTicks(low: number, high: number): number[] {
	if (low === high) {
		low -= 1;
		high += 1;
	}
	const raw = (high - low) / 5;
	const magnitude = 10 ** Math.floor(Math.log10(raw));
	const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!;
	const ticks: number[] = [];
	for (let t = Math.floor(low / step) * step; t <= Math.ceil(high / step) * step + step / 2; t += step) {
		ticks.push(Number(t.toPrecision(12)));
	}
	return ticks;
}

function barPath(x: number, base: number, w: number, top: number): string {
	const h = base - top;
	const rad = Math.max(0, Math.min(4, w / 2, Math.abs(h)));
	const s = Math.sign(h) || 1; // negative values hang below the baseline, rounded at the bottom
	return [
		`M${r(x)},${r(base)}`,
		`V${r(top + s * rad)}`,
		`Q${r(x)},${r(top)} ${r(x + rad)},${r(top)}`,
		`H${r(x + w - rad)}`,
		`Q${r(x + w)},${r(top)} ${r(x + w)},${r(top + s * rad)}`,
		`V${r(base)}Z`
	].join('');
}

function text(x: number, y: number, value: string, o: { anchor?: string; fill: string }): string {
	return `<text x="${r(x)}" y="${r(y)}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''} fill="${o.fill}">${esc(value)}</text>`;
}

function formatTick(v: number): string {
	return Math.abs(v) >= 10000 ? v.toLocaleString('en') : String(v);
}

const r = (v: number) => Math.round(v * 10) / 10;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
