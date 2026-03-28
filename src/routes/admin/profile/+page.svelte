<script lang="ts">
	import { enhance, deserialize } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let name = $state('');
	let tagline = $state('');
	let bio = $state('');
	let artistStatement = $state('');
	let contactEmail = $state('');
	let location = $state('');
	let profilePhotoUrl = $state('');

	$effect(() => {
		name = data.profile?.name ?? '';
		tagline = data.profile?.tagline ?? '';
		bio = data.profile?.bio ?? '';
		artistStatement = data.profile?.artistStatement ?? '';
		contactEmail = data.profile?.contactEmail ?? '';
		location = data.profile?.location ?? '';
		profilePhotoUrl = data.profile?.profilePhotoUrl ?? '';
	});
	let uploading = $state(false);
	let saving = $state(false);

	async function handlePhotoUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		uploading = true;
		try {
			// Get presigned upload URL
			const fd = new FormData();
			fd.set('filename', file.name);
			fd.set('contentType', file.type);

			const res = await fetch('?/uploadUrl', { method: 'POST', body: fd });
			const result = deserialize(await res.text());
			if (result.type !== 'success') throw new Error('Failed to get upload URL');
			const { uploadUrl, publicUrl } = result.data as { uploadUrl: string; publicUrl: string };

			// Upload directly to S3
			await fetch(uploadUrl, {
				method: 'PUT',
				body: file,
				headers: { 'Content-Type': file.type }
			});

			profilePhotoUrl = publicUrl;
		} finally {
			uploading = false;
		}
	}
</script>

<div class="p-8 max-w-2xl">
	<h1 class="text-xl font-semibold text-white mb-6">Profile</h1>

	<form
		method="POST"
		action="?/save"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update();
				saving = false;
			};
		}}
		class="space-y-6"
	>
		<!-- Photo -->
		<div>
			<label class="block text-sm font-medium text-zinc-300 mb-2">Photo</label>
			<div class="flex items-center gap-4">
				{#if profilePhotoUrl}
					<img src={profilePhotoUrl} alt="Profile" class="w-20 h-20 rounded-full object-cover border border-zinc-700" />
				{:else}
					<div class="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-600 text-2xl">◉</div>
				{/if}
				<label class="cursor-pointer">
					<input type="file" accept="image/*" onchange={handlePhotoUpload} class="sr-only" />
					<span class="px-3 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded-md text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors">
						{uploading ? 'Uploading…' : 'Change photo'}
					</span>
				</label>
			</div>
			<input type="hidden" name="profilePhotoUrl" value={profilePhotoUrl} />
		</div>

		<!-- Name -->
		<div>
			<label for="name" class="block text-sm font-medium text-zinc-300 mb-1">Name</label>
			<input
				id="name"
				name="name"
				type="text"
				bind:value={name}
				class="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
				placeholder="Your name or artist name"
			/>
		</div>

		<!-- Tagline -->
		<div>
			<label for="tagline" class="block text-sm font-medium text-zinc-300 mb-1">Tagline</label>
			<input
				id="tagline"
				name="tagline"
				type="text"
				bind:value={tagline}
				class="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
				placeholder="A short description — e.g. Painter & printmaker based in Brooklyn"
			/>
		</div>

		<!-- Bio -->
		<div>
			<label for="bio" class="block text-sm font-medium text-zinc-300 mb-1">Bio</label>
			<textarea
				id="bio"
				name="bio"
				bind:value={bio}
				rows="4"
				class="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
				placeholder="A short, conversational description of who you are…"
			></textarea>
		</div>

		<!-- Artist Statement -->
		<div>
			<label for="artistStatement" class="block text-sm font-medium text-zinc-300 mb-1">Artist Statement</label>
			<textarea
				id="artistStatement"
				name="artistStatement"
				bind:value={artistStatement}
				rows="5"
				class="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
				placeholder="Your formal statement about your practice, process, and intentions…"
			></textarea>
		</div>

		<!-- Contact Info -->
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="contactEmail" class="block text-sm font-medium text-zinc-300 mb-1">Contact Email</label>
				<input
					id="contactEmail"
					name="contactEmail"
					type="email"
					bind:value={contactEmail}
					class="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					placeholder="hello@yourdomain.com"
				/>
			</div>
			<div>
				<label for="location" class="block text-sm font-medium text-zinc-300 mb-1">Location</label>
				<input
					id="location"
					name="location"
					type="text"
					bind:value={location}
					class="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					placeholder="Brooklyn, NY"
				/>
			</div>
		</div>

		{#if form?.success}
			<p class="text-green-400 text-sm">Saved.</p>
		{/if}

		<div class="flex justify-end">
			<button
				type="submit"
				disabled={saving}
				class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
			>
				{saving ? 'Saving…' : 'Save profile'}
			</button>
		</div>
	</form>
</div>
