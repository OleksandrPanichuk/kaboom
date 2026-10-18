# Design tests time out

Design tests ran past `DESIGN_TEST_TIMEOUT_MS`; each one stopped a worker and replaced it.

## Check

- API logs around the timeouts: which problem and how large a design.

## Fix

- A problem whose drills got too heavy: check it with `checkPublishable`'s work bounds. Otherwise raise the timeout.
