import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL || "Momentos <geral@momentos.work>";

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY || "";

/**
 * POST /api/contact
 * Receives JSON from the contact form, validates reCAPTCHA v3,
 * and sends a branded email via Resend.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const firstName = (body.firstName ?? "").trim();
    const lastName = (body.lastName ?? "").trim();
    const email = (body.email ?? "").trim();
    const subject = (body.subject ?? "").trim();
    const message = (body.message ?? "").trim();
    const honeypot = (body.honeypot ?? "").trim();
    const recaptchaToken = (body.recaptchaToken ?? "").trim();

    // Honeypot check
    if (honeypot) {
      return NextResponse.json({ ok: true });
    }

    // Basic validation
    if (!firstName || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (message.length < 10) {
      return NextResponse.json({ error: "Message too short" }, { status: 400 });
    }

    // ── reCAPTCHA v3 server-side verification ──────────────────
    if (!recaptchaToken) {
      return NextResponse.json(
        { error: "reCAPTCHA token missing" },
        { status: 400 },
      );
    }

    if (RECAPTCHA_SECRET) {
      try {
        const captchaRes = await fetch(
          "https://www.google.com/recaptcha/api/siteverify",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              secret: RECAPTCHA_SECRET,
              response: recaptchaToken,
            }),
          },
        );
        const captchaData = await captchaRes.json();

        if (!captchaData.success || (captchaData.score ?? 1) < 0.5) {
          console.warn(
            "[contact] reCAPTCHA failed:",
            JSON.stringify(captchaData),
          );
          return NextResponse.json(
            { error: "reCAPTCHA validation failed" },
            { status: 400 },
          );
        }
      } catch (err) {
        console.error("[contact] reCAPTCHA verification error:", err);
        // Allow through if Google is unreachable (graceful degradation)
      }
    }

    // ── Destination email from Firestore ───────────────────────
    let toEmail = "rtiagomartins2005@gmail.com"; // fallback
    try {
      const db = getAdminDb();
      const snap = await db.doc("settings/contact").get();
      if (snap.exists && snap.data()?.email) {
        toEmail = snap.data()!.email;
      }
    } catch {
      // use fallback
    }

    const fullName = `${firstName} ${lastName}`.trim();

    // ── Send branded email via Resend ──────────────────────────
    const { error } = await resend.emails.send({
      from: FROM,
      to: toEmail,
      replyTo: email,
      subject: `[Novo Contacto Site] ${subject}`,
      html: contactEmailHtml({ fullName, email, subject, message }),
    });

    if (error) {
      console.error("[contact] Resend error:", JSON.stringify(error));
      return NextResponse.json(
        { error: "Failed to send email" },
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

// ── Dark-themed branded contact email template ─────────────────
function contactEmailHtml(data: {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}): string {
  const { fullName, email, subject, message } = data;

  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Novo contacto — Momentos</title>
</head>
<body style="margin:0; padding:0; background-color:#030303; font-family:'Geist','Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
    Nova mensagem de ${esc(fullName)}: ${esc(subject)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#030303;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; margin:0 auto;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <img
                src="https://www.momentos.work/brand/logo-sem-fundo-sem-nome.png"
                alt="Momentos"
                width="48"
                height="48"
                style="display:block; border:0; outline:none; opacity:0.9;"
              />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:32px 28px;">

              <!-- Header -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:20px;">
                    <h1 style="margin:0; font-size:20px; font-weight:600; color:#ffffff; letter-spacing:-0.02em;">
                      &#128236; Nova mensagem de contacto
                    </h1>
                    <p style="margin:6px 0 0; font-size:13px; color:rgba(255,255,255,0.4);">
                      Recebida pelo formulário do site Momentos.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fields -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate; border-spacing:0;">
                <tr>
                  <td style="padding:14px 16px; border-bottom:1px solid rgba(255,255,255,0.06);">
                    <p style="margin:0 0 2px; font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:rgba(255,255,255,0.35);">Nome</p>
                    <p style="margin:0; font-size:15px; color:#ffffff;">${esc(fullName)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px; border-bottom:1px solid rgba(255,255,255,0.06);">
                    <p style="margin:0 0 2px; font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:rgba(255,255,255,0.35);">Email</p>
                    <p style="margin:0; font-size:15px;">
                      <a href="mailto:${esc(email)}" style="color:#60a5fa; text-decoration:none;">${esc(email)}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px; border-bottom:1px solid rgba(255,255,255,0.06);">
                    <p style="margin:0 0 2px; font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:rgba(255,255,255,0.35);">Assunto</p>
                    <p style="margin:0; font-size:15px; color:#ffffff;">${esc(subject)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 2px; font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:rgba(255,255,255,0.35);">Mensagem</p>
                    <p style="margin:0; font-size:14px; line-height:1.65; color:rgba(255,255,255,0.8); white-space:pre-wrap;">${esc(message)}</p>
                  </td>
                </tr>
              </table>

              <!-- Reply CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-top:24px;">
                    <a
                      href="mailto:${esc(email)}?subject=Re: ${esc(subject)}"
                      style="display:inline-block; background-color:#ffffff; color:#0a0a0a; font-size:14px; font-weight:600; text-decoration:none; padding:10px 28px; border-radius:12px; letter-spacing:-0.01em;"
                    >
                      Responder a ${esc(fullName.split(" ")[0])}
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0; font-size:11px; color:rgba(255,255,255,0.15);">
                &copy; ${new Date().getFullYear()} Momentos &middot; Portugal
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
