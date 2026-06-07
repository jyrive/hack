import azure from 'svelte-adapter-azure-swa';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: azure({
			allowReservedSwaRoutes: true,
			customStaticWebAppConfig: {
				platform: {
					apiRuntime: 'node:20'
				}
			}
		})
	}
};

export default config;
