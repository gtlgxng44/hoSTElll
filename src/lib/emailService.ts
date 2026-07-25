export async function sendVerificationEmail(
  email: string,
  name: string,
  code: string
): Promise<{ sent: boolean; message?: string; simulated?: boolean }> {
  try {
    const response = await fetch("/api/send-verification-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, code }),
    });
    const data = await response.json();
    return { sent: !!data.sent, message: data.message, simulated: !!data.simulated };
  } catch (err) {
    console.warn("Failed to dispatch verification email API:", err);
    return { sent: false, message: "Network error triggering email dispatch." };
  }
}
