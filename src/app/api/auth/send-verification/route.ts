// src/app/api/auth/send-verification/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getAdminAuth } from "@/lib/firebase/admin";
import { verificationEmailHtml } from "@/lib/emails/verification";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM =
  process.env.RESEND_FROM_EMAIL || "Momentos <noreply@momentos.work>";

/**
 * POST /api/auth/send-verification
 * Body: { email: string }
 *
 * Generates a Firebase email-verification link via Admin SDK,
 * then sends a branded HTML email via Resend.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const auth = getAdminAuth();

    // actionCodeSettings — the user lands on our custom handler
    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.momentos.work"}/pt/login/action`,
      handleCodeInApp: false,
    };

    const link = await auth.generateEmailVerificationLink(
      email,
      actionCodeSettings,
    );

    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Confirma o teu e-mail — Momentos",
      html: verificationEmailHtml(link),
    });

    if (error) {
      console.error("[send-verification] Resend error:", JSON.stringify(error));
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[send-verification] error:", err);

    // Surface specific Firebase Admin errors
    const code = err?.errorInfo?.code || err?.code || "";
    if (code === "auth/user-not-found") {
      return NextResponse.json({ error: "user-not-found" }, { status: 404 });
    }
    if (code === "auth/invalid-email") {
      return NextResponse.json({ error: "invalid-email" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
