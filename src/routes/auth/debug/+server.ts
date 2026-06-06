import { env } from '$env/dynamic/private';
import { createServerClient } from '@supabase/ssr';
import { json, type RequestHandler } from '@sveltejs/kit';
import WebSocket from 'ws';

function normalize(value?: string) {
	return value?.trim().replace(/^['\"]|['\"]$/g, '');
}

function summarizeSecret(value?: string) {
	if (!value) {
		return { present: false };
	}

	return {
		present: true,
		length: value.length,
		prefix: value.slice(0, 12)
	};
}

export const GET: RequestHandler = async (event) => {
	const rawUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.PUBLIC_SUPABASE_URL;
	const rawKey =
		env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.PUBLIC_SUPABASE_ANON_KEY;

	const url = normalize(rawUrl);
	const key = normalize(rawKey);

	let urlValid = false;
	let clientInitOk = false;
	let clientInitError = '';

	try {
		if (url) {
			new URL(url);
			urlValid = true;
		}
	} catch {
		urlValid = false;
	}

	try {
		if (url && key) {
			createServerClient(url, key, {
				realtime: {
					transport: WebSocket
				},
				cookies: {
					getAll: () => event.cookies.getAll(),
					setAll: () => {
						// no-op for diagnostics
					}
				}
			});
			clientInitOk = true;
		}
	} catch (error) {
		clientInitError = error instanceof Error ? error.message : String(error);
	}

	return json({
		runtime: {
			node: process.version
		},
			envSummary: {
				url: summarizeSecret(url),
				key: summarizeSecret(key),
				urlValid,
				keyLooksPublishable: Boolean(key?.startsWith('sb_publishable_')),
				keyLooksJwt: Boolean(key?.startsWith('eyJ'))
			},
			clientInit: {
				ok: clientInitOk,
				error: clientInitError
			}
	});
};
