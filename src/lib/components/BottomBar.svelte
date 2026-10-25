<!-- bottom-left bar: links to the repository and other projects, then the hovered button's hint
     or the version and last update; hidden in print -->
<script lang="ts">
	import type { Component } from 'svelte';
	import { hint } from '$lib/stores/hint';
	import IconGithub from '$lib/icons/icon-github.svelte';
	import IconFourCubes from '$lib/icons/icon-four-cubes.svelte';

	type Link = { href: string; icon: Component; hint: string };
	const links: Link[] = [
		{ href: 'https://github.com/kutaycoskuner/vellum', icon: IconGithub, hint: 'to github repository' },
		{ href: 'https://kutaycoskuner.github.io/port/computer_science', icon: IconFourCubes, hint: 'other projects' }
	];

	// version from package.json, last update = build day; both set in vite.config.ts
	const version = __APP_VERSION__;
	const lastUpdate = __BUILD_DATE__;
</script>

<nav>
	{#each links as link (link.href)}
		<a
			href={link.href}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={link.hint}
			onmouseenter={() => hint.set(link.hint)}
			onmouseleave={() => hint.set('')}
		>
			<link.icon />
		</a>
	{/each}

	{#if $hint}
		<span class="hint">{$hint}</span>
	{:else}
		<span class="version">v{version} · last update {lastUpdate}</span>
	{/if}
</nav>

<style>
	nav {
		position: fixed;
		bottom: 0;
		left: 0;
		z-index: 90;
		display: flex;
		align-items: center;
		padding: 0 0 0.5rem 0;
		color: #fdfdfd;
		font-family: system-ui, sans-serif;
	}

	a {
		display: flex;
		padding-left: 0.5rem;
		color: inherit;
		opacity: 0.8;
		transition:
			opacity 0.2s ease,
			transform 0.2s ease;
	}

	a:hover {
		opacity: 1;
		transform: scale(1.1);
	}

	a :global(svg) {
		width: 1.2rem;
		height: 1.2rem;
	}

	.hint,
	.version {
		padding-left: 1rem;
		font-size: 0.75rem;
		white-space: nowrap;
		user-select: none;
	}

	/* in the hint's place while nothing is hovered, quieter than the icons */
	.version {
		opacity: 0.5;
	}

	@media print {
		nav {
			display: none;
		}
	}
</style>
