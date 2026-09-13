# Deterministic recommendation evaluation

Evaluated 2026-09-12 using isolated academic scenarios in
`tests/recommender.test.ts`. These records never enter production catalogs.

## Expected behavior and evidence

| Scenario | Expected result |
| --- | --- |
| University algebra, virtual, same schedule | Lower hourly price ranks first within budget |
| Same price, Monday/Wednesday afternoon | 240 overlapping minutes outrank 60; Tuesday-only excluded |
| Same price/schedule, in-person | Nearby teaching zone outranks farther zone; tutor coverage also enforced |
| Virtual, missing/distant coordinates | Rank unchanged by GPS or search radius |
| Calculus I at university level | Cheap wrong-subject/wrong-level offers and over-budget offers excluded |
| No budget or selected schedule, virtual | Neutral score 50 with explicit missing-criteria explanations |
| 24 price/overlap combinations | Scores bounded 0–100, deterministic ties, no dominated option scores higher |

Existing tests also cover missing locations, incompatible availability and no
experience bonus. New cases assert returned ordering/explanation facts and monotonic
behavior rather than merely reproducing the weighted formula.

## Interpretation

Weights remain 40% price, 30% schedule and 30% proximity; virtual renormalizes price
and schedule to 4:3. The technical checks establish consistency with the declared
rules, not educational effectiveness, trustworthiness or a probability of success.
A tutor exactly at the maximum price and edge of both radii can be eligible with a
low score; eligibility and ranking are separate. Multi-day selection means overlap
with any selected day; it does not guarantee availability on every selected day.

No weights were changed without evidence. A subsequent academic evaluation should
collect consenting participants' relevance judgments on a fixed, anonymized scenario
set, compare the existing ranking with price-only and distance-only baselines, and
report disagreements and sample limits before proposing new weights. User-supplied
learning styles or free-form goals are context, not scored attributes in this model.
