<script lang="ts">
	import type { Component } from 'svelte';
	import BasicNavigation from '$lib/components/BasicNavigation.svelte';
	import BottomBar from '$lib/components/BottomBar.svelte';
	import PageTools from '$lib/components/PageTools.svelte';

	let { children } = $props();

	// local-only components on every page, e.g. a language switcher, from src/lib/-private/global/
	// (gitignored); none in a fresh clone
	const localGlobals = Object.values(
		import.meta.glob<{ default: Component }>('/src/lib/-private/global/*.svelte', { eager: true })
	).map((module) => module.default);
</script>

<svelte:head>
	<!-- TeX math for /homework and /report ($..$, $$..$$) -->
	<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg-full.js"></script>
</svelte:head>

<BasicNavigation />
<PageTools />
<BottomBar />

{#each localGlobals as LocalGlobal, i (i)}
	<LocalGlobal />
{/each}

{@render children()}

<style>
	/* print background colours and images without ticking "Background graphics" in the dialog */
	:global(html) {
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}

	/* MathJax SVG glyphs carry stroke-width="0": invisible on screen, but a PDF draws width 0 as
	   the thinnest line the viewer can, so every glyph gets an outline and math looks bold */
	:global(mjx-container svg path),
	:global(mjx-container svg use) {
		stroke: none;
	}
</style>
