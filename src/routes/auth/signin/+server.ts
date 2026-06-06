import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals, url }) => {
	const requestedNext = url.searchParams.get('next') ?? '/';
	const next = requestedNext.startsWith('/') ? requestedNext : '/';
	const redirectTo = `${url.origin}/auth/callback?next=${encodeURIComponent(next)}`;

	const { data, error } = await locals.supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo
		}
	});

	if (error || !data.url) {
		throw redirect(303, '/auth/error');
	}

	throw redirect(303, data.url);
};