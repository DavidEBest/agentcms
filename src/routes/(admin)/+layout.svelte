<script lang="ts">
	import { page } from '$app/state';
	import type { LayoutData } from './$types';
	import '../../../app.css';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const nav = [
		{ href: '/', label: 'Dashboard', icon: '▤' },
		{ href: '/profile', label: 'Profile', icon: '◉' },
		{ href: '/gallery', label: 'Gallery', icon: '▦' },
		{ href: '/news', label: 'News', icon: '◈' },
		{ href: '/links', label: 'Links', icon: '⬡' }
	];
</script>

<div class="min-h-screen bg-zinc-950 flex">
	<!-- Sidebar -->
	<aside class="w-56 flex-shrink-0 border-r border-zinc-800 flex flex-col">
		<div class="px-5 py-5 border-b border-zinc-800">
			<span class="text-white font-semibold text-sm tracking-wide">AgentCMS</span>
		</div>

		<nav class="flex-1 px-3 py-4 space-y-0.5">
			{#each nav as item}
				<a
					href={item.href}
					class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors
						{page.url.pathname === item.href
						? 'bg-zinc-800 text-white'
						: 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}"
				>
					<span class="text-base leading-none">{item.icon}</span>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="px-3 py-4 border-t border-zinc-800">
			<div class="px-3 py-2 mb-1">
				<p class="text-zinc-500 text-xs truncate">{data.user.email}</p>
			</div>
			<form method="POST" action="/auth/logout">
				<button
					type="submit"
					class="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
				>
					Sign out
				</button>
			</form>
		</div>
	</aside>

	<!-- Main content -->
	<main class="flex-1 overflow-auto">
		{@render children()}
	</main>
</div>
