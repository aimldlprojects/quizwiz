# Question Flow

## Purpose

Describe how non-table questions are loaded, answered, and reviewed.

## Flow

- Practice first uses due reviews that belong to the selected topic tree.
- If there are no due reviews, it uses new questions from the selected topic tree.
- Stored questions from the selected topic and its children stay inside that topic path.
- Unrelated mixed questions must not appear.
- Practice resumes the saved question session for the same user and topic when it exists.
- Practice session state is stored in synced settings, so the same user can resume on another device after sync.
- `Practice more` starts a fresh session for the same selected topic without deleting history.
- Random order reshuffles the current deck in place when it is turned on.
- In Learn, random order follows the shuffled deck order from the current position.
- Learn shows `Topic complete` when the topic deck is fully used.
- Learn `Learn more` restarts the same topic from the first card without deleting history.
- `Learn more` and `Practice more` share the same restart button style.
- The `Card X of Y` label uses the full topic deck count, not just the current queue window.
- Random order shuffles the loaded deck or reshuffles the current session questions in place for the selected topic.

## Answer Rules

- Correct answers save a review record.
- Wrong answers are treated as `again`.
- Wrong answers go back into the review schedule with a near-term retry.
- Correct answers move the question further out in the review schedule.

## Notes

- The selected topic tree is the only source for non-table practice questions.
- The question pool should stay inside the selected topic.
- Practice should not fall back to unrelated content.
- Saved question sessions should restore the current position instead of restarting the topic.
- The resume state should sync with the profile so it can follow the user across devices.

## Reference Docs

- See [Question Requirements](./question-requirements.md) for the hub page.
- See [Table Topic Flow](./table-topic-flow.md) for table behavior.
- See [Practice](../ui/practice.md) for the screen behavior.
- See [Topic Selection Rules](../topic%20selection%20rules.md) for topic filtering rules.
