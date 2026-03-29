# Table Topic Flow

## Purpose

Describe how multiplication table topics are built and when they finish.

## Flow

- Learn uses a full generated table deck for table topics.
- Practice uses the same table deck through a shared session cursor.
- `Tables 1-5` should show the full `1 x 1` through `5 x 10` deck.
- Table cards move forward one by one during a session.
- Table sessions resume from the last saved card when the user returns to the same topic.
- Table session resume state is stored in synced settings, so it can follow the same profile across devices after sync.
- The `Card X of Y` label uses the full table deck count for the selected range.
- Random order restores the saved table session and shuffles the current and remaining table cards.

## Answer Rules

- Learn table feedback moves to the next card.
- Practice correct and wrong answers still save review progress.
- Table questions should not loop forever in the same session.

## End Of Deck

- When the table deck is used up, Practice shows `Topic complete`.
- The finished screen includes `Practice more` so the user can restart the same table topic.
- The app should not invent unrelated questions just to keep going.
- Due reviews may appear again later if the scheduler says they are due.

## Notes

- Table topics use generated cards, not the mixed fallback.
- The table deck should stay inside the selected table range.
- If a table topic is reopened later, the session should resume from the saved position and keep the current and remaining table cards shuffled when random order is on.
- If a table topic is reopened later, the session should resume from the saved position and keep the current and remaining table cards shuffled when random order is on.
- The synced resume state should not delete the saved review history.

## Reference Docs

- See [Question Requirements](./question-requirements.md) for the hub page.
- See [Question Flow](./question-flow.md) for the general question rules.
- See [Learn](../ui/learn.md) for the flash-card screen behavior.
- See [Practice](../ui/practice.md) for the practice screen behavior.
