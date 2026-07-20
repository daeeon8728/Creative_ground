import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public routes — accessible without login
  const publicPrefixes = ["/", "/gallery", "/api/auth", "/api/register"];
  const isPublic =
    publicPrefixes.some((r) => pathname === r || pathname.startsWith(r + "/")) ||
    pathname === "/projects";

  // Protect editor and share routes — require login
  if (!isPublic && !req.auth) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Logged-in users visiting "/" go to /projects
  if (pathname === "/" && req.auth) {
    return NextResponse.redirect(new URL("/projects", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
