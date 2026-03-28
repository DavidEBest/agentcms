import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { generatedSites } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getSiteHtml } from '$lib/server/storage';

function parseManifest(raw: string | null | undefined): Record<string, string> {
	if (!raw) return {};
	try { return JSON.parse(raw); } catch { return {}; }
}

export const GET: RequestHandler = async ({ locals, url }) => {
	const userId = locals.user!.id;
	const page = url.searchParams.get('page') ?? 'index.html';

	const site = await db.query.generatedSites.findFirst({
		where: eq(generatedSites.userId, userId)
	});

	const manifest = parseManifest(site?.draftManifest);
	const key = manifest[page];
	if (!key) error(404, 'Page not found');

	const html = await getSiteHtml(key);
	return new Response(html, {
		headers: { 'Content-Type': 'text/html; charset=utf-8' }
	});
};
