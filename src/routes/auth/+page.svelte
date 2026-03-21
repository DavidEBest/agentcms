<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="min-h-screen flex items-center justify-center bg-zinc-950">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<h1 class="text-2xl font-semibold text-white">AgentCMS</h1>
			<p class="mt-1 text-zinc-400 text-sm">Sign in to manage your artist site</p>
		</div>

		<form method="POST" use:enhance class="space-y-4">
			<div>
				<label for="email" class="block text-sm font-medium text-zinc-300 mb-1">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					required
					autocomplete="email"
					class="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					placeholder="you@example.com"
				/>
			</div>

			{#if form?.error}
				<p class="text-red-400 text-sm">{form.error}</p>
			{/if}

			{#if form?.success}
				<div class="p-3 bg-green-900/30 border border-green-700 rounded-lg">
					<p class="text-green-300 text-sm">Check your email for a sign-in link.</p>
				</div>
			{:else}
				<button
					type="submit"
					class="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
				>
					Send sign-in link
				</button>
			{/if}
		</form>
	</div>
</div>
