# Runbooks

One file per alert in `infra/observability/grafana/alerts.tf`; each alert links to its own.

- [API answers 5xx](api-errors.md)
- [API is slow](api-latency.md)
- [Interviewer model errors](llm-errors.md)
- [Interviewer model unavailable](llm-unavailable.md)
- [Interviewer model is slow](llm-slow.md)
- [Token spend is high](llm-spend.md)
- [Design tests turned away](design-tests-busy.md)
- [Design tests time out](design-tests-timeouts.md)
- [Design tests are queueing](design-tests-queue.md)
- [Background job failed](jobs-failed.md)
- [Billing events failed](billing-failed.md)
- [Billing events are waiting](billing-stuck.md)
- [Metrics stopped arriving](metrics-missing.md)
