# Admin

## Purpose

Manage learner access and visibility.

## Main Flow

- The screen starts with `Admin Access` before unlock.
- After unlock, it shows `Manage Profiles`.
- The page then shows learner cards and the management tools for each learner.

## Controls

- Unlock Admin - open the admin area with the password.
- Add a learner profile - create a new learner on this device.
- Enable or disable a learner - hide or show a learner profile.
- Reset one learner - clear that learner's progress data.
- Delete one learner - remove that learner profile.
- Master reset - clear all learner progress data.
- Allow or hide subjects - control which subjects appear for a learner.
- Allow or hide topics - control which topics appear for a learner.
- Choose the current admin topic path - remember the branch you are managing.

## Notes

- Admin changes save on the device first.
- Permissions, admin path, and disable state are part of sync.
- The screen manages what each learner can see.
- If the password is wrong, the screen shows `Password is 0000.`.
- While loading, the screen shows `Loading admin tools...`.

## Sync Notes

- Admin subject and topic visibility changes sync to the global database.
- The current admin topic path syncs too.
- User disable and enable state syncs too.
- The app saves the device change first, then sync sends it to other devices.

## Reference Docs

- See [Docs Index](../index.md) for the full docs map.
- See [UI Reference](./README.md) for the screen-by-screen guide.
- See [Sync Settings](../sync-settings.md) for sync behavior.
- See [Topic Selection Rules](../topic%20selection%20rules.md) for selection rules.
