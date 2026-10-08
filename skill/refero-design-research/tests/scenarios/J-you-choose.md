# Scenario J — "you choose"

**Status: checklist.**

## Prompt

> Make me an internal tool for tracking support tickets. You pick the look.

## Expected behaviour

1. The question round still happens — "you choose" is an answer to the round, not
   a reason to skip it. The user has said what they want decided for them, not
   that nothing is open.
2. After the round, the agent applies **its recommended options**, and says so:
   which recommendation was taken for each question.
3. The recommendations are then labelled as decisions in the design direction —
   they are `Decision`, not `Observed`, and not presented as if the user had
   chosen them.
4. **No second round.** Nothing new is asked, even though the answers raised
   something new to decide; that becomes a labelled `Decision` instead.
5. Research proceeds normally from the chosen brief.

## Forbidden behaviour

- Asking the same questions again, or asking follow-ups "just to confirm"
- Silently applying recommendations without saying they were the agent's
- Labelling a recommendation `Observed`
- Treating "you choose" as a reason to skip the round entirely and guess at
  everything, including the questions it should have asked

## Pass criteria

- [ ] The round happened before the recommendation was applied
- [ ] Each applied option is identified as the agent's recommendation
- [ ] No follow-up question round
- [ ] Recommendations are labelled `Decision`, with reasons
