import type { users } from '$lib/server/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

type User = InferSelectModel<typeof users>;

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			sessionId: string | null;
		}
	}
}

export {};
