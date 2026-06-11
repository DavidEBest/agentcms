import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { generatedSites } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getSiteHtml } from '$lib/server/storage';
import { zipSync, strToU8 } from 'fflate';

export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.user!.id;
	const site = await db.query.generatedSites.findFirst({
		where: eq(generatedSites.userId, userId)
	});

	if (!site?.draftManifest) error(404, 'No site generated yet.');

	const manifest: Record<string, string> = JSON.parse(site.draftManifest);
	const entries = Object.entries(manifest);
	if (entries.length === 0) error(404, 'No site generated yet.');

	const htmlFiles = await Promise.all(
		entries.map(async ([name, key]) => ({ name, html: await getSiteHtml(key) }))
	);

	const files: Record<string, Uint8Array> = {};
	for (const { name, html } of htmlFiles) {
		files[name] = strToU8(html);
	}

	const zipped = zipSync(files, { level: 6 });

	return new Response(zipped, {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': 'attachment; filename="site.zip"',
			'Content-Length': String(zipped.byteLength)
		}
	});
};
