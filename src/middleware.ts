import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth?.user;
  const role = req.auth?.user?.role;

  const isAuthRoute = nextUrl.pathname.startsWith('/login');
  const isAdminRoute = nextUrl.pathname.startsWith('/admin');
  const isTrainerRoute = nextUrl.pathname.startsWith('/trainer');
  const isMemberRoute = nextUrl.pathname.startsWith('/app');
  const isKioskRoute = nextUrl.pathname.startsWith('/kiosk');

  if (isAuthRoute && isLoggedIn) {
    if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin/dashboard', nextUrl));
    if (role === 'TRAINER') return NextResponse.redirect(new URL('/trainer/dashboard', nextUrl));
    return NextResponse.redirect(new URL('/app', nextUrl));
  }

  if ((isAdminRoute || isTrainerRoute || isMemberRoute || isKioskRoute) && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  if (isAdminRoute && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', nextUrl));
  }

  if (isTrainerRoute && role !== 'TRAINER' && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', nextUrl));
  }

  if (isKioskRoute && role !== 'ADMIN' && role !== 'TRAINER') {
    return NextResponse.redirect(new URL('/unauthorized', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
