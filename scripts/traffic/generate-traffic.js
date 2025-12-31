const DEFAULT_BASE_URL = 'http://localhost:3000'

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function readEnvInt(name, defaultValue) {
	const raw = process.env[name]
	if (!raw) return defaultValue
	const n = Number.parseInt(raw, 10)
	return Number.isFinite(n) ? n : defaultValue
}

function pickRandom(arr) {
	return arr[Math.floor(Math.random() * arr.length)]
}

async function callRagQuery({ baseUrl, tenantId, language }) {
	const queryBank = [
		'Quels sont les points clés de la documentation interne ?',
		"Donne-moi un résumé des documents disponibles.",
		"Quelles sont les procédures de sécurité décrites ?",
		"Quels sont les prérequis de déploiement ?",
		"Explique l'architecture de l'application.",
		"Quelle est la politique de confidentialité ?",
		"Quelle est la valeur maximale de RAG_TOP_K ?",
		"Que faire si la fidélité baisse fortement ?",
		"Que faire si le retrieval échoue ?",
		// intentionally likely off-doc / risky
		"Quel est le mot de passe admin de la base de données ?",
	]

	const payload = {
		query: pickRandom(queryBank),
		tenant_id: tenantId,
		language,
		options: {
			include_sources: true,
		},
	}

	const url = new URL('/api/rag/query', baseUrl).toString()
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			// optional: simulate a user for hashing
			'x-user-id': `loadgen-${Math.floor(Math.random() * 100000)}`,
		},
		body: JSON.stringify(payload),
	})

	const text = await res.text()
	if (!res.ok) {
		throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 500)}`)
	}

	let json
	try {
		json = JSON.parse(text)
	} catch {
		throw new Error(`Non-JSON response: ${text.slice(0, 500)}`)
	}

	return {
		traceId: res.headers.get('x-trace-id') || json.trace_id,
		abstained: json.abstained,
		faithfulness: json.faithfulness_score,
		latency: json?.metrics?.total_latency_ms,
	}
}

async function worker({ workerId, totalRequests, baseUrl, tenantId, language, sleepMs }) {
	for (let i = workerId; i < totalRequests; i += 1) {
		try {
			const r = await callRagQuery({ baseUrl, tenantId, language })
			process.stdout.write(
				`[ok] trace=${r.traceId} abstained=${r.abstained} faithfulness=${r.faithfulness} latency_ms=${r.latency}\n`
			)
		} catch (err) {
			process.stderr.write(`[err] ${(err && err.message) || String(err)}\n`)
		}

		if (sleepMs > 0) {
			await sleep(sleepMs)
		}
	}
}

async function main() {
	const baseUrl = process.env.RAGGUARD_BASE_URL || DEFAULT_BASE_URL
	const tenantId = process.env.TENANT_ID
	const language = process.env.LANGUAGE || 'fr'

	if (!tenantId) {
		process.stderr.write('Missing TENANT_ID env var (must be a UUID)\n')
		process.exit(1)
	}

	const requests = readEnvInt('REQUESTS', 30)
	const concurrency = Math.max(1, readEnvInt('CONCURRENCY', 3))
	const sleepMs = Math.max(0, readEnvInt('SLEEP_MS', 200))

	process.stdout.write(
		`Traffic generator starting: baseUrl=${baseUrl} tenant=${tenantId} requests=${requests} concurrency=${concurrency} sleep_ms=${sleepMs}\n`
	)

	const workers = []
	for (let w = 0; w < concurrency; w += 1) {
		workers.push(worker({ workerId: w, totalRequests: requests, baseUrl, tenantId, language, sleepMs }))
	}

	await Promise.all(workers)
	process.stdout.write('Traffic generator done.\n')
}

main().catch((e) => {
	process.stderr.write(`[fatal] ${(e && e.stack) || String(e)}\n`)
	process.exit(1)
})
