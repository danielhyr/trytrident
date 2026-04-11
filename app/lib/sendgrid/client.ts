/**
 * SendGrid API client — low-level wrapper using fetch (no SDK).
 */

interface SendEmailParams {
  apiKey: string;
  to: string;
  from: { email: string; name?: string };
  subject: string;
  html?: string;
  text?: string;
  customArgs?: Record<string, string>;
}

interface SendEmailResult {
  messageId: string;
}

export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const body = {
    personalizations: [
      {
        to: [{ email: params.to }],
        custom_args: params.customArgs ?? {},
      },
    ],
    from: {
      email: params.from.email,
      name: params.from.name ?? params.from.email,
    },
    subject: params.subject,
    content: [
      ...(params.text
        ? [{ type: "text/plain", value: params.text }]
        : []),
      ...(params.html
        ? [{ type: "text/html", value: params.html }]
        : []),
    ],
  };

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid API error (${response.status}): ${errorText}`);
  }

  // SendGrid returns message ID in X-Message-Id header
  const messageId = response.headers.get("X-Message-Id") ?? "";

  return { messageId };
}
