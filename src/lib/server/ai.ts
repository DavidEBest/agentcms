import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
import { savePromptLog } from './storage';

const HYDRATION_SCRIPT = `<script>
(async()=>{
  let d;
  try{d=window.__easelData||await fetch('/site.json').then(r=>r.ok?r.json():null);}catch{return;}
  if(!d)return;
  const p=d.profile||{};
  const fill=(sel,val)=>{if(!val)return;document.querySelectorAll(sel).forEach(el=>el.textContent=val);};
  fill('[data-easel="name"]',p.name);
  fill('[data-easel="tagline"]',p.tagline);
  fill('[data-easel="bio"]',p.bio);
  fill('[data-easel="statement"]',p.artistStatement);
  fill('[data-easel="location"]',p.location);
  document.querySelectorAll('[data-easel="photo"]').forEach(el=>{if(p.photoUrl)el.src=p.photoUrl;});
  const ce=document.querySelector('[data-easel="contact-email"]');
  if(ce&&p.contactEmail){ce.textContent=p.contactEmail;ce.href='mailto:'+p.contactEmail;}
  const populate=(containerSel,templateId,items,fillFn)=>{
    const c=document.querySelector(containerSel);
    const t=document.getElementById(templateId);
    if(!c||!t||!items?.length)return;
    c.innerHTML='';
    items.forEach(item=>{const clone=t.content.cloneNode(true);fillFn(clone,item);c.appendChild(clone);});
  };
  populate('[data-easel="gallery"]','easel-gallery-item',d.gallery,(clone,item)=>{
    const img=clone.querySelector('[data-easel="item-image"]');if(img){img.src=item.url;img.alt=item.title||'';img.title=item.title||'';}
    const ttl=clone.querySelector('[data-easel="item-title"]');if(ttl)ttl.textContent=item.title||'';
    const desc=clone.querySelector('[data-easel="item-description"]');if(desc)desc.textContent=item.description||'';
  });
  populate('[data-easel="links"]','easel-link-item',d.links,(clone,link)=>{
    const a=clone.querySelector('[data-easel="link-url"]');
    if(a){a.href=link.url;a.textContent=link.label||link.platform;a.target='_blank';a.rel='noopener';}
  });
  populate('[data-easel="news"]','easel-news-item',d.news,(clone,item)=>{
    const ttl=clone.querySelector('[data-easel="news-title"]');if(ttl)ttl.textContent=item.title;
    const dt=clone.querySelector('[data-easel="news-date"]');if(dt)dt.textContent=item.publishedAt?new Date(item.publishedAt).toLocaleDateString():'';
    const body=clone.querySelector('[data-easel="news-body"]');if(body)body.textContent=item.body||'';
  });
})();
</script>`;

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export interface ArtistContext {
	profile: {
		name?: string | null;
		tagline?: string | null;
		bio?: string | null;
		artistStatement?: string | null;
		contactEmail?: string | null;
		location?: string | null;
		profilePhotoUrl?: string | null;
	} | null;
	gallery: Array<{ imageUrl: string; title?: string | null; description?: string | null }>;
	links: Array<{ platform: string; url: string; label?: string | null }>;
	news: Array<{ title: string; body: string; publishedAt: Date | null }>;
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
- index.html — always include; home/hero (name, tagline, profile photo if available, short bio, social links)
- gallery.html — always include; full image gallery (all provided images, prominent)
- about.html — include only if bio or artist statement is provided; skip entirely if neither exists
- contact.html — include only if contact email, location, or social links are provided; skip entirely if none exist
- news.html — include only if news items are provided; skip entirely if none exist

REQUIREMENTS FOR EVERY PAGE:
- All CSS inline in <style> tags — no external CSS frameworks
- You may use ONE Google Fonts <link> (same font across all pages for consistency)
- Minimal vanilla JS only if it adds real value
- Fully responsive and mobile-first
- Navigation must use .html extensions (href="/gallery.html", href="/about.html", etc.) and must ONLY link to pages you are actually generating in this response — never add a nav link to a page you are skipping
- All gallery images use the exact URLs provided
- Social links are real <a> tags opening in new tabs
- Contact email is a mailto: link

DESIGN PRINCIPLES:
- Make bold, opinionated decisions — avoid generic templates
- The style description drives creative choices in layout, typography, and color
- Consistent visual identity across all pages
- Prioritize the work: images should be prominent

DATA ATTRIBUTES — required on every page so content updates work without regeneration:
- data-easel="name" — on any element displaying the artist name
- data-easel="tagline" — tagline element
- data-easel="bio" — bio element
- data-easel="statement" — artist statement element
- data-easel="location" — location element
- data-easel="photo" — profile photo <img>
- data-easel="contact-email" — contact <a> with mailto: href
- data-easel="gallery" — the gallery container element
- data-easel="links" — the social links container element
- data-easel="news" — the news container element

CRITICAL — inline content: always write the actual provided text directly inside these elements. The data attributes allow future updates but the page must be fully readable before JavaScript runs. Never leave a data-easel element empty — if you have content for it, put it in the element.

TEMPLATE ELEMENTS — include these hidden templates on pages that show that content:
- <template id="easel-gallery-item"> — one gallery item; inside use data-easel="item-image" (img), data-easel="item-title", data-easel="item-description"
- <template id="easel-link-item"> — one link; inside use data-easel="link-url" (a element)
- <template id="easel-news-item"> — one news item; inside use data-easel="news-title", data-easel="news-date", data-easel="news-body"

A hydration script is automatically appended — do NOT include your own fetch or hydration logic.`;

function buildContext(ctx: ArtistContext): string {
	const lines: string[] = [];

	if (ctx.profile) {
		lines.push('ARTIST:');
		if (ctx.profile.name) lines.push(`  Name: ${ctx.profile.name}`);
		if (ctx.profile.tagline) lines.push(`  Tagline: ${ctx.profile.tagline}`);
		if (ctx.profile.location) lines.push(`  Location: ${ctx.profile.location}`);
		if (ctx.profile.bio) lines.push(`  Bio: ${ctx.profile.bio}`);
		if (ctx.profile.artistStatement) lines.push(`  Artist Statement: ${ctx.profile.artistStatement}`);
		if (ctx.profile.contactEmail) lines.push(`  Contact Email: ${ctx.profile.contactEmail}`);
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
		let html = parts[i + 1].trim();
		if (name && html) {
			// Inject before the last </body> to avoid matching </body> in comments/scripts
			const bodyClose = html.lastIndexOf('</body>');
			html = bodyClose !== -1
				? html.slice(0, bodyClose) + HYDRATION_SCRIPT + html.slice(bodyClose)
				: html + HYDRATION_SCRIPT;
			pages[name] = html;
		}
	}
	return pages;
}

export function buildSiteJson(ctx: ArtistContext) {
	return {
		profile: {
			name: ctx.profile?.name ?? null,
			tagline: ctx.profile?.tagline ?? null,
			bio: ctx.profile?.bio ?? null,
			artistStatement: ctx.profile?.artistStatement ?? null,
			contactEmail: ctx.profile?.contactEmail ?? null,
			location: ctx.profile?.location ?? null,
			photoUrl: ctx.profile?.profilePhotoUrl ?? null,
		},
		gallery: ctx.gallery.map(g => ({ url: g.imageUrl, title: g.title ?? null, description: g.description ?? null })),
		links: ctx.links.map(l => ({ platform: l.platform, url: l.url, label: l.label ?? null })),
		news: ctx.news.map(n => ({ title: n.title, publishedAt: n.publishedAt?.toISOString() ?? null, body: n.body ?? null })),
	};
}

export async function generateSite(ctx: ArtistContext, userId: string): Promise<Record<string, string>> {
	const userMessage = `${buildContext(ctx)}\n\nGenerate a stunning multi-page portfolio site for this artist. Be creative and distinctive.`;

	savePromptLog(userId, 'generate', SYSTEM_PROMPT, userMessage).catch(() => {});

	const stream = client.messages.stream({
		model: 'claude-sonnet-4-6',
		max_tokens: 32000,
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
	ctx: ArtistContext,
	userId: string
): Promise<Record<string, string>> {
	const pagesBlock = Object.entries(currentPages)
		.map(([name, html]) => `=== PAGE: ${name} ===\n${html}`)
		.join('\n');

	const userMessage = `${buildContext(ctx)}\n\nCurrent site pages:\n\n${pagesBlock}\n\nApply this change: ${request}\n\nReturn all pages using the same === PAGE: filename.html === delimiter format.`;

	savePromptLog(userId, 'refine', SYSTEM_PROMPT, userMessage).catch(() => {});

	const stream = client.messages.stream({
		model: 'claude-sonnet-4-6',
		max_tokens: 48000,
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
