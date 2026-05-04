import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '$env/dynamic/private';
import { nanoid } from 'nanoid';

const s3 = new S3Client({
	region: env.S3_REGION ?? 'auto',
	endpoint: env.S3_ENDPOINT,
	credentials: {
		accessKeyId: env.S3_ACCESS_KEY_ID!,
		secretAccessKey: env.S3_SECRET_ACCESS_KEY!
	},
	requestChecksumCalculation: 'WHEN_REQUIRED',
	responseChecksumValidation: 'WHEN_REQUIRED'
});

const BUCKET = env.S3_BUCKET;

export async function getUploadUrl(userId: string, filename: string, contentType: string) {
	const ext = filename.split('.').pop() ?? 'bin';
	const key = `uploads/${userId}/${nanoid()}.${ext}`;

	const command = new PutObjectCommand({
		Bucket: BUCKET,
		Key: key,
		ContentType: contentType
	});

	const url = await getSignedUrl(s3, command, { expiresIn: 300 });
	const publicUrl = `${env.S3_PUBLIC_URL}/${key}`;

	return { uploadUrl: url, publicUrl, key };
}

export async function deleteObject(key: string) {
	await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// Upload multiple HTML pages; returns manifest mapping pageName → s3Key
export async function putSitePages(
	userId: string,
	pages: Record<string, string>,
	slot: 'draft' | 'published'
): Promise<Record<string, string>> {
	const manifest: Record<string, string> = {};
	await Promise.all(
		Object.entries(pages).map(async ([name, html]) => {
			const key = `sites/${userId}/${slot}/${name}`;
			await putSiteHtml(key, html);
			manifest[name] = key;
		})
	);
	return manifest;
}

export async function putSiteHtml(key: string, html: string): Promise<void> {
	await s3.send(new PutObjectCommand({
		Bucket: BUCKET,
		Key: key,
		Body: html,
		ContentType: 'text/html; charset=utf-8'
	}));
}

export async function getSiteHtml(key: string): Promise<string> {
	const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
	if (!response.Body) throw new Error('Empty S3 response');
	return response.Body.transformToString();
}

export async function saveSiteJson(userId: string, data: unknown, slot: 'draft' | 'published'): Promise<void> {
	const key = `sites/${userId}/${slot}/site.json`;
	await s3.send(new PutObjectCommand({
		Bucket: BUCKET,
		Key: key,
		Body: JSON.stringify(data),
		ContentType: 'application/json; charset=utf-8'
	}));
}

export async function savePromptLog(userId: string, label: string, system: string, user: string): Promise<void> {
	const ts = new Date().toISOString().replace(/[:.]/g, '-');
	const key = `prompts/${userId}/${ts}-${label}.txt`;
	const body = `=== SYSTEM ===\n${system}\n\n=== USER ===\n${user}`;
	await s3.send(new PutObjectCommand({
		Bucket: BUCKET,
		Key: key,
		Body: body,
		ContentType: 'text/plain; charset=utf-8'
	}));
}
