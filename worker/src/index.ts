interface Env {
	SUBDOMAINS: KVNamespace;
	R2_BUCKET: R2Bucket;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const subdomain = url.hostname.split('.')[0];

		const userId = await env.SUBDOMAINS.get(subdomain);
		if (!userId) {
			return new Response('Not found', { status: 404 });
		}

		// Map path to filename: / → index.html, /gallery → gallery.html
		const slug = url.pathname.replace(/^\/|\/$/g, '');
		const filename = !slug ? 'index.html' : slug.endsWith('.html') ? slug : `${slug}.html`;
		const key = `sites/${userId}/published/${filename}`;

		const object = await env.R2_BUCKET.get(key);
		if (!object) {
			return new Response('Page not found', { status: 404 });
		}

		return new Response(object.body, {
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				'Cache-Control': 'public, max-age=60',
			},
		});
	},
};
