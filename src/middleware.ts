import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('dwpl_auth');
  const { pathname } = request.nextUrl;
  
  // Public paths that bypass authentication checks
  if (
    pathname.startsWith('/api/auth') || 
    pathname.startsWith('/_next/') || 
    pathname.includes('favicon.ico') || 
    pathname.includes('icon.png')
  ) {
    return NextResponse.next();
  }

  // If trying to access protected route without cookie, redirect to login
  if (!authCookie && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If trying to access login with cookie, redirect to dashboard
  if (authCookie && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
