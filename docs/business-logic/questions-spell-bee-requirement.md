# Spell Bee Requirement (English Topics)

## 1) Goal

Spell Bee is for practicing spelling from listening context.

Learner should:
- Hear a sentence (TTS) that contains the target word.
- See the same sentence on screen with the target word hidden (blank).
- Type the correct spelling in the answer box.

This flow applies only to Spell Bee topics.

---

## 2) Problem This Solves

In English, multiple words can sound similar but have different spellings.
If we show the target word directly, learner does not practice spelling recall.
So we must:
- Keep pronunciation context in audio.
- Hide the spelling in UI.

---

## 3) Topic Scope

Use this behavior only when topic type is Spell Bee (for example: `english-spell-bee`).

Non-Spell-Bee topics must continue current behavior.

---

## 4) Learner Experience

### 4.1 Question display

UI shows:
- Sentence with blank at target word position.
- Example: `The cat sat on the _____.`

Optional helper text:
- `Listen and type the missing word spelling.`

### 4.2 Audio

TTS reads:
- Full sentence including the hidden target word.
- Example audio: `The cat sat on the mat.`

### 4.3 Input

Learner types spelling in answer box.

### 4.4 Validation

Answer is correct when typed word matches expected target word (case-insensitive trim compare by default).

Optional strict mode (future):
- Enforce exact case/punctuation for advanced levels.

Scoring rule (mandatory):
- If typed spelling matches target word -> mark `correct`.
- If typed spelling does not match target word -> mark `wrong`.
- Score and attempts must be calculated using the same existing app scoring rules for correct/wrong answers.

---

## 5) Data Model (DB Requirements)

Store enough information to support:
- Hidden word rendering
- Full-sentence TTS
- Accurate answer checking

### 5.1 Question content fields (recommended)

For Spell Bee question rows:
- `id`
- `subject_id`
- `topic_id`
- `type` = `english-spell-bee`
- `prompt_text` (full sentence with target word)
- `target_word` (the expected spelling)
- `mask_strategy` (optional; default `single_blank`)
- `mask_index` (optional; which occurrence of target to mask if repeated)
- `tts_text` (optional override; if null, use `prompt_text`)
- `answer` (can mirror `target_word` for compatibility)

### 5.2 Why both `prompt_text` and `target_word`

- `prompt_text` gives sentence context and TTS source.
- `target_word` gives exact answer key.
- UI can derive masked sentence from both.

---

## 6) UI Masking Rules

For Spell Bee only:
- Replace target occurrence with `_____`.
- Hide only one intended occurrence (default first match, or `mask_index` if provided).
- Do not show target spelling anywhere in visible question text.

If target word is not found in sentence (data issue):
- Fallback: show sentence + explicit blank prompt such as `Spell the word you hear.`
- Log content warning for data cleanup.

---

## 7) TTS Rules

For Spell Bee only:
- TTS must read full sentence with target word included.
- If `tts_text` exists, read `tts_text`; otherwise read `prompt_text`.
- Replay button should replay same full sentence.
- TTS should only read when learner is on active screen (existing app rule).

---

## 8) Answer and Scoring Rules

Spell Bee uses normal attempt/correct tracking:
- Correct: increment attempts + correct.
- Wrong: increment attempts only.

Wrong handling can follow current queue priority rules:
- Wrong answers should re-enter wrong queue/stage per existing review strategy.

---

## 9) Learn vs Practice Behavior

Both Learn and Practice can use same Spell Bee rendering model:
- Hear full sentence
- See masked sentence
- Type spelling

Difference remains existing mode behavior (queue, scoring UI, progression), not masking logic.

---

## 10) Sync and Storage Impact

No new sync protocol is required if Spell Bee question content is part of normal question catalog and answer/review events already sync.

Must ensure:
- `type` is synced/available locally so UI knows to apply Spell Bee masking.
- Review results for Spell Bee questions use same review table flow.

---

## 11) Admin/Content Authoring Requirements

For each Spell Bee question, content creator should provide:
- Correct full sentence.
- Correct target word spelling.
- Optional explicit `tts_text` when pronunciation formatting differs.

Quality checks:
- Sentence contains the target word.
- Target word spelling is valid.
- Topic is marked Spell Bee type.

---

## 12) Acceptance Criteria

A Spell Bee question is considered correctly implemented when:
- User hears full sentence including the answer word.
- UI hides answer word with blank.
- User can type spelling and submit.
- Correct/wrong is evaluated correctly.
- Feature applies only to Spell Bee topics.
- Existing non-Spell-Bee topics are unchanged.

---

## 13) Example

Stored data:
- `prompt_text`: `I read a book every night.`
- `target_word`: `book`
- `type`: `english-spell-bee`

Runtime:
- TTS says: `I read a book every night.`
- UI shows: `I read a ____ every night.`
- Expected input: `book`
