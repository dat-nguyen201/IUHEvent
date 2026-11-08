const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

export function isPasswordResetMailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
    process.env.PASSWORD_RESET_FROM?.trim(),
  );
}

export async function sendPasswordResetCode(to: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.PASSWORD_RESET_FROM?.trim();
  if (!apiKey || !from) throw new Error('PASSWORD_RESET_EMAIL_NOT_CONFIGURED');

  const response = await fetch(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Mã khôi phục mật khẩu IUH Event',
      text: `Mã xác nhận đặt lại mật khẩu IUH Event của bạn là: ${code}. Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f2937"><h2>Khôi phục mật khẩu IUH Event</h2><p>Mã xác nhận đặt lại mật khẩu của bạn:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px;color:#1877b9">${code}</p><p>Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p></div>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`PASSWORD_RESET_EMAIL_PROVIDER_${response.status}`);
  }
}
