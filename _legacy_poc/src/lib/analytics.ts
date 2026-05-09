/**
 * Analytics tracking stubs for Nirmit.
 *
 * These functions are designed to be swapped for Google Analytics,
 * Mixpanel, PostHog, or any analytics provider without changing call sites.
 *
 * Usage:
 *   import { trackScreenView, trackEvent, trackError } from '../lib/analytics';
 *   trackScreenView('planner');
 *   trackEvent('furniture', 'add', 'sofa-3s', 1);
 */

/**
 * Track a screen view (page view equivalent for SPA).
 * Wire this into your router or screen navigation.
 */
export function trackScreenView(screenName: string): void {
  if (import.meta.env.DEV) {
    console.debug(`[analytics] screen_view: ${screenName}`);
  }

  // TODO: Integrate with Google Analytics / Mixpanel
  // Example GA4:
  // gtag('event', 'screen_view', { screen_name: screenName });
  //
  // Example Mixpanel:
  // mixpanel.track('Screen View', { screen: screenName });
}

/**
 * Track a user action event.
 *
 * @param category - High-level category (e.g., 'furniture', 'navigation', 'export')
 * @param action   - Specific action (e.g., 'add', 'remove', 'click')
 * @param label    - Optional label for the action target (e.g., 'sofa-3s')
 * @param value    - Optional numeric value (e.g., count, price)
 */
export function trackEvent(
  category: string,
  action: string,
  label?: string,
  value?: number,
): void {
  if (import.meta.env.DEV) {
    console.debug(
      `[analytics] event: ${category} / ${action}` +
        (label ? ` / ${label}` : '') +
        (value !== undefined ? ` (${value})` : ''),
    );
  }

  // TODO: Integrate with Google Analytics / Mixpanel
  // Example GA4:
  // gtag('event', action, {
  //   event_category: category,
  //   event_label: label,
  //   value: value,
  // });
  //
  // Example Mixpanel:
  // mixpanel.track(action, { category, label, value });
}

/**
 * Track an error event for analytics.
 *
 * @param errorType - Type of error (e.g., 'api_failure', 'render_error')
 * @param message   - Human-readable error message
 */
export function trackError(errorType: string, message: string): void {
  if (import.meta.env.DEV) {
    console.debug(`[analytics] error: ${errorType} — ${message}`);
  }

  // TODO: Integrate with error tracking
  // Example Sentry:
  // Sentry.captureMessage(message, { tags: { errorType } });
  //
  // Example GA4:
  // gtag('event', 'exception', { description: message, fatal: false });
}

/**
 * Track a timing event (e.g., how long an operation took).
 *
 * @param category   - Timing category (e.g., 'ai_generation', '3d_render')
 * @param variable   - Specific variable being timed
 * @param durationMs - Duration in milliseconds
 */
export function trackTiming(
  category: string,
  variable: string,
  durationMs: number,
): void {
  if (import.meta.env.DEV) {
    console.debug(
      `[analytics] timing: ${category} / ${variable} = ${durationMs}ms`,
    );
  }

  // TODO: Integrate with analytics
  // Example GA4:
  // gtag('event', 'timing_complete', {
  //   name: variable,
  //   value: durationMs,
  //   event_category: category,
  // });
}

/**
 * Measure the duration of an async operation and track it.
 * Usage:
 *   const result = await trackAsync('ai_generation', 'layout_gen', async () => {
 *     return await generateLayouts(...);
 *   });
 */
export async function trackAsync<T>(
  category: string,
  variable: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    trackTiming(category, variable, Math.round(duration));
    return result;
  } catch (err) {
    const duration = performance.now() - start;
    trackError(category, `Failed after ${Math.round(duration)}ms: ${(err as Error).message}`);
    throw err;
  }
}