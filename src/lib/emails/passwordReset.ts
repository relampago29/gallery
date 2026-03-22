// src/lib/emails/passwordReset.ts

/**
 * Dark-themed, responsive HTML email for password reset.
 * Uses inline styles for maximum email client compatibility.
 * Font: system-ui fallback (Geist is loaded where supported).
 */
export function passwordResetEmailHtml(link: string): string {
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Recuperação de password — Momentos</title>
  <!--[if mso]>
  <style>
    table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#030303; font-family:'Geist','Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <!-- Preheader (hidden preview text) -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
    Alguém pediu para redefinir a password da tua conta Momentos.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#030303; min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img
                src="https://www.momentos.work/brand/logo-sem-fundo-sem-nome.png"
                alt="Momentos"
                width="56"
                height="56"
                style="display:block; border:0; outline:none; opacity:0.9;"
              />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:40px 32px;">

              <!-- Icon -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <div style="display:inline-block; width:56px; height:56px; line-height:56px; text-align:center; border-radius:50%; background-color:rgba(251,191,36,0.1);">
                      <span style="font-size:28px;">🔑</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Title -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <h1 style="margin:0; font-size:22px; font-weight:600; color:#ffffff; letter-spacing:-0.02em;">
                      Recuperar password
                    </h1>
                  </td>
                </tr>
              </table>

              <!-- Description -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <p style="margin:0; font-size:14px; line-height:1.6; color:rgba(255,255,255,0.6); max-width:360px;">
                      Recebemos um pedido para redefinir a password da tua conta <strong style="color:rgba(255,255,255,0.8);">Momentos</strong>. Clica no botão abaixo para escolher uma nova password.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a
                      href="${link}"
                      target="_blank"
                      style="display:inline-block; background-color:#ffffff; color:#0a0a0a; font-size:14px; font-weight:600; text-decoration:none; padding:12px 32px; border-radius:12px; letter-spacing:-0.01em; mso-padding-alt:0; text-align:center;"
                    >
                      <!--[if mso]>
                      <i style="letter-spacing:32px; mso-font-width:-100%; mso-text-raise:24pt;">&nbsp;</i>
                      <![endif]-->
                      Redefinir password
                      <!--[if mso]>
                      <i style="letter-spacing:32px; mso-font-width:-100%;">&nbsp;</i>
                      <![endif]-->
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry note -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <p style="margin:0; font-size:13px; color:rgba(255,255,255,0.4); line-height:1.5;">
                      Este link expira dentro de 1 hora.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <p style="margin:0; font-size:12px; color:rgba(255,255,255,0.3); line-height:1.5;">
                      Se o botão não funcionar, copia e cola este link no navegador:
                    </p>
                    <p style="margin:4px 0 0; font-size:11px; color:rgba(255,255,255,0.25); word-break:break-all; line-height:1.4;">
                      ${link}
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="margin:0; font-size:12px; color:rgba(255,255,255,0.25); line-height:1.5;">
                Se não pediste para redefinir a password, podes ignorar este e-mail.
              </p>
              <p style="margin:8px 0 0; font-size:11px; color:rgba(255,255,255,0.15);">
                © ${new Date().getFullYear()} Momentos · Portugal
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}
