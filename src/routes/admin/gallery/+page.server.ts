import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { galleryItems } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getUploadUrl, deleteObject } from '$lib/server/storage';

export const load: PageServerLoad = async ({ locals }) => {
	const items = await db.query.galleryItems.findMany({
		where: eq(galleryItems.userId, locals.user!.id),
		orderBy: asc(galleryItems.order)
	});
	return { items };
};

export const actions: Actions = {
	uploadUrl: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const filename = data.get('filename') as string;
		const contentType = data.get('contentType') as string;
		if (!filename || !contentType) return fail(400, { error: 'Missing file info' });
		try {
			return await getUploadUrl(userId, filename, contentType);
		} catch {
			return fail(500, { error: 'Failed to generate upload URL' });
		}
	},

	addItem: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const imageUrl = data.get('imageUrl') as string;
		const title = data.get('title') as string;
		const description = data.get('description') as string;

		if (!imageUrl) return fail(400, { error: 'Image URL required' });

		const existing = await db.query.galleryItems.findMany({
			where: eq(galleryItems.userId, userId)
		});

		await db.insert(galleryItems).values({
			id: nanoid(),
			userId,
			imageUrl,
			title: title || null,
			description: description || null,
			order: existing.length,
			visible: true,
			createdAt: new Date()
		});

		return { success: true };
	},

	updateItem: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = data.get('id') as string;
		const title = data.get('title') as string;
		const description = data.get('description') as string;
		const visible = data.getAll('visible').includes('true');

		await db
			.update(galleryItems)
			.set({ title: title || null, description: description || null, visible })
			.where(eq(galleryItems.id, id));

		return { success: true };
	},

	deleteItem: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const id = data.get('id') as string;

		const item = await db.query.galleryItems.findFirst({ where: eq(galleryItems.id, id) });
		if (!item || item.userId !== userId) return fail(403);

		// Extract key from URL for deletion
		try {
			const key = new URL(item.imageUrl).pathname.slice(1);
			await deleteObject(key);
		} catch {
			// Don't block deletion if S3 delete fails
		}

		await db.delete(galleryItems).where(eq(galleryItems.id, id));
		return { success: true };
	},

	reorder: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const ids = (data.get('ids') as string).split(',');

		await Promise.all(
			ids.map((id, index) =>
				db
					.update(galleryItems)
					.set({ order: index })
					.where(eq(galleryItems.id, id))
			)
		);

		return { success: true };
	}
};
