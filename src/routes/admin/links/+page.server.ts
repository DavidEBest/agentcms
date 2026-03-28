import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { socialLinks } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async ({ locals }) => {
	const links = await db.query.socialLinks.findMany({
		where: eq(socialLinks.userId, locals.user!.id),
		orderBy: asc(socialLinks.order)
	});
	return { links };
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const platform = data.get('platform') as string;
		const url = data.get('url') as string;
		const label = data.get('label') as string;

		if (!platform || !url) return fail(400, { error: 'Platform and URL are required' });

		const existing = await db.query.socialLinks.findMany({ where: eq(socialLinks.userId, userId) });

		await db.insert(socialLinks).values({
			id: nanoid(),
			userId,
			platform,
			url,
			label: label || null,
			order: existing.length
		});

		return { success: true };
	},

	update: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = data.get('id') as string;
		const url = data.get('url') as string;
		const label = data.get('label') as string;

		const link = await db.query.socialLinks.findFirst({ where: eq(socialLinks.id, id) });
		if (!link || link.userId !== userId) return fail(403);

		await db.update(socialLinks).set({ url, label: label || null }).where(eq(socialLinks.id, id));
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = data.get('id') as string;

		const link = await db.query.socialLinks.findFirst({ where: eq(socialLinks.id, id) });
		if (!link || link.userId !== userId) return fail(403);

		await db.delete(socialLinks).where(eq(socialLinks.id, id));
		return { success: true };
	}
};
