import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Kicks off Google sign-in. Call as /api/auth/google/start?role=customer
// or /api/auth/google/start?role=worker
export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role") === "worker" ? "worker" : "customer";
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/login?g_error=Google sign-in isn't configured yet.", req.url),
    );
  }

  const redirectUri = new URL("/api/auth/google/callback", req.url).toString();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state: role,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}
