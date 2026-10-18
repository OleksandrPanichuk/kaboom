locals {
  job = "job=\"${var.service_name}\""

  datasource = {
    type = "prometheus"
    uid  = var.prometheus_datasource_uid
  }

  runbook = { for name in [
    "api-errors",
    "api-latency",
    "llm-errors",
    "llm-unavailable",
    "llm-slow",
    "llm-spend",
    "design-tests-busy",
    "design-tests-timeouts",
    "design-tests-queue",
    "jobs-failed",
    "billing-failed",
    "billing-stuck",
    "metrics-missing",
  ] : name => "${var.runbook_base_url}/${name}.md" }
}
