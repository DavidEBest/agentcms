import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	name: text('name'),
	subdomain: text('subdomain').unique(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const magicTokens = sqliteTable('magic_tokens', {
	token: text('token').primaryKey(),
	userId: text('user_id').notNull(),
	email: text('email').notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	used: integer('used', { mode: 'boolean' }).notNull().default(false)
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const artistProfiles = sqliteTable('artist_profiles', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().unique(),
	name: text('name'),
	tagline: text('tagline'),
	bio: text('bio'),
	profilePhotoUrl: text('profile_photo_url'),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const socialLinks = sqliteTable('social_links', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull(),
	platform: text('platform').notNull(),
	url: text('url').notNull(),
	label: text('label'),
	order: integer('order').notNull().default(0)
});

export const galleryItems = sqliteTable('gallery_items', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull(),
	imageUrl: text('image_url').notNull(),
	title: text('title'),
	description: text('description'),
	order: integer('order').notNull().default(0),
	visible: integer('visible', { mode: 'boolean' }).notNull().default(true),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const generatedSites = sqliteTable('generated_sites', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().unique(),
	// JSON: Record<pageName, s3Key> e.g. {"index.html": "sites/x/draft/index.html"}
	draftManifest: text('draft_manifest'),
	publishedManifest: text('published_manifest'),
	stylePrompt: text('style_prompt'),
	chatLog: text('chat_log').notNull().default('[]'), // JSON: [{role,text}]
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const newsItems = sqliteTable('news_items', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull(),
	title: text('title').notNull(),
	body: text('body').notNull(),
	publishedAt: integer('published_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
