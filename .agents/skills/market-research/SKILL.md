---
name: market-research
description: "Trigger: market research, investigar el mercado, análisis de mercado, competitor analysis, market trends, product opportunities. Research markets and turn evidence into actionable product recommendations."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Use this skill for structured research about a market, segment, competitors, trends, customer needs, or product opportunities. Do not use it for unsupported speculation, generic brainstorming, or final business decisions without evidence.

## Hard Rules

- Clarify the product, target segment, geography, timeframe, and decision to support before researching.
- Separate verified facts, attributed claims, assumptions, and recommendations.
- Prefer recent primary sources; cite URLs and publication dates for material claims.
- State source gaps, uncertainty, conflicts, and research date. Never invent data, sources, interviews, or market size.
- Compare competitors consistently: audience, positioning, offering, pricing, distribution, strengths, and weaknesses.
- Recommend opportunities only after connecting evidence to an unmet need; rank them by impact, confidence, effort, and risk.

## Decision Gates

| Situation | Action |
| --- | --- |
| Scope is ambiguous | Ask focused clarification questions before research |
| Current data is unavailable | Report the limitation and use clearly labeled assumptions |
| User asks for features | Research the need first, then prioritize opportunities |

## Execution Steps

1. Define the research question and evaluation criteria.
2. Gather and cross-check relevant sources.
3. Synthesize competitors, trends, customer problems, and gaps.
4. Produce prioritized opportunities with evidence and next validation steps.

## Output Contract

Return an executive summary, scope, methodology, dated findings, source links, confidence/limitations, competitor or trend analysis, prioritized opportunities, and concrete validation actions. Match the user's language.

## References

None. Keep domain-specific templates in `assets/` when they become reusable.
