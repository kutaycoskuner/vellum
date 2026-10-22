<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { marked } from 'marked';
	import '@fontsource-variable/source-sans-3';
	import '@fontsource-variable/source-sans-3/wght-italic.css';
	import { renderMarkdown, splitFrontmatter, waitForImages } from '$lib/paged/markdown';
	import { paginate } from '$lib/paged/paginate';
	import './page.css';

	// a short A4 report from one markdown file: the frontmatter holds the company identity
	// (ci), customer and order; page 1 shows them with the order parameters and a generated
	// contents list, the markdown body follows from page 2 with numbered ## sections.
	// layout after the company's contract documents (logo top right, company footer,
	// "Page x of y"). The file is .data/report.md, or .data/<path> with /report?file=<path>.
	// every key is described in data.example/report.md
	interface Report {
		language?: string;
		title?: string; // without it, a leading # heading is the title, the next line the subtitle
		subtitle?: string;
		date?: string; // report date
		ci?: CorporateIdentity;
		customer?: { name?: string; contact?: string; address?: string; email?: string; phone?: string };
		order?: {
			product?: string;
			file?: string; // the product's file name, e.g. asm_shelf-h1800-w800-t2
			number?: string;
			date?: string;
			parameters?: Record<string, unknown>[]; // - Länge: 2000 mm (a list, so each report has its own)
			nomenclature?: Record<string, unknown>[]; // - bs3: Blechstärke 3 mm (the file name decoded)
		};
		toc?: boolean; // contents on page 1 (default true)
		numbered?: boolean; // 1. 2. 3. in front of ## sections (default true)
	}

	// the same in every report of a company: who sends it and how it looks
	interface CorporateIdentity {
		logo?: string; // path relative to .data/ or a URL
		accent?: string;
		font?: string; // family name; load it with fontUrl (e.g. Google Fonts)
		fontUrl?: string;
		label?: string; // first footer line; default: the title
		footer?: string[]; // company lines under it, inline markdown (**bold**)
		status?: Record<string, 'ok' | 'warn' | 'fail'>; // extra table words shown in colour
	}

	type Labels = {
		page: (i: number, n: number) => string;
		customer: string;
		order: string;
		product: string;
		number: string;
		orderDate: string;
		date: string;
		parameters: string;
		file: string;
		nomenclature: string;
		contents: string;
	};

	const labels: Record<string, Labels> = {
		en: {
			page: (i, n) => `Page <b>${i}</b> of <b>${n}</b>`,
			customer: 'Customer',
			order: 'Order',
			product: 'Product',
			number: 'Order number',
			orderDate: 'Order date',
			date: 'Report date',
			parameters: 'Parameters',
			file: 'File',
			nomenclature: 'Nomenclature',
			contents: 'Contents'
		},
		de: {
			page: (i, n) => `Seite <b>${i}</b> von <b>${n}</b>`,
			customer: 'Kunde',
			order: 'Auftrag',
			product: 'Produkt',
			number: 'Auftragsnummer',
			orderDate: 'Auftragsdatum',
			date: 'Berichtsdatum',
			parameters: 'Parameter',
			file: 'Datei',
			nomenclature: 'Nomenklatur',
			contents: 'Inhalt'
		},
		tr: {
			page: (i, n) => `Sayfa <b>${i}</b> / <b>${n}</b>`,
			customer: 'Müşteri',
			order: 'Sipariş',
			product: 'Ürün',
			number: 'Sipariş no.',
			orderDate: 'Sipariş tarihi',
			date: 'Rapor tarihi',
			parameters: 'Parametreler',
			file: 'Dosya',
			nomenclature: 'Adlandırma',
			contents: 'İçindekiler'
		}
	};

	// whole-cell table texts shown in colour; ci.status adds or overrides
	const statusWords: Record<string, 'ok' | 'warn' | 'fail'> = {
		ok: 'ok',
		ja: 'ok',
		yes: 'ok',
		pass: 'ok',
		warn: 'warn',
		warnung: 'warn',
		warning: 'warn',
		fail: 'fail',
		fehler: 'fail',
		error: 'fail',
		nok: 'fail',
		nein: 'fail',
		no: 'fail'
	};

	let report: Report = {};
	let html = '';
	let loading = true;
	let failed = '';
	let file = 'report.md';
	let sourceEl: HTMLDivElement; // hidden sheet the content is laid out in first
	let pagesEl: HTMLDivElement; // the A4 pages it is split into
	let pageCount = 0;
	let tooTall = 0; // blocks taller than a page (cut); shown on screen and in data-overflow
	let fontLink: HTMLLinkElement | null = null;

	onMount(async () => {
		// ?file= picks another markdown file in .data/ (the page is prerendered, so read it here)
		file = new URLSearchParams(location.search).get('file')?.replace(/^\/+/, '') || 'report.md';
		try {
			const response = await fetch(`/data/${file}`);
			if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);
			const { meta, body } = splitFrontmatter(await response.text());
			report = meta as Report;
			html = takeTitle(withDataPaths(renderMarkdown(body)));
		} catch (error) {
			failed = `could not load .data/${file}`;
			console.error('Failed to load report:', error);
		} finally {
			loading = false;
		}

		await tick();
		if (!sourceEl || !pagesEl) return;
		structure(sourceEl);
		await loadFont(ci);
		await waitForImages(sourceEl);
		await document.fonts.ready;

		const result = paginate(sourceEl, pagesEl, {
			pageClass: 'rp-page',
			contentClass: 'rp',
			keepWithNext: (block) => /^H[1-6]$/.test(block.tagName) || block.classList.contains('rp-keep')
		});
		pageCount = result.pages.length;
		tooTall = result.tooTall;
		decorate(result.pages);
		fillPageNumbers(result.pages);
	});

	onDestroy(() => fontLink?.remove());

	$: ci = report.ci ?? {};
	$: label = labels[report.language ?? 'de'] ?? labels.de;
	$: customer = report.customer ?? {};
	$: order = report.order ?? {};
	$: orderRows = [
		[label.product, order.product],
		[label.file, order.file],
		[label.number, order.number],
		[label.orderDate, order.date],
		[label.date, report.date]
	].filter(([, value]) => String(value ?? '').trim());
	$: customerLines = [customer.contact, customer.address, customer.email, customer.phone].filter(
		(value) => String(value ?? '').trim()
	);
	$: parameters = pairs(order.parameters);
	$: nomenclature = pairs(order.nomenclature);

	// a list of one-key mappings: - Länge: 2000 mm  ->  [['Länge', '2000 mm']]
	function pairs(list: Record<string, unknown>[] | undefined): string[][] {
		return (list ?? []).flatMap((item) =>
			item && typeof item === 'object' ? Object.entries(item).map(([key, value]) => [key, String(value ?? '')]) : []
		);
	}
	$: hasSheet = Boolean(report.customer || report.order || report.toc !== false);
	$: docStyle = [
		ci.accent && `--accent: ${ci.accent}`,
		ci.font && `--font: '${ci.font}', 'Source Sans 3 Variable', Helvetica, sans-serif`
	]
		.filter(Boolean)
		.join('; ');

	// ci.fontUrl: a stylesheet that defines ci.font, loaded before anything is measured
	async function loadFont(identity: CorporateIdentity) {
		if (!identity.fontUrl) return;
		fontLink = document.createElement('link');
		fontLink.rel = 'stylesheet';
		fontLink.href = identity.fontUrl;
		const loaded = new Promise((resolve) => {
			fontLink!.onload = resolve;
			fontLink!.onerror = resolve;
		});
		document.head.append(fontLink);
		await loaded;
		if (identity.font) await document.fonts.load(`400 12px "${identity.font}"`);
	}

	// paths in the markdown and frontmatter are relative to .data/ (served at /data/)
	function dataUrl(path: string): string {
		return /^(https?:|data:|\/)/.test(path) ? path : `/data/${path}`;
	}

	function withDataPaths(markup: string): string {
		return markup.replace(/(<img[^>]*?\ssrc=")(?!https?:|data:|\/)/g, '$1/data/');
	}

	// without a title in the frontmatter, a leading # heading is the title, the paragraph
	// after it the subtitle, and a --- right after them is dropped
	function takeTitle(markup: string): string {
		const doc = new DOMParser().parseFromString(`<div>${markup}</div>`, 'text/html');
		const root = doc.body.firstElementChild!;
		const first = root.firstElementChild;
		if (!report.title && first?.tagName === 'H1') {
			report.title = first.textContent?.trim();
			first.remove();
			const next = root.firstElementChild;
			if (!report.subtitle && next?.tagName === 'P' && next.textContent?.trim()) {
				report.subtitle = next.textContent.trim();
				next.remove();
			}
		}
		if (root.firstElementChild?.tagName === 'HR') root.firstElementChild.remove();
		return root.innerHTML;
	}

	// prepares the markdown output for print: anchors, section numbers, contents,
	// tables. Everything here only adds classes, ids or numbers; the text stays as written
	function structure(source: HTMLElement) {
		// <a id="x"></a> alone in a paragraph: the id moves to the next block
		for (const p of source.querySelectorAll<HTMLElement>(':scope > p')) {
			const anchor = p.querySelector('a[id]:not([href])');
			const next = p.nextElementSibling;
			if (anchor && p.children.length === 1 && !p.textContent?.trim() && next && !next.id) {
				next.id = anchor.id;
				p.remove();
			}
		}

		// "↑ back to contents" links only make sense on screen; --- lines become space
		for (const p of source.querySelectorAll<HTMLElement>(':scope > p')) {
			if (p.querySelector('a[href^="#"]') && p.children.length === 1 && /^\s*[↑⬆]/.test(p.textContent ?? '')) {
				p.remove();
			}
		}
		for (const hr of source.querySelectorAll(':scope > hr')) hr.remove();

		// 1. 2. 3. in front of ## sections, as in the contract; every section gets an id
		const headings = [...source.querySelectorAll<HTMLElement>(':scope > h2, :scope > h3')];
		let section = 0;
		headings.forEach((heading, i) => {
			heading.id ||= `rp-section-${i}`;
			if (heading.tagName === 'H2' && report.numbered !== false) {
				section++;
				heading.insertAdjacentHTML('afterbegin', `<span class="rp-num">${section}.</span>`);
			}
		});

		// contents on page 1: one entry per ## (numbered) with its ### below
		const slot = source.querySelector('.rp-toc-slot');
		if (slot && headings.length) {
			const list = document.createElement('ul');
			list.className = 'rp-contents';
			let parent: HTMLElement | null = null;
			for (const heading of headings) {
				const item = document.createElement('li');
				item.innerHTML = `<a href="#${heading.id}">${heading.innerHTML}</a><span class="rp-contents-page" data-target="${heading.id}"></span>`;
				if (heading.tagName === 'H2' || !parent) {
					list.append(item);
					parent = item;
				} else {
					let sub = parent.querySelector(':scope > ul');
					if (!sub) parent.append((sub = document.createElement('ul')));
					sub.append(item);
				}
			}
			slot.replaceWith(list);
		} else {
			slot?.remove();
		}

		// tables: label column for two-column tables, numbers right, status words in colour
		const words = { ...statusWords, ...lowerKeys(ci.status ?? {}) };
		const numeric = /^[-+]?\d[\d.,\s]*(\s?[\p{L}%°³²µ/·]+)*$/u;
		for (const table of source.querySelectorAll<HTMLTableElement>(':scope > table')) {
			const rows = [...(table.tBodies[0]?.rows ?? [])];
			const columns = table.rows[0]?.cells.length ?? 0;
			if (columns === 2) table.classList.add('rp-pairs');
			for (let c = 0; c < columns; c++) {
				const texts = rows.map((row) => row.cells[c]?.textContent?.trim() ?? '').filter(Boolean);
				if (texts.length && texts.every((text) => numeric.test(text))) {
					for (const row of table.rows) row.cells[c]?.classList.add('rp-right');
				}
			}
			for (const cell of table.querySelectorAll('td')) {
				const status = words[cell.textContent?.trim().toLowerCase() ?? ''];
				if (status) cell.classList.add('rp-status', `rp-status-${status}`);
				else if (/^[^\s]*[_][^\s]*$|\.\w{2,5}$/.test(cell.textContent?.trim() ?? '')) cell.classList.add('rp-code');
			}
			// a paragraph right before a table introduces it: never left alone at a page bottom
			if (table.previousElementSibling?.tagName === 'P') table.previousElementSibling.classList.add('rp-keep');
			// a bold-only line right after a table is its total
			const next = table.nextElementSibling;
			if (next?.tagName === 'P' && next.children.length === 1 && next.firstElementChild!.tagName === 'STRONG' &&
				next.textContent?.trim() === next.firstElementChild!.textContent?.trim()) {
				next.classList.add('rp-total');
			}
		}
	}

	function lowerKeys<T>(map: Record<string, T>): Record<string, T> {
		return Object.fromEntries(Object.entries(map).map(([key, value]) => [key.toLowerCase(), value]));
	}

	// logo top right and the company footer on every page
	function decorate(pages: HTMLElement[]) {
		const lines = (ci.footer ?? []).map((line) => marked.parseInline(String(line)) as string);
		pages.forEach((page, i) => {
			if (ci.logo) {
				const logo = document.createElement('img');
				logo.className = 'rp-logo';
				logo.src = dataUrl(ci.logo);
				logo.alt = '';
				page.append(logo);
			}
			const foot = document.createElement('footer');
			foot.className = 'rp-foot';
			foot.innerHTML = `
				<div class="rp-foot-text">
					<div class="rp-foot-label">${escapeHtml(ci.label ?? report.title ?? '')}</div>
					${lines.map((line) => `<div>${line}</div>`).join('')}
				</div>
				<div class="rp-foot-page">${label.page(i + 1, pages.length)}</div>`;
			page.append(foot);
		});
	}

	function fillPageNumbers(pages: HTMLElement[]) {
		for (const number of pagesEl.querySelectorAll<HTMLElement>('.rp-contents-page')) {
			const target = pagesEl.querySelector(`[id="${CSS.escape(number.dataset.target ?? '')}"]`);
			const page = target?.closest('.rp-page');
			if (page) number.textContent = String(pages.indexOf(page as HTMLElement) + 1);
		}
	}

	function escapeHtml(text: string): string {
		return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}
</script>

<!-- --------------------------------------------------------------------------------- -->
<!-- 				Report (page 1: order sheet and contents, then the body)			   -->
<!-- --------------------------------------------------------------------------------- -->
<div class="rp-doc" style={docStyle} data-file={file} data-overflow={tooTall || ''} data-pages={pageCount || ''}>
	{#if loading}
		<p class="rp-message">Loading the report...</p>
	{:else if failed}
		<p class="rp-message">{failed}</p>
	{:else}
		{#if tooTall}
			<div class="rp-notice">overflow: {tooTall} block(s) taller than a page are cut at the bottom</div>
		{/if}

		<div class="rp-pages" bind:this={pagesEl}></div>

		<!-- laid out here first, then moved block by block onto the pages above -->
		<div class="rp-page rp-measure" aria-hidden="true">
			<div class="rp" lang={report.language ?? 'de'} bind:this={sourceEl}>
				{#if report.title}
					<header class="rp-title">
						<h1>{report.title}</h1>
						{#if report.subtitle}<p class="rp-subtitle">{report.subtitle}</p>{/if}
					</header>
				{/if}

				{#if customer.name || customerLines.length || orderRows.length}
					<div class="rp-sheet">
						{#if customer.name || customerLines.length}
							<section>
								<h5>{label.customer}</h5>
								{#if customer.name}<p class="rp-sheet-name">{customer.name}</p>{/if}
								{#each customerLines as line}<p>{line}</p>{/each}
							</section>
						{/if}
						{#if orderRows.length}
							<section>
								<h5>{label.order}</h5>
								<dl>
									{#each orderRows as [name, value]}
										<dt>{name}</dt>
										<dd class:rp-code={name === label.file}>{value}</dd>
									{/each}
								</dl>
							</section>
						{/if}
					</div>
				{/if}

				{#if parameters.length}
					<section class="rp-parameters">
						<h5>{label.parameters}</h5>
						<dl>
							{#each parameters as [name, value]}
								<div><dt>{name}</dt><dd>{value}</dd></div>
							{/each}
						</dl>
					</section>
				{/if}

				{#if nomenclature.length}
					<section class="rp-parameters rp-nomenclature">
						<h5>{label.nomenclature}</h5>
						<dl>
							{#each nomenclature as [code, meaning]}
								<div><dt class="rp-code">{code}</dt><dd>{meaning}</dd></div>
							{/each}
						</dl>
					</section>
				{/if}

				{#if report.toc !== false}
					<h5 class="rp-contents-title">{label.contents}</h5>
					<div class="rp-toc-slot"></div>
				{/if}

				{#if hasSheet}<div class="page-break"></div>{/if}

				{@html html}
			</div>
		</div>
	{/if}
</div>
