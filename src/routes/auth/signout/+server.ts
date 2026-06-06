import { redirect, type RequestHandler } from '@sveltejs/kit';

const signOut: RequestHandler = async ({ locals }) => {
	await locals.supabase.auth.signOut();
	throw redirect(303, '/auth/signin');
};

export const GET = signOut;
export const POST = signOut;