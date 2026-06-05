# SvelteKit + Azure Static Web Apps (SSR)

This repository root now contains a minimal SvelteKit project configured for Azure Static Web Apps with server-side capability.

## What is included

- One page at `/` ([src/routes/+page.svelte](src/routes/+page.svelte))
- One server endpoint at `/hello` ([src/routes/hello/+server.ts](src/routes/hello/+server.ts))
- Azure SWA adapter configuration in [svelte.config.js](svelte.config.js)
- Ready-to-use SWA GitHub Actions workflow in [.github/workflows/azure-static-web-apps.yml](.github/workflows/azure-static-web-apps.yml)

## Local development

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

This creates:

- Static app artifacts in `build/static`
- SWA API (SSR function) in `build/server`

## Azure Static Web Apps deployment notes

Workflow uses these required settings for this adapter:

- `app_location: ./`
- `api_location: build/server`
- `output_location: build/static`

Add the deployment token as repository secret:

- `AZURE_STATIC_WEB_APPS_API_TOKEN`

Then push to `main` to trigger deployment.
