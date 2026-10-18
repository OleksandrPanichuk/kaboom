# Billing events are waiting

A billing event has waited more than fifteen minutes. The job worker is down or the queue is stuck.

## Check

- Is the jobs Redis up? Does the dashboard show any job runs at all?

## Fix

- Restore the queue; pending events are processed once it runs.
