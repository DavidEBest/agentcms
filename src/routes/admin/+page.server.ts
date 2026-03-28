import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { artistProfiles, galleryItems, newsItems, socialLinks } from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const [profile, gallery, news, links] = await Promise.all([
		db.query.artistProfiles.findFirst({ where: eq(artistProfiles.userId, userId) }),
		db.select({ count: count() }).from(galleryItems).where(eq(galleryItems.userId, userId)),
		db.select({ count: count() }).from(newsItems).where(eq(newsItems.userId, userId)),
		db.select({ count: count() }).from(socialLinks).where(eq(socialLinks.userId, userId))
	]);

	return {
		profile,
		galleryCount: gallery[0].count,
		newsCount: news[0].count,
		linksCount: links[0].count
	};
};
