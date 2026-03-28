<svelte:head>
	<title>easel — your site, your way</title>
	<meta name="description" content="AI-generated portfolio sites with actual personality. No templates. No drag-and-drop. Just describe what you want and watch it appear." />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
</svelte:head>

<style>
	:global(body) {
		margin: 0;
		background: #0a0a0a;
		color: #f0f0f0;
		font-family: 'Space Grotesk', sans-serif;
		overflow-x: hidden;
	}

	.noise {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		opacity: 0.03;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
	}

	main {
		position: relative;
		z-index: 1;
	}

	/* NAV */
	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem;
		border-bottom: 1px solid #1a1a1a;
	}

	.logo {
		font-family: 'Space Mono', monospace;
		font-size: 1.25rem;
		font-weight: 700;
		color: #f0f0f0;
		text-decoration: none;
		letter-spacing: -0.05em;
	}

	.logo span {
		color: #a78bfa;
	}

	.signin {
		font-family: 'Space Mono', monospace;
		font-size: 0.75rem;
		color: #666;
		text-decoration: none;
		border: 1px solid #2a2a2a;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		transition: all 0.15s;
	}

	.signin:hover {
		color: #f0f0f0;
		border-color: #555;
	}

	/* HERO */
	.hero {
		max-width: 900px;
		margin: 0 auto;
		padding: 6rem 2rem 4rem;
		text-align: center;
	}

	.eyebrow {
		font-family: 'Space Mono', monospace;
		font-size: 0.7rem;
		letter-spacing: 0.2em;
		color: #a78bfa;
		text-transform: uppercase;
		margin-bottom: 1.5rem;
	}

	h1 {
		font-size: clamp(2.5rem, 8vw, 6rem);
		font-weight: 700;
		line-height: 1.0;
		letter-spacing: -0.03em;
		margin: 0 0 1.5rem;
	}

	h1 em {
		font-style: normal;
		color: #a78bfa;
	}

	.subhead {
		font-size: clamp(1rem, 2.5vw, 1.25rem);
		color: #888;
		max-width: 560px;
		margin: 0 auto 3rem;
		line-height: 1.6;
	}

	.cta-group {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.cta-primary {
		font-family: 'Space Mono', monospace;
		font-size: 0.875rem;
		background: #a78bfa;
		color: #0a0a0a;
		text-decoration: none;
		padding: 0.875rem 2rem;
		border-radius: 4px;
		font-weight: 700;
		letter-spacing: 0.02em;
		transition: background 0.15s;
	}

	.cta-primary:hover {
		background: #c4b5fd;
	}

	.cta-secondary {
		font-family: 'Space Mono', monospace;
		font-size: 0.875rem;
		color: #888;
		text-decoration: none;
		padding: 0.875rem 2rem;
		border: 1px solid #2a2a2a;
		border-radius: 4px;
		transition: all 0.15s;
	}

	.cta-secondary:hover {
		color: #f0f0f0;
		border-color: #555;
	}

	/* MARQUEE */
	.marquee-wrap {
		border-top: 1px solid #1a1a1a;
		border-bottom: 1px solid #1a1a1a;
		overflow: hidden;
		padding: 0.75rem 0;
		margin: 4rem 0;
		white-space: nowrap;
	}

	.marquee-track {
		display: inline-flex;
		gap: 3rem;
		animation: scroll 20s linear infinite;
	}

	.marquee-track span {
		font-family: 'Space Mono', monospace;
		font-size: 0.75rem;
		color: #444;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.marquee-track span.accent {
		color: #a78bfa;
	}

	@keyframes scroll {
		from { transform: translateX(0); }
		to { transform: translateX(-50%); }
	}

	/* HOW IT WORKS */
	.section {
		max-width: 900px;
		margin: 0 auto;
		padding: 4rem 2rem;
	}

	.section-label {
		font-family: 'Space Mono', monospace;
		font-size: 0.65rem;
		letter-spacing: 0.2em;
		color: #444;
		text-transform: uppercase;
		margin-bottom: 3rem;
	}

	.steps {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 2rem;
	}

	.step {
		border: 1px solid #1a1a1a;
		border-radius: 8px;
		padding: 1.5rem;
		position: relative;
	}

	.step-num {
		font-family: 'Space Mono', monospace;
		font-size: 0.65rem;
		color: #a78bfa;
		margin-bottom: 0.75rem;
		letter-spacing: 0.1em;
	}

	.step h3 {
		font-size: 1rem;
		font-weight: 700;
		margin: 0 0 0.5rem;
		letter-spacing: -0.02em;
	}

	.step p {
		font-size: 0.875rem;
		color: #666;
		line-height: 1.6;
		margin: 0;
	}

	/* PHILOSOPHY */
	.philosophy {
		border-top: 1px solid #1a1a1a;
		border-bottom: 1px solid #1a1a1a;
		padding: 5rem 2rem;
		text-align: center;
	}

	.philosophy blockquote {
		max-width: 680px;
		margin: 0 auto;
		font-size: clamp(1.25rem, 3vw, 1.75rem);
		font-weight: 700;
		line-height: 1.4;
		letter-spacing: -0.02em;
	}

	.philosophy blockquote em {
		font-style: normal;
		color: #a78bfa;
	}

	.philosophy cite {
		display: block;
		margin-top: 1.5rem;
		font-family: 'Space Mono', monospace;
		font-size: 0.7rem;
		color: #444;
		font-style: normal;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	/* EXAMPLES */
	.examples {
		max-width: 900px;
		margin: 0 auto;
		padding: 4rem 2rem;
	}

	.example-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 1.5rem;
		margin-top: 2rem;
	}

	.example-card {
		border: 1px solid #1a1a1a;
		border-radius: 8px;
		overflow: hidden;
		transition: border-color 0.15s;
	}

	.example-card:hover {
		border-color: #a78bfa;
	}

	.example-preview {
		height: 180px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Space Mono', monospace;
		font-size: 0.75rem;
		color: #333;
		position: relative;
		overflow: hidden;
	}

	.preview-synthwave {
		background: linear-gradient(180deg, #0d0d2b 0%, #1a0030 100%);
		color: #ff2d78;
	}

	.preview-minimal {
		background: #f5f0eb;
		color: #888;
	}

	.preview-editorial {
		background: #1a1a1a;
		color: #c8ff00;
	}

	.example-label {
		padding: 1rem 1.25rem;
		border-top: 1px solid #1a1a1a;
		font-size: 0.8rem;
		color: #666;
		font-family: 'Space Mono', monospace;
	}

	/* FOOTER */
	footer {
		border-top: 1px solid #1a1a1a;
		padding: 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	footer .logo {
		font-size: 1rem;
	}

	footer p {
		font-family: 'Space Mono', monospace;
		font-size: 0.65rem;
		color: #333;
		margin: 0;
	}
</style>

<div class="noise"></div>

<main>
	<nav>
		<a href="/" class="logo">easel<span>.</span></a>
		<a href="/auth" class="signin">sign in →</a>
	</nav>

	<section class="hero">
		<p class="eyebrow">// your portfolio, generated by AI</p>
		<h1>Your site.<br /><em>Your weird.</em></h1>
		<p class="subhead">
			Describe the vibe. We build it. No templates, no drag-and-drop, no
			sites that look like everyone else's.
		</p>
		<div class="cta-group">
			<a href="/auth" class="cta-primary">Get your site →</a>
			<a href="#how" class="cta-secondary">See how it works</a>
		</div>
	</section>

	<div class="marquee-wrap">
		<div class="marquee-track">
			<span class="accent">★ make the web weird again</span>
			<span>portfolio</span>
			<span class="accent">★ no two sites alike</span>
			<span>gallery</span>
			<span class="accent">★ your personality, online</span>
			<span>artist</span>
			<span class="accent">★ generated by AI</span>
			<span>musician</span>
			<span class="accent">★ make the web weird again</span>
			<span>portfolio</span>
			<span class="accent">★ no two sites alike</span>
			<span>gallery</span>
			<span class="accent">★ your personality, online</span>
			<span>artist</span>
			<span class="accent">★ generated by AI</span>
			<span>musician</span>
		</div>
	</div>

	<section class="section" id="how">
		<p class="section-label">// how it works</p>
		<div class="steps">
			<div class="step">
				<p class="step-num">01 —</p>
				<h3>Fill in the details</h3>
				<p>Your name, bio, gallery images, social links. The raw material we work with.</p>
			</div>
			<div class="step">
				<p class="step-num">02 —</p>
				<h3>Describe the vibe</h3>
				<p>"Dark and moody with huge images." "Chaotic maximalist zine energy." We figure out the rest.</p>
			</div>
			<div class="step">
				<p class="step-num">03 —</p>
				<h3>Iterate in plain English</h3>
				<p>Not happy? Just say so. "Make the type bigger." "Less corporate." No CSS required.</p>
			</div>
			<div class="step">
				<p class="step-num">04 —</p>
				<h3>Publish to your subdomain</h3>
				<p>One click and you're live at <span style="color:#a78bfa;font-family:'Space Mono',monospace">you.easel.site</span>.</p>
			</div>
		</div>
	</section>

	<div class="philosophy">
		<blockquote>
			"The web used to feel like <em>people</em>. Handmade things, weird corners,
			sites that told you something real about whoever made them.
			We want that back."
		</blockquote>
		<cite>— the easel manifesto, probably</cite>
	</div>

	<section class="examples">
		<p class="section-label">// every site is different</p>
		<div class="example-grid">
			<div class="example-card">
				<div class="example-preview preview-synthwave">
					<span>SYNTHWAVE / RETRO</span>
				</div>
				<div class="example-label">// dark + neon + 80s energy</div>
			</div>
			<div class="example-card">
				<div class="example-preview preview-minimal">
					<span style="color:#aaa">minimal / editorial</span>
				</div>
				<div class="example-label">// clean + lots of white space</div>
			</div>
			<div class="example-card">
				<div class="example-preview preview-editorial">
					<span>BRUTALIST / BOLD</span>
				</div>
				<div class="example-label">// raw + typographic + loud</div>
			</div>
		</div>
	</section>

	<section class="section" style="text-align:center; padding-top: 2rem; padding-bottom: 6rem;">
		<p class="eyebrow">// ready?</p>
		<h1 style="font-size: clamp(2rem, 6vw, 4rem); margin-bottom: 1.5rem;">
			Claim your corner<br />of the <em>weird web</em>.
		</h1>
		<a href="/auth" class="cta-primary">Get started free →</a>
	</section>

	<footer>
		<a href="/" class="logo">easel<span>.</span></a>
		<p>built with claude · hosted on the edge · no two sites alike</p>
	</footer>
</main>
