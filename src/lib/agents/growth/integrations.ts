/**
 * Growth Agent - External API Integrations
 *
 * Handles communication with Apollo.io for lead search/email sending
 * and SendGrid for transactional email delivery.
 */

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  title: string;
  linkedinUrl?: string;
}

// ---------------------------------------------------------------------------
// Apollo.io
// ---------------------------------------------------------------------------

interface ApolloSearchParams {
  query: string;
  industry?: string;
  limit?: number;
  apolloApiKey: string;
}

/**
 * Search for leads using the Apollo.io People Search API.
 *
 * Returns an array of matching leads. If the API key is missing or the
 * request fails, an empty array is returned so the agent can continue
 * with any manually-provided leads.
 */
export async function searchLeadsApollo(
  params: ApolloSearchParams,
): Promise<Lead[]> {
  const { query, industry, limit = 10, apolloApiKey } = params;

  if (!apolloApiKey) {
    console.warn("[growth/integrations] Apollo API key not provided – skipping lead search.");
    return [];
  }

  try {
    const body: Record<string, unknown> = {
      q_keywords: query,
      per_page: Math.min(limit, 100),
      page: 1,
    };

    if (industry) {
      body.organization_industry_tag_ids = [industry];
    }

    const response = await fetch(
      "https://api.apollo.io/api/v1/mixed_people/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apolloApiKey,
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      console.error(
        `[growth/integrations] Apollo search failed: ${response.status} ${response.statusText}`,
      );
      return [];
    }

    const data = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const people: any[] = data.people ?? data.contacts ?? [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return people.map((person: any) => ({
      id: person.id ?? crypto.randomUUID(),
      name: [person.first_name, person.last_name].filter(Boolean).join(" "),
      email: person.email ?? "",
      company: person.organization?.name ?? person.organization_name ?? "",
      title: person.title ?? "",
      linkedinUrl: person.linkedin_url ?? undefined,
    }));
  } catch (error) {
    console.error("[growth/integrations] Apollo search error:", error);
    return [];
  }
}

interface ApolloSendEmailParams {
  apolloApiKey: string;
  emailAccountId: string;
  to: string;
  subject: string;
  body: string;
}

/**
 * Send an email through the Apollo.io API.
 * Returns `true` on success, `false` on failure.
 */
export async function sendEmailApollo(
  params: ApolloSendEmailParams,
): Promise<boolean> {
  const { apolloApiKey, emailAccountId, to, subject, body } = params;

  if (!apolloApiKey) {
    console.warn("[growth/integrations] Apollo API key not provided – cannot send email.");
    return false;
  }

  try {
    const response = await fetch(
      "https://api.apollo.io/api/v1/emailer_messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apolloApiKey,
        },
        body: JSON.stringify({
          email_account_id: emailAccountId,
          contact_email: to,
          subject,
          body_html: body,
        }),
      },
    );

    if (!response.ok) {
      console.error(
        `[growth/integrations] Apollo send failed: ${response.status} ${response.statusText}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("[growth/integrations] Apollo send error:", error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// SendGrid
// ---------------------------------------------------------------------------

interface SendGridParams {
  to: string;
  subject: string;
  body: string;
  fromEmail?: string;
}

/**
 * Send an email via SendGrid using the platform SENDGRID_API_KEY env var.
 * Returns `true` on success, `false` on failure.
 */
export async function sendEmailSendGrid(
  params: SendGridParams,
): Promise<boolean> {
  const { to, subject, body, fromEmail } = params;
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    console.warn(
      "[growth/integrations] SENDGRID_API_KEY not set – cannot send email.",
    );
    return false;
  }

  const from = fromEmail ?? process.env.SENDGRID_FROM_EMAIL ?? "noreply@tasklyne.com";

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
            subject,
          },
        ],
        from: { email: from },
        content: [
          {
            type: "text/html",
            value: body,
          },
        ],
      }),
    });

    // SendGrid returns 202 Accepted on success
    if (!response.ok && response.status !== 202) {
      const errorText = await response.text().catch(() => "unknown error");
      console.error(
        `[growth/integrations] SendGrid send failed: ${response.status} – ${errorText}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("[growth/integrations] SendGrid send error:", error);
    return false;
  }
}
