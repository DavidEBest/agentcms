import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '$env/dynamic/private';
import { nanoid } from 'nanoid';

const s3 = new S3Client({
	region: env.S3_REGION ?? 'auto',
	endpoint: env.S3_ENDPOINT,
	credentials: {
		accessKeyId: env.S3_ACCESS_KEY_ID!,
		secretAccessKey: env.S3_SECRET_ACCESS_KEY!
	}
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
