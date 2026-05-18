/**
 * Shared CeenAiX auth email shell. All roles (patient, doctor, pharmacy, lab, insurance)
 * use the same Supabase auth mailers — role is stored in user metadata, not in the template.
 */

const LOGO_URL = 'https://www.ceenaix.com/favicon.svg';
const BRAND_URL = 'https://www.ceenaix.com';

/**
 * @param {{
 *   pageTitle: string;
 *   headline: string;
 *   intro: string;
 *   cta?: { label: string; href: string };
 *   linkFallback?: string;
 *   extraBody?: string;
 *   footerNote: string;
 * }} options
 */
export function renderAuthEmail(options) {
  const ctaBlock = options.cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:10px;background-color:#0d9488;">
                      <a href="${options.cta.href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${options.cta.label}</a>
                    </td>
                  </tr>
                </table>`
    : '';

  const linkFallbackBlock = options.linkFallback
    ? `<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#64748b;">
                  Or copy and paste this link into your browser:
                </p>
                <p style="margin:0 0 24px;font-size:12px;line-height:1.5;color:#0d9488;word-break:break-all;">
                  <a href="${options.linkFallback}" style="color:#0d9488;">${options.linkFallback}</a>
                </p>`
    : '';

  const extraBody = options.extraBody ?? '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${options.pageTitle}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background-color:#0f172a;padding:28px 32px;text-align:center;">
                <img src="${LOGO_URL}" width="48" height="48" alt="CeenAiX" style="display:block;margin:0 auto 12px;border-radius:12px;" />
                <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">CeenAiX</div>
                <span style="display:block;font-size:12px;color:#5eead4;margin-top:4px;">Healthcare platform</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">${options.headline}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">
                  ${options.intro}
                </p>
                ${extraBody}
                ${ctaBlock}
                ${linkFallbackBlock}
                <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">
                  ${options.footerNote}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
                <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8;">
                  &copy; CeenAiX &middot; <a href="${BRAND_URL}" style="color:#64748b;text-decoration:none;">www.ceenaix.com</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}
