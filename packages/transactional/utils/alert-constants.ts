/**
 * Placeholders for service alert emails.
 * The notification Lambda replaces these at runtime before sending via SES.
 */
export const ALERT_ALARM_NAME = '{{alarmName}}';
export const ALERT_SEVERITY = '{{severity}}';
export const ALERT_SERVICE = '{{service}}';
export const ALERT_DESCRIPTION = '{{description}}';
export const ALERT_TIMESTAMP = '{{timestamp}}';
export const ALERT_DASHBOARD_URL = '{{dashboardUrl}}';
