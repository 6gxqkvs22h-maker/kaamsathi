import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Kicks off Google sign-in. One button for everyone — the callback figures
// out whether the Google email belongs to a worker or customer.
export async function GET(req: NextRequest) {
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
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}
