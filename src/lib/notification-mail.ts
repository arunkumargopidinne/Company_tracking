type ApprovalEmailInput = {
  to: string;
  name: string;
  userCode: string;
  temporaryPassword: string;
};

export async function sendApprovalEmail(input: ApprovalEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM || "EduTech Pipeline <onboarding@resend.dev>";
  const draft = buildApprovalEmailDraft(input);

  if (!apiKey) {
    console.log("[Auth Email] RESEND_API_KEY not configured. Temporary password delivery skipped.", {
      to: input.to,
      userCode: input.userCode,
    });
    return {
      skipped: true,
      reason: "RESEND_API_KEY is not configured.",
      draft,
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: draft.subject,
      text: draft.body,
    }),
  });

  if (!response.ok) {
    return {
      skipped: true,
      reason: `Email provider returned ${response.status}.`,
      draft,
    };
  }

  return {
    skipped: false,
    draft,
  };
}

export function buildApprovalEmailDraft(input: ApprovalEmailInput) {
  const subject = "EduTech Pipeline account approved";
  const body = [
    `Hi ${input.name},`,
    "",
    "Your EduTech Pipeline account has been approved.",
    "",
    `User ID: ${input.userCode}`,
    `Temporary password: ${input.temporaryPassword}`,
    "",
    "Please login and change this temporary password before accessing the dashboard.",
    "",
    "Login URL: http://localhost:3000/login",
  ].join("\n");
  const mailtoUrl = `mailto:${encodeURIComponent(input.to)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;

  return {
    to: input.to,
    subject,
    body,
    mailtoUrl,
  };
}
