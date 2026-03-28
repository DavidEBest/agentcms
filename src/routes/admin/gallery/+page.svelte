<script lang="ts">
	import { enhance, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let uploading = $state(false);
	let uploadProgress = $state<string[]>([]);
	let editingId = $state<string | null>(null);

	async function handleFiles(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		if (!files.length) return;

		uploading = true;
		uploadProgress = files.map((f) => f.name);

		for (const file of files) {
			// Get presigned URL
			const fd = new FormData();
			fd.set('filename', file.name);
			fd.set('contentType', file.type);
			const res = await fetch('?/uploadUrl', { method: 'POST', body: fd });
			const result = deserialize(await res.text());
			if (result.type !== 'success') throw new Error('Failed to get upload URL');
			const { uploadUrl, publicUrl } = result.data as { uploadUrl: string; publicUrl: string };

			// Upload to S3
			await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });

			// Register in DB
			const addFd = new FormData();
			addFd.set('imageUrl', publicUrl);
			await fetch('?/addItem', { method: 'POST', body: addFd });
		}

		uploading = false;
		uploadProgress = [];
		input.value = '';
		await invalidateAll();
	}
</script>

<div class="p-8">
	<div class="flex items-center justify-between mb-6 max-w-5xl">
		<h1 class="text-xl font-semibold text-white">Gallery</h1>
		<label class="cursor-pointer">
			<input type="file" accept="image/*" multiple onchange={handleFiles} class="sr-only" />
			<span class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
				{uploading ? 'Uploading…' : '+ Add images'}
			</span>
		</label>
	</div>

	{#if uploading}
		<div class="mb-4 p-3 bg-zinc-900 border border-zinc-800 rounded-lg max-w-5xl">
			<p class="text-zinc-400 text-sm">Uploading {uploadProgress.length} image(s)…</p>
		</div>
	{/if}

	{#if data.items.length === 0}
		<div class="max-w-5xl border-2 border-dashed border-zinc-800 rounded-xl p-12 text-center">
			<p class="text-zinc-500 text-sm">No images yet. Click "Add images" to upload.</p>
		</div>
	{:else}
		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl">
			{#each data.items as item (item.id)}
				<div class="group relative bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
					<img
						src={item.imageUrl}
						alt={item.title ?? ''}
						class="w-full aspect-square object-cover {item.visible ? '' : 'opacity-40'}"
					/>

					<!-- Overlay controls -->
					<div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 gap-1">
						<button
							onclick={() => (editingId = editingId === item.id ? null : item.id)}
							class="w-full text-xs py-1 px-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
						>
							Edit
						</button>
						<form method="POST" action="?/deleteItem" use:enhance={() => async ({ update }) => { await update(); await invalidateAll(); }}>
							<input type="hidden" name="id" value={item.id} />
							<button
								type="submit"
								class="w-full text-xs py-1 px-2 bg-red-900/60 hover:bg-red-800 text-red-300 rounded transition-colors"
								onclick={(e) => { if (!confirm('Delete this image?')) e.preventDefault(); }}
							>
								Delete
							</button>
						</form>
					</div>

					{#if !item.visible}
						<div class="absolute top-2 left-2 text-xs bg-zinc-800/90 text-zinc-400 px-1.5 py-0.5 rounded">Hidden</div>
					{/if}
				</div>

				{#if editingId === item.id}
					<div class="col-span-full bg-zinc-900 border border-zinc-700 rounded-lg p-4">
						<form
							method="POST"
							action="?/updateItem"
							use:enhance={() => async ({ update }) => {
								await update();
								await invalidateAll();
								editingId = null;
							}}
							class="space-y-3"
						>
							<input type="hidden" name="id" value={item.id} />
							<div>
								<label class="block text-xs font-medium text-zinc-400 mb-1">Title</label>
								<input
									name="title"
									type="text"
									value={item.title ?? ''}
									class="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
									placeholder="Optional title"
								/>
							</div>
							<div>
								<label class="block text-xs font-medium text-zinc-400 mb-1">Description</label>
								<textarea
									name="description"
									rows="2"
									class="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
									placeholder="Optional description"
								>{item.description ?? ''}</textarea>
							</div>
							<div class="flex items-center gap-2">
								<label class="flex items-center gap-2 cursor-pointer">
									<input type="hidden" name="visible" value="false" />
									<input
										type="checkbox"
										name="visible"
										value="true"
										checked={item.visible}
										class="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
									/>
									<span class="text-sm text-zinc-300">Visible</span>
								</label>
							</div>
							<div class="flex gap-2">
								<button
									type="submit"
									class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded transition-colors"
								>
									Save
								</button>
								<button
									type="button"
									onclick={() => (editingId = null)}
									class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded transition-colors"
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
