// TEMPORÁRIO — apagar depois de diagnosticar o problema
import { NextResponse } from "next/server";

export async function GET() {
  const vars = {
    FIREBASE_PROJECT_ID: mask(process.env.FIREBASE_PROJECT_ID),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: mask(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    FIREBASE_CLIENT_EMAIL: mask(process.env.FIREBASE_CLIENT_EMAIL),
    FIREBASE_PRIVATE_KEY_exists: !!process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_PRIVATE_KEY_length: process.env.FIREBASE_PRIVATE_KEY?.length ?? 0,
    FIREBASE_PRIVATE_KEY_starts: process.env.FIREBASE_PRIVATE_KEY?.substring(0, 40) ?? "EMPTY",
    FIREBASE_PRIVATE_KEY_BASE64_exists: !!process.env.FIREBASE_PRIVATE_KEY_BASE64,
    FIREBASE_PRIVATE_KEY_BASE64_length: process.env.FIREBASE_PRIVATE_KEY_BASE64?.length ?? 0,
    FIREBASE_STORAGE_BUCKET: mask(process.env.FIREBASE_STORAGE_BUCKET),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: mask(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    NEXTAUTH_SECRET_exists: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "NOT SET",
    GOOGLE_CLIENT_ID: mask(process.env.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET_exists: !!process.env.GOOGLE_CLIENT_SECRET,
    RESEND_API_KEY_exists: !!process.env.RESEND_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  };

  return NextResponse.json(vars, { status: 200 });
}

function mask(val: string | undefined): string {
  if (!val) return "NOT SET";
  if (val.length <= 8) return val;
  return val.substring(0, 8) + "..." + val.substring(val.length - 4);
}
