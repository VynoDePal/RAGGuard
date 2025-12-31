const fs = require('node:fs')
const path = require('node:path')

function requiredEnv(name) {
	const v = process.env[name]
	if (!v) {
		throw new Error(`Missing env var: ${name}`)
	}
	return v
}

function optionalEnv(name, defaultValue) {
	return process.env[name] || defaultValue
}

function parseIdList(raw) {
	if (!raw) return []
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
}

function ensureDir(p) {
	fs.mkdirSync(p, { recursive: true })
}

async function ddGetJson({ site, apiKey, appKey, urlPath }) {
	const url = `https://api.${site}${urlPath}`
	const res = await fetch(url, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'DD-API-KEY': apiKey,
			'DD-APPLICATION-KEY': appKey,
		},
	})

	const text = await res.text()
	if (!res.ok) {
		throw new Error(`Datadog API ${res.status} ${res.statusText} on ${urlPath}: ${text.slice(0, 800)}`)
	}

	return JSON.parse(text)
}

async function exportDashboards({ outDir, site, apiKey, appKey, ids }) {
	if (ids.length === 0) return
	ensureDir(outDir)
	for (const id of ids) {
		const json = await ddGetJson({ site, apiKey, appKey, urlPath: `/api/v1/dashboard/${id}` })
		fs.writeFileSync(path.join(outDir, `dashboard-${id}.json`), JSON.stringify(json, null, 2) + '\n')
		process.stdout.write(`Exported dashboard ${id}\n`)
	}
}

async function exportMonitors({ outDir, site, apiKey, appKey, ids }) {
	if (ids.length === 0) return
	ensureDir(outDir)
	for (const id of ids) {
		const json = await ddGetJson({ site, apiKey, appKey, urlPath: `/api/v1/monitor/${id}` })
		fs.writeFileSync(path.join(outDir, `monitor-${id}.json`), JSON.stringify(json, null, 2) + '\n')
		process.stdout.write(`Exported monitor ${id}\n`)
	}
}

async function exportSLOs({ outDir, site, apiKey, appKey, ids }) {
	if (ids.length === 0) return
	ensureDir(outDir)
	for (const id of ids) {
		const json = await ddGetJson({ site, apiKey, appKey, urlPath: `/api/v1/slo/${id}` })
		fs.writeFileSync(path.join(outDir, `slo-${id}.json`), JSON.stringify(json, null, 2) + '\n')
		process.stdout.write(`Exported SLO ${id}\n`)
	}
}

async function main() {
	const apiKey = requiredEnv('DD_API_KEY')
	const appKey = requiredEnv('DD_APP_KEY')
	const site = optionalEnv('DD_SITE', 'datadoghq.eu')

	const dashboardIds = parseIdList(process.env.DD_DASHBOARD_IDS)
	const monitorIds = parseIdList(process.env.DD_MONITOR_IDS)
	const sloIds = parseIdList(process.env.DD_SLO_IDS)

	const baseOut = path.resolve(__dirname, '../../submission/datadog/exports')
	const dashboardsOut = path.join(baseOut, 'dashboards')
	const monitorsOut = path.join(baseOut, 'monitors')
	const slosOut = path.join(baseOut, 'slos')

	process.stdout.write(`Datadog export: site=${site}\n`)
	process.stdout.write(`Dashboards: ${dashboardIds.length} | Monitors: ${monitorIds.length} | SLOs: ${sloIds.length}\n`)

	await exportDashboards({ outDir: dashboardsOut, site, apiKey, appKey, ids: dashboardIds })
	await exportMonitors({ outDir: monitorsOut, site, apiKey, appKey, ids: monitorIds })
	await exportSLOs({ outDir: slosOut, site, apiKey, appKey, ids: sloIds })

	process.stdout.write('Datadog export done.\n')
}

main().catch((e) => {
	process.stderr.write(`[fatal] ${(e && e.stack) || String(e)}\n`)
	process.exit(1)
})
