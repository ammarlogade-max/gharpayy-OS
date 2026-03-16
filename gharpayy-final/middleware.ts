import { NextRequest, NextResponse } from "next/server";

// Require auth for attendance: if no JWT cookie, send to home (login instructions)
export function middleware(req: NextRequest) {
  const token = req.cookies.get("gharpayy_token");
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/attendance") && !token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/attendance/:path*"],
};
