# API answers 5xx

More than 2% of API requests ended in a 5xx for five minutes. Users see errors.

## Check

- Open the Kaboom dashboard, API row: which status and which routes.
- Open Sentry for the same minutes: an unexpected error is reported there with its route.
- `GET /api/health/ready` names a module that is down (database, Redis, storage).

## Fix

- A failing dependency: bring it back, or roll back the deploy that broke it.
- `503 DESIGN_TESTS_BUSY` or `LANGUAGE_MODEL_UNAVAILABLE` show up as 5xx too: see those runbooks.
