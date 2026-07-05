import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public routes
  const publicRoutes = ["/", "/api/register", "/api/auth"];
  const isPublic =
    publicRoutes.some((r) => pathname === r || pathname.startsWith(r + "/")) ||
    pathname.startsWith("/share/");

  if (!isPublic && !req.auth) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Redirect logged-in users away from auth page
  if (pathname === "/" && req.auth) {
    return NextResponse.redirect(new URL("/boards", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
