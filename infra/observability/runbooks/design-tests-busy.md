# Design tests turned away

The tester answered `503 DESIGN_TESTS_BUSY`: every worker had four tests queued.

## Check

- Dashboard, Design tests row: queue and p95 duration.

## Fix

- Raise `DESIGN_TEST_WORKERS`, or find the design that takes a worker for long.
