<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { renderMarkdown, splitFrontmatter, typesetMath } from '$lib/paged/markdown';
	import { paginate } from '$lib/paged/paginate';
	import './page.css';

	// frontmatter of /data/homework.md; same fields as metadata.tex in latex-templates/homework.
	// the markdown body below the frontmatter is the content
	interface HomeworkMeta {
		title: string;
		lecture: string;
		university: string;
		faculty?: string;
		semester: string;
		dueDate: string;
		lecturers?: string[];
		tutors?: string[];
		student: { name: string; number: string; email: string };
		language?: string;
	}

	const required = [
		'title',
		'lecture',
		'university',
		'semester',
		'dueDate',
		'student.name',
		'student.number',
		'student.email'
	];

	// fixed words per language (metadata-en.tex / metadata-de.tex)
	const labels: Record<
		string,
		{ lecturer: string; tutor: string; student: string; due: string; page: (i: number, n: number) => string }
	> = {
		en: { lecturer: 'Lecturer:', tutor: 'Tutor(s):', student: 'Student:', due: 'Due:', page: (i, n) => `Page ${i} of ${n}` },
		de: { lecturer: 'Dozent:', tutor: 'Tutor:', student: 'Student:', due: 'Abgabe:', page: (i, n) => `Seite ${i} von ${n}` },
		tr: { lecturer: 'Öğretim Üyesi:', tutor: 'Asistan:', student: 'Öğrenci:', due: 'Teslim:', page: (i, n) => `Sayfa ${i} / ${n}` }
	};

	let homework: { meta: HomeworkMeta; html: string } | null = null;
	let loading: boolean = true;
	let sourceEl: HTMLDivElement; // hidden sheet the content is laid out in first
	let pagesEl: HTMLDivElement; // the A4 pages it is split into
	let pageCount = 0;
	// blocks taller than a whole page (cut at the bottom). Shown on screen and in data-overflow
	let tooTall = 0;

	onMount(async () => {
		try {
			const response = await fetch('/data/homework.md');

			if (!response.ok) {
				throw new Error(`HTTP Error! Status: ${response.status}`);
			}

			homework = parseHomework(await response.text());
		} catch (error) {
			console.error('Failed to load homework data:', error);
		} finally {
			loading = false;
		}

		// heights are only right once math and fonts are in place
		await tick();
		if (!sourceEl || !pagesEl) return;
		await typesetMath(sourceEl);
		await document.fonts.ready;
		const result = paginate(sourceEl, pagesEl, { pageClass: 'hw-page', contentClass: 'hw' });
		pageCount = result.pages.length;
		tooTall = result.tooTall;
		if (pageCount > 1) numberPages(pagesEl, label.page);
	});

	$: meta = homework?.meta;
	$: missing = meta ? required.filter((path) => !String(get(meta, path) ?? '').trim()) : [];
	$: label = labels[meta?.language ?? 'en'] ?? labels.en;

	function parseHomework(text: string): { meta: HomeworkMeta; html: string } {
		const { meta, body } = splitFrontmatter(text);
		return { meta: meta as HomeworkMeta, html: renderMarkdown(body) };
	}

	// "Page i of n" in the bottom margin of every page; a single page gets none
	function numberPages(target: HTMLElement, text: (i: number, n: number) => string) {
		const pages = [...target.children];
		pages.forEach((page, i) => {
			const foot = document.createElement('div');
			foot.className = 'hw-page-number';
			foot.textContent = text(i + 1, pages.length);
			page.append(foot);
		});
	}

	function get(obj: unknown, path: string): unknown {
		return path.split('.').reduce<any>((value, key) => value?.[key], obj);
	}

	// ' -- ' in the source text prints as an en dash
	function dash(text: string): string {
		return text.replaceAll(' -- ', ' – ');
	}
</script>

<!-- --------------------------------------------------------------------------------- -->
<!-- 				Homework (as many A4 pages as the content needs)				   -->
<!-- --------------------------------------------------------------------------------- -->
<div class="hw-doc" data-missing={missing.join(',')} data-overflow={tooTall || ''} data-pages={pageCount || ''}>
	{#if loading}
		<p class="hw-status">Loading your homework...</p>
	{:else if homework && meta}
		{#if missing.length || tooTall}
			<div class="hw-missing">
				{#if missing.length}missing: {missing.join(', ')}{/if}
				{#if tooTall}overflow: {tooTall} block(s) taller than a page are cut at the bottom{/if}
			</div>
		{/if}

		<div class="hw-pages" bind:this={pagesEl}></div>

		<!-- laid out here first, then moved block by block onto the pages above -->
		<div class="hw-page hw-measure" aria-hidden="true">
			<div class="hw" lang={meta.language ?? 'en'} bind:this={sourceEl}>
				<!-- title block -->
				<header class="hw-head">
					<div class="hw-title">{dash(String(meta.title ?? ''))}</div>
					<div class="hw-lecture">{meta.lecture}</div>
					<div class="hw-institution">
						{[meta.university, meta.faculty, meta.semester]
							.filter((value) => String(value ?? '').trim())
							.join(' | ')}
					</div>
					<div class="hw-due">{label.due} {meta.dueDate}</div>

					<table class="hw-info">
						<tbody>
							{#if meta.lecturers?.length}
								<tr>
									<th>{label.lecturer}</th>
									<td>{#each meta.lecturers as lecturer}<div>{lecturer}</div>{/each}</td>
								</tr>
							{/if}
							{#if meta.tutors?.length}
								<tr>
									<th>{label.tutor}</th>
									<td>{#each meta.tutors as tutor}<div>{tutor}</div>{/each}</td>
								</tr>
							{/if}
							<tr>
								<th>{label.student}</th>
								<td>
									{meta.student?.name} ({meta.student?.number})
									(<a href={`mailto:${meta.student?.email}`}>{meta.student?.email}</a>)
								</td>
							</tr>
						</tbody>
					</table>
				</header>

				<hr class="hw-rule" />

				<!-- markdown body -->
				{@html homework.html}
			</div>
		</div>
	{:else}
		<p class="hw-status">Error loading data.</p>
	{/if}
</div>
