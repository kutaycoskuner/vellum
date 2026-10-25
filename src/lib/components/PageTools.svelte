<!-- left toolbar above the bottom bar: one icon button per entry; hidden in print -->
<script lang="ts">
	import type { Component } from 'svelte';
	import { hint } from '$lib/stores/hint';
	import IconPdf from '$lib/icons/icon-pdf.svelte';

	// toolbar entries, top to bottom: data only (icon, hover hint, action); the template renders
	// them all the same way
	type Tool = { id: string; icon: Component; hint: string; action: () => void };
	const tools: Tool[] = [
		// the print dialog with A4, margins and colours preset by the page, so only Save is left
		{ id: 'pdf', icon: IconPdf, hint: 'save as PDF [Ctrl+P]', action: () => window.print() }
	];
</script>

<div class="tools">
	{#each tools as tool (tool.id)}
		<button
			type="button"
			aria-label={tool.hint}
			onclick={tool.action}
			onmouseenter={() => hint.set(tool.hint)}
			onmouseleave={() => hint.set('')}
		>
			<tool.icon />
		</button>
	{/each}
</div>

<style>
	.tools {
		position: fixed;
		bottom: 2.6rem;
		left: 0.5rem;
		z-index: 90;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	button {
		display: flex;
		width: 1.6rem;
		height: 1.6rem;
		padding: 0.2rem;
		justify-content: center;
		align-items: center;
		border: 0;
		border-radius: 4px;
		background: #333436;
		color: #fdfdfd;
		cursor: pointer;
	}

	button:hover {
		background: #3d3e40;
	}

	/* the icons are their own components (src/lib/icons), so their svg is styled globally */
	button :global(svg) {
		width: 100%;
		height: 100%;
		opacity: 0.8;
	}

	button:hover :global(svg) {
		opacity: 1;
	}

	@media print {
		.tools {
			display: none;
		}
	}
</style>
