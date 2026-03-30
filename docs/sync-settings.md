# Sync Setup Guide

## What Sync Does

QuizWiz keeps your data in two places:

- your device database
- the global database

Your changes are saved on the device first. Sync copies those changes between the device and the global database.

Refresh timing is documented in [Refresh Policy](./refresh-policy.md).

The app shows sync status in a few places:

- a sync icon in the top-right of every screen
- a sync panel in the Profile screen

When you select a profile, the app attempts to sync that profile immediately and then updates the shared study state from the synced data.

## What Gets Synced

These user changes are part of sync:

- practice answers and review history
- progress, accuracy, and the current practice session card count
- badges
- topic selections
- Learn screen progress, including the last card position for a topic
- Practice session resume state, including the current card, remaining queue, and session stats
- profile preferences such as theme, voice, and practice behavior
- sync settings such as sync mode, sync interval, and sync gap

These are part of sync too:

- admin visibility rules for which subjects and topics are shown
- the current admin topic path for a subject
- user disable / enable state

## Across Devices

When you use the same profile on more than one device, sync keeps the newer change.

| Situation | What happens |
| --- | --- |
| You change something on Device A and tap sync | The change is saved on Device A first, then sent to the global database. |
| You open Device B and tap sync later | Device B gets the newer data from the global database. |
| The same item changes on two devices | The newer timestamp wins. |

This keeps progress, badges, topic selections, Learn progress, preferences, and admin visibility rules in step across devices.

## Device Vs Global

This table follows the screen order in the app and shows what each screen can do, what saves locally first, and what sync sends to the global database.

| Screen | Actions possible in the screen | Saved on this device right away? | Sent to the global database by sync? | Notes |
| --- | --- | --- | --- | --- |
| Topics | Select subjects and topics | Yes | Yes | Topic selections save on the device first, then sync later. |
| Learn | Study flash cards and learning content | Yes | Yes | Learn keeps the last card position for each topic. |
| Practice | Answer questions and build progress | Yes | Yes | Practice updates review history, progress, accuracy, and saved session state, including the current card count. |
| Progress | Review accuracy and progress | Yes, when the tab opens | Yes | The Progress tab syncs the active profile first, then shows the latest local progress data. |
| Badges | See earned badges | Yes | Yes | Badge progress saves locally and syncs with the user data. |
| Profile | Change sync mode, preferences, and sync manually | Yes | Yes | This screen has the main sync controls and shared sync settings. |
| Change User | Switch to another learner profile | Yes, for the current user before switching | Yes, if the current user sync finishes in time | The app saves the current user first, then changes profiles, then attempts to sync the new profile right away. |
| Log out | Leave the current learner profile | Yes, for the current user before logout | Yes, if the current user sync finishes in time | The app syncs first, then returns to the user picker. |
| App opens or comes back to the front | Sync all loaded users | No new change by itself | Yes, if sync starts and finishes in time | The app makes a best-effort sync pass while loading or resuming. |
| App goes to the background | Sync all loaded users | No new change by itself | Yes, if sync starts and finishes in time | The app tries one last sync pass before it backgrounds. |
| Top-right sync icon | Sync the current user from any screen | No new change by itself | Yes | Syncs the active user and shared profile/admin settings, then updates the shared preferences used by the study screens. |
| `Push` in Profile | Upload the current user's local changes only | No new change by itself | Yes, but only from device to global | Uploads local changes for the active user and shared settings. |
| `Pull` in Profile | Refresh the current user from the global database only | No new change by itself | Yes, but only from global to device | Refreshes the active user and shared settings. |
| Admin subject or topic permission change | Show or hide subjects and topics for the current device | Yes | Yes | Includes allowed subjects/topics, current admin topic path, and user disable / enable. |

### Top-right sync icon

The sync icon is always available in the screen header. Tap it to sync the current user. The table above explains what it affects.

### Profile screen

The Profile screen gives you the full sync controls. Use `Push`, `Sync`, or `Pull` to upload, do both steps, or refresh only.

The Profile screen also shows:

- sync status
- server address
- connection state
- last sync time
- a small countdown for the next automatic sync

## Profile And Admin Settings

This table lists the settings that are saved right away on the device and also synced to the global database when sync runs.

| Screen | Setting | Saved on this device right away? | Sent to the global database by sync? | Notes |
| --- | --- | --- | --- | --- |
| Profile | Sync mode: Local / Hybrid | Yes | Yes | Controls whether the scheduler sync runs or stays off. |
| Profile | Sync interval | Yes | Yes | Controls how often scheduler sync checks for changes. |
| Profile | Sync gap | Yes | Yes | Controls the minimum wait between scheduler sync checks. |
| Profile | Dark theme | Yes | Yes | Theme choice is stored per profile. |
| Profile | Read questions aloud | Yes | Yes | Voice setting for the current profile. |
| Profile | Auto next | Yes | Yes | Moves to the next question automatically after an answer. |
| Profile | Correct answer delay | Yes | Yes | Delay before moving on after a correct answer. |
| Profile | Wrong answer delay | Yes | Yes | Delay before moving on after a wrong answer. |
| Profile | Auto play learn cards | Yes | Yes | Learn screen autoplay for the current profile. |
| Profile | Front side delay | Yes | Yes | Wait time before showing the answer side in Learn. |
| Profile | Back side delay | Yes | Yes | Wait time before moving to the next Learn card. |
| Admin | Allowed subjects | Yes | Yes | Controls which subjects show for a learner. |
| Admin | Allowed topics | Yes | Yes | Controls which topics show for a learner. |
| Admin | Current admin topic path | Yes | Yes | Remembers the selected admin path for that subject. |
| Admin | Disable / Enable user | Yes | Yes | Keeps the learner hidden or available across devices. |

### Syncing Overlay

The full-screen `Syncing...` overlay appears when the app is doing a manual sync, a user change sync, or an app open/background sync pass.

- manual syncs show `Syncing current profile...`
- app open/background sync passes show `Syncing all profiles...`

The scheduled timer sync runs quietly and does not show the overlay.

## Color Meaning

The sync icon and badges use color to show what is happening:

- green means everything is up to date
- orange means attention is needed, usually because another device has newer data or this device has unsynced changes from Learn or Practice
- red means the last sync failed, or this device still has local changes waiting to be sent

If the icon or badge changes color, tap sync to resolve it.

## Auto Sync

Auto sync is controlled from the Profile screen.

- `Hybrid` mode turns auto sync on
- `Local` mode turns auto sync off

When auto sync is on:

- the app checks sync on a timer while the app is open and syncs all loaded users
- the timer sync runs quietly without the full-screen `Syncing...` overlay
- the next sync time is shown next to the sync icon
- the Profile screen also shows the sync interval and sync gap settings

If auto sync is off, the header still shows the sync icon and you can still sync manually.

## What The Timer Means

The small timer next to the sync icon tells you when the next automatic sync should happen.

Examples:

- `30s`
- `1m 20s`
- `Now`
- `Off`

If the timer says `Off`, auto sync is not running for that profile.

## How Sync Works

`Sync` sends local changes first, then refreshes the device from the global database and updates the shared state used by the study screens.

`Push` sends local changes only.

`Pull` refreshes the device from the global database only.

## When To Use Sync

Use sync when:

- you changed topics, practice data, badges, or profile preferences
- you want another device to see your latest changes
- the sync icon is orange or red
- you are switching between devices and want the newest data

If you are only using one device and auto sync is on, you may not need to tap sync often.

## Advanced Setup

If you are maintaining the app, these settings control sync behavior:

| Setting | What it controls | Default |
| --- | --- | --- |
| `syncPullTimeoutMs` | How long the app waits for the server response when sending or receiving data | `15000` |
| `syncPushChunkSize` | How many review rows are sent in one push batch | `128` |
| `syncIntervalMs` | How often auto sync checks for changes in Hybrid mode | `60000` |
| `syncMinGapMs` | A sync setting shown in the Profile screen as the sync gap | `30000` |
| `syncServerUrl` | The global database server address | `http://localhost:8000` |
| `syncDebugLogs` | Turns extra sync logs on or off | `false` |

These values can be set in `app.json` or `app.config.js` under `extra`.

If sync feels slow, the two most common adjustments are:

- increase `syncPullTimeoutMs`
- reduce `syncPushChunkSize`

## Resetting Data

If you need a clean setup for testing:

```bash
python server/scripts/01_reset_databases.py --master
python server/scripts/01_reset_databases.py --local
python server/scripts/01_reset_databases.py --both
```

Use them like this:

- `--master` resets the global database
- `--local` resets the device database
- `--both` resets both

This is mainly for development or repair work. It is not part of normal app use.

## Reference Docs

- See [Docs Index](./index.md) for the full docs map.
- See [UI Reference](./ui/README.md) for the screen-by-screen guide.
- See [Glossary](./glossary.md) for word meanings.
- See [Data Ownership](./data-ownership.md) for local vs global data.
- See [Refresh Policy](./refresh-policy.md) for when screens should update.
- See [Topic Selection Rules](./topic%20selection%20rules.md) for selection rules.
- See [Change Log](./change-log.md) for recent changes.
- See [Maintenance](./maintenance.md) for docs rules.
