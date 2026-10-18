# Interviewer model is slow

p95 of language model requests has been above a minute for fifteen minutes. Interviews feel unresponsive.

## Check

- Dashboard: is the first token slow too (the provider), or only the whole turn (long answers, many tool calls)?

## Fix

- Provider latency: usually passes. Long turns: lower `maxOutputTokens` or review the persona.
