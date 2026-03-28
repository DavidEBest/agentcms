import { db } from './db';
import { users, magicTokens, sessions } from './db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_COOKIE = 'session';

export async function sendMagicLink(email: string, baseUrl: string) {
	const normalizedEmail = email.toLowerCase().trim();

	// Upsert user
	let user = await db.query.users.findFirst({ where: eq(users.email, normalizedEmail) });
	if (!user) {
		const id = nanoid();
		await db.insert(users).values({ id, email: normalizedEmail, createdAt: new Date() });
		user = { id, email: normalizedEmail, name: null, createdAt: new Date() };
	}

	const token = nanoid(32);
	const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

	await db.insert(magicTokens).values({
		token,
		userId: user.id,
		email: normalizedEmail,
		expiresAt,
		used: false
	});

	const link = `${baseUrl}/auth/verify?token=${token}`;

	const resend = new Resend(env.RESEND_API_KEY);
	await resend.emails.send({
		from: env.EMAIL_FROM ?? 'AgentCMS <noreply@agentcms.app>',
		to: normalizedEmail,
		subject: 'Sign in to AgentCMS',
		html: `
			<p>Click the link below to sign in. It expires in 15 minutes.</p>
			<p><a href="${link}">${link}</a></p>
			<p>If you didn't request this, you can safely ignore this email.</p>
		`
	});
}

export async function verifyMagicLink(token: string): Promise<string | null> {
	const record = await db.query.magicTokens.findFirst({
		where: and(
			eq(magicTokens.token, token),
			eq(magicTokens.used, false),
			gt(magicTokens.expiresAt, new Date())
		)
	});

	if (!record) return null;

	// Mark token used
	await db.update(magicTokens).set({ used: true }).where(eq(magicTokens.token, token));

	// Create session
	const sessionId = nanoid(32);
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
	await db.insert(sessions).values({ id: sessionId, userId: record.userId, expiresAt });

	return sessionId;
}

export async function getSession(sessionId: string) {
	const session = await db.query.sessions.findFirst({
		where: and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date()))
	});
	if (!session) return null;

	const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
	return user ?? null;
}

export async function deleteSession(sessionId: string) {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}
