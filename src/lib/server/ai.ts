import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export interface ArtistContext {
	profile: {
		name?: string | null;
		tagline?: string | null;
		bio?: string | null;
		profilePhotoUrl?: string | null;
	} | null;
	gallery: Array<{ imageUrl: string; title?: string | null; description?: string | null }>;
	links: Array<{ platform: string; url: string; label?: string | null }>;
	news: Array<{ title: string; publishedAt: Date | null }>;
	stylePrompt: string;
}

// Map of page filename → human label for the preview tab strip
export const PAGE_LABELS: Record<string, string> = {
	'index.html': 'Home',
	'gallery.html': 'Gallery',
	'news.html': 'News',
	'about.html': 'About',
	'contact.html': 'Contact'
};

const SYSTEM_PROMPT = `You are a world-class web designer specializing in artist portfolio websites. Generate a complete multi-page portfolio site as several self-contained HTML files.

OUTPUT FORMAT — this is critical:
- Output each page preceded by exactly this delimiter on its own line: === PAGE: filename.html ===
- Then immediately the full HTML for that page, starting with <!DOCTYPE html>
- No explanation, no markdown, no code fences — just the delimiters and raw HTML
- Example:
=== PAGE: index.html ===
<!DOCTYPE html>
<html>...</html>
=== PAGE: gallery.html ===
<!DOCTYPE html>
<html>...</html>

PAGES TO GENERATE:
- index.html — home/profile (hero, bio, social links)
- gallery.html — full image gallery
- news.html — only if the artist has published news; skip otherwise

REQUIREMENTS FOR EVERY PAGE:
- All CSS inline in <style> tags — no external CSS frameworks
- You may use ONE Google Fonts <link> (same font across all pages for consistency)
- Minimal vanilla JS only if it adds real value
- Fully responsive and mobile-first
- Consistent navigation across all pages linking to each other (use relative href="/gallery" style paths)
- All gallery images use the exact URLs provided
- Social links are real <a> tags opening in new tabs

DESIGN PRINCIPLES:
- Make bold, opinionated decisions — avoid generic templates
- The style description drives creative choices in layout, typography, and color
- Consistent visual identity across all pages
- Prioritize the work: images should be prominent`;

function buildContext(ctx: ArtistContext): string {
	const lines: string[] = [];

	if (ctx.profile) {
		lines.push('ARTIST:');
		if (ctx.profile.name) lines.push(`  Name: ${ctx.profile.name}`);
		if (ctx.profile.tagline) lines.push(`  Tagline: ${ctx.profile.tagline}`);
		if (ctx.profile.bio) lines.push(`  Bio: ${ctx.profile.bio}`);
		if (ctx.profile.profilePhotoUrl) lines.push(`  Photo: ${ctx.profile.profilePhotoUrl}`);
	}

	if (ctx.gallery.length > 0) {
		lines.push('\nGALLERY IMAGES (use all of these):');
		ctx.gallery.forEach((item, i) => {
			const parts = [`  ${i + 1}. ${item.imageUrl}`];
			if (item.title) parts.push(`title="${item.title}"`);
			if (item.description) parts.push(`description="${item.description}"`);
			lines.push(parts.join(' '));
		});
	}

	if (ctx.links.length > 0) {
		lines.push('\nSOCIAL LINKS:');
		ctx.links.forEach((l) => lines.push(`  ${l.label ?? l.platform}: ${l.url}`));
	}

	if (ctx.news.length > 0) {
		lines.push('\nNEWS/UPDATES:');
		ctx.news.forEach((n) =>
			lines.push(`  - ${n.title}${n.publishedAt ? ` (${n.publishedAt.toLocaleDateString()})` : ''}`)
		);
	}

	lines.push(`\nSTYLE: ${ctx.stylePrompt}`);
	return lines.join('\n');
}

function parsePages(response: string): Record<string, string> {
	const pages: Record<string, string> = {};
	const parts = response.split(/^=== PAGE: (.+?) ===$/m);
	// parts: [preamble, name1, html1, name2, html2, ...]
	for (let i = 1; i < parts.length - 1; i += 2) {
		const name = parts[i].trim();
		const html = parts[i + 1].trim();
		if (name && html) pages[name] = html;
	}
	return pages;
}

export async function generateSite(ctx: ArtistContext): Promise<Record<string, string>> {
	const userMessage = `${buildContext(ctx)}\n\nGenerate a stunning multi-page portfolio site for this artist. Be creative and distinctive.`;

	console.log('\n=== generateSite ===');
	console.log('SYSTEM:\n', SYSTEM_PROMPT);
	console.log('\nUSER:\n', userMessage);
	console.log('===================\n');

	const stream = client.messages.stream({
		model: 'claude-opus-4-6',
		max_tokens: 16000,
		thinking: { type: 'adaptive' },
		system: SYSTEM_PROMPT,
		messages: [{ role: 'user', content: userMessage }]
	});

	const message = await stream.finalMessage();
	const text = message.content.find((b) => b.type === 'text');
	if (!text || text.type !== 'text') throw new Error('No HTML in response');

	const pages = parsePages(text.text);
	if (Object.keys(pages).length === 0) throw new Error('Could not parse pages from response');
	return pages;
}

export async function refineSite(
	currentPages: Record<string, string>,
	request: string,
	ctx: ArtistContext
): Promise<Record<string, string>> {
	const pagesBlock = Object.entries(currentPages)
		.map(([name, html]) => `=== PAGE: ${name} ===\n${html}`)
		.join('\n');

	const userMessage = `${buildContext(ctx)}\n\nCurrent site pages:\n\n${pagesBlock}\n\nApply this change: ${request}\n\nReturn all pages using the same === PAGE: filename.html === delimiter format.`;

	console.log('\n=== refineSite ===');
	console.log('SYSTEM:\n', SYSTEM_PROMPT);
	console.log('\nUSER:\n', userMessage);
	console.log('==================\n');

	const stream = client.messages.stream({
		model: 'claude-opus-4-6',
		max_tokens: 16000,
		thinking: { type: 'adaptive' },
		system: SYSTEM_PROMPT,
		messages: [{ role: 'user', content: userMessage }]
	});

	const message = await stream.finalMessage();
	const text = message.content.find((b) => b.type === 'text');
	if (!text || text.type !== 'text') throw new Error('No HTML in response');

	const pages = parsePages(text.text);
	if (Object.keys(pages).length === 0) throw new Error('Could not parse pages from response');
	return pages;
}
