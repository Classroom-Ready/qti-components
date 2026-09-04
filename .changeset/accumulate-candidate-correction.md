---
'@qti-components/corrections': minor
'@citolab/qti-components': minor
---

Accumulate candidate correction across attempts.

After a scored attempt the player marks the candidate's pick. Those marks now persist when the
candidate selects something else, and the next scored attempt adds to them — so two wrong attempts
leave two ✘ marks and the reviewer sees the whole history rather than only the latest guess.

`toggleCandidateCorrection(show, accumulate)` and
`QtiAssessmentItemCorrection.showCandidateCorrection(show, accumulate)` take a new optional
`accumulate` flag. It defaults to `false`, which keeps the existing behaviour of recomputing the
marks from the current response, so nothing changes for a consumer that does not pass it. Hiding
always clears, regardless of mode.

`TestNavigationCorrection` passes `accumulate` from `afterAttemptEnded`, so **any assessment that
opts an item into the QTI-standard `qti-item-session-control show-solution` now accumulates marks**.
That is the point of the change rather than a side effect: `show-solution` is the assessment asking
for correctness to be reflected back to the candidate, and the history is what an end-of-attempt
review needs.

Showing marks in accumulate mode also opts the item into keeping them across a response change,
replacing the unconditional auto-clear in `afterResponseVariableUpdated` — otherwise the next
selection would wipe the mark before the next attempt could add to it.

Accumulation applies to per-choice marks and to the interaction-level verdict. For the drag-drop
interactions (match, gap-match, order) and select-point the flag is threaded but inert: those marks
live on the drags or points the candidate currently has placed, so they already follow the response
and there is no earlier mark left behind to keep.
