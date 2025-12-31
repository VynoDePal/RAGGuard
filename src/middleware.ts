// =============================================
// Next.js Middleware
// =============================================

import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Headers CORS pour les requêtes cross-origin
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-Tenant-Id',
}

export async function middleware(request: NextRequest) {
	// Gérer les requêtes OPTIONS (preflight CORS)
	if (request.method === 'OPTIONS') {
		return new NextResponse(null, {
			status: 204,
			headers: corsHeaders,
		})
	}

	// Pour les routes API, ajouter les headers CORS à la réponse
	if (request.nextUrl.pathname.startsWith('/api/')) {
		const response = await updateSession(request)
		
		// Ajouter les headers CORS
		Object.entries(corsHeaders).forEach(([key, value]) => {
			response.headers.set(key, value)
		})
		
		return response
	}

	return await updateSession(request)
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * Feel free to modify this pattern to include more paths.
		 */
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
	],
}
