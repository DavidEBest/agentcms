import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users, artistProfiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

// In-memory rate limit: 3 messages per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
	const now = Date.now();
	const entry = rateLimitMap.get(ip);
	if (!entry || now > entry.resetAt) {
		rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
		return true;
	}
	if (entry.count >= RATE_LIMIT) return false;
	entry.count++;
	return true;
}

function corsHeaders(origin: string | null): Record<string, string> {
	const allowed = origin && /^https:\/\/[a-z0-9-]+\.easel\.site$/.test(origin);
	return {
		'Access-Control-Allow-Origin': allowed ? origin : 'null',
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Vary': 'Origin',
	};
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export const OPTIONS: RequestHandler = async ({ request }) => {
	return new Response(null, {
		status: 204,
		headers: corsHeaders(request.headers.get('origin')),
	});
};

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const origin = request.headers.get('origin') ?? '';
	const headers = corsHeaders(origin);

	const match = origin.match(/^https:\/\/([a-z0-9-]+)\.easel\.site$/);
	if (!match) {
		return json({ error: 'Invalid origin' }, { status: 400, headers });
	}
	const subdomain = match[1];

	const ip = getClientAddress();
	if (!checkRateLimit(ip)) {
		return json({ error: 'Too many messages. Please try again later.' }, { status: 429, headers });
	}

	let body: { name?: string; email?: string; message?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request' }, { status: 400, headers });
	}

	const name = body.name?.trim();
	const email = body.email?.trim();
	const message = body.message?.trim();

	if (!name || !email || !message) {
		return json({ error: 'All fields are required.' }, { status: 400, headers });
	}

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return json({ error: 'Please enter a valid email address.' }, { status: 400, headers });
	}

	const user = await db.query.users.findFirst({ where: eq(users.subdomain, subdomain) });
	if (!user) {
		return json({ error: 'Not found' }, { status: 404, headers });
	}

	const profile = await db.query.artistProfiles.findFirst({
		where: eq(artistProfiles.userId, user.id),
	});

	const toEmail = profile?.contactEmail || user.email;

	const resend = new Resend(env.RESEND_API_KEY);
	await resend.emails.send({
		from: env.EMAIL_FROM ?? 'easel.site <noreply@easel.site>',
		to: toEmail,
		replyTo: email,
		subject: `Message from ${name} via ${subdomain}.easel.site`,
		html: `
			<p style="font-family:sans-serif;color:#111">
				<strong>${escapeHtml(name)}</strong> sent you a message via your easel.site contact form.
			</p>
			<blockquote style="font-family:sans-serif;color:#333;border-left:3px solid #ccc;margin:1rem 0;padding:0.5rem 1rem">
				${escapeHtml(message).replace(/\n/g, '<br>')}
			</blockquote>
			<p style="font-family:sans-serif;color:#555;font-size:0.875rem">
				Reply to this email to respond directly to ${escapeHtml(name)} at ${escapeHtml(email)}.
			</p>
		`,
	});

	return json({ ok: true }, { headers });
};
