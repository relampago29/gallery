import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATIC_FORMS_KEY =
  process.env.STATICFORMS_ACCESS_KEY || "sf_kbe7ji7h9ikc0mf35kn01ac0";

/**
 * POST /api/contact
 * Receives JSON from the contact form and forwards it to StaticForms.
 * The access key stays server-side (never exposed to the browser).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const firstName =
      typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName =
      typeof body.lastName === "string" ? body.lastName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const honeypot =
      typeof body.honeypot === "string" ? body.honeypot.trim() : "";

    // Honeypot check
    if (honeypot) {
      return NextResponse.json({ ok: true });
    }

    // Validation
    if (!firstName || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (message.length < 10) {
      return NextResponse.json({ error: "Message too short" }, { status: 400 });
    }

    const fullName = `${firstName} ${lastName}`.trim();

    // Forward to StaticForms
    const sfRes = await fetch("https://api.staticforms.xyz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessKey: STATIC_FORMS_KEY,
        name: fullName,
        email,
        subject: `[Contacto] ${subject}`,
        message,
        replyTo: "@",
        honeypot: "",
      }),
    });

    const sfData = await sfRes.json().catch(() => ({}));

    if (!sfRes.ok || sfData?.success === false) {
      console.error("[contact] StaticForms error:", JSON.stringify(sfData));
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[contact] error:", err);
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 },
    );
  }
}
