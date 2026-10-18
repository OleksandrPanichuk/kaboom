locals {
  sections = [
    {
      title = "API"
      panels = [
        { title = "Requests by status", unit = "reqps", targets = [
          { expr = "sum by (status_class) (rate(http_requests_total{${local.job}}[$__rate_interval]))", legend = "{{status_class}}" },
        ] },
        { title = "5xx share", unit = "percentunit", targets = [
          { expr = "sum(rate(http_requests_total{${local.job},status_class=\"5xx\"}[$__rate_interval])) / clamp_min(sum(rate(http_requests_total{${local.job}}[$__rate_interval])), 1e-9)", legend = "5xx" },
        ] },
        { title = "p95 by route", unit = "ms", targets = [
          { expr = "topk(8, histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_milliseconds_bucket{${local.job},route!~\".*/events\"}[$__rate_interval]))))", legend = "{{route}}" },
        ] },
      ]
    },
    {
      title = "Interviewer model"
      panels = [
        { title = "Requests by stop reason", unit = "short", targets = [
          { expr = "sum by (role, stop_reason) (increase(llm_turns_total{${local.job}}[$__rate_interval]))", legend = "{{role}} {{stop_reason}}" },
          { expr = "sum by (role, reason) (increase(llm_failures_total{${local.job}}[$__rate_interval]))", legend = "{{role}} failed: {{reason}}" },
        ] },
        { title = "p95 duration and first token", unit = "ms", targets = [
          { expr = "histogram_quantile(0.95, sum by (le, role) (rate(llm_turn_duration_milliseconds_bucket{${local.job}}[$__rate_interval])))", legend = "{{role}} turn" },
          { expr = "histogram_quantile(0.95, sum by (le, role) (rate(llm_first_token_milliseconds_bucket{${local.job}}[$__rate_interval])))", legend = "{{role}} first token" },
        ] },
        { title = "Tokens per hour", unit = "short", targets = [
          { expr = "sum by (type) (increase(llm_tokens_total{${local.job}}[1h]))", legend = "{{type}}" },
        ] },
        { title = "Turns refused by the budget", unit = "short", targets = [
          { expr = "sum(increase(llm_budget_refusals_total{${local.job}}[$__rate_interval]))", legend = "refused" },
        ] },
      ]
    },
    {
      title = "Design tests"
      panels = [
        { title = "Tests by outcome", unit = "short", targets = [
          { expr = "sum by (task, outcome) (increase(design_tests_total{${local.job}}[$__rate_interval]))", legend = "{{task}} {{outcome}}" },
        ] },
        { title = "p95 duration", unit = "ms", targets = [
          { expr = "histogram_quantile(0.95, sum by (le, task) (rate(design_test_duration_milliseconds_bucket{${local.job}}[$__rate_interval])))", legend = "{{task}}" },
        ] },
        { title = "Queue and worker restarts", unit = "short", targets = [
          { expr = "max(design_test_queue{${local.job}})", legend = "waiting" },
          { expr = "sum by (reason) (increase(design_test_worker_restarts_total{${local.job}}[$__rate_interval]))", legend = "restarted: {{reason}}" },
        ] },
      ]
    },
    {
      title = "Background jobs"
      panels = [
        { title = "Attempts by outcome", unit = "short", targets = [
          { expr = "sum by (outcome) (increase(job_runs_total{${local.job}}[$__rate_interval]))", legend = "{{outcome}}" },
        ] },
        { title = "Failures by job", unit = "short", targets = [
          { expr = "sum by (job_name) (increase(job_runs_total{${local.job},outcome=\"failed\"}[$__rate_interval]))", legend = "{{job_name}}" },
        ] },
        { title = "p95 duration by job", unit = "ms", targets = [
          { expr = "histogram_quantile(0.95, sum by (le, job_name) (rate(job_duration_milliseconds_bucket{${local.job}}[$__rate_interval])))", legend = "{{job_name}}" },
        ] },
      ]
    },
    {
      title = "Billing"
      panels = [
        { title = "Events in failed", unit = "short", targets = [
          { expr = "max(billing_events_failed{${local.job}})", legend = "failed" },
        ] },
        { title = "Oldest event waiting", unit = "s", targets = [
          { expr = "max(billing_oldest_pending_seconds{${local.job}})", legend = "oldest pending" },
        ] },
      ]
    },
    {
      title = "Product"
      panels = [
        { title = "What people did, per day", unit = "short", targets = [
          { expr = "sum by (event) (increase(product_events_total{${local.job}}[1d]))", legend = "{{event}}" },
        ] },
      ]
    },
  ]

  panel_width  = 8
  panel_height = 8
  per_row      = 3

  section_heights = [
    for section in local.sections :
    1 + ceil(length(section.panels) / local.per_row) * local.panel_height
  ]

  section_tops = [
    for index in range(length(local.sections)) :
    sum(concat([0], slice(local.section_heights, 0, index)))
  ]

  dashboard_panels = flatten([
    for index, section in local.sections : concat(
      [{
        id        = index * 100 + 1
        type      = "row"
        title     = section.title
        collapsed = false
        panels    = []
        gridPos   = { x = 0, y = local.section_tops[index], w = 24, h = 1 }
      }],
      [
        for position, panel in section.panels : {
          id         = index * 100 + position + 2
          type       = "timeseries"
          title      = panel.title
          datasource = local.datasource
          gridPos = {
            x = (position % local.per_row) * local.panel_width
            y = local.section_tops[index] + 1 + floor(position / local.per_row) * local.panel_height
            w = local.panel_width
            h = local.panel_height
          }
          fieldConfig = {
            defaults  = { unit = panel.unit }
            overrides = []
          }
          options = {
            legend  = { displayMode = "list", placement = "bottom", showLegend = true }
            tooltip = { mode = "multi", sort = "desc" }
          }
          targets = [
            for target_index, target in panel.targets : {
              refId        = substr("ABCDEFGH", target_index, 1)
              datasource   = local.datasource
              expr         = target.expr
              legendFormat = target.legend
            }
          ]
        }
      ],
    )
  ])
}

resource "grafana_dashboard" "kaboom" {
  folder    = grafana_folder.kaboom.uid
  overwrite = true

  config_json = jsonencode({
    uid           = "kaboom-overview"
    title         = "Kaboom"
    tags          = ["kaboom"]
    timezone      = "utc"
    schemaVersion = 39
    refresh       = "1m"
    time          = { from = "now-6h", to = "now" }
    panels        = local.dashboard_panels
  })
}
