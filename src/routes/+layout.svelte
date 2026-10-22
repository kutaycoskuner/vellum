<script lang="ts">
	import BasicNavigation from '$lib/components/BasicNavigation.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<!-- TeX math for /homework and /report ($..$, $$..$$) -->
	<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg-full.js"></script>
</svelte:head>

<BasicNavigation />

{@render children()}
