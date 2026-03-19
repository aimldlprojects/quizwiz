
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

## ✅ Summary for Codex

```text
There are 2 distinct interactions:
1. First click → expand/filter hierarchy (no selection)
2. Second click on same item → toggle selection (learn ON/OFF)

Currently only expansion works.
Selection toggle on second click is not happening.

Fix by separating:
- active state (for navigation)
- selected state (for learning)

Ensure toggle only happens when clicking an already active item.
```
