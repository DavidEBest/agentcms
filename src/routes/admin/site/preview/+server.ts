import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { generatedSites, artistProfiles, galleryItems, socialLinks, newsItems } from '$lib/server/db/schema';
import { eq, and, asc, desc, isNotNull } from 'drizzle-orm';
import { getSiteHtml } from '$lib/server/storage';
import { buildSiteJson } from '$lib/server/ai';

function parseManifest(raw: string | null | undefined): Record<string, string> {
	if (!raw) return {};
	try { return JSON.parse(raw); } catch { return {}; }
}

export const GET: RequestHandler = async ({ locals, url }) => {
	const userId = locals.user!.id;
	const page = url.searchParams.get('page') ?? 'index.html';

	const [site, profile, gallery, links, news] = await Promise.all([
		db.query.generatedSites.findFirst({ where: eq(generatedSites.userId, userId) }),
		db.query.artistProfiles.findFirst({ where: eq(artistProfiles.userId, userId) }),
		db.select().from(galleryItems).where(and(eq(galleryItems.userId, userId), eq(galleryItems.visible, true))).orderBy(asc(galleryItems.order)),
		db.select().from(socialLinks).where(eq(socialLinks.userId, userId)).orderBy(asc(socialLinks.order)),
		db.select().from(newsItems).where(and(eq(newsItems.userId, userId), isNotNull(newsItems.publishedAt))).orderBy(desc(newsItems.publishedAt)),
	]);

	const manifest = parseManifest(site?.draftManifest);
	const key = manifest[page];
	if (!key) error(404, 'Page not found');

	let html = await getSiteHtml(key);

	// Inject current data so the hydration script uses live data without fetching /site.json
	const siteData = buildSiteJson({ profile: profile ?? null, gallery, links, news, stylePrompt: site?.stylePrompt ?? '' });
	const injection = `<script>window.__easelData=${JSON.stringify(siteData)};</script>`;
	html = html.includes('</head>') ? html.replace('</head>', `${injection}</head>`) : injection + html;

	return new Response(html, {
		headers: { 'Content-Type': 'text/html; charset=utf-8' }
	});
};
