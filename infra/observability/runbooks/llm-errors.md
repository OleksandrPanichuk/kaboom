# Interviewer model errors

More than 10% of language model requests failed rather than stopped. Interviews stall: two failed turns in a row post a system message and stop.

## Check

- Dashboard, Interviewer model row: failures by reason.
- Sentry and the API logs (`component` AnthropicLanguageModel) for the provider's error.
- The provider's status page.

## Fix

- A provider outage: wait, and tell users if it lasts.
- A rejected key or exhausted credit: fix `ANTHROPIC_API_KEY` or top up.
