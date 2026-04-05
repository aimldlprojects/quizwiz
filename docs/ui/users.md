# Users

## Purpose

Choose the active profile.

## Startup Flow

- If no profile is active, the app opens `Users` first.
- If a profile is already active, the app skips `Users` and goes straight to `Topics`.
- There is no separate landing screen.
- Selecting a profile attempts to sync that profile right away, then updates the shared study state from the synced data.

## Main Flow

- The screen starts with `Pick your player`.
- The main prompt asks `Who is learning today?`.
- The profile cards show who can be selected.
- Tapping a profile makes it the active one and continues into the app.

## Controls

- Pick a profile - choose who is learning now.
- Open Admin - go to the profile and permission manager.

## Notes

- Log out returns here after syncing the current profile.
- If there are no profiles yet, the screen shows `No profiles yet`.
- While loading, the screen shows `Loading profiles...`.

## Sync Notes

- Switching profiles syncs the previous profile first.
- The new profile opens after that attempt finishes or times out.
- The selected profile attempts to sync immediately after it becomes active.
- The shared study state updates when the app reuses the synced profile data.
- Log out syncs the current profile first, then returns to this screen.

## Reference Docs

- See [Docs Index](../index.md) for the full docs map.
- See [UI Reference](./README.md) for the screen-by-screen guide.
- See [Sync Settings Requirement](../business-logic/sync-settings-requirement.md) for sync behavior.
- See [Topic Selection Rules](../topic%20selection%20rules.md) for selection rules.
