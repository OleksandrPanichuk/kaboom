locals {
  alerts = {
    "api-errors" = {
      title       = "API answers 5xx"
      summary     = "More than 2% of API requests failed with a 5xx for 5 minutes"
      expr        = "sum(rate(http_requests_total{${local.job},status_class=\"5xx\"}[5m])) / clamp_min(sum(rate(http_requests_total{${local.job}}[5m])), 1e-9)"
      above       = 0.02
      for         = "5m"
      severity    = "page"
      when_absent = "OK"
    }
    "api-latency" = {
      title       = "API is slow"
      summary     = "p95 of API requests, streams aside, is above 2 seconds"
      expr        = "histogram_quantile(0.95, sum by (le) (rate(http_request_duration_milliseconds_bucket{${local.job},route!~\".*/events\",route!=\"unmatched\"}[5m])))"
      above       = 2000
      for         = "10m"
      severity    = "warn"
      when_absent = "OK"
    }
    "llm-errors" = {
      title       = "Interviewer model errors"
      summary     = "More than 10% of language model requests failed"
      expr        = "sum(rate(llm_failures_total{${local.job}}[10m])) / clamp_min(sum(rate(llm_failures_total{${local.job}}[10m])) + sum(rate(llm_turns_total{${local.job}}[10m])), 1e-9)"
      above       = 0.1
      for         = "5m"
      severity    = "page"
      when_absent = "OK"
    }
    "llm-unavailable" = {
      title       = "Interviewer model unavailable"
      summary     = "Requests were refused because no language model is configured"
      expr        = "sum(increase(llm_failures_total{${local.job},reason=\"unavailable\"}[10m]))"
      above       = 0
      for         = "0s"
      severity    = "page"
      when_absent = "OK"
    }
    "llm-slow" = {
      title       = "Interviewer model is slow"
      summary     = "p95 of language model requests is above a minute"
      expr        = "histogram_quantile(0.95, sum by (le) (rate(llm_turn_duration_milliseconds_bucket{${local.job}}[15m])))"
      above       = 60000
      for         = "15m"
      severity    = "warn"
      when_absent = "OK"
    }
    "llm-spend" = {
      title       = "Token spend is high"
      summary     = "The model wrote more output tokens in the last hour than expected"
      expr        = "sum(increase(llm_tokens_total{${local.job},type=\"output\"}[1h]))"
      above       = var.hourly_output_token_limit
      for         = "0s"
      severity    = "warn"
      when_absent = "OK"
    }
    "design-tests-busy" = {
      title       = "Design tests turned away"
      summary     = "The tester answered 503 DESIGN_TESTS_BUSY in the last 10 minutes"
      expr        = "sum(increase(design_tests_total{${local.job},outcome=\"busy\"}[10m]))"
      above       = 0
      for         = "5m"
      severity    = "warn"
      when_absent = "OK"
    }
    "design-tests-timeouts" = {
      title       = "Design tests time out"
      summary     = "More than two design tests timed out in 15 minutes"
      expr        = "sum(increase(design_tests_total{${local.job},outcome=\"timed_out\"}[15m]))"
      above       = 2
      for         = "0s"
      severity    = "warn"
      when_absent = "OK"
    }
    "design-tests-queue" = {
      title       = "Design tests are queueing"
      summary     = "More than four design tests have waited for a worker for 5 minutes"
      expr        = "max(design_test_queue{${local.job}})"
      above       = 4
      for         = "5m"
      severity    = "warn"
      when_absent = "OK"
    }
    "jobs-failed" = {
      title       = "Background job failed"
      summary     = "A job failed its last attempt"
      expr        = "sum by (job_name) (increase(job_runs_total{${local.job},outcome=\"failed\"}[15m]))"
      above       = 0
      for         = "0s"
      severity    = "page"
      when_absent = "OK"
    }
    "billing-failed" = {
      title       = "Billing events failed"
      summary     = "Billing events are stuck in failed"
      expr        = "max(billing_events_failed{${local.job}})"
      above       = 0
      for         = "5m"
      severity    = "page"
      when_absent = "OK"
    }
    "billing-stuck" = {
      title       = "Billing events are waiting"
      summary     = "A billing event has waited more than 15 minutes to be processed"
      expr        = "max(billing_oldest_pending_seconds{${local.job}})"
      above       = 900
      for         = "5m"
      severity    = "page"
      when_absent = "OK"
    }
    "metrics-missing" = {
      title       = "Metrics stopped arriving"
      summary     = "Nothing from the API for 10 minutes: it is down or cannot export"
      expr        = "absent_over_time(billing_events_failed{${local.job}}[10m])"
      above       = 0
      for         = "0s"
      severity    = "page"
      when_absent = "OK"
    }
  }
}

resource "grafana_rule_group" "kaboom" {
  name             = "Kaboom"
  folder_uid       = grafana_folder.kaboom.uid
  interval_seconds = 60

  dynamic "rule" {
    for_each = local.alerts

    content {
      name           = rule.value.title
      condition      = "C"
      for            = rule.value.for
      no_data_state  = rule.value.when_absent
      exec_err_state = "Error"

      labels = {
        severity = rule.value.severity
        alert    = rule.key
      }

      annotations = {
        summary     = rule.value.summary
        description = "{{ $values.A }}"
        runbook_url = local.runbook[rule.key]
      }

      data {
        ref_id         = "A"
        datasource_uid = var.prometheus_datasource_uid

        relative_time_range {
          from = 3600
          to   = 0
        }

        model = jsonencode({
          refId   = "A"
          expr    = rule.value.expr
          instant = true
        })
      }

      data {
        ref_id         = "C"
        datasource_uid = "__expr__"

        relative_time_range {
          from = 0
          to   = 0
        }

        model = jsonencode({
          refId      = "C"
          type       = "threshold"
          expression = "A"
          conditions = [{
            evaluator = {
              type   = "gt"
              params = [rule.value.above]
            }
          }]
        })
      }
    }
  }
}
