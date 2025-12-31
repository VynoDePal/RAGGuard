# Datadog Challenge Artifacts

This folder is meant to be included in the repository so reviewers can easily find:
- exported Datadog assets (dashboards / monitors / SLOs)
- runbooks and incident response notes
- a traffic generator to produce telemetry

## Exports

- Dashboards: `submission/datadog/exports/dashboards/`
- Monitors: `submission/datadog/exports/monitors/`
- SLOs: `submission/datadog/exports/slos/`

To export assets via API, use:

- `npm run datadog:export`

Environment variables:
- `DD_API_KEY`
- `DD_APP_KEY`
- `DD_SITE` (default: `datadoghq.eu`)
- `DD_DASHBOARD_IDS` (comma-separated)
- `DD_MONITOR_IDS` (comma-separated)
- `DD_SLO_IDS` (comma-separated)

## Traffic generator

Use:

- `npm run traffic:generate`

Environment variables:
- `RAGGUARD_BASE_URL` (default: `http://localhost:3000`)
- `TENANT_ID` (UUID)
- `REQUESTS` (default: `30`)
- `CONCURRENCY` (default: `3`)
- `SLEEP_MS` (default: `200`)
- `LANGUAGE` (default: `fr`)
