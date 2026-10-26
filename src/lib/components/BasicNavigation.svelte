<!-- top-left links to the documents; hidden in print -->
<nav>
	<a href="/letter">letter</a>
	<a href="/homework">homework</a>
	<a href="/report">report</a>
	<a href="/article">article</a>
</nav>

<style>
	nav {
		position: fixed;
		margin: 0;
		margin-left: 0.5rem;
		padding: 0;
		top: 0;
		left: 0;
		z-index: 90;
	}
	a {
		text-decoration: none;
		color: #fdfdfd;
	}

	@media print {
		nav {
			display: none;
		}
	}
</style>
