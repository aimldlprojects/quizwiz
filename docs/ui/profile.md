# Profile

## Purpose

Change profile settings and sync data.

## Main Flow

- The screen starts with `Active Profile`.
- The hero area shows the active profile name.
- The page groups appearance, sync, voice, practice, learn, and admin settings.
- The sync area shows the current status and next auto sync time.

## Controls

- Change profile - switch to another learner.
- Log out - sync the current profile first, then return to the user picker.
- Theme - switch between light and dark mode.
- Sync mode - choose Global Sync ON or Global Sync OFF behavior.
- Sync interval - set how often scheduler sync runs.
- Sync gap - set the minimum wait between scheduler sync checks.
- Voice - turn question reading on or off.
- Auto next - move to the next question automatically after an answer.
- Answer delays - set how long to wait before moving on after an answer.
- Learn autoplay - let Learn flip cards automatically.
- Learn delays - set how long each Learn side stays visible.
- Open Admin - go to the Admin screen.
- Use Push, Sync, or Pull - send changes, do both steps, or refresh from the global database.

## Notes

- This is the main sync control screen.
- Scheduler sync runs from the timing settings.
- Log out takes the current profile back to the user selection screen after sync.
- While loading, the screen shows `Loading profile...`.
- If no profile is active, the screen says `No profile selected`.

## Sync Notes

- Sync mode, sync interval, and sync gap are shared settings.
- Push sends local changes.
- Sync does Push then Pull.
- Pull updates the local database from the global database.
- Screen updates follow [Refresh Policy](../business-logic/refresh-policy.md), not sync completion alone.
- Log out syncs the active profile first, then clears the current profile on this device.
- The status area also shows server, connection, and last sync time.
- Last sync timestamps are shown in IST (+05:30) with an explicit timezone label.
- If you compare two devices, treat the displayed IST label as part of the timestamp, not as decoration.

## Reference Docs

- See [Docs Index](../index.md) for the full docs map.
- See [UI Reference](./README.md) for the screen-by-screen guide.
- See [Sync Settings Requirement](../business-logic/sync-settings-requirement.md) for sync behavior.
- See [Topic Selection Rules](../topic%20selection%20rules.md) for selection rules.
