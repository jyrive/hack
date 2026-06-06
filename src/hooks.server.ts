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

export const handle: Handle = async ({ event, resolve }) => {
	const supabaseUrl = env.VITE_SUPABASE_URL;
	const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be configured.');
	}

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
};