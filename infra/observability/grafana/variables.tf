variable "grafana_url" {
  description = "The Grafana Cloud stack, such as https://kaboom.grafana.net"
  type        = string
}

variable "grafana_token" {
  description = "A service account token of the stack with the Admin role"
  type        = string
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "An incoming webhook of the Slack channel alerts go to"
  type        = string
  sensitive   = true
}

variable "prometheus_datasource_uid" {
  description = "The stack's Prometheus data source, which receives the OTLP metrics"
  type        = string
  default     = "grafanacloud-prom"
}

variable "service_name" {
  description = "The API's APP_SLUG; Grafana Cloud stores it as the job label"
  type        = string
  default     = "kaboom"
}

variable "runbook_base_url" {
  description = "Where the runbooks are read, each alert linking to its own"
  type        = string
  default     = "https://github.com/OleksandrPanichuk/kaboom/blob/main/infra/observability/runbooks"
}

variable "hourly_output_token_limit" {
  description = "Output tokens an hour above which spend is worth a look"
  type        = number
  default     = 2000000
}
