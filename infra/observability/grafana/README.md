# Grafana Cloud: dashboard and alerts

The API exports its metrics over OTLP (see "Metrics" in the root `CLAUDE.md`).
This module turns them into one dashboard, *Kaboom*, and the alert rules in
`alerts.tf`, which post to Slack. Each alert links to its runbook in
`infra/observability/runbooks`.

## Before the first apply

1. Create a Grafana Cloud stack (the free tier is enough).
2. In the stack, **Connections → OpenTelemetry (OTLP)**: copy the endpoint and
   the instance id, and create a token. Set the API's environment:

   ```
   OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://otlp-gateway-<region>.grafana.net/otlp/v1/metrics
   OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic%20<base64 of instance-id:token>
   ```

3. **Administration → Service accounts**: create one with the Admin role and
   a token for Terraform.
4. In Slack, create an incoming webhook for the channel alerts go to.
5. Copy `terraform.tfvars.example` to `terraform.tfvars` and fill it in. It is
   ignored by git.

## Apply

```
terraform init
terraform plan
terraform apply
```

State is local until there is somewhere to keep it; move it to a remote
backend before more than one person applies.

`grafana_notification_policy.root` replaces the stack's whole notification
policy tree: everything goes to the Slack contact point, `severity=page` alerts
repeating hourly and the rest every four hours.

## Metric names

Grafana Cloud stores OTLP metrics under Prometheus names: a counter gains
`_total`, a histogram in milliseconds `_milliseconds_bucket`, a gauge in
seconds `_seconds`, and the API's `APP_SLUG` becomes the `job` label
(`service_name`, `kaboom` by default). A new metric in the catalogue gets a
panel in `dashboard.tf` and, when something should page, a rule in
`alerts.tf` with its runbook.
