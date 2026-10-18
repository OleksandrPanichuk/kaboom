# Design tests are queueing

More than four tests have waited for a worker for five minutes.

## Check

- Dashboard: worker restarts (dying workers shrink the pool) and p95 duration.

## Fix

- Raise `DESIGN_TEST_WORKERS`, or fix what kills workers.
