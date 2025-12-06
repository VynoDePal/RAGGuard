// =============================================
// Health Check API Route
// =============================================

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
	const checks: Record<string, { status: 'ok' | 'error'; latency_ms?: number; error?: string }> = {}

	// Check Supabase connection
	try {
		const start = Date.now()
		const supabase = await createServiceRoleClient()
		await supabase.from('tenants').select('id').limit(1)
		checks.supabase = { status: 'ok', latency_ms: Date.now() - start }
	} catch (error) {
		checks.supabase = { status: 'error', error: (error as Error).message }
	}

	// Check environment variables
	const requiredEnvVars = [
		'NEXT_PUBLIC_SUPABASE_URL',
		'NEXT_PUBLIC_SUPABASE_ANON_KEY',
		'OPENAI_API_KEY',
	]

	const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v])
	if (missingEnvVars.length > 0) {
		checks.environment = {
			status: 'error',
			error: `Missing: ${missingEnvVars.join(', ')}`,
		}
	} else {
		checks.environment = { status: 'ok' }
	}

	// Overall status
	const allOk = Object.values(checks).every((c) => c.status === 'ok')

	return NextResponse.json(
		{
			status: allOk ? 'healthy' : 'degraded',
			timestamp: new Date().toISOString(),
			checks,
		},
		{ status: allOk ? 200 : 503 }
	)
}
