import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { newsItems } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = async ({ locals }) => {
	const items = await db.query.newsItems.findMany({
		where: eq(newsItems.userId, locals.user!.id),
		orderBy: desc(newsItems.createdAt)
	});
	return { items };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = data.get('id') as string | null;
		const title = data.get('title') as string;
		const body = data.get('body') as string;
		const publishedStr = data.get('published') as string;

		if (!title || !body) return fail(400, { error: 'Title and body are required' });

		const publishedAt = publishedStr === 'true' ? new Date() : null;

		if (id) {
			const existing = await db.query.newsItems.findFirst({ where: eq(newsItems.id, id) });
			if (!existing || existing.userId !== userId) return fail(403);

			await db.update(newsItems).set({
				title,
				body,
				publishedAt: publishedAt ?? existing.publishedAt
			}).where(eq(newsItems.id, id));
		} else {
			await db.insert(newsItems).values({
				id: nanoid(),
				userId,
				title,
				body,
				publishedAt,
				createdAt: new Date()
			});
		}

		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = data.get('id') as string;

		const item = await db.query.newsItems.findFirst({ where: eq(newsItems.id, id) });
		if (!item || item.userId !== userId) return fail(403);

		await db.delete(newsItems).where(eq(newsItems.id, id));
		return { success: true };
	},

	publish: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = data.get('id') as string;

		const item = await db.query.newsItems.findFirst({ where: eq(newsItems.id, id) });
		if (!item || item.userId !== userId) return fail(403);

		await db.update(newsItems)
			.set({ publishedAt: item.publishedAt ? null : new Date() })
			.where(eq(newsItems.id, id));
		return { success: true };
	}
};
