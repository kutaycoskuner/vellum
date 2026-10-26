<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { renderMarkdown, splitFrontmatter, typesetMath, waitForImages } from '$lib/paged/markdown';
	import { paginate } from '$lib/paged/paginate';
	import { formatDate } from '$lib/paged/format';
	import { parseChart, renderChart } from '$lib/paged/chart';
	import { pageLanguage } from '$lib/stores/language';
	import '$lib/paged/cmu-serif.css';
	import './page.css';

	// a journal-style scientific article from one markdown file: the frontmatter holds title,
	// authors, dates and abstract (full width on page 1), the markdown body flows in two columns.
	// The file is .data/article.md, or .data/<path> with /article?file=<path>. Format: docs/article.md
	interface Author {
		name: string;
		affiliations?: number[]; // numbers into `affiliations`, from 1
		email?: string;
		corresponding?: boolean;
	}
	interface ArticleMeta {
		title: string;
		shortTitle?: string; // running head on pages 2+
		language?: string;
		journal?: string;
		volume?: string | number;
		issue?: string | number;
		year?: string | number;
		doi?: string;
		received?: string;
		accepted?: string;
		published?: string;
		authors: Author[];
		affiliations?: string[];
		abstract: string; // markdown, math allowed
		keywords?: string[];
	}

	const required = ['title', 'authors', 'abstract'];

	// fixed words per language
	type Labels = {
		abstract: string;
		keywords: string;
		received: string;
		accepted: string;
		published: string;
		corresponding: string;
		figure: string;
		table: string;
	};
	const labels: Record<string, Labels> = {
		en: { abstract: 'Abstract', keywords: 'Keywords', received: 'Received', accepted: 'Accepted', published: 'Published', corresponding: 'Corresponding author', figure: 'Fig.', table: 'Table' },
		de: { abstract: 'Zusammenfassung', keywords: 'Schlüsselwörter', received: 'Eingereicht', accepted: 'Angenommen', published: 'Veröffentlicht', corresponding: 'Korrespondierender Autor', figure: 'Abb.', table: 'Tabelle' },
		tr: { abstract: 'Özet', keywords: 'Anahtar kelimeler', received: 'Geliş', accepted: 'Kabul', published: 'Yayın', corresponding: 'Sorumlu yazar', figure: 'Şekil', table: 'Tablo' }
	};
	// section headings that are never numbered, in any language; the list after a references
	// heading becomes the numbered reference list
	const REFERENCES = ['references', 'bibliography', 'literatur', 'literaturverzeichnis', 'kaynaklar', 'kaynakça'];
	const UNNUMBERED = [...REFERENCES, 'acknowledgements', 'acknowledgments', 'danksagung', 'teşekkür'];

	let meta: ArticleMeta | null = null;
	let bodyHtml = '';
	let abstractHtml = '';
	let loading = true;
	let failed = '';
	let file = 'article.md';
	let docEl: HTMLDivElement;
	let headerEl: HTMLElement; // title block, moved above the columns of page 1
	let sourceEl: HTMLDivElement; // hidden column the body is laid out in first
	let pagesEl: HTMLDivElement;
	let pageCount = 0;
	let tooTall = 0;

	onMount(async () => {
		// ?file= picks another markdown file in .data/ (the page is prerendered, so read it here)
		file = new URLSearchParams(location.search).get('file')?.replace(/^\/+/, '') || 'article.md';
		try {
			const response = await fetch(`/data/${file}`);
			if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);
			const { meta: frontmatter, body } = splitFrontmatter(await response.text());
			meta = frontmatter as ArticleMeta;
			abstractHtml = dataPaths(renderMarkdown(String(meta.abstract ?? '')));
			bodyHtml = dataPaths(numberEquations(renderMarkdown(body)));
		} catch (error) {
			console.error('Failed to load article:', error);
			failed = `could not load .data/${file}`;
		} finally {
			loading = false;
		}

		// heights are only right once math, images and fonts are in place
		await tick();
		if (!sourceEl || !pagesEl || !headerEl) return;
		prepare(sourceEl);
		relabel(docEl, label);
		await typesetMath(headerEl);
		await typesetMath(sourceEl);
		await waitForImages(sourceEl);
		await document.fonts.ready;
		const result = paginate(sourceEl, pagesEl, {
			pageClass: 'ar-page',
			contentClass: 'ar-flow',
			columns: 2,
			columnClass: 'ar ar-col',
			firstPageHeader: headerEl,
			keepWithNext: (block) => /^H[1-6]$/.test(block.tagName) || block.classList.contains('ar-table-caption')
		});
		pageCount = result.pages.length;
		tooTall = result.tooTall;
		decorate(result.pages);
	});

	$: missing = meta ? required.filter((key) => !hasValue((meta as any)[key])) : [];
	// a language picked in the browser wins over the frontmatter's
	$: language = $pageLanguage ?? meta?.language ?? 'en';
	$: label = labels[language] ?? labels.en;
	$: if (docEl && pageCount) relabel(docEl, label);
	$: authors = meta?.authors ?? [];
	$: corresponding = authors.find((author) => author.corresponding && author.email);
	$: journalLine = meta
		? [meta.journal, [meta.volume, meta.issue ? `(${meta.issue})` : ''].join(''), meta.year].filter((v) => String(v ?? '').trim()).join(' · ')
		: '';
	$: dates = meta
		? (['received', 'accepted', 'published'] as const)
				.filter((key) => meta?.[key])
				.map((key) => `${label[key]} ${formatDate(String(meta?.[key]), language)}`)
		: [];

	// a display equation gets the next number at the right, unless it has \tag, \notag or \nonumber
	function numberEquations(html: string): string {
		let n = 0;
		return html.replace(/\\\[([\s\S]+?)\\\]/g, (_, tex: string) =>
			/\\(tag|notag|nonumber)\b/.test(tex)
				? `\\[${tex.replace(/\\(notag|nonumber)\b/g, '')}\\]`
				: `\\[${tex} \\tag{${++n}}\\]`
		);
	}

	// relative image paths point into .data/
	function dataPaths(html: string): string {
		return html.replace(/(<img[^>]*?\ssrc=")(?!https?:|data:|\/)/g, '$1/data/');
	}

	// turns plain markdown output into article parts: numbered sections, figures from images
	// and ```chart blocks, captioned tables, the reference list
	function prepare(source: HTMLElement) {
		dashes(source);
		let section = 0;
		let subsection = 0;
		let figures = 0;
		let tables = 0;
		let inReferences = false;

		for (const block of [...source.children] as HTMLElement[]) {
			if (block.tagName === 'H2' || block.tagName === 'H3') {
				// "## Title {-}" is never numbered, like references and acknowledgements
				const marked = /\s*\{-\}\s*$/.test(block.textContent ?? '');
				if (marked) block.innerHTML = block.innerHTML.replace(/\s*\{-\}\s*$/, '');
				const name = (block.textContent ?? '').trim().toLowerCase();
				if (block.tagName === 'H2') inReferences = REFERENCES.includes(name);
				if (marked || UNNUMBERED.includes(name)) continue;
				const number = block.tagName === 'H2' ? `${++section}` : `${section}.${++subsection}`;
				if (block.tagName === 'H2') subsection = 0;
				block.insertAdjacentHTML('afterbegin', `<span class="ar-num">${number}</span>`);
				continue;
			}

			// a paragraph holding only an image is a figure; its alt text is the caption
			const image = block.tagName === 'P' && block.childElementCount === 1 && !block.textContent?.trim() ? block.querySelector('img') : null;
			if (image) {
				const caption = image.getAttribute('title') || image.alt;
				block.replaceWith(figure(image.outerHTML, caption, ++figures));
				continue;
			}

			const code = block.tagName === 'PRE' ? block.querySelector('code.language-chart') : null;
			if (code) {
				try {
					const spec = parseChart(code.textContent ?? '');
					block.replaceWith(figure(renderChart(spec), spec.caption ?? '', ++figures));
				} catch (error) {
					block.outerHTML = `<p class="ar-error">chart: ${(error as Error).message}</p>`;
				}
				continue;
			}

			// "Table: caption" as its own paragraph right above a table
			if (block.tagName === 'P' && /^Table:\s/.test(block.textContent ?? '') && block.nextElementSibling?.tagName === 'TABLE') {
				block.classList.add('ar-table-caption');
				block.innerHTML = block.innerHTML.replace(/^Table:\s*/, '');
				block.insertAdjacentHTML('afterbegin', `<span class="ar-label" data-kind="table" data-n="${++tables}"></span> `);
				continue;
			}

			if (inReferences && block.tagName === 'OL') block.classList.add('ar-refs');
		}
	}

	// ' -- ' in the text prints as an en dash; code stays as written
	function dashes(root: HTMLElement) {
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
			acceptNode: (node) => (node.parentElement?.closest('code, pre') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
		});
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			if (node.nodeValue?.includes(' -- ')) node.nodeValue = node.nodeValue.replaceAll(' -- ', ' – ');
		}
	}

	function figure(content: string, caption: string, n: number): HTMLElement {
		const el = document.createElement('figure');
		el.className = 'ar-figure';
		el.innerHTML = content;
		const figcaption = document.createElement('figcaption');
		figcaption.innerHTML = `<span class="ar-label" data-kind="figure" data-n="${n}"></span> `;
		figcaption.append(caption);
		el.append(figcaption);
		return el;
	}

	// "Fig. 1." / "Table 2." in the current language; runs again on every language change
	function relabel(root: HTMLElement, words: Labels) {
		for (const span of root.querySelectorAll<HTMLElement>('.ar-label')) {
			span.textContent = `${span.dataset.kind === 'table' ? words.table : words.figure} ${span.dataset.n}.`;
		}
	}

	// page number on every page, running head (authors · short title) from page 2
	function decorate(pages: HTMLElement[]) {
		const head = [authorsShort(authors), meta?.shortTitle || meta?.title].filter(Boolean) as string[];
		pages.forEach((page, i) => {
			if (i > 0) {
				const running = document.createElement('div');
				running.className = 'ar-running';
				for (const part of head) running.append(Object.assign(document.createElement('span'), { textContent: part }));
				page.append(running);
			}
			page.append(Object.assign(document.createElement('div'), { className: 'ar-page-number', textContent: String(i + 1) }));
		});
	}

	// "Lastname", "A and B", "First et al."
	function authorsShort(list: Author[]): string {
		const last = (author: Author) => author.name.trim().split(/\s+/).at(-1) ?? '';
		if (list.length > 2) return `${last(list[0])} et al.`;
		return list.map(last).join(' & ');
	}

	function hasValue(value: unknown): boolean {
		return Array.isArray(value) ? value.length > 0 : String(value ?? '').trim() !== '';
	}
</script>

<!-- --------------------------------------------------------------------------------- -->
<!-- 				Article (title block on page 1, body in two columns)			   -->
<!-- --------------------------------------------------------------------------------- -->
<!-- tab title = default file name when saving as PDF -->
<svelte:head><title>{meta?.title || 'article'}</title></svelte:head>

<div class="ar-doc" bind:this={docEl} data-file={file} data-missing={missing.join(',')} data-overflow={tooTall || ''} data-pages={pageCount || ''}>
	{#if loading}
		<p class="ar-status">Loading the article...</p>
	{:else if failed}
		<p class="ar-status">{failed}</p>
	{:else if meta}
		{#if missing.length || tooTall}
			<div class="ar-missing">
				{#if missing.length}missing: {missing.join(', ')}{/if}
				{#if tooTall}overflow: {tooTall} block(s) taller than a column are cut at the bottom{/if}
			</div>
		{/if}

		<div class="ar-pages" bind:this={pagesEl}></div>

		<!-- laid out here first, then moved onto the pages above -->
		<div class="ar-measure" aria-hidden="true">
			<header class="ar-header" lang={language} bind:this={headerEl}>
				{#if journalLine || meta.doi}
					<div class="ar-journal">
						<span>{journalLine}</span>
						{#if meta.doi}<span>doi: <a href={`https://doi.org/${meta.doi}`}>{meta.doi}</a></span>{/if}
					</div>
				{/if}
				<h1 class="ar-title">{meta.title}</h1>
				<p class="ar-authors">
					{#each authors as author, i (i)}
						<span class="ar-author"
							>{author.name}{#if author.affiliations?.length || author.corresponding}<sup
									>{(author.affiliations ?? []).join(',')}{author.corresponding ? '*' : ''}</sup
								>{/if}</span
						>{i < authors.length - 1 ? ', ' : ''}
					{/each}
				</p>
				{#if meta.affiliations?.length}
					<ol class="ar-affiliations">
						{#each meta.affiliations as affiliation, i (i)}
							<li><sup>{i + 1}</sup>{affiliation}</li>
						{/each}
					</ol>
				{/if}
				{#if corresponding}
					<p class="ar-corresponding">
						* {label.corresponding}: <a href={`mailto:${corresponding.email}`}>{corresponding.email}</a>
					</p>
				{/if}
				{#if dates.length}<p class="ar-dates">{dates.join(' · ')}</p>{/if}
				<section class="ar-abstract">
					<h2>{label.abstract}</h2>
					{@html abstractHtml}
				</section>
				{#if meta.keywords?.length}
					<p class="ar-keywords"><strong>{label.keywords}:</strong> {meta.keywords.join(' · ')}</p>
				{/if}
			</header>

			<div class="ar ar-col ar-source" lang={meta.language ?? 'en'} bind:this={sourceEl}>
				{@html bodyHtml}
			</div>
		</div>
	{/if}
</div>
