import { env } from '$env/dynamic/private';
import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';

const PUBLIC_PATHS = new Set(['/auth/signin', '/auth/callback', '/auth/error', '/hello']);
const PUBLIC_PREFIXES = ['/_app/', '/icons/'];
const PUBLIC_FILES = new Set(['/robots.txt', '/site.webmanifest', '/service-worker.js', '/favicon.ico']);

function isPublicPath(pathname: string): boolean {
	if (PUBLIC_PATHS.has(pathname) || PUBLIC_FILES.has(pathname)) {
		return true;
	}

	for (const prefix of PUBLIC_PREFIXES) {
		if (pathname.startsWith(prefix)) {
			return true;
		}
	}

	return false;
}

function getSupabaseConfig() {
	const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.PUBLIC_SUPABASE_URL;
	const anonKey =
		env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.PUBLIC_SUPABASE_ANON_KEY;

	if (!url || !anonKey) {
		throw new Error(
			'Supabase config missing. Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (or SUPABASE_URL + SUPABASE_ANON_KEY) in SWA app settings.'
		);
	}

	return { url, anonKey };
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;

	try {
		const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseConfig();

		event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (
					cookiesToSet: {
						name: string;
						value: string;
						options: Parameters<typeof event.cookies.set>[2];
					}[]
				) => {
					for (const { name, value, options } of cookiesToSet) {
						event.cookies.set(name, value, { ...options, path: '/' });
					}
				}
			}
		});

		// Some provider setups land on /?code=... instead of /auth/callback; exchange here too.
		const code = event.url.searchParams.get('code');
		if (code && event.url.pathname !== '/auth/callback') {
			try {
				const { error } = await event.locals.supabase.auth.exchangeCodeForSession(code);
				if (error) {
					throw error;
				}
			} catch {
				throw redirect(303, '/auth/error');
			}

			const requestedNext = event.url.searchParams.get('next') ?? '/';
			const next = requestedNext.startsWith('/') ? requestedNext : '/';
			throw redirect(303, next);
		}

		const {
			data: { user }
		} = await event.locals.supabase.auth.getUser();

		event.locals.user = user;

		if (!user && !isPublicPath(event.url.pathname)) {
			const next = `${event.url.pathname}${event.url.search}`;
			throw redirect(303, `/auth/signin?next=${encodeURIComponent(next)}`);
		}

		if (user && event.url.pathname === '/auth/signin') {
			throw redirect(303, '/');
		}

		return resolve(event);
	} catch (error) {
		console.error('Auth hook failure', {
			path: event.url.pathname,
			hasViteUrl: Boolean(env.VITE_SUPABASE_URL),
			hasViteAnonKey: Boolean(env.VITE_SUPABASE_ANON_KEY),
			hasSupabaseUrl: Boolean(env.SUPABASE_URL),
			hasSupabaseAnonKey: Boolean(env.SUPABASE_ANON_KEY),
			error
		});

		if (isPublicPath(event.url.pathname) || event.url.pathname === '/auth/error') {
			return resolve(event);
		}

		throw redirect(303, '/auth/error');
	}
};