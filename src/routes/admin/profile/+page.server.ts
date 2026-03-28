import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { artistProfiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getUploadUrl } from '$lib/server/storage';

export const load: PageServerLoad = async ({ locals }) => {
	const profile = await db.query.artistProfiles.findFirst({
		where: eq(artistProfiles.userId, locals.user!.id)
	});
	return { profile };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();

		const name = data.get('name') as string;
		const tagline = data.get('tagline') as string;
		const bio = data.get('bio') as string;
		const artistStatement = data.get('artistStatement') as string;
		const contactEmail = data.get('contactEmail') as string;
		const location = data.get('location') as string;
		const profilePhotoUrl = data.get('profilePhotoUrl') as string | null;

		const existing = await db.query.artistProfiles.findFirst({
			where: eq(artistProfiles.userId, userId)
		});

		if (existing) {
			await db
				.update(artistProfiles)
				.set({ name, tagline, bio, artistStatement, contactEmail, location, profilePhotoUrl: profilePhotoUrl || existing.profilePhotoUrl, updatedAt: new Date() })
				.where(eq(artistProfiles.userId, userId));
		} else {
			await db.insert(artistProfiles).values({
				id: nanoid(),
				userId,
				name,
				tagline,
				bio,
				artistStatement,
				contactEmail,
				location,
				profilePhotoUrl: profilePhotoUrl || null,
				updatedAt: new Date()
			});
		}

		return { success: true };
	},

	uploadUrl: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const filename = data.get('filename') as string;
		const contentType = data.get('contentType') as string;

		if (!filename || !contentType) return fail(400, { error: 'Missing file info' });

		try {
			const result = await getUploadUrl(userId, filename, contentType);
			return result;
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Failed to generate upload URL' });
		}
	}
};
