<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let editingId = $state<string | null>(null);
	let adding = $state(false);

	const PLATFORMS = [
		{ value: 'instagram', label: 'Instagram' },
		{ value: 'bandcamp', label: 'Bandcamp' },
		{ value: 'spotify', label: 'Spotify' },
		{ value: 'soundcloud', label: 'SoundCloud' },
		{ value: 'youtube', label: 'YouTube' },
		{ value: 'twitter', label: 'X / Twitter' },
		{ value: 'facebook', label: 'Facebook' },
		{ value: 'tiktok', label: 'TikTok' },
		{ value: 'website', label: 'Website' },
		{ value: 'shop', label: 'Shop' },
		{ value: 'other', label: 'Other' }
	];

	function platformLabel(value: string) {
		return PLATFORMS.find((p) => p.value === value)?.label ?? value;
	}
</script>

<div class="p-8 max-w-2xl">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-semibold text-white">Social Links</h1>
		<button
			onclick={() => (adding = !adding)}
			class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
		>
			+ Add link
		</button>
	</div>

	{#if adding}
		<form
			method="POST"
			action="?/add"
			use:enhance={() => async ({ update }) => {
				await update();
				await invalidateAll();
				adding = false;
			}}
			class="mb-6 p-4 bg-zinc-900 border border-zinc-700 rounded-lg space-y-3"
		>
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="block text-xs font-medium text-zinc-400 mb-1">Platform</label>
					<select
						name="platform"
						class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
					>
						{#each PLATFORMS as p}
							<option value={p.value}>{p.label}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-xs font-medium text-zinc-400 mb-1">Label (optional)</label>
					<input
						name="label"
						type="text"
						class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
						placeholder="e.g. My Bandcamp"
					/>
				</div>
			</div>
			<div>
				<label class="block text-xs font-medium text-zinc-400 mb-1">URL</label>
				<input
					name="url"
					type="url"
					required
					class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
					placeholder="https://"
				/>
			</div>
			<div class="flex gap-2">
				<button type="submit" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded transition-colors">Add</button>
				<button type="button" onclick={() => (adding = false)} class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded transition-colors">Cancel</button>
			</div>
		</form>
	{/if}

	{#if data.links.length === 0 && !adding}
		<div class="border-2 border-dashed border-zinc-800 rounded-xl p-10 text-center">
			<p class="text-zinc-500 text-sm">No links yet. Add your social profiles and websites.</p>
		</div>
	{:else}
		<ul class="space-y-2">
			{#each data.links as link (link.id)}
				<li class="bg-zinc-900 border border-zinc-800 rounded-lg">
					{#if editingId === link.id}
						<form
							method="POST"
							action="?/update"
							use:enhance={() => async ({ update }) => {
								await update();
								await invalidateAll();
								editingId = null;
							}}
							class="p-4 space-y-3"
						>
							<input type="hidden" name="id" value={link.id} />
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label class="block text-xs font-medium text-zinc-400 mb-1">Platform</label>
									<p class="text-zinc-300 text-sm py-2">{platformLabel(link.platform)}</p>
								</div>
								<div>
									<label class="block text-xs font-medium text-zinc-400 mb-1">Label</label>
									<input
										name="label"
										type="text"
										value={link.label ?? ''}
										class="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
									/>
								</div>
							</div>
							<div>
								<label class="block text-xs font-medium text-zinc-400 mb-1">URL</label>
								<input
									name="url"
									type="url"
									value={link.url}
									class="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
								/>
							</div>
							<div class="flex gap-2">
								<button type="submit" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded transition-colors">Save</button>
								<button type="button" onclick={() => (editingId = null)} class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded transition-colors">Cancel</button>
							</div>
						</form>
					{:else}
						<div class="flex items-center justify-between px-4 py-3">
							<div>
								<p class="text-white text-sm font-medium">{link.label ?? platformLabel(link.platform)}</p>
								<p class="text-zinc-500 text-xs mt-0.5 truncate max-w-sm">{link.url}</p>
							</div>
							<div class="flex items-center gap-2">
								<button
									onclick={() => (editingId = link.id)}
									class="text-xs text-zinc-400 hover:text-white px-2 py-1 hover:bg-zinc-800 rounded transition-colors"
								>
									Edit
								</button>
								<form method="POST" action="?/delete" use:enhance={() => async ({ update }) => { await update(); await invalidateAll(); }}>
									<input type="hidden" name="id" value={link.id} />
									<button
										type="submit"
										class="text-xs text-red-400 hover:text-red-300 px-2 py-1 hover:bg-zinc-800 rounded transition-colors"
										onclick={(e) => { if (!confirm('Remove this link?')) e.preventDefault(); }}
									>
										Remove
									</button>
								</form>
							</div>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
