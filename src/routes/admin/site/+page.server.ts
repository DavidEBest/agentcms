import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { generatedSites, artistProfiles, galleryItems, socialLinks, newsItems, users } from '$lib/server/db/schema';
import { eq, and, asc, desc, isNotNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { generateSite, refineSite } from '$lib/server/ai';
import { putSitePages, getSiteHtml } from '$lib/server/storage';
import { env } from '$env/dynamic/private';

async function getContext(userId: string, stylePrompt: string) {
	const [profile, gallery, links, news] = await Promise.all([
		db.query.artistProfiles.findFirst({ where: eq(artistProfiles.userId, userId) }),
		db.select().from(galleryItems)
			.where(and(eq(galleryItems.userId, userId), eq(galleryItems.visible, true)))
			.orderBy(asc(galleryItems.order)),
		db.select().from(socialLinks)
			.where(eq(socialLinks.userId, userId))
			.orderBy(asc(socialLinks.order)),
		db.select().from(newsItems)
			.where(and(eq(newsItems.userId, userId), isNotNull(newsItems.publishedAt)))
			.orderBy(desc(newsItems.publishedAt))
	]);
	return { profile: profile ?? null, gallery, links, news, stylePrompt };
}

function parseManifest(raw: string | null): Record<string, string> {
	if (!raw) return {};
	try { return JSON.parse(raw); } catch { return {}; }
}

async function writeSubdomainToKv(subdomain: string, userId: string) {
	const res = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${env.CLOUDFLARE_KV_NAMESPACE_ID}/values/${subdomain}`,
		{
			method: 'PUT',
			headers: {
				Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
				'Content-Type': 'text/plain',
			},
			body: userId,
		}
	);
	if (!res.ok) throw new Error(`KV write failed: ${await res.text()}`);
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const [site, user] = await Promise.all([
		db.query.generatedSites.findFirst({ where: eq(generatedSites.userId, userId) }),
		db.query.users.findFirst({ where: eq(users.id, userId) })
	]);
	return {
		draftPages: Object.keys(parseManifest(site?.draftManifest ?? null)),
		isPublished: !!site?.publishedManifest,
		stylePrompt: site?.stylePrompt ?? '',
		chatLog: JSON.parse(site?.chatLog ?? '[]') as Array<{ role: string; text: string }>,
		subdomain: user?.subdomain ?? ''
	};
};

export const actions: Actions = {
	setSubdomain: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const subdomain = (data.get('subdomain') as string)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

		if (!subdomain) return fail(400, { subdomainError: 'Enter a subdomain.' });
		if (subdomain.length < 2) return fail(400, { subdomainError: 'Too short.' });

		// Check not taken by another user
		const existing = await db.query.users.findFirst({ where: eq(users.subdomain, subdomain) });
		if (existing && existing.id !== userId) return fail(400, { subdomainError: 'Already taken.' });

		await db.update(users).set({ subdomain }).where(eq(users.id, userId));
		return { subdomainSaved: true };
	},

	generate: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const stylePrompt = (data.get('stylePrompt') as string)?.trim();

		if (!stylePrompt) return fail(400, { error: 'Please describe the style you want.' });

		try {
			const ctx = await getContext(userId, stylePrompt);
			const pages = await generateSite(ctx);
			const manifest = await putSitePages(userId, pages, 'draft');

			const chatLog = JSON.stringify([
				{ role: 'user', text: stylePrompt },
				{ role: 'assistant', text: `Generated ${Object.keys(pages).length} pages: ${Object.keys(pages).join(', ')}` }
			]);

			const existing = await db.query.generatedSites.findFirst({
				where: eq(generatedSites.userId, userId)
			});

			if (existing) {
				await db.update(generatedSites)
					.set({ draftManifest: JSON.stringify(manifest), stylePrompt, chatLog, updatedAt: new Date() })
					.where(eq(generatedSites.userId, userId));
			} else {
				await db.insert(generatedSites).values({
					id: nanoid(), userId,
					draftManifest: JSON.stringify(manifest),
					stylePrompt, chatLog,
					updatedAt: new Date()
				});
			}

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Generation failed. Please try again.' });
		}
	},

	refine: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const userRequest = (data.get('request') as string)?.trim();

		if (!userRequest) return fail(400, { error: 'Please describe what to change.' });

		const site = await db.query.generatedSites.findFirst({
			where: eq(generatedSites.userId, userId)
		});
		const draftManifest = parseManifest(site?.draftManifest ?? null);
		if (Object.keys(draftManifest).length === 0) return fail(400, { error: 'Generate a site first.' });

		try {
			const currentPages: Record<string, string> = {};
			await Promise.all(
				Object.entries(draftManifest).map(async ([name, key]) => {
					currentPages[name] = await getSiteHtml(key);
				})
			);

			const ctx = await getContext(userId, site?.stylePrompt ?? '');
			const pages = await refineSite(currentPages, userRequest, ctx);
			const manifest = await putSitePages(userId, pages, 'draft');

			const chatLog = JSON.parse(site?.chatLog ?? '[]');
			chatLog.push(
				{ role: 'user', text: userRequest },
				{ role: 'assistant', text: 'Updated.' }
			);

			await db.update(generatedSites)
				.set({ draftManifest: JSON.stringify(manifest), chatLog: JSON.stringify(chatLog), updatedAt: new Date() })
				.where(eq(generatedSites.userId, userId));

			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: 'Refinement failed. Please try again.' });
		}
	},

	publish: async ({ locals }) => {
		const userId = locals.user!.id;

		const [site, user] = await Promise.all([
			db.query.generatedSites.findFirst({ where: eq(generatedSites.userId, userId) }),
			db.query.users.findFirst({ where: eq(users.id, userId) })
		]);

		if (!user?.subdomain) return fail(400, { error: 'Set your subdomain before publishing.' });

		const draftManifest = parseManifest(site?.draftManifest ?? null);
		if (Object.keys(draftManifest).length === 0) return fail(400, { error: 'Nothing to publish.' });

		const pages: Record<string, string> = {};
		await Promise.all(
			Object.entries(draftManifest).map(async ([name, key]) => {
				pages[name] = await getSiteHtml(key);
			})
		);
		const publishedManifest = await putSitePages(userId, pages, 'published');

		await db.update(generatedSites)
			.set({ publishedManifest: JSON.stringify(publishedManifest), updatedAt: new Date() })
			.where(eq(generatedSites.userId, userId));

		await writeSubdomainToKv(user.subdomain, userId);

		return { published: true, url: `https://${user.subdomain}.easel.site` };
	}
};
