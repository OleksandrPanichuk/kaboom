# Metrics stopped arriving

Nothing has arrived from the API for ten minutes. The API is down, or it cannot reach the OTLP endpoint.

## Check

- Is the API up (`/api/health`)? Its logs for export errors from `OtlpMetrics`.
- Are `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` and `OTEL_EXPORTER_OTLP_HEADERS` still valid?

## Fix

- Bring the API back, or renew the Grafana Cloud token.
