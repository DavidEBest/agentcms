<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<div class="p-8 max-w-3xl">
	<div class="mb-8">
		<h1 class="text-xl font-semibold text-white">
			{data.profile?.name ? `Welcome back, ${data.profile.name}` : 'Welcome'}
		</h1>
		<p class="text-zinc-400 text-sm mt-1">
			{data.profile ? 'Your site content at a glance.' : 'Start by filling out your profile.'}
		</p>
	</div>

	{#if !data.profile?.name || !data.profile?.bio}
		<div class="mb-6 p-4 border border-amber-700/50 bg-amber-900/20 rounded-lg flex items-start gap-3">
			<span class="text-amber-400 text-lg">!</span>
			<div>
				<p class="text-amber-300 text-sm font-medium">Profile incomplete</p>
				<p class="text-amber-400/80 text-sm mt-0.5">
					<a href="/profile" class="underline">Add your name and bio</a> to get started.
				</p>
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-3 gap-4">
		{#each [
			{ label: 'Gallery images', count: data.galleryCount, href: '/gallery', icon: '▦' },
			{ label: 'News posts', count: data.newsCount, href: '/news', icon: '◈' },
			{ label: 'Social links', count: data.linksCount, href: '/links', icon: '⬡' }
		] as card}
			<a
				href={card.href}
				class="p-5 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-600 transition-colors"
			>
				<div class="text-2xl mb-3 text-zinc-500">{card.icon}</div>
				<div class="text-2xl font-semibold text-white">{card.count}</div>
				<div class="text-zinc-400 text-sm mt-0.5">{card.label}</div>
			</a>
		{/each}
	</div>
</div>
