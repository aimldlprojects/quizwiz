# UI Reference

Use this as a short cross-check after each UI change.

## Start Here

- [docs/index.md](../index.md)

## Core References

- [change-log.md](../templates/change-log.md)
- [glossary.md](../glossary.md)
- [data-ownership.md](../data-ownership.md)
- [refresh-policy.md](../business-logic/refresh-policy.md)
- [sync-settings-requirement.md](../business-logic/sync-settings-requirement.md)
- [topic selection rules.md](../business-logic/topic%20selection%20rules.md)
- [template.md](./TEMPLATE.md)

## Shared Across Screens

- The app starts by redirecting to `Users` when no profile is active, or to `Topics` when a profile is already selected.
- Selecting a profile syncs the previous profile first, then opens the new profile and updates the shared study state from the synced data.
- The top-right sync icon appears in the header.
- The sync icon changes color when attention is needed, including unsynced Learn or Practice changes.
- The sync overlay appears only for manual and lifecycle syncs.
- Study screens update from focus, profile change, or direct user actions, not from sync completion alone.
- Screen refreshes follow [Refresh Policy](../business-logic/refresh-policy.md).

## Pages

- [Users](./users.md)
- [Topics](./topics.md)
- [Learn](./learn.md)
- [Practice](./practice.md)
- [Progress](./progress.md)
- [Badges](./badges.md)
- [Profile](./profile.md)
- [Admin](./admin.md)
- [Streamlit Dashboard](./streamlit/README.md)

## Reference Docs

- [Docs Index](../index.md)
- [Glossary](../glossary.md)
- [Data Ownership](../data-ownership.md)
- [Refresh Policy](../business-logic/refresh-policy.md)
- [Sync Settings Requirement](../business-logic/sync-settings-requirement.md)
- [Topic Selection Rules](../topic%20selection%20rules.md)
- [Change Log](../templates/change-log.md)
- [Maintenance](../maintenance.md)
