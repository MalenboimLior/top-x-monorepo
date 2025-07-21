import { Analytics, logEvent } from 'firebase/analytics';

export function trackEvent(
  analytics: Analytics | null | undefined,
  eventName: string,
  params: Record<string, any> = {}
) {
  try {
    if (analytics) {
      logEvent(analytics, eventName, params);
    }
  } catch (err) {
    console.error('Analytics error:', err);
  }
}
