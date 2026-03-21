import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { deleteSession, SESSION_COOKIE } from '$lib/server/auth';

export const actions: Actions = {
	default: async ({ locals, cookies }) => {
		if (locals.sessionId) {
			await deleteSession(locals.sessionId);
		}
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/auth');
	}
};
