<script lang="ts">
	import { onMount, tick } from 'svelte';
	import './page.css';

	// shape of /data/letter.json (one letter = one language, so plain strings)
	interface LetterData {
		name: string;
		sender: {
			location: string;
			phone: string;
			email: string;
		};
		recipient: { addressee: string; department?: string; company: string; city: string };
		place: string;
		date: string;
		title?: string; // heading word before the subject, e.g. "Cover Letter"; default per language
		subject: string;
		salutation: string;
		paragraphs: string[];
		closing: string;
		signature: string;
		signatureImage?: string; // path relative to .data/, e.g. images/signature.png
		language: string;
	}

	// fields every letter must have; department is optional (not every posting names one)
	const required = [
		'name',
		'signature',
		'sender.phone',
		'sender.email',
		'recipient.addressee',
		'recipient.company',
		'recipient.city',
		'date'
	];

	// fixed words per letter language; `title` in letter.json replaces the heading word
	const labels: Record<string, { to: string; title: string }> = {
		en: { to: 'To', title: 'Letter' },
		de: { to: 'An', title: 'Brief' },
		tr: { to: 'Alıcı', title: 'Mektup' }
	};

	let letter: LetterData | null = null;
	let loading: boolean = true;
	let letterEl: HTMLDivElement;
	// false once the signature image fails to load (file not there yet): placeholder instead
	let signatureLoads = true;
	// mm of content past the page bottom; 0 = fits. Shown on screen and in data-overflow
	let overflow = 0;

	onMount(async () => {
		try {
			const response = await fetch('/data/letter.json');

			if (!response.ok) {
				throw new Error(`HTTP Error! Status: ${response.status}`);
			}

			letter = await response.json();
		} catch (error) {
			console.error('Failed to load letter data:', error);
		} finally {
			loading = false;
		}

		// the page box cuts anything past one page, so measure instead of letting it vanish.
		// compared with the bottom margin line, not scrollHeight: text running into the
		// bottom padding doesn't count as overflow there
		await tick();
		const foot = letterEl?.querySelector('.letter-foot');
		if (letterEl && foot) {
			const marginLine =
				letterEl.getBoundingClientRect().bottom - parseFloat(getComputedStyle(letterEl).paddingBottom);
			const px = foot.getBoundingClientRect().bottom - marginLine;
			overflow = px > 2 ? Math.round(px / (96 / 25.4)) : 0;
		}
	});

	// listed on screen and in data-missing on the page box, so attercop can refuse to print
	$: missing = letter ? required.filter((path) => !String(get(letter, path) ?? '').trim()) : [];
	// footer contact: phone and email only, no labels (they are obvious)
	$: contact = letter
		? [letter.sender.phone, letter.sender.email].filter((value) => value?.trim())
		: [];

	function get(obj: unknown, path: string): unknown {
		return path.split('.').reduce<any>((value, key) => value?.[key], obj);
	}

	// ' -- ' in the source text prints as an en dash
	function dash(text: string): string {
		return text.replaceAll(' -- ', ' – ');
	}
</script>

<!-- --------------------------------------------------------------------------------- -->
<!-- 				Letter (single page)											   -->
<!-- --------------------------------------------------------------------------------- -->
<div class="a4-visual-guide" data-missing={missing.join(',')} data-overflow={overflow || ''}>
	<div class="a4-limit"></div>

	{#if loading}
		<p>Loading your letter...</p>
	{:else if letter}
		{#if missing.length || overflow}
			<div class="letter-missing">
				{#if missing.length}missing: {missing.join(', ')}{/if}
				{#if overflow}overflow: {overflow} mm past the page, shorten the text{/if}
			</div>
		{/if}

		<div class="letter" lang={letter.language} bind:this={letterEl}>
			<!-- recipient -->
			<div class="letter-recipient">
				<div class="letter-to">{labels[letter.language]?.to ?? labels.en.to}</div>
				<div class="letter-addressee">{letter.recipient.addressee}</div>
				{#if letter.recipient.department?.trim()}
					<div>{letter.recipient.department}</div>
				{/if}
				<div>{letter.recipient.company}</div>
				<div>{letter.recipient.city}</div>
			</div>

			<!-- "Title | subject" on one line (wraps at words when long) | date + place -->
			<div class="letter-head">
				<div class="letter-title">
					<span>{letter.title?.trim() || (labels[letter.language]?.title ?? labels.en.title)}</span>
					<span class="letter-subject">| {dash(letter.subject)}</span>
				</div>
				<div class="letter-date">
					<div class="letter-date-day">{letter.date}</div>
					<div class="letter-date-place">{letter.place}</div>
				</div>
			</div>

			<!-- body -->
			<div class="letter-body">
				<p class="letter-salutation">{letter.salutation}</p>
				{#each letter.paragraphs as paragraph}
					<p>{dash(paragraph)}</p>
				{/each}
				<p class="letter-closing">{letter.closing}</p>
			</div>

			<!-- footer: name + signature | phone + email (name on the phone line) -->
			<div class="letter-foot">
				<div class="letter-sign">
					<div class="letter-signature">{letter.name}</div>
					{#if letter.signatureImage?.trim() && signatureLoads}
						<div class="letter-sign-slot">
							<img
								src={`/data/${letter.signatureImage}`}
								alt=""
								on:error={() => (signatureLoads = false)}
							/>
						</div>
					{:else}
						<!-- placeholder until the signature image exists; invisible in print, keeps its space -->
						<div class="letter-sign-slot letter-sign-placeholder">signature</div>
					{/if}
				</div>
				<div class="letter-contact">
					{#each contact as value}
						<div>{value}</div>
					{/each}
				</div>
			</div>
		</div>
	{:else}
		<p>Error loading data.</p>
	{/if}
</div>
