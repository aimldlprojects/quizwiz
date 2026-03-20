### ✅ Context for Codex (Clean & Structured)

---

## 🧩 Current Issue

* **User selection is not working**
* Selecting/deselecting **subjects or topics has no effect**

---

## 🎯 Expected Behavior

### 1️⃣ Admin Permissions (Visibility Control)

* Admin can:
  * View **all subjects & topics per user**
  * Assign **permissions (visibility)** to users
* Admin permissions define:

```text
What user can SEE (not what they learn)
```

---

### 2️⃣ Topics Tab (User View)

* User should see **only subjects & topics permitted by admin**
* Non-permitted items should **not appear at all**

---

### 3️⃣ User Selection (Learning Control)

* Within visible (permitted) topics:
  * User can:
    * ✅ Select
    * ❌ Deselect
* This defines:

```text
What user wants to LEARN / PRACTICE
```

---

### 4️⃣ Important Rule (Separation of Concerns)

| Layer | Responsibility                            |
| ----- | ----------------------------------------- |
| Admin | Controls**visibility (permission)** |
| User  | Controls**learning selection**      |

* ❗ User selection **must NOT overwrite admin permissions**
* ❗ Admin permissions **must NOT auto-select topics for learning**

---

### 5️⃣ Behavior Rules

* All  **admin-permitted topics** :
  * Always visible in Topics tab
* User selection:
  * Applies **only within permitted topics**
  * Independent of admin permissions

---

## 🚀 Initial State (After Install / Reset)

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

## 🔁 Lifecycle Flow

```text
1. Install / Reset
   ↓
2. Seed default permissions (Math + Multiplication Tables)
   ↓
3. Admin assigns more permissions (optional)
   ↓
4. User sees only permitted topics
   ↓
5. User selects topics for learning
```

---

## ❗ Key Constraints

* Admin permission = **visibility only**
* User selection = **learning only**
* No overlap / overwrite between the two
* UI must always reflect:
  * Admin-filtered list
  * User-selected subset

---

## ✅ Summary

```text
Admin → controls WHAT IS VISIBLE
User  → controls WHAT TO LEARN
```

Both must remain  **independent but consistent** .

---

If you want, I can next:

* Map this to **DB schema (user_subjects vs permissions tables)**
* Or give **exact fix locations in your codebase** (very quick to implement)

---

### 🔧 Refined Requirement for Codex (Multi-Level Selection Logic)

---

## 🧩 Core Concept

There are  **3 levels** :

```text
Subjects → Topics Level 1 → Topics Level 2
```

User interaction has  **2 different behaviors** :

1. **Navigation / Filtering (first click)**
2. **Selection for learning (second click)**

---

## 🎯 Expected Behavior

### 1️⃣ First Click = Filter / Expand (NOT selection)

* When user clicks a  **Subject** :
  * It becomes **active (focused)**
  * Shows its **Level 1 topics**
  * ❌ Does NOT select for learning
* When user clicks a  **Level 1 Topic** :
  * Shows its **Level 2 topics**
  * ❌ Does NOT select for learning

👉 First click is only for:

```text
Navigation / drilling down hierarchy
```

---

### 2️⃣ Second Click = Toggle Selection (Learning)

* Clicking the **same item again** should:

```text
If not selected → select for learning
If selected → deselect
```

* This applies to:
  * Subjects
  * Level 1 topics
  * Level 2 topics

---

## 🔁 Interaction Flow Example

### Subject Level

```text
Click 1 → expand subject → show topics
Click 2 → toggle subject selection (learn ON/OFF)
```

---

### Topic Level 1

```text
Click 1 → expand → show level 2 topics
Click 2 → toggle selection
```

---

### Topic Level 2

```text
Click 1 → (no further expansion)
Click 2 → toggle selection
```

---

## ⚠️ Important Rules

### Separation of Responsibilities

| Action       | Purpose                |
| ------------ | ---------------------- |
| First click  | Navigation / filtering |
| Second click | Selection for learning |

---

### State Separation

* Maintain  **two independent states** :

```text
activeSubjectId / activeTopicId   → controls UI expansion
selectedSubjectIds / selectedTopicIds → controls learning selection
```



 * **Admin and topics tab permissions and selection schema**
   * The documented two-click pattern (first click = navigation/focus, second click = learning selection) must remain enforced: navigation interactions only adjust focus, while toggling learning state occurs only when the already-focused node is clicked again.
   * Admin visibility (the subjects/topics surfaced in the UI) must stay independent from the learning selections; only the `selected*` sets should drive the color/highlighting states, and these selections should be allowed strictly within the currently visible (admin-permitted) subset.
   * Clearing any learning state must never change the underlying permissions—topic visibility is solely determined by admin configuration, and user selections should never modify the admin-permitted list.
 * **Selected Path text requirement**
* Reset the navigation path and derived UI (topic levels, path text) whenever the active subject switches.
  * `topicLevels` should be recalculated for the new subject so chips from the previous subject never remain after the switch.
  * `activePathNames` and the “Path:” summary must always start from the newly focused subject, and they should not display topics that belonged to the prior subject until the user drills into them again.
---

### Constraints

* ❌ First click must NOT change selection state
* ❌ Selection must NOT affect visibility
* ✅ Selection only applies within **admin-permitted items**

---

## 🔍 Current Issue

* First click works (filtering works)
* ❌ Second click does NOT toggle selection
* Likely cause:
  * Same handler is used for both behaviors
  * No distinction between **active vs selected state**

---

## ✅ Required Fix

* Separate logic:

```text
If clicked item is NOT active:
    → set as active (expand)
Else:
    → toggle selection
```

---

## 📍 File to Update

```text
app/(tabs)/topics.tsx
```

Focus:

```text
handleSubjectPress
handleTopicPress
```

---

# Color schema

### 🎨 Subject Chips Styling (Admin Tab)

| State         | Background Color | Border Color | Color Names           | Meaning                     |
| ------------- | ---------------- | ------------ | --------------------- | --------------------------- |
| Default       | `#ffffff`      | `#ffffff`  | White / White         | Neutral, no emphasis        |
| Fully Allowed | `#16a34a`      | `#ffffff`  | Green / White         | Fully permitted subject     |
| Partial       | `#fde68a`      | `#f59e0b`  | Light Yellow / Orange | Partially permitted subject |

---

### 🎨 Topic Chips Styling (Admin Tab)

| State          | Background Color | Border Color | Color Names           | Meaning                      |
| -------------- | ---------------- | ------------ | --------------------- | ---------------------------- |
| Default        | `#ffffff`      | `#ffffff`  | White / White         | Neutral topic                |
| Fully Allowed  | `#16a34a`      | `#ffffff`  | Green / White         | Fully permitted topic        |
| Partial        | `#fde68a`      | `#f59e0b`  | Light Yellow / Orange | Partially permitted topic    |
| Selected Path  | `—`           | `#93c5fd`  | Light Blue            | Active navigation path       |
| Pending Toggle | Light Blue BG    | `#93c5fd`  | Light Blue            | User interaction in progress |

---

### 🎨 Subjects – Topics Tab Color Schema

| State                  | Background Color | Border Color | Text Color  | Color Names                                | Meaning                   |
| ---------------------- | ---------------- | ------------ | ----------- | ------------------------------------------ | ------------------------- |
| Default                | `#ffffff`      | `#dbe4f0`  | `#1e3a5f` | White / Light Blue-Gray / Dark Navy        | Neutral subject           |
| Fully Allowed          | `#16a34a`      | `#16a34a`  | `#ffffff` | Green / Green / White                      | Fully enabled subject     |
| Partial                | `#fde68a`      | `#dbe4f0`  | `#1e3a5f` | Light Yellow / Light Blue-Gray / Dark Navy | Partially enabled subject |
| Selected Path (Active) | `#ffffff`      | `#0ea5e9`  | `#1e3a5f` | White / Sky Blue / Dark Navy               | Active navigation subject |

---

### 🎨 Topics – Topics Tab Color Schema

| State                  | Background Color | Border Color | Text Color  | Color Names                                | Meaning                 |
| ---------------------- | ---------------- | ------------ | ----------- | ------------------------------------------ | ----------------------- |
| Default                | `#ffffff`      | `#dbe4f0`  | `#1e3a5f` | White / Light Blue-Gray / Dark Navy        | Neutral topic           |
| Fully Allowed          | `#16a34a`      | `#16a34a`  | `#ffffff` | Green / Green / White                      | Fully enabled topic     |
| Partial                | `#fde68a`      | `#dbe4f0`  | `#1e3a5f` | Light Yellow / Light Blue-Gray / Dark Navy | Partially enabled topic |
| Selected Path (Active) | `#ffffff`      | `#0ea5e9`  | `#1e3a5f` | White / Sky Blue / Dark Navy               | Active navigation topic |

---

🎯 Key Pattern

| Color       | Name         | Purpose                      |
| ----------- | ------------ | ---------------------------- |
| `#ffffff` | White        | Default / no emphasis        |
| `#16a34a` | Green        | Fully allowed                |
| `#fde68a` | Light Yellow | Partial state                |
| `#f59e0b` | Orange       | Partial border highlight     |
| `#93c5fd` | Light Blue   | Active / pending interaction |

---

### 🧠 Summary

```text
White → default / clean UI
Green → fully allowed
Yellow + Orange → partial state
Blue → active / user interaction
```

---
