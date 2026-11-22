import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const sb = await supabaseServer();

  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);
  } else if (tokenHash && type) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: type as any });
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);
  }
  return NextResponse.redirect(`${origin}/login?error=1`);
}
