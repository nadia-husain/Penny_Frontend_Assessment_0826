# Implementation Notes

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
- in cr-list.component.ts, implemented visibleRows to filter the loaded rows by the selected statusFilter 
  ('ALL' shows everything unfiltered).
- in cr-detail.component.ts, i implemented approve() to call the API, update the view state on success, and 
  surface the error message on failure.
- in cr-detail.component.ts, i implemented reject() to require a valid rejectControl (rejection reason) before 
  proceeding (marking it touched if invalid, so the error message shows), then call the API and update the view 
  state on success, resetting the reason field; surfaces the error message on failure.

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
- submitting: boolean — true while approve() is in flight; disables the approve action.
- actionError?: string — set on a failed approve() call, cleared at the start of each attempt.
- approve(): async method — guards on canApprove/detail, calls the API, then updates state to the fresh 
  CrDetail on success so canApprove/timeline/detail recompute automatically.
- reject(): async method — guards on canReject/detail/rejectControl.invalid (marking the control touched 
  if invalid), calls the API with the entered reason, then updates state to the fresh CrDetail and resets 
  rejectControl on success.

CrListComponent
- statusFilter: CrStatus | 'ALL' — bound to the status dropdown; drives which rows are shown.
- visibleRows: CrSummary[] (getter) — the loaded rows narrowed by statusFilter; feeds the rendered table.

## 3. Invariants I keep
<!-- Which properties the UI guarantees, and where in the component/template each is enforced. -->

| Invariant | How / where |
|---|---|
| Reject action cannot be submitted with an empty or whitespace-only reason | notBlank + Validators.required on rejectControl in cr-detail.component.ts; submit button uses [disabled]="rejectControl.invalid" |
| Timeline is always displayed oldest-first, regardless of the order entries arrive in from the API | timeline getter in cr-detail.component.ts sorts a copy of detail.audit by `at` before returning it |
| The list only shows rows matching the selected status filter | visibleRows getter in cr-list.component.ts |
| Approve cannot be triggered unless the current user is permitted and the CR is in Pending Approval status | approve() re-checks canApprove and detail before calling the API, in addition to the template disabling the button |
| Reject cannot be triggered unless the CR is in Pending Approval status and the reason is valid | reject() re-checks canReject detail, and rejectControl.invalid before calling the API, in addition to the template disabling the button |

## 4. Testing strategy
<!-- What you tested (component/DOM vs pure) and why; what you deliberately skipped given the budget. -->

- Focused tests on the features/fixes I implemented, not on provided/pre-existing code.
- Tested through the DOM (querySelector + click/input/change events) rather than calling component 
  methods directly. This exercises the actual template bindings (*ngIf, [disabled], [formControl]), 
  not just the underlying TypeScript logic.
- CrDetailComponent: covered timeline ordering, approve success/failure, reject validation (blank/valid), 
  and reject success/failure. Failures were simulated deterministically via the mock API's failNext flag.
- CrListComponent: covered visibleRows showing all rows on 'ALL', narrowing to matching rows, and showing 
  zero rows when nothing matches the selected status.
- Did not add a component-level test for the diff getter/binding, since it was provided code rather than 
  something I implemented. computeDiff() itself is already covered by the pre-existing diff.spec.ts.

## 5. Assumptions
<!-- Where the requirements left room for interpretation, the calls you made and why. -->

- Treated whitespace-only input as invalid, since Validators.required alone does not catch " " as blank — added
  a custom notBlank validator for this.

## 6. Where I used AI

- Mostly used Claude to help write test cases and to understand Angular components faster, since I have 
  no prior experience with Angular.

## 7. What I'd improve with more time
-
