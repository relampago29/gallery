import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/contact
 * Receives form data from the contact form and sends an email via Resend.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const firstName = (formData.get("firstName") as string)?.trim() || "";
    const lastName = (formData.get("lastName") as string)?.trim() || "";
    const email = (formData.get("email") as string)?.trim() || "";
    const subject = (formData.get("subject") as string)?.trim() || "";
    const message = (formData.get("message") as string)?.trim() || "";
    const honeypot = (formData.get("company") as string)?.trim() || "";

    // Honeypot check
    if (honeypot) {
      return NextResponse.json({ ok: true });
    }

    // Validation
    if (!firstName || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (message.length < 10) {
      return NextResponse.json({ error: "Message too short" }, { status: 400 });
    }

    // Get destination email from Firestore settings
    let toEmail = "rtiagomartins2005@gmail.com"; // fallback (Resend verified recipient)
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

    const { error } = await resend.emails.send({
      from: "Momentos <onboarding@resend.dev>",
      to: toEmail,
      replyTo: email,
      subject: `[Contacto] ${subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Nova mensagem de contacto</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #555; vertical-align: top; width: 100px;">Nome</td>
              <td style="padding: 8px 12px;">${fullName}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 8px 12px; font-weight: bold; color: #555; vertical-align: top;">Email</td>
              <td style="padding: 8px 12px;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #555; vertical-align: top;">Assunto</td>
              <td style="padding: 8px 12px;">${subject}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 8px 12px; font-weight: bold; color: #555; vertical-align: top;">Mensagem</td>
              <td style="padding: 8px 12px; white-space: pre-wrap;">${message}</td>
            </tr>
          </table>
          <hr style="margin-top: 24px; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999; margin-top: 12px;">
            Enviado pelo formulário de contacto do site Momentos.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[contact] Resend error:", JSON.stringify(error));
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[contact] error:", err);
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}
