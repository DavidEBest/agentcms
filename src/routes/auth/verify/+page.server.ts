import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { verifyMagicLink, SESSION_COOKIE } from '$lib/server/auth';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const token = url.searchParams.get('token');

	if (!token) error(400, 'Missing token');

	const sessionId = await verifyMagicLink(token);

	if (!sessionId) error(400, 'This link is invalid or has expired.');

	cookies.set(SESSION_COOKIE, sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 30
	});

	redirect(303, '/');
};
