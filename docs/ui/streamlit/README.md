# Streamlit UI

## Purpose

Document the Streamlit analytics dashboard in `server/user_analytics_dashboard.py`.

## Run

From `server/`:

```powershell
streamlit run user_analytics_dashboard.py
```

## Ranking Formula

The `User Ranking` tab score is calculated as:

`score = (0.40*norm(accuracy_pct) + 0.25*norm(log1p(attempts)) + 0.20*norm(active_days) + 0.15*norm(mastered) - 0.10*norm(due_cards)) * 100`

- `norm(...)` is min-max normalization to `0..1` within the current filter scope.
- Higher `score` gets higher rank.
- Tie-break order: `accuracy_pct`, then `attempts`.

## Notes

- Ranking depends on the currently selected filters (user, subject, date range).
- `due_cards` acts as a penalty in the score.
