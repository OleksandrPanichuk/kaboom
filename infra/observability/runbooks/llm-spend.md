# Token spend is high

The model wrote more output tokens in the last hour than `hourly_output_token_limit`.

## Check

- Dashboard, *Tokens per hour*, and `llm_usage` for the users spending the most.

## Fix

- Expected growth: raise the limit. One user: lower `LLM_DAILY_TOKEN_BUDGET` or block abuse.
