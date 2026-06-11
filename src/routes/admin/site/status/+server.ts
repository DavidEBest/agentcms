import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { generatedSites } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const STALE_JOB_MS = 5 * 60 * 1000;

export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.user!.id;
	const site = await db.query.generatedSites.findFirst({
		where: eq(generatedSites.userId, userId)
	});

	let status = site?.generationStatus ?? null;
	if (status === 'pending' && site?.updatedAt) {
		if (Date.now() - site.updatedAt.getTime() > STALE_JOB_MS) status = 'error';
	}

	const draftPages = site?.draftManifest
		? Object.keys(JSON.parse(site.draftManifest))
		: [];

	return json({
		status,
		error: site?.generationError ?? null,
		draftPages
	});
};
