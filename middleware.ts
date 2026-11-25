import { NextRequest, NextResponse } from "next/server";
import { getAdminHomePath, isEvaluationAdmin, isOperationalAdmin, verifySession } from "./src/lib/auth";

const SESSION_COOKIE = "loket_session";

async function getSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/loket")) {
    const session = await getSession(request);
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.role !== "LAYANAN_PUBLIK" || !session.counterId) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const match = pathname.match(/^\/loket\/(\d+)/);
    if (match) {
      const counterId = Number(match[1]);
      if (session.counterId !== counterId) {
        return NextResponse.redirect(
          new URL(`/loket/${session.counterId}`, request.url),
        );
      }
    }
  }

  if (pathname.startsWith("/api/queue/call") || pathname.startsWith("/api/queue/complete")) {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "LAYANAN_PUBLIK") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (pathname.startsWith("/attendance")) {
    const session = await getSession(request);
    if (!session || session.role !== "PERMINTAAN_DATA") {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith("/online-requests") || pathname.startsWith("/api/sheets")) {
    const session = await getSession(request);
    if (!session || session.role === null) {
      if (pathname.startsWith("/api/sheets")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith("/whatsapp") || pathname.startsWith("/api/whatsapp")) {
    const session = await getSession(request);
    if (!session || session.role === null) {
      if (pathname.startsWith("/api/whatsapp")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith("/profile")) {
    const session = await getSession(request);
    if (!session || (session.role === "ADMIN" && !session.adminLevel)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith("/rekap-saya") || pathname.startsWith("/api/my-recap")) {
    const session = await getSession(request);
    if (!session || session.role === "ADMIN") {
      if (pathname.startsWith("/api/my-recap")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (session?.role === "ADMIN" && session.adminLevel) {
        return NextResponse.redirect(new URL(getAdminHomePath(session.adminLevel), request.url));
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const session = await getSession(request);
    const isApi = pathname.startsWith("/api/admin");
    const isEvaluationPath =
      pathname === "/admin/penilaian-petugas" ||
      pathname.startsWith("/admin/penilaian-petugas/") ||
      pathname === "/api/admin/penilaian-petugas" ||
      pathname.startsWith("/api/admin/penilaian-petugas/");
    const allowed = isEvaluationPath
      ? isEvaluationAdmin(session?.adminLevel)
      : isOperationalAdmin(session?.adminLevel);

    if (!session || !allowed) {
      if (isApi) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (session?.role === "ADMIN" && session.adminLevel) {
        return NextResponse.redirect(new URL(getAdminHomePath(session.adminLevel), request.url));
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/loket/:path*",
    "/api/queue/call",
    "/api/queue/complete",
    "/attendance",
    "/online-requests/:path*",
    "/api/sheets/:path*",
    "/whatsapp/:path*",
    "/api/whatsapp/:path*",
    "/profile/:path*",
    "/rekap-saya/:path*",
    "/api/my-recap/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
