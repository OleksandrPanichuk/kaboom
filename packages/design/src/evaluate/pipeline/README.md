# Pipeline evaluator

`evaluatePipeline(graph, scenario)` times a change through the design's
CI/CD pipeline: when each stage starts and ends, how long a change takes
from merge to production, how often a run goes green, and which deploys
skip a gate. It needs no traffic, so it does not step through time like
the load evaluator; it answers once.

These are the rules. Each one is pinned by a test in `pipeline.test.ts`;
change a rule here and in its test in the same pull request.

## Scenario

| Field          | Default | Meaning                                             |
| -------------- | ------- | --------------------------------------------------- |
| `changedShare` | 1       | Share of the repository's packages a change touches |

## Stages

A pipeline is the `pipeline-stage` nodes joined by `pipeline-next` edges,
which `applyOps` keeps free of loops. A stage starts once every stage
before it has ended, and one with none before it starts at 0.

A stage takes, in minutes:

- `approve`: its `durationMinutes`, the time someone takes to approve,
  whatever the change or the runners;
- any other stage: `work / parallelism`, plus `RUNNER_SETUP_MINUTES` (1)
  when it has more than one runner, times its expected attempts. `work` is
  `durationMinutes`, times `changedShare` when the stage is `affectedOnly`.
  A stage that fails with chance `flakiness` and is retried `retries`
  times makes `(1 − flakiness^(retries + 1)) / (1 − flakiness)` attempts
  on average.

The **lead time** is when the last stage ends. A stage fails a run with
chance `flakiness^(retries + 1)`, an approval never does, and the **green
rate** is the chance that no stage fails.

## Findings

| Kind               | When                                                    |
| ------------------ | ------------------------------------------------------- |
| `untested-deploy`  | a `deploy` stage has no `test` stage anywhere before it |
| `unscanned-deploy` | a `deploy` stage has no `scan` stage anywhere before it |
