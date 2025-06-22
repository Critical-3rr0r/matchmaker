import { redirect } from '@sveltejs/kit';

export function load({ locals }) {
	// This runs ONLY on the server
	if (locals.user) {
		throw redirect(302, '/matchmaker');
	}
	return {
		user: locals.user
	};
}