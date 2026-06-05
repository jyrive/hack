/// <reference lib="webworker" />
import { build, files, version } from '$service-worker';

const CACHE = `app-cache-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => keys.filter((key) => key !== CACHE))
			.then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	event.respondWith(
		caches.match(event.request).then((cached) => {
			if (cached) return cached;
			return fetch(event.request);
		})
	);
});
