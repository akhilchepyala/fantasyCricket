# Requirements Document

## Introduction

This feature adds a dedicated "My Team" submission flow to the fantasy cricket app's member view. Members can build, save, and submit their XI for a match. The experience is modelled after Dream11 and IPL T20 Fantasy — with a clear multi-step flow (Build → Preview → Confirm), a submission deadline enforced by match state, and teams revealed only after the toss and within 10 minutes of play starting. Once a team is submitted and the match is locked, it cannot be edited.

The feature integrates with the existing `TeamBuilder`, `XIPanel`, `MyTeamCard`, and `MemberView` components, and persists data via the existing Firebase `matches/{matchId}.teams` structure.

---

## Glossary

- **Member**: A registered fantasy league participant.
- **Team**: A Member's selected XI of 11 players with a Captain and Vice-Captain for a specific match.
- **Submission**: The act of a Member finalising and saving their Team to Firestore for a match.
- **Draft**: A Team that has been saved locally or to Firestore but not yet submitted (confirmed).
- **Lock**: The state where a match is closed for further Team edits; triggered by the admin or automatically 10 minutes before play.
- **Reveal**: The state where submitted Teams become visible to all Members; triggered after the toss.
- **Deadline**: The point in time after which no new Submissions or edits are accepted (i.e., when the match is Locked).
- **TeamBuilder**: The existing component used to pick players, Captain, and Vice-Captain.
- **XIPanel**: The existing sidebar component showing the current XI and the lock/submit button.
- **MyTeamCard**: The existing read-only view of a submitted Team.
- **SubmissionFlow**: The new multi-step UI (Build → Preview → Confirm) introduced by this feature.
- **MemberView**: The top-level member screen that hosts all tabs.
- **Firestore**: The Firebase Realtime/Firestore backend used for persistence.

---

## Requirements

### Requirement 1: Dedicated Team Selection Tab

**User Story:** As a Member, I want a dedicated tab for building and submitting my team, so that the selection flow is clearly separated from live scores and season standings.

#### Acceptance Criteria

1. THE MemberView SHALL display a tab labelled "My Team" as the first tab in the tab bar.
2. WHEN the Member navigates to the "My Team" tab, THE MemberView SHALL render the SubmissionFlow for the current match.
3. WHEN no match is currently active, THE MemberView SHALL display an empty state message on the "My Team" tab indicating that no match has been set up.
4. THE MemberView SHALL preserve the existing "Live Scores" and "Season Table" tabs without modification.

---

### Requirement 2: Multi-Step Submission Flow

**User Story:** As a Member, I want a clear step-by-step flow to build, preview, and confirm my team, so that I don't accidentally submit an incomplete or wrong team.

#### Acceptance Criteria

1. THE SubmissionFlow SHALL present three sequential steps: Step 1 "Build XI", Step 2 "Preview & Pick Captain", Step 3 "Confirm & Submit".
2. THE SubmissionFlow SHALL display a step indicator showing the current step and total steps at the top of the flow.
3. WHEN the Member has selected fewer than 11 players, THE SubmissionFlow SHALL disable the "Next" button on Step 1 and display the count of remaining players needed.
4. WHEN the Member has selected exactly 11 valid players, THE SubmissionFlow SHALL enable the "Next" button to proceed to Step 2.
5. WHEN the Member is on Step 2, THE SubmissionFlow SHALL display the full XI grouped by role with Captain and Vice-Captain selectors.
6. WHEN the Member has not selected a Captain or has selected the same player as both Captain and Vice-Captain, THE SubmissionFlow SHALL disable the "Next" button on Step 2.
7. WHEN the Member is on Step 3, THE SubmissionFlow SHALL display a read-only summary of the full XI, Captain, Vice-Captain, and total credits used.
8. THE SubmissionFlow SHALL allow the Member to navigate back to a previous step without losing selections.

---

### Requirement 3: Save Draft

**User Story:** As a Member, I want my team selections to be saved as a draft automatically, so that I don't lose my progress if I navigate away or close the app.

#### Acceptance Criteria

1. WHEN the Member modifies their player selection, captain, or vice-captain, THE SubmissionFlow SHALL persist the current selections to Firestore as a Draft within 2 seconds.
2. WHEN the Member returns to the "My Team" tab after navigating away, THE SubmissionFlow SHALL restore the Member's last saved Draft selections.
3. THE SubmissionFlow SHALL display a "Saved" indicator after a successful Draft save.
4. IF a Firestore write fails during Draft save, THEN THE SubmissionFlow SHALL display an error toast and retain the local state.

---

### Requirement 4: Team Submission (Confirm & Lock)

**User Story:** As a Member, I want to submit and lock my final team, so that my entry is registered for the match.

#### Acceptance Criteria

1. WHEN the Member taps "Submit Team" on Step 3, THE SubmissionFlow SHALL validate the Team using the existing `validateTeam` utility.
2. IF validation fails, THEN THE SubmissionFlow SHALL display a descriptive error toast and remain on Step 3.
3. WHEN validation passes, THE SubmissionFlow SHALL write the Team to `matches/{matchId}.teams.{memberName}` in Firestore with `submitted: true` and a `submittedAt` timestamp.
4. WHEN the Submission succeeds, THE SubmissionFlow SHALL display a full-screen success confirmation with the Member's team name, Captain, and Vice-Captain.
5. WHEN the Submission succeeds, THE SubmissionFlow SHALL transition to a read-only "Team Submitted" view showing the MyTeamCard.
6. IF the Firestore write fails during Submission, THEN THE SubmissionFlow SHALL display an error toast and allow the Member to retry.

---

### Requirement 5: Edit Team Before Deadline

**User Story:** As a Member, I want to edit my submitted team before the match is locked, so that I can react to toss results or last-minute changes.

#### Acceptance Criteria

1. WHEN a Team has been submitted and the match is not Locked, THE SubmissionFlow SHALL display an "Edit Team" button on the MyTeamCard view.
2. WHEN the Member taps "Edit Team", THE SubmissionFlow SHALL re-enter Step 1 with the previously submitted selections pre-populated.
3. WHEN the Member re-submits an edited Team, THE SubmissionFlow SHALL overwrite the existing Firestore entry with `submitted: true` and an updated `submittedAt` timestamp.
4. WHEN the match transitions to Locked state, THE SubmissionFlow SHALL remove the "Edit Team" button and display a "🔒 Locked" indicator.

---

### Requirement 6: Submission Deadline Enforcement

**User Story:** As a Member, I want the app to prevent me from submitting or editing my team once the match starts, so that the competition is fair.

#### Acceptance Criteria

1. WHILE the match is in Locked state, THE SubmissionFlow SHALL display the Team in read-only mode with no edit controls.
2. WHILE the match is in Locked state, THE SubmissionFlow SHALL display a "🔒 Match Locked — no further changes allowed" banner.
3. IF the Member attempts to submit or edit a Team while the match is Locked, THEN THE SubmissionFlow SHALL reject the action and display an error toast.
4. WHEN the match transitions from open to Locked, THE SubmissionFlow SHALL update the UI in real time without requiring a page refresh, using the existing Firestore `onSnapshot` listener.

---

### Requirement 7: Team Reveal After Toss

**User Story:** As a Member, I want my submitted team to be revealed to all members only after the toss, so that no one can copy my selections before the match.

#### Acceptance Criteria

1. WHILE the match is not in Revealed state, THE MyTeamCard SHALL display each player's name and role but SHALL NOT display other Members' team compositions.
2. WHEN the match transitions to Revealed state, THE SubmissionFlow SHALL display a "🥁 Toss done — teams are now visible!" banner on the "My Team" tab.
3. WHEN the match is in Revealed state and not yet Locked, THE SubmissionFlow SHALL allow the Member to edit and re-submit their Team.
4. WHEN the match is in Revealed state and Locked, THE SubmissionFlow SHALL display the full MyTeamCard in read-only mode.

---

### Requirement 8: No Submission State

**User Story:** As a Member, I want to see a clear message if I missed the submission deadline, so that I understand why I have no entry for the match.

#### Acceptance Criteria

1. WHEN the match is Locked and the Member has no submitted Team, THE SubmissionFlow SHALL display a "Deadline Passed" state with a message indicating the Member did not submit for this match.
2. THE SubmissionFlow SHALL NOT display the TeamBuilder or any edit controls in the "Deadline Passed" state.

---

### Requirement 9: Submission State Persistence and Round-Trip Integrity

**User Story:** As a developer, I want team data to be reliably written and read from Firestore, so that submissions are never silently lost or corrupted.

#### Acceptance Criteria

1. THE SubmissionFlow SHALL write Team data to Firestore in the schema `{ players: string[], captain: string, vc: string, submitted: boolean, submittedAt: number, updatedAt: number }`.
2. FOR ALL valid Team objects written to Firestore, reading the document back SHALL produce a Team object with identical `players`, `captain`, `vc`, and `submitted` values (round-trip property).
3. IF a Team read from Firestore is missing required fields (`players`, `captain`, `vc`), THEN THE SubmissionFlow SHALL treat it as an empty Draft and not crash.
4. THE SubmissionFlow SHALL use the existing `validateTeam` utility as the single source of truth for Team validity before any Submission write.

---

### Requirement 10: Visual Progress and UX Feedback

**User Story:** As a Member, I want clear visual feedback throughout the selection and submission process, so that I always know what action to take next.

#### Acceptance Criteria

1. THE SubmissionFlow SHALL display a credit budget bar showing credits used vs. total budget (100 CR) at all times during Step 1.
2. THE SubmissionFlow SHALL display a role composition summary (WK / BAT / AR / BOWL counts) at all times during Step 1.
3. WHEN a player is added or removed, THE SubmissionFlow SHALL update the credit bar and role summary immediately.
4. THE SubmissionFlow SHALL display a countdown or status label indicating whether the match is Open, Toss Done, or Locked.
5. WHEN the Member is on Step 3, THE SubmissionFlow SHALL highlight the Captain with a "C" badge and the Vice-Captain with a "VC" badge in the summary.
