# Search compatibility percentage

Approved 2026-11-17. Preserve current eligibility and UI layout.

- WHEN all selected criteria are satisfied, the result SHALL show 100% compatibility
  with the search, regardless of additional savings or unused weekly availability.
- WHEN a criterion is not selected, it SHALL contribute neither a reward nor penalty.
- Selected criteria: subject, educational level (excluding `todos`), explicit modality,
  positive maximum budget, selected weekly schedule, and in-person proximity.
- Schedule satisfaction retains the existing ANY-overlap contract; it does not imply
  availability on every selected day or that a complete session can be reserved.
- In-person proximity requires a known distance within both participant radii.
  Virtual candidates SHALL ignore geographic distance.
- Incompatible candidates SHALL remain excluded. Experience and documents SHALL
  never increase the percentage. The score SHALL NOT certify teaching quality.
- WHEN percentages tie, results SHALL sort by lower price, greater selected weekly
  overlap, shorter applicable distance and stable ID. All eligible candidates may
  legitimately show 100%; the percentage no longer expresses relative preference.
- WHEN no scoring criteria are selected, the score SHALL be 0 and explanations
  SHALL invite criteria selection rather than claim an assessed full match.

## Design / ADR

Keep the pure domain recommender and existing DTO. Score equals rounded
`100 * satisfied selected criteria / selected criteria`. Each criterion has equal
weight; eligibility remains independent. Replace relative savings/coverage weights
because they penalized fully compatible candidates. Do not rescale or clamp the old
score to make it appear higher. Tie ordering retains useful preference information.

## Tasks and verification

1. Add failing regressions for full match, budget boundary, partial weekly overlap,
   no criteria, radius boundary and virtual independence.
2. Implement domain score and deterministic tie ordering; clarify visible meaning.
3. Run unit/type/build and affected Results browser checks; record evidence.
