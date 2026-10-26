<!-- index: what each document page is, and where its content comes from -->
<main class="index">
	<h1>vellum</h1>
	<p class="lead">Print-ready A4 documents from plain JSON and markdown files.</p>

	<ul>
		<li>
			<a href="/letter">letter</a>
			<span>single-page formal letter · <code>.data/letter.json</code></span>
		</li>
		<li>
			<a href="/homework">homework</a>
			<span>assignment sheet with TeX math, over as many pages as needed · <code>.data/homework.md</code></span>
		</li>
		<li>
			<a href="/report">report</a>
			<span>company report with order sheet, contents and numbered sections · <code>.data/report.md</code></span>
		</li>
		<li>
			<a href="/article">article</a>
			<span>scientific article in two columns: authors, abstract, figures, charts, tables, references · <code>.data/article.md</code></span>
		</li>
	</ul>

	<p class="note">Without a <code>.data/</code> folder the pages show the examples from <code>data.example/</code>.</p>
</main>

<style>
	.index {
		max-width: 38rem;
		margin: 0 auto;
		padding: 18vh 1.5rem 4rem;
		color: #b8bbc0;
		font-family: system-ui, sans-serif;
		line-height: 1.6;
	}

	h1 {
		margin: 0;
		color: #f2f3f5;
		font-size: 2rem;
		font-weight: 600;
		letter-spacing: 0.01em;
	}

	.lead {
		margin: 0.3rem 0 2.5rem;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		display: grid;
		grid-template-columns: 6.5rem 1fr;
		gap: 1rem;
		padding: 0.7rem 0;
		border-top: 1px solid #3a3b3d;
	}

	a {
		color: #49bf9d;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}

	code {
		font-size: 0.9em;
		color: #d6d8db;
	}

	.note {
		margin-top: 2.5rem;
		font-size: 0.9rem;
		color: #8a8d91;
	}
</style>
