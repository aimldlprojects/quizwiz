# Refresh Policy

Use this page as the canonical rule for when the app should refresh screen data.

## Core Rule

- Refresh should happen because the user changed something, changed screens, or changed profiles.
- Refresh should not happen just because sync completed.
- Sync updates the local database first. Screens should read that updated state when they are next focused or when their own event handlers run.

## What Should Trigger Refresh

- app startup, after the active profile is known
- selecting a profile
- switching back to a screen with new focus
- changing a setting on that screen
- answering or restarting practice
- changing the selected topic or subject
- changing the active profile or logging out

## What Should Not Trigger Refresh

- sync completion by itself
- background timer sync by itself
- repeated sync status checks
- sync metadata changes that do not change the visible screen state

## What Each Screen Should Listen To

| Area | Refresh trigger | Notes |
| --- | --- | --- |
| Users | profile selection, profile switch, logout | This is a navigation screen, not a sync-refresh screen. |
| Topics | focus, selected subject or topic change | Topics should read the current local profile state. |
| Learn | focus, selected topic change, local learning progress change | Learn should update when the local learning state changes. |
| Practice | focus, selected topic change, local answer or restart action | Practice score, accuracy, and session progress should update from its own local actions, not from sync completion. |
| Progress | tab focus, then local practice totals after sync | When the Progress tab opens, it should sync the active profile first, then read the latest local stats and show the topic and subject breakdowns. |
| Badges | focus, badge state change | Badges should update from local badge progress events. |
| Profile | user action, manual sync button, sync settings change | Profile can update sync status indicators, but should not force full study screen reloads. |

## Sync Behavior

- Sync should write or pull data.
- Sync should update the local database.
- Screen refresh should come from the screen itself noticing local state changes or gaining focus.
- Manual sync can update status indicators, but it should not force every study screen to rerender.

## Reference Docs

- See [Docs Index](./index.md) for the full docs map.
- See [Sync Settings Requirement](./sync-settings-requirement.md) for sync behavior.
- See [UI Reference](./ui/README.md) for per-screen behavior.
