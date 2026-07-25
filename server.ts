import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Endpoint to send real verification email
  app.post("/api/send-verification-email", async (req, res) => {
    try {
      const { email, name, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({ error: "Email and verification code are required" });
      }

      const brevoApiKey = process.env.BREVO_API_KEY;
      const resendApiKey = process.env.RESEND_API_KEY;
      const sendgridApiKey = process.env.SENDGRID_API_KEY;

      if (!brevoApiKey && !resendApiKey && !sendgridApiKey) {
        console.log(`[Email Dispatch] Code ${code} generated for ${email}. (Missing BREVO_API_KEY / RESEND_API_KEY / SENDGRID_API_KEY)`);
        return res.json({
          sent: false,
          error: "NO_API_KEY",
          message: "Email key not configured. Please add BREVO_API_KEY or RESEND_API_KEY to AI Studio Environment Variables."
        });
      }

      // 1. Dispatch via Brevo (Brevo.com / Sendinblue) API if configured
      if (brevoApiKey) {
        const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL || "bytebwoy@gmail.com";
        const brevoSenderName = process.env.BREVO_SENDER_NAME || "HostelLog Verification";

        const sendBrevo = async (senderEmail: string) => {
          return await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "api-key": brevoApiKey,
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({
              sender: {
                name: brevoSenderName,
                email: senderEmail
              },
              to: [
                {
                  email: email,
                  name: name || "User"
                }
              ],
              subject: `${code} is your HostelLog verification code`,
              htmlContent: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 28px; background-color: #0f0f0f; color: #f5f5f5; border-radius: 12px; border: 1px solid #262626;">
                  <div style="margin-bottom: 24px;">
                    <h1 style="color: #c5a059; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; margin: 0 0 6px 0;">HostelLog</h1>
                    <p style="color: #888888; font-size: 13px; margin: 0;">Student Hostel & Boarding Verification</p>
                  </div>
                  <p style="color: #d4d4d4; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                    Hello <strong>${name || "User"}</strong>,
                  </p>
                  <p style="color: #a3a3a3; font-size: 14px; margin-bottom: 20px;">
                    Please enter the following 6-digit confirmation code in your HostelLog application to verify your email address:
                  </p>
                  <div style="background-color: #171717; border: 1px solid #333333; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 24px;">
                    <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #c5a059;">${code}</span>
                  </div>
                  <p style="color: #737373; font-size: 12px; line-height: 1.5; margin: 0;">
                    If you did not initiate this request, you can safely ignore this message.
                  </p>
                </div>
              `
            })
          });
        };

        let brevoResponse = await sendBrevo(brevoSenderEmail);
        let brevoData = await brevoResponse.json();

        // If the custom sender email failed (e.g. unverified domain), fallback to bytebwoy@gmail.com
        if (!brevoResponse.ok && brevoSenderEmail !== "bytebwoy@gmail.com") {
          console.warn("Retrying Brevo dispatch with primary account email bytebwoy@gmail.com...");
          brevoResponse = await sendBrevo("bytebwoy@gmail.com");
          brevoData = await brevoResponse.json();
        }

        if (!brevoResponse.ok) {
          console.error("Brevo API Error:", brevoData);
          const rawError = brevoData.message || brevoData.code || "Failed to deliver email through Brevo API";
          return res.status(400).json({
            sent: false,
            error: `Brevo Error: ${rawError}`
          });
        }

        return res.json({
          sent: true,
          id: brevoData.messageId,
          message: `Verification code successfully emailed to ${email} via Brevo`
        });
      }

      // 1. Dispatch via Resend API if configured
      if (resendApiKey) {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "HostelLog Verification <onboarding@resend.dev>",
            to: [email],
            subject: `${code} is your HostelLog verification code`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 28px; background-color: #0f0f0f; color: #f5f5f5; border-radius: 12px; border: 1px solid #262626;">
                <div style="margin-bottom: 24px;">
                  <h1 style="color: #c5a059; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; margin: 0 0 6px 0;">HostelLog</h1>
                  <p style="color: #888888; font-size: 13px; margin: 0;">Student Hostel & Boarding Verification</p>
                </div>
                <p style="color: #d4d4d4; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                  Hello <strong>${name || "User"}</strong>,
                </p>
                <p style="color: #a3a3a3; font-size: 14px; margin-bottom: 20px;">
                  Please enter the following 6-digit confirmation code in your HostelLog application to verify your email address:
                </p>
                <div style="background-color: #171717; border: 1px solid #333333; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 24px;">
                  <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #c5a059;">${code}</span>
                </div>
                <p style="color: #737373; font-size: 12px; line-height: 1.5; margin: 0;">
                  If you did not initiate this request, you can safely ignore this message.
                </p>
              </div>
            `
          })
        });

        const data = await resendResponse.json();

        if (!resendResponse.ok) {
          console.error("Resend API Error:", data);
          let rawError = data.message || "Failed to deliver email through Resend API";
          if (rawError.toLowerCase().includes("testing emails") || rawError.toLowerCase().includes("can only send to")) {
            rawError = `Resend Free Tier Restriction: ${rawError}. (Note: On Resend free tier without a custom domain, emails can only be sent to the email address used to create the Resend account).`;
          }
          return res.status(400).json({
            sent: false,
            error: rawError
          });
        }

        return res.json({
          sent: true,
          id: data.id,
          message: `Verification code successfully emailed to ${email}`
        });
      }

      // 2. Dispatch via SendGrid API if configured
      if (sendgridApiKey) {
        const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${sendgridApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: "no-reply@hostellog.com", name: "HostelLog Verification" },
            subject: `${code} is your HostelLog verification code`,
            content: [
              {
                type: "text/html",
                value: `<p>Your HostelLog verification code is: <strong>${code}</strong></p>`
              }
            ]
          })
        });

        if (!sgResponse.ok) {
          const errText = await sgResponse.text();
          console.error("SendGrid Error:", errText);
          return res.status(400).json({ sent: false, error: "SendGrid delivery failed" });
        }

        return res.json({ sent: true, message: `Email delivered to ${email}` });
      }
    } catch (err: any) {
      console.error("Failed to send verification email:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
