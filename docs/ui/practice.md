# Practice

## Purpose

Answer questions and track practice progress.

## Main Flow

- The screen starts with `Practice Mode`.
- The main card shows the question first.
- The selected topic name appears below the action icons.
- The topic name stays on one line.
- The question card shows `Card X of Y` so the user can track progress in the current practice session.
- The `Card X of Y` line shows the full deck count for the selected topic.
- The answer is shown after reveal or marking.
- Moving next loads the next question in the session.
- Practice resumes the saved question session when you return to the same topic.
- The saved session state can sync across devices for the same profile and topic.
- The score and accuracy card updates from the live practice session state.

## Controls

- Answer - type or choose the response for the current question.
- Show answer - reveal the correct answer if needed.
- Mark result - mark the question as correct or wrong.
- Next question - move to the next item in the deck.
- Change delays - adjust how long the app waits before moving on.
- Use the top-right sync icon or Profile screen sync controls - save the latest practice progress to the global database.
- Toggle random order - shuffle the question order for the selected topic.
- Toggle auto next question - move to the next question automatically after an answer.
- Text to speech - read the current question aloud.
- Play question - repeat the current question aloud.

## Notes

- Practice progress and the current session card count are saved for the active profile.
- Saved practice sessions resume from the last question for the same topic and can follow the profile to another device after sync.
- Table topics avoid repeating the same question until the current deck is used.
- When a table deck is finished, the screen shows `Topic complete`.
- The finished screen includes a `Practice more` button to restart the same topic session.
- `Practice more` uses the same restart button style as Learn.
- If no topic is selected, the screen asks you to choose one in Topics.
- While loading, the screen shows `Preparing questions...`.
- If no deck is ready, the screen asks you to choose a topic first.

## Sync Notes

- Practice answers, review progress, and the saved session state save locally first.
- The top-right sync icon or the Profile screen sync controls send that Practice state to the global database.
- `Practice more` clears only the current practice session and starts the same topic again.

## Reference Docs

- See [Docs Index](../index.md) for the full docs map.
- See [UI Reference](./README.md) for the screen-by-screen guide.
- See [Sync Settings Requirement](../business-logic/sync-settings-requirement.md) for sync behavior.
- See [Topic Selection Rules](../topic%20selection%20rules.md) for selection rules.
