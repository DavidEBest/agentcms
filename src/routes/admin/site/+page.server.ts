import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { generatedSites, artistProfiles, galleryItems, socialLinks, newsItems, users } from '$lib/server/db/schema';
import { eq, and, asc, desc, isNotNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { generateSite, refineSite, buildSiteJson } from '$lib/server/ai';
import type { ArtistContext } from '$lib/server/ai';
import { putSitePages, getSiteHtml, saveSiteJson } from '$lib/server/storage';
import { env } from '$env/dynamic/private';

const STALE_JOB_MS = 5 * 60 * 1000;

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

async function runGeneration(userId: string, ctx: ArtistContext, stylePrompt: string) {
	try {
		const pages = await generateSite(ctx, userId);
		const [manifest] = await Promise.all([
			putSitePages(userId, pages, 'draft'),
			saveSiteJson(userId, buildSiteJson(ctx), 'draft'),
		]);

		const chatLog = JSON.stringify([
			{ role: 'user', text: stylePrompt },
			{ role: 'assistant', text: `Generated ${Object.keys(pages).length} pages: ${Object.keys(pages).join(', ')}` }
		]);

		await db.update(generatedSites)
			.set({ draftManifest: JSON.stringify(manifest), chatLog, generationStatus: 'done', generationError: null, updatedAt: new Date() })
			.where(eq(generatedSites.userId, userId));
	} catch (e) {
		console.error('Site generation failed:', e);
		await db.update(generatedSites)
			.set({ generationStatus: 'error', generationError: e instanceof Error ? e.message : 'Generation failed', updatedAt: new Date() })
			.where(eq(generatedSites.userId, userId));
	}
}

async function runRefinement(
	userId: string,
	currentPages: Record<string, string>,
	userRequest: string,
	ctx: ArtistContext,
	existingChatLog: Array<{ role: string; text: string }>
) {
	try {
		const pages = await refineSite(currentPages, userRequest, ctx, userId);
		const [manifest] = await Promise.all([
			putSitePages(userId, pages, 'draft'),
			saveSiteJson(userId, buildSiteJson(ctx), 'draft'),
		]);

		const chatLog = [
			...existingChatLog,
			{ role: 'user', text: userRequest },
			{ role: 'assistant', text: 'Updated.' }
		];

		await db.update(generatedSites)
			.set({ draftManifest: JSON.stringify(manifest), chatLog: JSON.stringify(chatLog), generationStatus: 'done', generationError: null, updatedAt: new Date() })
			.where(eq(generatedSites.userId, userId));
	} catch (e) {
		console.error('Site refinement failed:', e);
		await db.update(generatedSites)
			.set({ generationStatus: 'error', generationError: e instanceof Error ? e.message : 'Refinement failed', updatedAt: new Date() })
			.where(eq(generatedSites.userId, userId));
	}
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const [site, user] = await Promise.all([
		db.query.generatedSites.findFirst({ where: eq(generatedSites.userId, userId) }),
		db.query.users.findFirst({ where: eq(users.id, userId) })
	]);

	let generationStatus = site?.generationStatus ?? null;
	if (generationStatus === 'pending' && site?.updatedAt) {
		if (Date.now() - site.updatedAt.getTime() > STALE_JOB_MS) generationStatus = null;
	}

	return {
		draftPages: Object.keys(parseManifest(site?.draftManifest ?? null)),
		isPublished: !!site?.publishedManifest,
		stylePrompt: site?.stylePrompt ?? '',
		chatLog: JSON.parse(site?.chatLog ?? '[]') as Array<{ role: string; text: string }>,
		subdomain: user?.subdomain ?? '',
		generationStatus
	};
};

export const actions: Actions = {
	setSubdomain: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const subdomain = (data.get('subdomain') as string)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

		if (!subdomain) return fail(400, { subdomainError: 'Enter a subdomain.' });
		if (subdomain.length < 2) return fail(400, { subdomainError: 'Too short.' });

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

		const existing = await db.query.generatedSites.findFirst({ where: eq(generatedSites.userId, userId) });
		if (existing?.generationStatus === 'pending') return fail(400, { error: 'A generation is already in progress.' });

		const ctx = await getContext(userId, stylePrompt);

		if (existing) {
			await db.update(generatedSites)
				.set({ generationStatus: 'pending', generationError: null, stylePrompt, updatedAt: new Date() })
				.where(eq(generatedSites.userId, userId));
		} else {
			await db.insert(generatedSites).values({
				id: nanoid(), userId,
				generationStatus: 'pending',
				stylePrompt, chatLog: '[]',
				updatedAt: new Date()
			});
		}

		runGeneration(userId, ctx, stylePrompt).catch(console.error);

		return { jobStarted: true };
	},

	refine: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const data = await request.formData();
		const userRequest = (data.get('request') as string)?.trim();

		if (!userRequest) return fail(400, { error: 'Please describe what to change.' });

		const site = await db.query.generatedSites.findFirst({ where: eq(generatedSites.userId, userId) });
		const draftManifest = parseManifest(site?.draftManifest ?? null);
		if (Object.keys(draftManifest).length === 0) return fail(400, { error: 'Generate a site first.' });
		if (site?.generationStatus === 'pending') return fail(400, { error: 'A generation is already in progress.' });

		const currentPages: Record<string, string> = {};
		await Promise.all(
			Object.entries(draftManifest).map(async ([name, key]) => {
				currentPages[name] = await getSiteHtml(key);
			})
		);

		const ctx = await getContext(userId, site?.stylePrompt ?? '');
		const existingChatLog = JSON.parse(site?.chatLog ?? '[]');

		await db.update(generatedSites)
			.set({ generationStatus: 'pending', generationError: null, updatedAt: new Date() })
			.where(eq(generatedSites.userId, userId));

		runRefinement(userId, currentPages, userRequest, ctx, existingChatLog).catch(console.error);

		return { jobStarted: true };
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
		const ctx = await getContext(userId, site?.stylePrompt ?? '');
		const [publishedManifest] = await Promise.all([
			putSitePages(userId, pages, 'published'),
			saveSiteJson(userId, buildSiteJson(ctx), 'published'),
		]);

		await db.update(generatedSites)
			.set({ publishedManifest: JSON.stringify(publishedManifest), updatedAt: new Date() })
			.where(eq(generatedSites.userId, userId));

		await writeSubdomainToKv(user.subdomain, userId);

		return { published: true, url: `https://${user.subdomain}.easel.site` };
	},

	publishContent: async ({ locals }) => {
		const userId = locals.user!.id;

		const [site, user] = await Promise.all([
			db.query.generatedSites.findFirst({ where: eq(generatedSites.userId, userId) }),
			db.query.users.findFirst({ where: eq(users.id, userId) })
		]);

		if (!user?.subdomain) return fail(400, { error: 'Set your subdomain before publishing.' });
		if (!site?.publishedManifest) return fail(400, { error: 'Publish the full site first.' });

		const ctx = await getContext(userId, site.stylePrompt ?? '');
		await saveSiteJson(userId, buildSiteJson(ctx), 'published');

		return { contentPublished: true, url: `https://${user.subdomain}.easel.site` };
	}
};
