import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/auth',
    '/api/auth/login',
    '/api/auth/register',
    '/api/uploads'
  ];

  // Check if the current path is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route)
  );

  // If it's a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For protected routes, check if user has a token
  if (!token) {
    console.log(`🚫 No token found, redirecting ${pathname} to /login`);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Validate token format (basic check)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    
    if (payload.exp <= currentTime) {
      console.log(`⏰ Token expired, redirecting ${pathname} to /login`);
      // Token is expired, redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      response.cookies.delete('refreshToken');
      return response;
    }
  } catch (error) {
    console.log(`❌ Invalid token format, redirecting ${pathname} to /login`);
    // Invalid token, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    response.cookies.delete('refreshToken');
    return response;
  }

  // Token is valid, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};