import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Ignora o middleware se faltarem variáveis de ambiente
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  // Versão mais moderna e estável de manipulação de cookies do Supabase SSR
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Definir as rotas que NÃO exigem login (incluindo a do formulário externo)
  const isPublicRoute = 
    request.nextUrl.pathname.startsWith("/login") || 
    request.nextUrl.pathname.startsWith("/auth") ||
    request.nextUrl.pathname.startsWith("/submit");

  let redirectUrl = null;

  // 2. Regras de Redirecionamento
  if (!user && !isPublicRoute) {
    // Se não há utilizador e não é rota pública, vai para o login
    redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
  } else if (user && request.nextUrl.pathname.startsWith("/login")) {
    // Se o utilizador já está logado e tenta ir para a página de login, vai para os Boards
    redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/boards"; 
  }

  // 3. Executar o redirecionamento com segurança (A MÁGICA ACONTECE AQUI)
  if (redirectUrl) {
    const redirectResponse = NextResponse.redirect(redirectUrl);
    
    // CRÍTICO: Copiar todos os cookies da sessão validada para a nova resposta
    // Isso evita que o utilizador perca o login durante o redirecionamento visual
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};