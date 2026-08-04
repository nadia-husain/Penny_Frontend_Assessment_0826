# Implementation Notes

> Fill this in as part of your submission. 1–2 pages, bullet points are fine. Delete these
> instructions before submitting.

## 1. What I changed
<!-- Grouped by task: bugs fixed and features implemented (component + template). -->

bug fix:
- in diff.util.ts, i fixed the change detection as it used to only report the changes made to the unit price
  by adding the quantity field to the change condition as it was added in the test in diff.spec.ts.
- in cr-detail.component.ts, i added the canApprovePolicy so users can only approve based on their permissions. 
- in cr-detail.component.ts, the timeline getter returned audit entries unsorted. Fixed it to return a sorted 
  copy of the audit array, ordered oldest-first.

feature:
- in cr-detail.component.ts, i added validation to rejectControl so the form stays invalid until a non-blank 
  reason is entered (wrote a custom notBlank validator).

## 2. Component & state model
<!-- The screens, the view-state each component exposes, and how data flows from the mock API into the
template. -->

CrDetailComponent
- canApprove: boolean (getter) — true only when the loaded CR's status is 'PENDING_APPROVAL' and the current 
  session user holds an approve-scope policy (cr_a_u / cr_a_w / cr_a_o), via canApprovePolicy(); drives 
  whether the approve action is shown/enabled in the template.
- rejectControl: FormControl<string> — bound to the reject-reason input; exposes .invalid to gate the reject 
  button and show the error message.
- timeline: TimelineEntry[] (getter) — returns a sorted copy of detail.audit, oldest-first by the `at` 
  timestamp; feeds the approval timeline view in the template.

## 3. Invariants I keep
<!-- Which properties the UI guarantees, and where in the component/template each is enforced. -->

| Invariant | How / where |
|---|---|
- | Reject action cannot be submitted with an empty or whitespace-only reason | notBlank + Validators.required 
  on rejectControl in cr-detail.component.ts; submit button uses [disabled]="rejectControl.invalid" |
- | Timeline is always displayed oldest-first, regardless of the order entries arrive in from the API | 
  timeline getter in cr-detail.component.ts sorts a copy of detail.audit by `at` before returning it |

## 4. Testing strategy
<!-- What you tested (component/DOM vs pure) and why; what you deliberately skipped given the budget. -->

-

## 5. Assumptions
<!-- Where the requirements left room for interpretation, the calls you made and why. -->

- Treated whitespace-only input as invalid, since Validators.required alone does not catch " " as blank — added
  a custom notBlank validator for this.

## 6. Where I used AI
-

## 7. What I'd improve with more time
-
