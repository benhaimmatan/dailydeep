import sgMail from '@sendgrid/mail';

interface NotificationResult {
  success: boolean;
  error?: string;
}

interface ReportInfo {
  title: string;
  slug: string;
}

/**
 * Initialize SendGrid client lazily.
 * Returns false if SENDGRID_API_KEY is not set.
 */
function initSendGrid(): boolean {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn('[Email] SENDGRID_API_KEY not set, email notifications disabled');
    return false;
  }
  sgMail.setApiKey(apiKey);
  return true;
}

/**
 * Send email notification when a new report is published.
 * Non-blocking: errors are logged but do not throw.
 */
export async function sendNewReportNotification(
  report: ReportInfo
): Promise<NotificationResult> {
  try {
    if (!initSendGrid()) {
      return { success: false, error: 'SENDGRID_API_KEY not configured' };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailydeep.co.il';
    const reportUrl = `${siteUrl}/reports/${report.slug}`;
    const recipientEmail = process.env.NOTIFICATION_EMAIL || 'matan.benhaim@gmail.com';
    const senderEmail = process.env.SENDGRID_FROM_EMAIL || 'matan.benhaim@gmail.com';

    await sgMail.send({
      to: recipientEmail,
      from: senderEmail,
      subject: `New Report Published: ${report.title}`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #d4a853; margin-bottom: 16px;">New Report Published</h1>
          <h2 style="color: #333; margin-bottom: 24px;">${report.title}</h2>
          <p style="color: #666; margin-bottom: 24px;">
            A new investigative report has been published on Daily Deep.
          </p>
          <a href="${reportUrl}" style="display: inline-block; background-color: #d4a853; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Read the Report
          </a>
          <p style="color: #999; margin-top: 32px; font-size: 12px;">
            Published at ${new Date().toISOString()}
          </p>
        </div>
      `,
    });

    console.log('[Email] Notification sent successfully to', recipientEmail);
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[Email] Exception sending notification:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
