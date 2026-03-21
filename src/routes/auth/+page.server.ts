import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { sendMagicLink } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const data = await request.formData();
		const email = data.get('email');

		if (!email || typeof email !== 'string') {
			return fail(400, { error: 'Email is required' });
		}

		try {
			await sendMagicLink(email, url.origin);
			return { success: true };
		} catch (e) {
			console.error('Magic link error:', e);
			return fail(500, { error: 'Failed to send sign-in link. Please try again.' });
		}
	}
};
