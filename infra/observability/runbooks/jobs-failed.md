# Background job failed

A job failed its last attempt. The alert's `job_name` says which one.

## Check

- Sentry: `Job.failed` reports the error with the job and its payload.
- Dashboard, Background jobs row.

## Fix

- Emails (`notifications.send-email`): check SMTP. Reviews: the interview moves to `review_failed` and can be retried. Billing: see the billing runbooks.
