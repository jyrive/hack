import { env } from '$env/dynamic/private';

function cleanChecklistItems(items: string[]): string[] {
	const unique: string[] = [];
	for (const item of items) {
		const trimmed = item.trim();
		if (!trimmed) continue;
		if (trimmed.length > 120) {
			unique.push(trimmed.slice(0, 120).trim());
		} else {
			unique.push(trimmed);
		}
	}

	return [...new Set(unique)].slice(0, 8);
}

export async function suggestChecklistItems(input: {
	workOrderType: string;
	contextText: string;
}): Promise<string[]> {
	const apiKey = env.OPENAI_API_KEY;
	if (!apiKey) {
		throw new Error('OPENAI_API_KEY is not configured on the server.');
	}

	const prompt = [
		'Create practical technician checklist items.',
		`Work order type: ${input.workOrderType || 'General service'}`,
		`Context: ${input.contextText}`,
		'Return only JSON in the format: {"items": ["...", "..."]}.',
		'Rules: 4-8 items, short imperative phrases, concrete actions, no markdown.'
	].join('\n');

	const response = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: 'gpt-4o-mini',
			temperature: 0.2,
			response_format: { type: 'json_object' },
			messages: [
				{ role: 'system', content: 'You produce concise maintenance checklist items as strict JSON.' },
				{ role: 'user', content: prompt }
			]
		})
	});

	const payload = (await response.json()) as {
		error?: { message?: string };
		choices?: Array<{ message?: { content?: string } }>;
	};

	if (!response.ok) {
		throw new Error(payload.error?.message ?? 'Checklist suggestion request failed.');
	}

	const content = payload.choices?.[0]?.message?.content;
	if (!content) {
		return [];
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		return [];
	}

	if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { items?: unknown }).items)) {
		return [];
	}

	const items = (parsed as { items: unknown[] }).items
		.filter((item): item is string => typeof item === 'string')
		.map((item) => item.replace(/\s+/g, ' ').trim());

	return cleanChecklistItems(items);
}
