interface NotificationResult {
  success: boolean;
  error?: string;
}

interface ReportInfo {
  title: string;
  slug: string;
}

/**
 * Send push notification via ntfy.sh when a new report is published.
 * No API key or signup required - completely free.
 * Install the ntfy app and subscribe to your NTFY_TOPIC to receive notifications.
 */
export async function sendNewReportNotification(
  report: ReportInfo
): Promise<NotificationResult> {
  try {
    const topic = process.env.NTFY_TOPIC;
    if (!topic) {
      console.warn('[Notify] NTFY_TOPIC not set, push notifications disabled');
      return { success: false, error: 'NTFY_TOPIC not configured' };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dailydeep.co.il';
    const reportUrl = `${siteUrl}/reports/${report.slug}`;

    const response = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: {
        'Title': `New Report: ${report.title}`,
        'Click': reportUrl,
        'Tags': 'newspaper',
      },
      body: `A new investigative report has been published on Daily Deep.\n\n${report.title}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Notify] ntfy.sh error:', response.status, errorText);
      return { success: false, error: `ntfy.sh returned ${response.status}: ${errorText}` };
    }

    console.log('[Notify] Push notification sent successfully via ntfy.sh');
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[Notify] Exception sending notification:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
