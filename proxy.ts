import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "***REDACTED***";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Excepciones de rutas públicas (Landing, Assets, SEO, etc.)
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/admin/auth") || // Permitir verificar sesión
    pathname.includes("favicon.ico") ||
    pathname.includes(".svg") ||
    pathname.includes(".png") ||
    pathname.includes(".jpg");

  if (isPublicRoute) return NextResponse.next();

  // 2. Protección de rutas administrativas (Páginas y API)
  if ((pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) && pathname !== "/admin/login") {
    const cookie = request.cookies.get("kostruye_admin");
    if (!cookie || cookie.value !== ADMIN_TOKEN) {
      // Si es una petición de API, devolver 401. Si es una página, redireccionar.
      if (pathname.startsWith("/api/")) {
        return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  // 3. Protección de rutas de cliente (Supabase)
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = pathname.startsWith("/login") || pathname.includes("/auth");

  // Si no hay usuario y no es ruta de auth, al login
  if (!user && !isAuthRoute && !pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Si hay usuario y está en login, a proyectos
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/proyectos";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
