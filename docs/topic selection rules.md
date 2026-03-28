### Context for Codex (Clean & Structured)

---

## Final Selection Rule

Use this rule for implementation:

```text
For any subject/topic node:

If the node has children:
Click 1 -> expand and show child nodes
Click 2 -> toggle selection

If the node has no children:
Click 1 -> set active path only
Click 2 -> toggle selection
No child nodes are shown
```

Notes:
- active path controls what is expanded and shown
- selected set controls learning selection
- visibility stays separate from selection
- leaf nodes must not auto-expand into children because they have none

Leaf topic selection:
- Leaf topics can be selected independently.
- Multiple leaf topics may be selected across branches.
- Selecting a leaf topic must not clear other selected leaf topics.
- Only the clicked leaf node toggles its own selected state.

## Current Issue

* **User selection is not working**
* Selecting/deselecting **subjects or topics has no effect**

---

## Expected Behavior

### 1. Admin Permissions (Visibility Control)

* Admin can:
  * View **all subjects & topics per user**
  * Assign **permissions (visibility)** to users
* Admin permissions define:

```text
What user can SEE (not what they learn)
```

---

### 2. Topics Tab (User View)

* User should see **only subjects & topics permitted by admin**
* Non-permitted items should **not appear at all**

---

### 3. User Selection (Learning Control)

* Within visible (permitted) topics:
  * User can:
    *  Select
    *  Deselect
* This defines:

```text
What user wants to LEARN / PRACTICE
```

---

### 4. Important Rule (Separation of Concerns)

| Layer | Responsibility                            |
| ----- | ----------------------------------------- |
| Admin | Controls**visibility (permission)** |
| User  | Controls**learning selection**      |

*  User selection **must NOT overwrite admin permissions**
*  Admin permissions **must NOT auto-select topics for learning**

---

### 5. Behavior Rules

* All  **admin-permitted topics** :
  * Always visible in Topics tab
* User selection:
  * Applies **only within permitted topics**
  * Independent of admin permissions

---

## Initial State (After Install / Reset)

### Default Permissions (Admin Level)

* Only these are permitted:

```text
Subject: Mathematics
Topic: Multiplication Tables
```

* All other subjects/topics:

```text
NOT permitted (hidden)
```

---

### Default User Selection State

* All visible topics are:

```text
Deselected
```

* User must manually choose learning path.

---

## Lifecycle Flow

```text
1. Install / Reset
   
2. Seed default permissions (Math + Multiplication Tables)
   
3. Admin assigns more permissions (optional)
   
4. User sees only permitted topics
   
5. User selects topics for learning
```

---

## Key Constraints

* Admin permission = **visibility only**
* User selection = **learning only**
* No overlap / overwrite between the two
* UI must always reflect:
  * Admin-filtered list
  * User-selected subset

---

## Summary

```text
Admin  controls WHAT IS VISIBLE
User   controls WHAT TO LEARN
```

Both must remain  **independent but consistent** .

---

If you want, I can next:

* Map this to **DB schema (user_subjects vs permissions tables)**
* Or give **exact fix locations in your codebase** (very quick to implement)

---

## Selection Rules

Use this rule for implementation:

```text
For any subject/topic node:

If the node has children:
Click 1 -> expand and show child nodes
Click 2 -> toggle selection

If the node has no children:
Click 1 -> set active path only
Click 2 -> toggle selection
No child nodes are shown
```

Notes:
- active path controls what is expanded and shown
- selected set controls learning selection
- visibility stays separate from selection
- leaf nodes must not auto-expand into children because they have none

### Admin and topics tab permissions and selection schema

- Admin visibility (the subjects/topics surfaced in the UI) must stay independent from the learning selections.
- Only the `selected*` sets should drive the color/highlighting states.
- These selections must be allowed strictly within the currently visible (admin-permitted) subset.
- Clearing any learning state must never change the underlying permissions.
- Topic visibility is solely determined by admin configuration, and user selections should never modify the admin-permitted list.
- When admin changes subject/topic permissions, the Topics tab must refresh its visible list immediately in the same app session.

### Selected Path text requirement

- Reset the navigation path and derived UI (topic levels, path text) whenever the active subject switches.
- `topicLevels` should be recalculated for the new subject so chips from the previous subject never remain after the switch.
- `activePathNames` and the "Path:" summary must always start from the newly focused subject, and they should not display topics that belonged to the prior subject until the user drills into them again.
- The active path must never mix topics from different subjects; when the subject changes, the displayed topic chain must belong only to that subject.
- All displayed topic levels must belong to the currently active subject.


## Color Schema

### Subject Chips Styling (Admin Tab)

| State         | Background Color | Border Color | Color Names           | Meaning                     |
| ------------- | ---------------- | ------------ | --------------------- | --------------------------- |
| Default       | `#ffffff`        | `#ffffff`    | White / White         | Neutral, no emphasis        |
| Fully Allowed | `#16a34a`        | `#ffffff`    | Green / White         | Fully permitted subject     |
| Partial       | `#fde68a`        | `#f59e0b`    | Light Yellow / Orange | Partially permitted subject |

---

### Topic Chips Styling (Admin Tab)

| State         | Background Color | Border Color | Color Names           | Meaning                    |
| ------------- | ---------------- | ------------ | --------------------- | -------------------------- |
| Default       | `#ffffff`        | `#ffffff`    | White / White         | Neutral topic              |
| Fully Allowed | `#16a34a`        | `#ffffff`    | Green / White         | Fully permitted topic      |
| Partial       | `#fde68a`        | `#f59e0b`    | Light Yellow / Orange | Partially permitted topic  |
| Selected Path | none             | `#93c5fd`    | Light Blue            | Active navigation path     |
| Pending Toggle | Light Blue BG    | `#93c5fd`    | Light Blue            | User interaction in flight |

---

### Subjects and Topics Tab Color Schema

---


| State                  | Background Color | Border Color | Text Color  | Color Names                                | Meaning                   |
| ---------------------- | ---------------- | ------------ | ----------- | ------------------------------------------ | ------------------------- |
| Default                | `#ffffff`      | `#dbe4f0`  | `#1e3a5f` | White / Light Blue-Gray / Dark Navy        | Neutral subject           |
| Fully Allowed          | `#16a34a`      | `#16a34a`  | `#ffffff` | Green / Green / White                      | Fully enabled subject     |
| Partial                | `#fde68a`      | `#dbe4f0`  | `#1e3a5f` | Light Yellow / Light Blue-Gray / Dark Navy | Partially enabled subject |
| Selected Path (Active) | `#ffffff`      | `#0ea5e9`  | `#1e3a5f` | White / Sky Blue / Dark Navy               | Active navigation subject |

---

### Topics Tab Color Schema

| State                  | Background Color | Border Color | Text Color  | Color Names                                | Meaning                 |
| ---------------------- | ---------------- | ------------ | ----------- | ------------------------------------------ | ----------------------- |
| Default                | `#ffffff`      | `#dbe4f0`  | `#1e3a5f` | White / Light Blue-Gray / Dark Navy        | Neutral topic           |
| Fully Allowed          | `#16a34a`      | `#16a34a`  | `#ffffff` | Green / Green / White                      | Fully enabled topic     |
| Partial                | `#fde68a`      | `#dbe4f0`  | `#1e3a5f` | Light Yellow / Light Blue-Gray / Dark Navy | Partially enabled topic |
| Selected Path (Active) | `#ffffff`      | `#0ea5e9`  | `#1e3a5f` | White / Sky Blue / Dark Navy               | Active navigation topic |

---

## Key Pattern

| Color       | Name         | Purpose                      |
| ----------- | ------------ | ---------------------------- |
| `#ffffff` | White        | Default / no emphasis        |
| `#16a34a` | Green        | Fully allowed                |
| `#fde68a` | Light Yellow | Partial state                |
| `#f59e0b` | Orange       | Partial border highlight     |
| `#93c5fd` | Light Blue   | Active / pending interaction |

---

### Summary

```text
White -> default / clean UI
Green -> fully allowed
Yellow + Orange -> partial state
Blue -> active / user interaction
```

---
## Reference Docs

- [Docs Index](./index.md)
- [UI Reference](./ui/README.md)
- [Sync Settings](./sync-settings.md)
- [Glossary](./glossary.md)
- [Data Ownership](./data-ownership.md)
- [Change Log](./change-log.md)
- [Maintenance](./maintenance.md)

