# Implementation Plan: Team Selection & Submission

## Overview

Introduce a multi-step `SubmissionFlow` component that orchestrates the existing `TeamBuilder`, `XIPanel`, and `MyTeamCard` components into a cohesive Build → Preview → Confirm flow. Add debounced draft-saving and a proper submission write to Firestore, then wire everything into `MemberView` under a "My Team" tab.

## Tasks

- [x] 1. Extend the Firebase/db layer with draft-save and submission helpers
  - [x] 1.1 Add `saveDraftTeam(db, matchId, memberName, teamData)` to `src/firebase/db.js`
    - Writes `{ players, captain, vc, submitted: false, updatedAt: Date.now() }` via `updateDoc` to `matches/{matchId}` using a dot-path key `teams.{memberName}`
    - _Requirements: 3.1, 9.1_
  - [x] 1.2 Add `submitTeam(db, matchId, memberName, teamData)` to `src/firebase/db.js`
    - Writes `{ players, captain, vc, submitted: true, submittedAt: Date.now(), updatedAt: Date.now() }` via `updateDoc`
    - _Requirements: 4.3, 9.1_
  - [ ]\* 1.3 Write unit tests for `saveDraftTeam` and `submitTeam`
    - Mock Firestore `updateDoc`; assert correct field shapes, `submitted` flag, and timestamp presence
    - _Requirements: 3.1, 4.3, 9.1_

- [x] 2. Create `ConfirmStep` component
  - [x] 2.1 Create `src/components/member/ConfirmStep.jsx`
    - Accept props: `{ team, matchPlayers, onSubmit, onBack, submitting }`
    - Render full XI grouped by role using `roleCounts` / `ROLE_ICONS`; show C/VC badges; show total credits via `teamSpend`
    - Render "Submit Team" button (disabled while `submitting`) and a "← Back" link
    - _Requirements: 2.7, 4.1, 10.5_
  - [ ]\* 2.2 Write unit tests for `ConfirmStep`
    - Assert C badge on captain, VC badge on vc, no badge on others
    - Assert "Submit Team" button disabled when `submitting=true`
    - Assert `onBack` called on back click
    - _Requirements: 2.7, 10.5_
  - [ ]\* 2.3 Write property test for `ConfirmStep` — C/VC badge exclusivity (Property 13)
    - `// Feature: team-selection-submission, Property 13: C/VC badges on Step 3 summary`
    - Generate arbitrary valid teams; assert exactly one C badge and one VC badge, on the correct players
    - **Property 13: C/VC badges on Step 3 summary**
    - **Validates: Requirements 10.5**

- [x] 3. Create `SubmissionFlow` component — skeleton and state machine
  - [x] 3.1 Create `src/components/member/SubmissionFlow.jsx` with props interface from design
    - Accept: `{ db, currentMatchId, currentMatch, matchPlayers, allTeams, allMembers, session, isIPL, localTeam, setLocalTeam, showToast }`
    - Derive `locked`, `revealed`, `myTeam`, `submitted` from props
    - Implement state: `step` (1|2|3), `saving`, `saveError`, `submitting`
    - Render the correct UI branch: NoMatch empty state, DeadlinePassed, ReadOnly (locked+submitted), or the step flow
    - _Requirements: 1.2, 1.3, 6.1, 6.2, 8.1, 8.2_
  - [ ]\* 3.2 Write unit tests for `SubmissionFlow` state branches
    - Test: no match → empty state message rendered
    - Test: locked + no submission → "Deadline Passed" message rendered, no TeamBuilder
    - Test: locked + submitted → MyTeamCard rendered, no edit controls
    - _Requirements: 1.3, 6.1, 8.1, 8.2_

- [x] 4. Implement Step 1 (Build XI) inside `SubmissionFlow`
  - [x] 4.1 Render `TeamBuilder` on step 1; add a "Next →" button below it
    - Button disabled when `localTeam.players.length !== 11`; show "Need N more" when disabled
    - On click: advance `step` to 2
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 10.1, 10.2, 10.3_
  - [ ]\* 4.2 Write property test for Next button gate (Property 1)
    - `// Feature: team-selection-submission, Property 1: Next button gated by player count`
    - Generate player counts 0–10; assert button disabled and remaining count correct; generate count=11; assert enabled
    - **Property 1: Next button gated by player count**
    - **Validates: Requirements 2.3, 2.4**
  - [ ]\* 4.3 Write property test for credit bar and role summary (Property 11)
    - `// Feature: team-selection-submission, Property 11: Credit bar and role summary reflect current selection`
    - Generate arbitrary player selections; assert displayed spend equals `teamSpend(players)` and role pills match `roleCounts`
    - **Property 11: Credit bar and role summary reflect current selection**
    - **Validates: Requirements 10.1, 10.2, 10.3**

- [x] 5. Implement debounced draft-save in `SubmissionFlow`
  - [x] 5.1 Wire a `useEffect` that calls `saveDraftTeam` (debounced 1500 ms) whenever `localTeam.players`, `localTeam.captain`, or `localTeam.vc` change
    - Set `saving: true` before write, `saving: false` + show "Saved" indicator on success
    - On failure: set `saveError: true`, call `showToast` with error message
    - Skip write when `currentMatch.locked` is true
    - _Requirements: 3.1, 3.3, 3.4_
  - [ ]\* 5.2 Write property test for draft write trigger (Property 4)
    - `// Feature: team-selection-submission, Property 4: Draft write triggered on selection change`
    - Generate random selection mutations; assert `saveDraftTeam` called with `submitted: false` and an `updatedAt` number within debounce window
    - **Property 4: Draft write triggered on selection change**
    - **Validates: Requirements 3.1**
  - [ ]\* 5.3 Write property test for lock-state write rejection (Property 10)
    - `// Feature: team-selection-submission, Property 10: Locked match rejects submit/edit actions`
    - Generate actions with `locked=true`; assert no Firestore write and toast shown
    - **Property 10: Locked match rejects submit/edit actions**
    - **Validates: Requirements 6.3**

- [x] 6. Implement Step 2 (Preview & Pick Captain) inside `SubmissionFlow`
  - [x] 6.1 Render `XIPanel` on step 2 (hide its internal lock button); add "Next →" and "← Back" navigation buttons
    - "Next" disabled when `captain` is empty or `captain === vc`
    - "← Back" returns to step 1 without clearing selections
    - _Requirements: 2.5, 2.6, 2.8_
  - [ ]\* 6.2 Write property test for Step 2 Next button gate (Property 2)
    - `// Feature: team-selection-submission, Property 2: Step 2 Next button gated by valid captain/vc`
    - Generate captain/vc combos (empty, same, distinct); assert Next enabled iff both set and distinct
    - **Property 2: Step 2 Next button gated by valid captain/vc**
    - **Validates: Requirements 2.6**
  - [ ]\* 6.3 Write property test for back navigation state preservation (Property 3)
    - `// Feature: team-selection-submission, Property 3: Back navigation preserves selections`
    - Generate team state; simulate forward then back; assert `players`, `captain`, `vc` unchanged
    - **Property 3: Back navigation preserves selections**
    - **Validates: Requirements 2.8**

- [x] 7. Implement Step 3 (Confirm & Submit) inside `SubmissionFlow`
  - [x] 7.1 Render `ConfirmStep` on step 3; wire `onSubmit` to call `validateTeam` then `submitTeam`
    - If `validateTeam` returns an error: call `showToast(err, "err")`, stay on step 3, no Firestore write
    - If write succeeds: transition to submitted/read-only view showing `MyTeamCard`
    - If write fails: call `showToast`, stay on step 3, keep button active for retry
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [ ]\* 7.2 Write property test for submission validation gate (Property 5)
    - `// Feature: team-selection-submission, Property 5: Submission validates before writing`
    - Generate valid and invalid teams; assert `validateTeam` gates the write; invalid → toast, no write; valid → write proceeds
    - **Property 5: Submission validates before writing**
    - **Validates: Requirements 4.1, 4.2, 9.4**
  - [ ]\* 7.3 Write property test for submission write schema (Property 6)
    - `// Feature: team-selection-submission, Property 6: Submission write schema correctness`
    - Generate valid teams; assert written doc contains all required fields with correct types
    - **Property 6: Submission write schema correctness**
    - **Validates: Requirements 4.3, 9.1**
  - [ ]\* 7.4 Write property test for re-submission timestamp (Property 14)
    - `// Feature: team-selection-submission, Property 14: Re-submission updates submittedAt`
    - Generate two sequential submissions; assert second `submittedAt >= first`
    - **Property 14: Re-submission updates submittedAt**
    - **Validates: Requirements 5.3**

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Edit Team flow and lock-state enforcement in `SubmissionFlow`
  - [x] 9.1 Pass `onEditTeam` to `MyTeamCard` that resets `step` to 1 and re-populates `localTeam` from `allTeams[session]`
    - Only wire `onEditTeam` when `!currentMatch.locked`; pass no-op when locked
    - Show "🔒 Match Locked — no further changes allowed" banner when locked
    - _Requirements: 5.1, 5.2, 5.4, 6.1, 6.2_
  - [ ]\* 9.2 Write property test for Edit button lock-state (Property 9)
    - `// Feature: team-selection-submission, Property 9: Edit controls reflect lock state`
    - Generate `match.locked` true/false; assert Edit button present iff `!locked`
    - **Property 9: Edit controls reflect lock state**
    - **Validates: Requirements 5.1, 5.4, 6.1, 6.2, 7.3**
  - [ ]\* 9.3 Write unit test for Edit Team re-entry
    - Simulate submitted state → tap Edit → assert step resets to 1 with pre-populated selections
    - _Requirements: 5.2_

- [x] 10. Implement malformed Firestore data handling and round-trip integrity
  - [x] 10.1 Add defensive defaults when reading `allTeams[session]` in `SubmissionFlow`
    - Apply the pattern from design: `Array.isArray(myTeam.players)`, `typeof myTeam.captain === "string"`, etc.
    - _Requirements: 9.3_
  - [ ]\* 10.2 Write property test for malformed Firestore data (Property 8)
    - `// Feature: team-selection-submission, Property 8: Graceful handling of malformed Firestore data`
    - Generate partial/empty/null Firestore docs; assert no crash and empty draft state returned
    - **Property 8: Graceful handling of malformed Firestore data**
    - **Validates: Requirements 9.3**
  - [ ]\* 10.3 Write property test for round-trip integrity (Property 7)
    - `// Feature: team-selection-submission, Property 7: Team data round-trip integrity`
    - Generate valid teams; write then read back; assert `players`, `captain`, `vc`, `submitted` identical
    - **Property 7: Team data round-trip integrity**
    - **Validates: Requirements 9.2, 3.2**

- [x] 11. Implement match status label in `SubmissionFlow`
  - [x] 11.1 Render a status pill/label derived from `currentMatch` flags
    - "🟢 Open" when `!locked && !revealed`; "🥁 Toss Done" when `revealed && !locked`; "🔒 Locked" when `locked`
    - _Requirements: 10.4_
  - [ ]\* 11.2 Write property test for status label (Property 12)
    - `// Feature: team-selection-submission, Property 12: Status label matches match state`
    - Generate all combinations of `locked`/`revealed`; assert label matches expected string
    - **Property 12: Status label matches match state**
    - **Validates: Requirements 10.4**

- [x] 12. Wire `SubmissionFlow` into `MemberView`
  - [x] 12.1 Import `SubmissionFlow` in `MemberView.jsx`; replace the `renderTeamTab()` function body with `<SubmissionFlow ... />` passing all required props
    - Ensure "My Team" remains the first tab (index 0); preserve "Live Scores" and "Season Table" tabs unchanged
    - Remove the now-redundant inline locked/deadline/builder rendering logic from `renderTeamTab`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [ ]\* 12.2 Write unit tests for `MemberView` tab wiring
    - Assert "My Team" tab is first; assert `SubmissionFlow` rendered when tab active; assert other tabs unchanged
    - _Requirements: 1.1, 1.4_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use `fast-check` with `{ numRuns: 100 }` and must include the comment referencing the property number
- Test files live at `src/components/member/__tests__/SubmissionFlow.test.jsx`, `SubmissionFlow.pbt.test.jsx`, and `ConfirmStep.test.jsx`
- `saveDraftTeam` and `submitTeam` use `updateDoc` with dot-path keys (`teams.memberName`) to avoid overwriting other members' data
- The debounce timer should be cancelled on unmount to prevent stale writes
