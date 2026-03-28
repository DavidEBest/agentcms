import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { generatedSites } from '$lib/server/db/schema';
import { isNotNull } from 'drizzle-orm';
import { getSiteHtml } from '$lib/server/storage';

const COMING_SOON = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Coming Soon</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: #09090b; color: #52525b; font-family: sans-serif; }
</style>
</head>
<body><p>Coming soon.</p></body>
</html>`;

function parseManifest(raw: string | null | undefined): Record<string, string> {
	if (!raw) return {};
	try { return JSON.parse(raw); } catch { return {}; }
}

export const GET: RequestHandler = async () => {
	const site = await db.query.generatedSites.findFirst({
		where: isNotNull(generatedSites.publishedManifest)
	});

	if (site?.publishedManifest) {
		const manifest = parseManifest(site.publishedManifest);
		const key = manifest['index.html'];
		if (key) {
			try {
				const html = await getSiteHtml(key);
				return new Response(html, {
					headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' }
				});
			} catch {
				// fall through to coming soon
			}
		}
	}

	return new Response(COMING_SOON, {
		headers: { 'Content-Type': 'text/html; charset=utf-8' }
	});
};
