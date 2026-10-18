# API is slow

p95 of API requests (event streams aside) has been above 2 seconds for ten minutes.

## Check

- Dashboard, API row, *p95 by route*: one route or all of them?
- One route: its query or the work behind it (design tests run synchronously on run and submit).
- All routes: the database or the machine (CPU, memory, connection pool).

## Fix

- Add the missing index, cache the read, or give the service more resources.
