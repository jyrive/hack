import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals, url }) => {
	const code = url.searchParams.get('code');
	const requestedNext = url.searchParams.get('next') ?? '/';
	const next = requestedNext.startsWith('/') ? requestedNext : '/';

	if (code) {
		try {
			const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
			if (error) {
				throw error;
			}
		} catch {
			throw redirect(303, '/auth/error');
		}
	}

	throw redirect(303, next);
};