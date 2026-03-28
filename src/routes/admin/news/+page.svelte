<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let editingId = $state<string | 'new' | null>(null);
	let editTitle = $state('');
	let editBody = $state('');

	function startNew() {
		editingId = 'new';
		editTitle = '';
		editBody = '';
	}

	function startEdit(item: (typeof data.items)[0]) {
		editingId = item.id;
		editTitle = item.title;
		editBody = item.body;
	}

	function formatDate(d: Date | null) {
		if (!d) return null;
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<div class="p-8 max-w-3xl">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-semibold text-white">News</h1>
		{#if editingId !== 'new'}
			<button
				onclick={startNew}
				class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
			>
				+ New post
			</button>
		{/if}
	</div>

	{#if editingId === 'new' || (editingId && editingId !== 'new')}
		<div class="mb-6 bg-zinc-900 border border-zinc-700 rounded-lg p-5">
			<h2 class="text-sm font-medium text-zinc-300 mb-4">
				{editingId === 'new' ? 'New post' : 'Edit post'}
			</h2>
			<form
				method="POST"
				action="?/save"
				use:enhance={() => async ({ update }) => {
					await update();
					await invalidateAll();
					editingId = null;
				}}
				class="space-y-4"
			>
				{#if editingId !== 'new'}
					<input type="hidden" name="id" value={editingId} />
				{/if}
				<div>
					<label class="block text-xs font-medium text-zinc-400 mb-1">Title</label>
					<input
						name="title"
						type="text"
						bind:value={editTitle}
						required
						class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
						placeholder="Post title"
					/>
				</div>
				<div>
					<label class="block text-xs font-medium text-zinc-400 mb-1">Body</label>
					<textarea
						name="body"
						bind:value={editBody}
						required
						rows="8"
						class="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y font-mono"
						placeholder="Write your post… Markdown is supported."
					></textarea>
					<p class="text-zinc-600 text-xs mt-1">Markdown supported</p>
				</div>
				<div class="flex items-center justify-between">
					<label class="flex items-center gap-2 cursor-pointer">
						<input type="hidden" name="published" value="false" />
						<input
							type="checkbox"
							name="published"
							value="true"
							class="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
						/>
						<span class="text-sm text-zinc-300">Publish immediately</span>
					</label>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => (editingId = null)}
							class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded transition-colors"
						>
							Save
						</button>
					</div>
				</div>
			</form>
		</div>
	{/if}

	{#if data.items.length === 0}
		<div class="border-2 border-dashed border-zinc-800 rounded-xl p-10 text-center">
			<p class="text-zinc-500 text-sm">No posts yet.</p>
		</div>
	{:else}
		<ul class="space-y-2">
			{#each data.items as item (item.id)}
				<li class="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
					<div class="min-w-0">
						<div class="flex items-center gap-2">
							<p class="text-white text-sm font-medium truncate">{item.title}</p>
							{#if item.publishedAt}
								<span class="flex-shrink-0 text-xs text-green-400 bg-green-900/30 border border-green-800/50 px-1.5 py-0.5 rounded">
									Published {formatDate(item.publishedAt)}
								</span>
							{:else}
								<span class="flex-shrink-0 text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
									Draft
								</span>
							{/if}
						</div>
						<p class="text-zinc-500 text-xs mt-0.5 line-clamp-1">{item.body.slice(0, 100)}</p>
					</div>
					<div class="flex items-center gap-1 flex-shrink-0">
						<button
							onclick={() => startEdit(item)}
							class="text-xs text-zinc-400 hover:text-white px-2 py-1 hover:bg-zinc-800 rounded transition-colors"
						>
							Edit
						</button>
						<form method="POST" action="?/publish" use:enhance={() => async ({ update }) => { await update(); await invalidateAll(); }}>
							<input type="hidden" name="id" value={item.id} />
							<button type="submit" class="text-xs text-zinc-400 hover:text-white px-2 py-1 hover:bg-zinc-800 rounded transition-colors">
								{item.publishedAt ? 'Unpublish' : 'Publish'}
							</button>
						</form>
						<form method="POST" action="?/delete" use:enhance={() => async ({ update }) => { await update(); await invalidateAll(); }}>
							<input type="hidden" name="id" value={item.id} />
							<button
								type="submit"
								class="text-xs text-red-400 hover:text-red-300 px-2 py-1 hover:bg-zinc-800 rounded transition-colors"
								onclick={(e) => { if (!confirm('Delete this post?')) e.preventDefault(); }}
							>
								Delete
							</button>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
