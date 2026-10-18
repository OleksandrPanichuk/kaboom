resource "grafana_contact_point" "slack" {
  name = "Kaboom Slack"

  slack {
    url   = var.slack_webhook_url
    title = "{{ if eq .Status \"firing\" }}:rotating_light:{{ else }}:white_check_mark:{{ end }} {{ .CommonLabels.alertname }}"
    text  = <<-EOT
      {{ range .Alerts }}*{{ .Annotations.summary }}*
      {{ .Annotations.description }}
      Runbook: {{ .Annotations.runbook_url }}
      {{ end }}
    EOT
  }
}

resource "grafana_notification_policy" "root" {
  contact_point   = grafana_contact_point.slack.name
  group_by        = ["alertname"]
  group_wait      = "30s"
  group_interval  = "5m"
  repeat_interval = "4h"

  policy {
    contact_point   = grafana_contact_point.slack.name
    group_by        = ["alertname"]
    repeat_interval = "1h"

    matcher {
      label = "severity"
      match = "="
      value = "page"
    }
  }
}
