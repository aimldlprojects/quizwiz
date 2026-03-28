# Sync Setup Guide

## What Sync Does

QuizWiz keeps your data in two places:

- your device database
- the global database

Your changes are saved on the device first. Sync is what copies those changes between the device and the global database.

The app shows sync status in a few places:

- a sync icon in the top-right of every screen
- a sync panel in the Profile screen
- a sync button on the Practice screen after answering

## What Gets Synced

These user changes are part of sync:

- practice answers and review history
- progress and accuracy
- badges
- topic selections
- Learn screen progress, including the last card position for a topic
- profile preferences such as theme, voice, and practice behavior

These are part of sync too:

- admin visibility rules for which subjects and topics are shown

## Across Devices

When you use the same profile on more than one device, sync keeps the newer change.

The app does this with a saved time stamp on each synced item.

| Situation | What happens |
| --- | --- |
| You change something on Device A and tap sync | The change is saved on Device A first, then sent to the global database. |
| You open Device B and tap sync later | Device B pulls the newer data from the global database. |
| The same item changed on two devices | The newer time stamp wins, so the latest change becomes the final one. |

This is how the app keeps progress, badges, topic selections, Learn progress, preferences, and admin visibility rules in step across devices.

## Device Vs Global

The table below follows the screen order in the app and shows what each screen can do, what saves locally first, and what sync sends to the global database.

| Screen | Actions possible in the screen | Saved on this device right away? | Sent to the global database by sync? | Notes |
| --- | --- | --- | --- | --- |
| Topics | Choose subjects and topics | Yes | Yes | Topic selections are stored on the device first and can be synced later. |
| Learn | Study flash cards and learning content | Yes | Yes | Learn keeps your last card position for each topic so you can come back later and continue where you left off. |
| Practice | Answer questions and build progress | Yes | Yes | Practice answers update review history, progress, and accuracy. |
| Progress | Review accuracy and progress | No new change by itself | Reads synced practice data | This screen shows data that came from sync. |
| Badges | See earned badges | Yes | Yes | Badge progress is saved on the device and synced with the user data. |
| Profile | Change sync mode, preferences, and sync manually | Yes | Yes | This screen also contains the main sync controls. |
| Top-right sync icon | Sync the current user from any screen | No new change by itself | Yes | Sends current user changes between the device and the global database, including admin visibility rules. |
| `Push` in Profile | Upload local changes only | No new change by itself | Yes, but only from device to global | Use this when you only want to upload local changes, including admin visibility rules. |
| `Pull` in Profile | Refresh the device only | No new change by itself | Yes, but only from global to device | Use this when you only want to refresh the device, including admin visibility rules. |
| Admin subject or topic permission change | Show or hide subjects and topics for the current device | Yes | Yes | These changes are saved locally first and travel with the same sync flow as the rest of the user data. |

## What Each Sync Control Does

| Sync control | Where it appears | What it does | What data it sends or refreshes |
| --- | --- | --- | --- |
| Top-right sync icon | Every screen header | Syncs the current user | Sends and refreshes the current user's practice data, progress, Learn card position, badges, topic selections, profile preferences, and admin visibility rules |
| `Push` | Profile screen | Upload only | Sends local user changes, including Learn progress and admin visibility rules, to the global database without refreshing from the global database first |
| `Sync` | Profile screen | Full sync | Sends local user changes first, then refreshes the device from the global database, including admin visibility rules |
| `Pull` | Profile screen | Download only | Refreshes the device from the global database without uploading local changes first, including admin visibility rules |
| Sync button after Practice | Practice screen | Save practice progress right away | Sends the latest practice data and refreshes the user sync status |

### Top-right sync icon

The sync icon is always available in the screen header.

- tap it to sync the current user
- it uses the current sync state to show whether anything needs attention

### Profile screen

The Profile screen gives you the full sync controls:

- `Push` sends only the changes saved on this device to the global database
- `Sync` sends changes first and then refreshes the device from the global database
- `Pull` refreshes the device from the global database without sending local changes first

The Profile screen also shows:

- sync status
- server address
- connection state
- last sync time
- a small countdown for the next automatic sync

### Practice screen

After answering a question, the Practice screen shows a sync button near the answer controls.

Use it when you want to save practice progress right away.

## Color Meaning

The sync icon and badges use color to show what is happening:

- green means everything is up to date
- orange means attention is needed, usually because another device has newer data or this device has unsynced changes
- red means the last sync failed, or this device still has local changes waiting to be sent

If the icon or badge changes color, tap sync to resolve it.

## Auto Sync

Auto sync is controlled from the Profile screen.

- `Hybrid` mode turns auto sync on
- `Local` mode turns auto sync off

When auto sync is on:

- the app checks sync on a timer while the app is open
- the next sync time is shown next to the sync icon
- the Profile screen also lets you tune the sync interval and minimum gap

If auto sync is off, the header still shows the sync icon and you can still sync manually.

## What The Timer Means

The small timer next to the sync icon tells you when the next automatic sync should happen.

Examples:

- `30s`
- `1m 20s`
- `Now`
- `Off`

If the timer says `Off`, auto sync is not running for that profile.

## When Sync Runs

The app can try to sync at a few important moments:

| Trigger | What happens | Timeout rule |
| --- | --- | --- |
| User taps `Change User` | The app tries to sync the current user first, then switches to the new user. | If the sync does not finish in time, the app skips that sync step and continues switching users. |
| App opens or comes back to the front | The app tries a quick sync for the current user. | If the sync times out, the app skips that step and continues loading normally. |
| App goes to the background | The app tries one last sync for the current user. | If the sync times out, the app skips that step and lets the app close normally. |
| Manual sync buttons | The app runs the chosen sync action for the current user. | Each sync action waits only up to the configured timeout, then skips the step if the server does not answer in time. |

This means sync is helpful, but it should not block the app for too long.

## How Sync Works

When you tap `Sync`:

1. the app sends your local changes to the global database
2. the app refreshes the device from the global database
3. the sync status updates to show success or failure

When you tap `Push`:

1. the app sends your local changes to the global database
2. it does not do the refresh step

When you tap `Pull`:

1. the app refreshes the device from the global database
2. it does not send local changes first

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
| `syncPullTimeoutMs` | How long the app waits for the server response when pulling data | `15000` |
| `syncPushChunkSize` | How many review rows are sent in one push batch | `128` |
| `syncIntervalMs` | How often auto sync checks for changes in Hybrid mode | `60000` |
| `syncMinGapMs` | A sync tuning value shown in the Profile screen | `30000` |
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
