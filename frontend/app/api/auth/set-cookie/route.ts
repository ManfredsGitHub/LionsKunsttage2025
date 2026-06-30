import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token, stunden } = (await req.json()) as { token: string; stunden: number };

  const response = NextResponse.json({ ok: true });
  response.cookies.set("kt_auth_http", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: stunden * 3600,
    path: "/",
  });
  return response;
}
