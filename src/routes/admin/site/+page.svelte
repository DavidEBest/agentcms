<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const PAGE_LABELS: Record<string, string> = {
		'index.html': 'Home',
		'gallery.html': 'Gallery',
		'news.html': 'News',
		'about.html': 'About',
		'contact.html': 'Contact'
	};

	let subdomainInput = $state(data.subdomain);

	let generating = $state(false);
	let refining = $state(false);
	let publishing = $state(false);
	let pushingContent = $state(false);
	let generationError = $state<string | null>(null);
	let previewKey = $state(0);
	let previewPage = $state('index.html');

	let pollTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (data.draftPages.length > 0 && !data.draftPages.includes(previewPage)) {
			previewPage = data.draftPages[0];
		}
	});

	// Resume polling if the page loads with a job already in progress
	$effect(() => {
		if (data.generationStatus === 'pending') {
			if (data.draftPages.length === 0) {
				generating = true;
			} else {
				refining = true;
			}
			startPolling();
		}
		return () => stopPolling();
	});

	function startPolling() {
		stopPolling();
		pollTimer = setTimeout(poll, 2000);
	}

	function stopPolling() {
		if (pollTimer !== null) {
			clearTimeout(pollTimer);
			pollTimer = null;
		}
	}

	async function poll() {
		pollTimer = null;
		try {
			const res = await fetch('/admin/site/status');
			const result = await res.json();

			if (result.status === 'done') {
				await invalidateAll();
				generating = false;
				refining = false;
				generationError = null;
				previewKey++;
			} else if (result.status === 'error') {
				generationError = result.error ?? 'Generation failed. Please try again.';
				generating = false;
				refining = false;
			} else {
				startPolling();
			}
		} catch {
			startPolling();
		}
	}

	const suggestions = [
		'Make it darker and more moody',
		'Use larger, full-bleed images',
		'More minimal with lots of white space',
		'Use an elegant serif font',
		'Make the hero section more dramatic',
		'Reorganize to show gallery first',
		'Add a more editorial feel',
		'Make it feel warmer and more personal'
	];

	function pageLabel(filename: string): string {
		return PAGE_LABELS[filename] ?? filename.replace('.html', '');
	}
</script>

<div class="flex h-screen overflow-hidden">
	<!-- Left panel: controls -->
	<div class="w-80 flex-shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950">
		<div class="px-5 py-4 border-b border-zinc-800">
			<h1 class="text-white font-semibold text-sm">Your Site</h1>
			{#if data.isPublished}
				<span class="text-xs text-emerald-400 mt-0.5 block">● Live</span>
			{/if}
		</div>

		{#if !data.draftPages.length}
			<!-- First generation -->
			<div class="flex-1 overflow-y-auto p-5">
				<p class="text-zinc-400 text-sm mb-4">
					Describe the look and feel you want. We'll generate your portfolio site.
				</p>

				<form
					method="POST"
					action="?/generate"
					use:enhance={() => {
						generating = true;
						generationError = null;
						return async ({ result, update }) => {
							if (result.type === 'success' && (result.data as Record<string, unknown>)?.jobStarted) {
								startPolling();
							} else {
								generating = false;
								await update();
							}
						};
					}}
					class="space-y-4"
				>
					<div>
						<textarea
							name="stylePrompt"
							rows="5"
							placeholder="e.g. Dark and moody with large full-bleed images, minimal text, elegant sans-serif typography. I want it to feel like a high-end gallery."
							class="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
						></textarea>
					</div>

					<div class="space-y-1.5">
						<p class="text-zinc-500 text-xs">Suggestions:</p>
						{#each suggestions.slice(0, 4) as s}
							<button
								type="button"
								onclick={(e) => {
									const ta = e.currentTarget.closest('form')?.querySelector('textarea');
									if (ta) ta.value = s;
								}}
								class="w-full text-left text-xs px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
							>
								{s}
							</button>
						{/each}
					</div>

					{#if data.missingFields.bio || data.missingFields.statement || data.missingFields.contactEmail}
						<div class="rounded-lg bg-amber-950/50 border border-amber-800/50 px-3 py-2.5 space-y-1">
							<p class="text-amber-400 text-xs font-medium">Fill in your Profile first for best results:</p>
							{#if data.missingFields.bio || data.missingFields.statement}
								<p class="text-amber-500/80 text-xs">• <a href="/admin/profile" class="underline">Add your bio &amp; artist statement</a> → powers the About page</p>
							{/if}
							{#if data.missingFields.contactEmail}
								<p class="text-amber-500/80 text-xs">• <a href="/admin/profile" class="underline">Add your contact email</a> → powers the Contact page</p>
							{/if}
						</div>
					{/if}

					{#if form?.error}
						<p class="text-red-400 text-xs">{form.error}</p>
					{/if}
					{#if generationError}
						<p class="text-red-400 text-xs">{generationError}</p>
					{/if}

					<button
						type="submit"
						disabled={generating}
						class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
					>
						{generating ? 'Generating…' : 'Generate site'}
					</button>
				</form>
			</div>
		{:else}
			<!-- Refinement chat -->
			<div class="flex-1 overflow-y-auto p-4 space-y-3">
				{#each data.chatLog as msg}
					{#if msg.role === 'user'}
						<div class="flex justify-end">
							<div class="bg-indigo-600 text-white text-xs rounded-lg px-3 py-2 max-w-[85%]">
								{msg.text}
							</div>
						</div>
					{:else}
						<div class="flex justify-start">
							<div class="bg-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-2 max-w-[85%]">
								{msg.text}
							</div>
						</div>
					{/if}
				{/each}
				{#if refining}
					<div class="flex justify-start">
						<div class="bg-zinc-800 text-zinc-400 text-xs rounded-lg px-3 py-2">
							Updating…
						</div>
					</div>
				{/if}
				{#if generationError}
					<div class="flex justify-start">
						<div class="bg-red-900/50 text-red-400 text-xs rounded-lg px-3 py-2 max-w-[85%]">
							{generationError}
						</div>
					</div>
				{/if}
			</div>

			<!-- Suggestion chips -->
			<div class="px-4 py-2 flex flex-wrap gap-1.5">
				{#each suggestions.slice(0, 4) as s}
					<button
						onclick={() => {
							const input = document.querySelector<HTMLInputElement>('input[name="request"]');
							if (input) input.value = s;
						}}
						class="text-xs px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
					>
						{s}
					</button>
				{/each}
			</div>

			<!-- Profile completeness hint -->
			{#if data.missingFields.bio || data.missingFields.statement || data.missingFields.contactEmail}
				<div class="mx-4 mb-1 rounded-lg bg-amber-950/50 border border-amber-800/50 px-3 py-2">
					<p class="text-amber-400 text-xs font-medium mb-1">Some pages may be empty:</p>
					{#if data.missingFields.bio || data.missingFields.statement}
						<p class="text-amber-500/80 text-xs">• <a href="/admin/profile" class="underline">Add bio &amp; statement</a> → About page</p>
					{/if}
					{#if data.missingFields.contactEmail}
						<p class="text-amber-500/80 text-xs">• <a href="/admin/profile" class="underline">Add contact email</a> → Contact page</p>
					{/if}
					<p class="text-amber-600/60 text-xs mt-1">After updating Profile, click "Push content" to apply.</p>
				</div>
			{/if}

			<!-- Subdomain + publish -->
			<div class="p-4 border-t border-zinc-800 space-y-2">
				<form method="POST" action="?/setSubdomain" use:enhance={() => async ({ update }) => { await update(); }} class="space-y-1.5">
					<label class="text-zinc-500 text-xs block">Your URL</label>
					<div class="flex gap-1.5 items-center">
						<input
							name="subdomain"
							type="text"
							bind:value={subdomainInput}
							placeholder="yourname"
							class="flex-1 min-w-0 px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-white text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
						/>
						<span class="text-zinc-600 text-xs whitespace-nowrap">.easel.site</span>
						<button type="submit" class="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded transition-colors">Save</button>
					</div>
					{#if form?.subdomainError}
						<p class="text-red-400 text-xs">{form.subdomainError}</p>
					{:else if form?.subdomainSaved}
						<p class="text-emerald-400 text-xs">Saved.</p>
					{/if}
				</form>

				{#if form?.error}
					<p class="text-red-400 text-xs">{form.error}</p>
				{/if}
				<form
					method="POST"
					action="?/refine"
					use:enhance={() => {
						refining = true;
						generationError = null;
						return async ({ result, update }) => {
							if (result.type === 'success' && (result.data as Record<string, unknown>)?.jobStarted) {
								startPolling();
							} else {
								refining = false;
								await update();
							}
						};
					}}
					class="flex gap-2"
				>
					<input
						name="request"
						type="text"
						placeholder="What would you like to change?"
						class="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
					/>
					<button
						type="submit"
						disabled={refining}
						class="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
					>
						→
					</button>
				</form>

				<div class="flex gap-2">
					<form
						method="POST"
						action="?/publish"
						use:enhance={() => {
							publishing = true;
							return async ({ update }) => {
								publishing = false;
								await update();
							};
						}}
						class="flex-1"
					>
						<button
							type="submit"
							disabled={publishing}
							class="w-full py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
						>
							{publishing ? 'Publishing…' : data.isPublished ? 'Republish' : 'Publish site'}
						</button>
					</form>

					{#if data.isPublished}
						<form
							method="POST"
							action="?/publishContent"
							use:enhance={() => {
								pushingContent = true;
								return async ({ update }) => {
									pushingContent = false;
									await update();
								};
							}}
						>
							<button
								type="submit"
								disabled={pushingContent}
								title="Push profile, gallery & link changes without regenerating"
								class="py-2 px-3 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-60 text-zinc-200 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
							>
								{pushingContent ? 'Pushing…' : 'Push content'}
							</button>
						</form>
					{/if}
				</div>

				<a
					href="/admin/site/export"
					download="site.zip"
					class="block w-full py-2 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
				>
					Export ZIP
				</a>

				{#if form?.published}
					<p class="text-emerald-400 text-xs text-center">
						✓ Published — <a href={form.url} target="_blank" class="underline">{form.url}</a>
					</p>
				{:else if form?.contentPublished}
					<p class="text-emerald-400 text-xs text-center">
						✓ Content updated — <a href={form.url} target="_blank" class="underline">{form.url}</a>
					</p>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Right panel: preview -->
	<div class="flex-1 bg-zinc-900 flex flex-col">
		{#if data.draftPages.length}
			<!-- Page tab strip -->
			{#if data.draftPages.length > 1}
				<div class="flex border-b border-zinc-800 bg-zinc-950 px-1 pt-1 gap-1">
					{#each data.draftPages as pg}
						<button
							onclick={() => { previewPage = pg; }}
							class="px-3 py-1.5 text-xs rounded-t font-medium transition-colors {previewPage === pg
								? 'bg-zinc-900 text-white border border-b-zinc-900 border-zinc-700'
								: 'text-zinc-500 hover:text-zinc-300'}"
						>
							{pageLabel(pg)}
						</button>
					{/each}
				</div>
			{/if}

			{#if refining}
				<div class="flex-1 flex flex-col items-center justify-center gap-3">
					<div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
					<p class="text-zinc-400 text-sm">AI is updating your site…</p>
				</div>
			{:else}
				<iframe
					src="/admin/site/preview?page={encodeURIComponent(previewPage)}&v={previewKey}"
					title="Site preview"
					class="flex-1 w-full border-0"
					sandbox="allow-scripts allow-same-origin"
				></iframe>
			{/if}
		{:else}
			<div class="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
				{#if generating}
					<div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
					<p class="text-zinc-400 text-sm">AI is building your site…</p>
				{:else}
					<p class="text-zinc-600 text-4xl">◻</p>
					<p class="text-zinc-500 text-sm">Your site preview will appear here</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
