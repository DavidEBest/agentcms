import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { generatedSites } from '$lib/server/db/schema';
import { isNotNull } from 'drizzle-orm';
import { getSiteHtml } from '$lib/server/storage';

function parseManifest(raw: string | null | undefined): Record<string, string> {
	if (!raw) return {};
	try { return JSON.parse(raw); } catch { return {}; }
}

export const GET: RequestHandler = async ({ params }) => {
	// Map /gallery → gallery.html, /news → news.html, etc.
	const slug = params.path.replace(/\/$/, '');
	const filename = slug.endsWith('.html') ? slug : `${slug}.html`;

	const site = await db.query.generatedSites.findFirst({
		where: isNotNull(generatedSites.publishedManifest)
	});

	if (!site?.publishedManifest) error(404, 'Not found');

	const manifest = parseManifest(site.publishedManifest);
	const key = manifest[filename];
	if (!key) error(404, 'Not found');

	try {
		const html = await getSiteHtml(key);
		return new Response(html, {
			headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' }
		});
	} catch {
		error(404, 'Not found');
	}
};
