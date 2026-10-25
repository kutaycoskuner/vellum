<!-- document outline with the top right corner folded, "PDF" over its bottom right part -->
<script lang="ts">
	let { ...rest } = $props();
</script>

<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {...rest}>
	<!-- page: open at the bottom right, where the label sits -->
	<path d="M8 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8l6 6v6" />
	<!-- folded corner -->
	<path d="M14 2v6h6" />
	<text x="23.6" y="22.4" text-anchor="end" font-family="system-ui, Arial, sans-serif" font-size="7.4" font-weight="800" fill="currentColor" stroke="none">PDF</text>
</svg>
