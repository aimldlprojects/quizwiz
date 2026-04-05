# Sync Settings Requirement

## Status

Draft for alignment before implementation.

## Goal

Define two sync modes so the app can support both:

- full cross-device synchronization
- device-specific study flow with shared progress storage

The sync mode must be controlled by a toggle in the Profile screen.

## Key Requirement

The app must support two sync settings:

1. Global Sync ON
2. Global Sync OFF

The toggle default must be `ON`.

All profile settings must still be stored in the global database in both modes.

## Terms

| Term                  | Meaning                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Global DB             | The shared database used across devices for the same profile                                                            |
| Device DB             | The local database on one device                                                                                        |
| Global Sync ON        | Full sync mode where device changes are reflected on all devices                                                        |
| Global Sync OFF       | Partial sync mode where device-scoped study state and shared progress data are both stored in the global DB         |
| Device-specific state | State that can differ from one device to another for the same profile                                                   |
| Device display name   | User-friendly name shown in the UI and editable by the user                                                             |
| Device backend key    | Stable backend identifier used to store and restore device-scoped records                                              |

## Behavior Summary

### 1. Global Sync ON

When the toggle is enabled:

- any sync action on one device must be reflected on all other devices
- topics should stay the same across devices
- progress should stay the same across devices
- visual settings should stay the same across devices
- Learn and Practice state should behave as shared cross-device state

This is the full sync experience.

### 2. Global Sync OFF

When the toggle is disabled:

- Learn and Practice study state should be stored as device-scoped global data
- Topics selection should be stored as device-scoped global data
- progress history should still be stored in the global database
- the user can practice different topics on different devices
- the device-specific plan and progress should be stored in the global database under a registered device entry so the same device can restore its own state after a reinstall
- the Profile page should show the linked device, its current name, and a box to rename it
- the device name shown there should be the user-friendly display name
- the backend should store and match device-scoped records with a separate stable device backend key
- the user should be able to rename the device display name later without losing restore ability, as long as the backend key stays the same
- if the device is not registered yet, the Profile page should show a suggestion to add the device through the Admin page
- device registration must happen only in the Admin page
- a single profile can have multiple registered devices
- device display names must be unique within a profile
- the Admin page should also allow deleting a registered device
- before a device is deleted, Learn and Practice data must be synced first
- deleting a device must not affect the user's stored progress history
- after deletion, the device name must no longer appear in the Stats page
- when a device is deleted, only the current device state at delete time is discarded
- if the same device is added again later, it must start from a fresh state

This is the mixed mode where progress can be shared for reporting, but the active study state is device-scoped in the global database by registered device name.

## Storage Rules

- The sync mode toggle itself must be saved in the global database.
- All profile settings must be saved in the global database.
- Device-specific study state must be stored in the global database as device-scoped records when Global Sync is OFF.
- Shared progress records must still be written to the global database in both modes.
- The stable backend key must act as the unique key for the device-scoped records so the same device can recover its state after uninstall and reinstall.
- The user-facing device display name must be unique within a profile and can be renamed without changing the stable backend key.

## Device Recovery

If the app is reinstalled or the local device binding is lost, the app must not guess a new device identity automatically.

Recovery should work like this:

- the device list is loaded from the global database
- the user selects the registered device again from the Profile dropdown by its display name
- if the device is missing from the dropdown, Admin can register it again
- after the same registered device is rebound, its device-scoped study state should be restored from the global database
- if the device was deleted earlier, re-adding it must start from a fresh state

Recovery rule:

- display names are for user selection and can be renamed
- the stable backend key is what preserves the device binding and restore path
- recovery must always resolve through the backend key, not the friendly label alone

## Timestamp Granularity

Timestamp comparison should happen at the smallest persisted setting or record level, not at the whole page level.

That means:

- each independent toggle or preference gets its own timestamp
- each device-scoped study record gets its own timestamp
- each progress record keeps its own timestamp
- derived views do not need their own sync timestamp if they are rebuilt from stored data

Use this table to validate whether a separate timestamp should be tracked for each page feature.

| Page | Feature | Separate timestamp considered? | Why |
| --- | --- | --- | --- |
| Profile | Sync toggle | Yes | Sync mode must merge independently from other profile settings |
| Profile | Theme / visual settings | Yes | Theme changes should not overwrite unrelated settings |
| Profile | Voice / audio settings | Yes | Voice changes should sync independently |
| Profile | Auto-next / delays / autoplay | Yes | Each preference can change at a different time |
| Profile | Linked device card | Yes | The active device choice must be tracked separately |
| Profile | Device display name edit | Yes | Friendly label changes must not affect the backend device key |
| Profile | Missing device hint | No | This is a UI hint, not stored sync state |
| Profile | Manual sync action | No | This is an action, not persisted state |
| Topics | Subject selection | Yes | Subject selection can change independently of Learn and Practice |
| Topics | Topic selection | Yes | Topic selection needs its own last-write tracking |
| Topics | Selected topic UI state | Yes | The active selection state is persisted per device-scoped record |
| Learn | Current topic progress | Yes | Learn progress must restore independently |
| Learn | Card position / resume state | Yes | Resume position must not be lost when another Learn setting changes |
| Learn | Completion state | Yes | Completion updates should be tracked separately |
| Practice | Current topic progress | Yes | Practice flow must restore independently |
| Practice | Session resume state | Yes | Resume state changes separately from review history |
| Practice | Score / accuracy / review history | Yes | Each progress event needs its own timestamp |
| Practice | Current card / queue state | Yes | Queue state can change independently from score history |
| Progress | Overall progress view | No | This is derived from stored progress records |
| Progress | Topic progress list | No | This is derived from stored progress records |
| Progress | Subject progress list | No | This is derived from stored progress records |
| Badges | Badge progress | Yes | Badge unlock state is persisted and should merge independently |
| Admin | Allowed subjects | Yes | Visibility rules need independent merge tracking |
| Admin | Allowed topics | Yes | Visibility rules need independent merge tracking |
| Admin | Current admin path | Yes | The selected admin path should restore independently |
| Admin | Register device name | Yes | Device registration is persisted and must be tracked separately |
| Admin | Delete registered device | Yes | Delete events must win independently from other admin updates |
| Stats | Device name display | No | This is a display result from stored device data |

## Sync Trigger

Sync should be easy to reach from the app controls already shown on screen.

If the app keeps more than one sync entry point, they should all do the same sync work and show the same result.

## Manage Devices UX

The Admin page must make device management easy to understand at a glance.

### Color Meaning

Use readable color names in the UI logic and design language:

- `Selected` state: blue highlight
- `Not selected` state: white or neutral background
- `Selected border`: blue border
- `Not selected border`: light blue or neutral border
- `Selected text`: dark navy or primary text
- `Delete warning`: red only in the confirmation dialog, not on the chip itself

### Click Behavior

- User chips choose which profile is being managed.
- Device chips choose which devices are shown for that profile.
- Multiple devices can be shown for the same profile.
- The selected user must be obvious immediately.
- The shown devices must be obvious immediately.
- Tap changes device visibility for that profile.
- Delete should be a separate action from visibility selection.
- If delete is shown as a button instead of long press, it must be visually separate from selection.

### Default Seeded Devices

After `python server/scripts/01_reset_databases.py --both`, the default device catalog should be available for each demo profile:

- `bhavi_tab`
- `bhavi_phone`
- `mabhu_tab`
- `mabhu_phone`
- `eshu_s22`
- `eshu_tablet`

Default active device per profile:

- `Bhavi` -> `bhavi_tab`
- `Madhu` -> `mabhu_tab`
- `Quiz Kid` -> `eshu_s22`

### Visibility Rules

- The selected user must appear first or be clearly marked.
- All available devices for that user must be visible in the device list.
- The selected device must have a strong active state.
- Add-device controls must be separate from the device list.
- Delete-device controls must not look like the selection control.

## Startup Page UX

The startup page must use the same user and device selection model as the Admin page.

### What the user should see

- The startup page should show the selected user profile.
- The startup page should show all available devices for that selected profile.
- The selected device should be highlighted clearly.
- The startup page should make it obvious that the selected user and selected device are the pair that will be used for sync and study state.

### Click Behavior

- Tapping a user changes the active profile.
- Tapping a device changes the active device for that profile.
- Only one device can be selected at a time for a given user profile.
- The startup page should allow only one active device per user at a time, even if Admin has shown multiple devices for that user.
- The user should not need to type a device name on startup.
- If no device exists for the selected user, the startup page should suggest going to Admin to add one.
- The startup page should use the same visual state language as the Admin page so the user can understand selection immediately.

## Page And Feature Matrix

Use this matrix to validate what should happen in each mode.

Legend:

- `Global` = synced across devices through the global database
- `Device` = stays on the local device only
- `Both` = saved locally and also sent to the global database
- `Shared progress only` = progress data is synced, but the active UI state remains device-specific
- `Device-scoped global` = stored in the global database, but separated by registered device name so each device can restore its own state
- `Editable display name` = a user-facing label that can change without changing the backend identity

| Page                 | Feature                           | Global Sync ON | Global Sync OFF                        | Storage Rule              | Validation Note                                                |
| -------------------- | --------------------------------- | -------------- | -------------------------------------- | ------------------------- | -------------------------------------------------------------- |
| Profile              | Sync toggle                       | Global         | Global                                 | Global DB                 | Default should be ON                                           |
| Profile              | Theme / visual settings           | Global         | Global                                 | Global DB                 | Same look and feel across devices when ON                      |
| Profile              | Voice / audio settings            | Global         | Global                                 | Global DB                 | Settings must still be shared even when OFF                    |
| Profile              | Auto-next / delays / autoplay     | Global         | Global                                 | Global DB                 | Study behavior should match the selected mode                  |
| Profile              | Linked device card                | Global         | Global                                 | Global DB                 | Shows the current device name and rename box                   |
| Profile              | Device display name edit          | Global         | Global                                 | Global DB                 | Changing the label should not change the backend device key    |
| Profile              | Missing device hint               | Global         | Global                                 | Global DB                 | Suggests adding the device through Admin when no device exists |
| Profile              | Manual sync action                | Global         | Global                                 | Uses both DBs as needed   | Should respect current sync mode                               |
| Topics               | Subject selection                 | Global         | Device-scoped global                   | Device-scoped global      | ON keeps topic selection aligned across devices                |
| Topics               | Topic selection                   | Global         | Device-scoped global                   | Device-scoped global      | OFF allows different topics per device                         |
| Topics               | Selected topic UI state           | Global         | Device-scoped global                   | Device-scoped global      | UI must match the chosen sync mode                             |
| Learn                | Current topic progress            | Global         | Device-scoped global                   | Device-scoped global      | OFF keeps Learn position recoverable on the same device       |
| Learn                | Card position / resume state      | Global         | Device-scoped global                   | Device-scoped global      | Same device can resume after reinstall if device name matches |
| Learn                | Completion state                  | Global         | Device-scoped global                   | Device-scoped global      | Completion should reflect the selected sync mode               |
| Practice             | Current topic progress            | Global         | Device-scoped global                   | Device-scoped global      | OFF keeps Practice flow recoverable on the same device        |
| Practice             | Session resume state              | Global         | Device-scoped global                   | Device-scoped global      | Different devices may continue different sessions when OFF     |
| Practice             | Score / accuracy / review history | Global         | Shared progress only                   | Global DB                | Progress records must still reach the global DB in both modes  |
| Practice             | Current card / queue state        | Global         | Device-scoped global                   | Device-scoped global      | UI queue should remain restorable per device when OFF          |
| Progress             | Overall progress view             | Global         | Global                                 | Global DB                 | Progress page should reflect stored progress data              |
| Progress             | Topic progress list               | Global         | Global                                 | Global DB                 | Must show consistent totals when ON                            |
| Progress             | Subject progress list             | Global         | Global                                 | Global DB                 | Must show consistent totals when ON                            |
| Badges               | Badge progress                    | Global         | Global                                 | Global DB                 | Badge state should remain shared                               |
| Admin                | Allowed subjects                  | Global         | Global                                 | Global DB                 | Visibility rules must stay consistent                          |
| Admin                | Allowed topics                    | Global         | Global                                 | Global DB                 | Visibility rules must stay consistent                          |
| Admin                | Current admin path                | Global         | Global                                 | Global DB                 | Should remain shared for the profile                            |
| Admin                | Register device name              | Global         | Global                                 | Global DB                 | Used to add a device entry before the dropdown can restore it  |
| Admin                | Delete registered device          | Global         | Global                                 | Global DB                 | Must sync first, then remove the device label and current state|
| User switch / logout | Active profile sync before switch | Global         | Global                                 | Global DB                 | Sync behavior should match current mode before navigation      |
| Stats                | Device name display               | Global         | Global                                 | Global DB                 | Deleted device names should not appear after removal           |

## Expected Outcomes

### Global Sync ON

- the same topics appear on every device
- the same progress appears on every device
- the same profile visual settings appear on every device
- Learn and Practice continue from the shared profile state

### Global Sync OFF

- the same profile settings are still stored globally
- Learn and Practice progress data still reaches the global DB
- topics and current study UI can differ by device
- one device can work on one topic while another device works on a different topic

## Implementation Notes For Later

These notes are intentionally not implementation details yet, but they define the intended direction:

- the toggle must be available in Profile
- the toggle must default to enabled
- sync logic must branch based on the toggle value
- any page-title sync action must use the same decision logic as the rest of the app
- the global DB must always remain the source of stored profile settings
- device-scoped study records must be keyed by the stable backend key so the same device can recover its own local study state after reinstall
- the Profile screen should present a registered-device dropdown for restore and switching
- the Profile screen should allow editing the user-friendly device display name
- the Profile screen should suggest Admin device registration when no device is registered yet
- device registration must be available only from the Admin screen
- the Admin screen should support registering new devices when the dropdown does not yet contain them
- the Admin screen should support deleting registered devices after syncing Learn and Practice state
- deleting a device must not remove or alter the user's progress history
- deleted device names must not appear in the Stats page
- if the same device is registered again later, its study state must restart fresh

## Open Questions

These are the only items still worth confirming before implementation:

1. Should the page-title click replace the current sync icon action, or should both remain available?
2. In Global Sync OFF mode, should badge and progress totals be fully global, or should only raw progress records be global?

## Related Docs

- [Docs Index](../index.md)
- [Profile](../ui/profile.md)
- [Topics](../ui/topics.md)
- [Learn](../ui/learn.md)
- [Practice](../ui/practice.md)
- [Progress](../ui/progress.md)
