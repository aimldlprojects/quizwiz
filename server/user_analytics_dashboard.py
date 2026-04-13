from __future__ import annotations

from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import streamlit as st
import altair as alt

from db import fetch_table_df


st.set_page_config(
    page_title="QuizWiz User Analytics",
    page_icon=":bar_chart:",
    layout="wide",
)


def _to_datetime(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce")


def _to_int(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def _safe_ratio(num: float, den: float) -> float:
    if den <= 0:
        return 0.0
    return float(num) / float(den)


def _norm(series: pd.Series) -> pd.Series:
    if series.empty:
        return pd.Series([], dtype="float64")
    min_v = series.min()
    max_v = series.max()
    if pd.isna(min_v) or pd.isna(max_v) or max_v == min_v:
        return pd.Series(0.0, index=series.index)
    return (series - min_v) / (max_v - min_v)


@st.cache_data(ttl=90)
def load_data() -> dict[str, pd.DataFrame]:
    users = fetch_table_df("users", limit=None)
    subjects = fetch_table_df("subjects", limit=None)
    topics = fetch_table_df("topics", limit=None)
    questions = fetch_table_df("questions", limit=None)
    stats = fetch_table_df("stats", limit=None)
    reviews = fetch_table_df("reviews", limit=None)

    users["created_at"] = _to_datetime(users.get("created_at"))
    users = users.rename(columns={"id": "user_id", "name": "user_name"})

    subjects = subjects.rename(columns={"id": "subject_id", "name": "subject_name"})

    topic_name_map = topics.set_index("id")["name"].to_dict()
    topics["topic_level1"] = topics.apply(
        lambda r: r["name"] if pd.isna(r["parent_topic_id"]) else topic_name_map.get(r["parent_topic_id"]),
        axis=1,
    )
    topics["topic_level2"] = topics.apply(
        lambda r: pd.NA if pd.isna(r["parent_topic_id"]) else r["name"],
        axis=1,
    )
    topics = topics.rename(
        columns={
            "id": "topic_id",
            "name": "topic_name",
        }
    )
    topics = topics.merge(subjects, how="left", on="subject_id")

    questions = questions.rename(columns={"id": "question_id_num"})
    question_meta = questions.merge(
        topics[
            [
                "topic_id",
                "subject_id",
                "subject_name",
                "topic_level1",
                "topic_level2",
            ]
        ],
        how="left",
        on="topic_id",
    )

    stats["practiced_at"] = _to_datetime(stats.get("practiced_at"))
    stats["question_id_num"] = _to_int(stats.get("question_id"))
    stats["attempts"] = stats["correct"].fillna(0) + stats["wrong"].fillna(0)
    stats = stats.merge(
        users[["user_id", "user_name"]],
        how="left",
        on="user_id",
    )
    stats = stats.merge(
        question_meta[
            [
                "question_id_num",
                "topic_id",
                "subject_id",
                "subject_name",
                "topic_level1",
                "topic_level2",
            ]
        ],
        how="left",
        on="question_id_num",
        suffixes=("", "_qm"),
    )
    stats["topic_id"] = stats["topic_id"].fillna(stats.get("topic_id_qm"))
    stats = stats.drop(columns=[c for c in ["topic_id_qm"] if c in stats.columns])
    # Fallback enrichment: some stats rows may not resolve through question_id;
    # in those cases use stats.topic_id to recover subject/topic labels.
    topic_lookup = topics[
        ["topic_id", "subject_id", "subject_name", "topic_level1", "topic_level2"]
    ].rename(
        columns={
            "subject_id": "subject_id_from_topic",
            "subject_name": "subject_name_from_topic",
            "topic_level1": "topic_level1_from_topic",
            "topic_level2": "topic_level2_from_topic",
        }
    )
    stats = stats.merge(topic_lookup, how="left", on="topic_id")
    stats["subject_id"] = stats["subject_id"].fillna(stats["subject_id_from_topic"])
    stats["subject_name"] = stats["subject_name"].fillna(stats["subject_name_from_topic"])
    stats["topic_level1"] = stats["topic_level1"].fillna(stats["topic_level1_from_topic"])
    stats["topic_level2"] = stats["topic_level2"].fillna(stats["topic_level2_from_topic"])
    stats = stats.drop(
        columns=[
            "subject_id_from_topic",
            "subject_name_from_topic",
            "topic_level1_from_topic",
            "topic_level2_from_topic",
        ]
    )

    reviews["updated_at"] = _to_datetime(reviews.get("updated_at"))
    reviews["question_id_num"] = _to_int(reviews.get("question_id"))
    reviews["next_review_ts"] = pd.to_datetime(
        reviews.get("next_review"),
        unit="ms",
        errors="coerce",
    )
    reviews = reviews.merge(
        users[["user_id", "user_name"]],
        how="left",
        on="user_id",
    )
    reviews = reviews.merge(
        question_meta[
            [
                "question_id_num",
                "subject_id",
                "subject_name",
                "topic_level1",
                "topic_level2",
            ]
        ],
        how="left",
        on="question_id_num",
    )

    return {
        "users": users,
        "subjects": subjects,
        "topics": topics,
        "questions": questions,
        "question_meta": question_meta,
        "stats": stats,
        "reviews": reviews,
    }


def filter_by_scope(
    stats: pd.DataFrame,
    reviews: pd.DataFrame,
    question_meta: pd.DataFrame,
    user_ids: list[int],
    subject_ids: list[int],
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    scoped_stats = stats.copy()
    scoped_reviews = reviews.copy()
    scoped_questions = question_meta.copy()

    if user_ids:
        scoped_stats = scoped_stats[scoped_stats["user_id"].isin(user_ids)]
        scoped_reviews = scoped_reviews[scoped_reviews["user_id"].isin(user_ids)]

    if subject_ids:
        scoped_stats = scoped_stats[scoped_stats["subject_id"].isin(subject_ids)]
        scoped_reviews = scoped_reviews[scoped_reviews["subject_id"].isin(subject_ids)]
        scoped_questions = scoped_questions[scoped_questions["subject_id"].isin(subject_ids)]

    return scoped_stats, scoped_reviews, scoped_questions


def build_user_card_status(
    users: pd.DataFrame,
    scoped_stats: pd.DataFrame,
    scoped_reviews: pd.DataFrame,
    scoped_questions: pd.DataFrame,
) -> pd.DataFrame:
    now_utc = datetime.utcnow()
    total_questions = int(scoped_questions["question_id_num"].nunique())

    stats_seen = (
        scoped_stats.dropna(subset=["question_id_num"])
        .groupby("user_id")["question_id_num"]
        .nunique()
        .rename("seen_from_stats")
    )
    reviews_seen = (
        scoped_reviews.dropna(subset=["question_id_num"])
        .groupby("user_id")["question_id_num"]
        .nunique()
        .rename("seen_from_reviews")
    )

    due = (
        scoped_reviews[
            (scoped_reviews["next_review_ts"].notna())
            & (scoped_reviews["next_review_ts"] <= now_utc)
        ]
        .groupby("user_id")["question_id"]
        .count()
        .rename("due_cards")
    )
    wrong = (
        scoped_reviews[scoped_reviews["last_result"] == "again"]
        .groupby("user_id")["question_id"]
        .count()
        .rename("needs_rework")
    )
    in_progress = (
        scoped_reviews[
            (scoped_reviews["last_result"] != "again")
            & (scoped_reviews["repetition"].fillna(0) < 2)
            & (
                scoped_reviews["next_review_ts"].isna()
                | (scoped_reviews["next_review_ts"] > now_utc)
            )
        ]
        .groupby("user_id")["question_id"]
        .count()
        .rename("in_progress")
    )
    mastered = (
        scoped_reviews[
            (scoped_reviews["repetition"].fillna(0) >= 2)
            & (
                scoped_reviews["next_review_ts"].isna()
                | (scoped_reviews["next_review_ts"] > now_utc)
            )
        ]
        .groupby("user_id")["question_id"]
        .count()
        .rename("mastered")
    )

    card_status = users[["user_id", "user_name"]].copy()
    for part in [stats_seen, reviews_seen, due, wrong, in_progress, mastered]:
        card_status = card_status.merge(part, how="left", on="user_id")

    card_status["seen_from_stats"] = card_status["seen_from_stats"].fillna(0)
    card_status["seen_from_reviews"] = card_status["seen_from_reviews"].fillna(0)
    card_status["seen_cards"] = card_status[["seen_from_stats", "seen_from_reviews"]].max(axis=1)
    card_status["unseen_cards"] = (total_questions - card_status["seen_cards"]).clip(lower=0)

    for col in ["due_cards", "needs_rework", "in_progress", "mastered"]:
        card_status[col] = card_status[col].fillna(0).astype(int)

    card_status["follow_up_priority"] = (
        card_status["due_cards"] * 2
        + card_status["needs_rework"] * 1.5
        + card_status["unseen_cards"] * 0.5
    ).round(1)

    return card_status[
        [
            "user_id",
            "user_name",
            "due_cards",
            "unseen_cards",
            "needs_rework",
            "in_progress",
            "mastered",
            "follow_up_priority",
        ]
    ].sort_values(["follow_up_priority", "due_cards"], ascending=False)


def build_ranking(
    users: pd.DataFrame,
    scoped_stats: pd.DataFrame,
    card_status: pd.DataFrame,
) -> pd.DataFrame:
    agg = (
        scoped_stats.groupby(["user_id", "user_name"], dropna=False)
        .agg(
            attempts=("attempts", "sum"),
            correct=("correct", "sum"),
            wrong=("wrong", "sum"),
            active_days=("practiced_at", lambda s: s.dt.date.nunique()),
            last_active=("practiced_at", "max"),
        )
        .reset_index()
    )

    ranking = users[["user_id", "user_name"]].merge(agg, how="left", on=["user_id", "user_name"])
    ranking["attempts"] = ranking["attempts"].fillna(0)
    ranking["correct"] = ranking["correct"].fillna(0)
    ranking["wrong"] = ranking["wrong"].fillna(0)
    ranking["active_days"] = ranking["active_days"].fillna(0)
    ranking["accuracy_pct"] = np.where(
        ranking["attempts"] > 0,
        (ranking["correct"] * 100.0 / ranking["attempts"]).round(1),
        0.0,
    )
    ranking = ranking.merge(
        card_status[["user_id", "mastered", "due_cards"]],
        how="left",
        on="user_id",
    )
    ranking["mastered"] = ranking["mastered"].fillna(0)
    ranking["due_cards"] = ranking["due_cards"].fillna(0)

    ranking["score"] = (
        0.40 * _norm(ranking["accuracy_pct"])
        + 0.25 * _norm(np.log1p(ranking["attempts"]))
        + 0.20 * _norm(ranking["active_days"])
        + 0.15 * _norm(ranking["mastered"])
        - 0.10 * _norm(ranking["due_cards"])
    ) * 100
    ranking["score"] = ranking["score"].round(1)

    ranking = ranking.sort_values(["score", "accuracy_pct", "attempts"], ascending=False).reset_index(drop=True)
    ranking.insert(0, "rank", ranking.index + 1)
    return ranking[
        [
            "rank",
            "user_name",
            "score",
            "accuracy_pct",
            "attempts",
            "active_days",
            "mastered",
            "due_cards",
            "last_active",
        ]
    ]


data = load_data()
users_df = data["users"]
stats_df = data["stats"]
reviews_df = data["reviews"]
subjects_df = data["subjects"]
question_meta_df = data["question_meta"]

st.title("QuizWiz User Performance Dashboard")
st.caption("Performance, strengths/weaknesses, activity, card follow-up, and ranking.")

with st.sidebar:
    st.subheader("Filters")
    user_options = users_df.sort_values("user_name")[["user_id", "user_name"]]
    selected_user_name = st.selectbox(
        "User",
        options=["All Users"] + user_options["user_name"].tolist(),
        index=0,
    )
    selected_user_ids = []
    if selected_user_name != "All Users":
        selected_user_ids = (
            user_options[user_options["user_name"] == selected_user_name]["user_id"].astype(int).tolist()
        )

    subject_options = subjects_df.sort_values("subject_name")[["subject_id", "subject_name"]]
    selected_subject_names = st.multiselect(
        "Subjects",
        options=subject_options["subject_name"].tolist(),
        default=[],
        help="Leave empty for all subjects.",
    )
    selected_subject_ids = (
        subject_options[subject_options["subject_name"].isin(selected_subject_names)]["subject_id"]
        .astype(int)
        .tolist()
    )

    default_end = datetime.now().date()
    default_start = default_end - timedelta(days=30)
    date_range = st.date_input(
        "Practice Date Range",
        value=(default_start, default_end),
    )

scoped_stats_all, scoped_reviews_all, scoped_questions = filter_by_scope(
    stats_df,
    reviews_df,
    question_meta_df,
    selected_user_ids,
    selected_subject_ids,
)

if isinstance(date_range, tuple) and len(date_range) == 2:
    start_date, end_date = date_range
else:
    start_date = default_start
    end_date = default_end

scoped_stats = scoped_stats_all[
    (scoped_stats_all["practiced_at"].dt.date >= start_date)
    & (scoped_stats_all["practiced_at"].dt.date <= end_date)
]

total_attempts = int(scoped_stats["attempts"].sum())
total_correct = int(scoped_stats["correct"].sum())
total_wrong = int(scoped_stats["wrong"].sum())
accuracy_pct = round(_safe_ratio(total_correct, total_attempts) * 100, 1)
active_users = int(scoped_stats["user_id"].nunique())
active_days = int(scoped_stats["practiced_at"].dt.date.nunique())

card_status_df = build_user_card_status(
    users=users_df if not selected_user_ids else users_df[users_df["user_id"].isin(selected_user_ids)],
    scoped_stats=scoped_stats_all,
    scoped_reviews=scoped_reviews_all,
    scoped_questions=scoped_questions,
)

total_due = int(card_status_df["due_cards"].sum()) if not card_status_df.empty else 0
total_unseen = int(card_status_df["unseen_cards"].sum()) if not card_status_df.empty else 0

metric_cols = st.columns(6)
metric_cols[0].metric("Accuracy", f"{accuracy_pct}%")
metric_cols[1].metric("Attempts", f"{total_attempts:,}")
metric_cols[2].metric("Correct", f"{total_correct:,}")
metric_cols[3].metric("Wrong", f"{total_wrong:,}")
metric_cols[4].metric("Due Cards", f"{total_due:,}")
metric_cols[5].metric("Unseen Cards", f"{total_unseen:,}")

tabs = st.tabs(
    [
        "Overview",
        "Strengths & Weaknesses",
        "Activity",
        "Card Follow-Up",
        "User Ranking",
    ]
)

with tabs[0]:
    st.subheader("Performance by User")
    user_perf = (
        scoped_stats.groupby("user_name", dropna=False)
        .agg(
            attempts=("attempts", "sum"),
            correct=("correct", "sum"),
            wrong=("wrong", "sum"),
        )
        .reset_index()
    )
    user_perf["accuracy_pct"] = np.where(
        user_perf["attempts"] > 0,
        (user_perf["correct"] * 100.0 / user_perf["attempts"]).round(1),
        0.0,
    )
    user_perf = user_perf.merge(
        card_status_df[["user_name", "due_cards", "unseen_cards"]],
        how="left",
        on="user_name",
    )
    user_perf["due_cards"] = user_perf["due_cards"].fillna(0).astype(int)
    user_perf["unseen_cards"] = user_perf["unseen_cards"].fillna(0).astype(int)
    st.dataframe(
        user_perf[
            [
                "user_name",
                "accuracy_pct",
                "attempts",
                "correct",
                "wrong",
                "due_cards",
                "unseen_cards",
            ]
        ].sort_values(["accuracy_pct", "attempts"], ascending=False),
        use_container_width=True,
    )

    st.subheader("Subject Performance")
    subject_perf = (
        scoped_stats.groupby("subject_name", dropna=False)
        .agg(
            attempts=("attempts", "sum"),
            correct=("correct", "sum"),
            wrong=("wrong", "sum"),
        )
        .reset_index()
    )
    subject_perf["accuracy_pct"] = np.where(
        subject_perf["attempts"] > 0,
        (subject_perf["correct"] * 100.0 / subject_perf["attempts"]).round(1),
        0.0,
    )
    subject_due = (
        scoped_reviews_all[
            (scoped_reviews_all["next_review_ts"].notna())
            & (scoped_reviews_all["next_review_ts"] <= datetime.utcnow())
        ]
        .groupby("subject_name", dropna=False)["question_id"]
        .count()
        .rename("due_cards")
        .reset_index()
    )
    users_in_scope = (
        users_df[users_df["user_id"].isin(selected_user_ids)][["user_id"]]
        if selected_user_ids
        else users_df[["user_id"]]
    )
    question_counts_by_subject = (
        scoped_questions.groupby("subject_name", dropna=False)["question_id_num"]
        .nunique()
        .rename("question_count")
        .reset_index()
    )
    stats_seen_pairs = (
        scoped_stats_all[["user_id", "question_id_num", "subject_name"]]
        .dropna(subset=["question_id_num"])
        .drop_duplicates()
    )
    review_seen_pairs = (
        scoped_reviews_all[["user_id", "question_id_num", "subject_name"]]
        .dropna(subset=["question_id_num"])
        .drop_duplicates()
    )
    seen_pairs = pd.concat([stats_seen_pairs, review_seen_pairs], ignore_index=True).drop_duplicates()
    seen_by_subject = (
        seen_pairs.groupby("subject_name", dropna=False)
        .size()
        .rename("seen_pairs")
        .reset_index()
    )
    subject_cards = question_counts_by_subject.copy()
    subject_cards["potential_pairs"] = subject_cards["question_count"] * max(len(users_in_scope), 1)
    subject_cards = subject_cards.merge(seen_by_subject, how="left", on="subject_name")
    subject_cards["seen_pairs"] = subject_cards["seen_pairs"].fillna(0)
    subject_cards["unseen_cards"] = (subject_cards["potential_pairs"] - subject_cards["seen_pairs"]).clip(lower=0).astype(int)
    subject_perf = subject_perf.merge(subject_due, how="left", on="subject_name")
    subject_perf = subject_perf.merge(subject_cards[["subject_name", "unseen_cards"]], how="left", on="subject_name")
    subject_perf["due_cards"] = subject_perf["due_cards"].fillna(0).astype(int)
    subject_perf["unseen_cards"] = subject_perf["unseen_cards"].fillna(0).astype(int)
    st.dataframe(
        subject_perf[
            [
                "subject_name",
                "accuracy_pct",
                "attempts",
                "correct",
                "wrong",
                "due_cards",
                "unseen_cards",
            ]
        ].sort_values(["accuracy_pct", "attempts"], ascending=False),
        use_container_width=True,
    )

with tabs[1]:
    topic_perf = (
        scoped_stats.groupby(
            ["user_name", "subject_name", "topic_level1", "topic_level2"],
            dropna=False,
        )
        .agg(
            attempts=("attempts", "sum"),
            correct=("correct", "sum"),
            wrong=("wrong", "sum"),
        )
        .reset_index()
    )
    topic_perf = topic_perf[topic_perf["attempts"] > 0]
    topic_perf["accuracy_pct"] = (topic_perf["correct"] * 100.0 / topic_perf["attempts"]).round(1)
    topic_perf["topic_label"] = np.where(
        topic_perf["topic_level2"].isna(),
        topic_perf["topic_level1"].astype(str),
        topic_perf["topic_level1"].astype(str) + " / " + topic_perf["topic_level2"].astype(str),
    )

    min_attempts = st.slider(
        "Minimum attempts per topic",
        min_value=1,
        max_value=25,
        value=5,
    )
    usable = topic_perf[topic_perf["attempts"] >= min_attempts]
    if usable.empty:
        st.info("No topic has enough attempts in the selected scope.")
    else:
        col_good, col_weak = st.columns(2)
        with col_good:
            st.subheader("Strong Topics")
            strong = usable.sort_values(["accuracy_pct", "attempts"], ascending=[False, False]).head(15)
            st.dataframe(
                strong[
                    [
                        "user_name",
                        "subject_name",
                        "topic_label",
                        "attempts",
                        "accuracy_pct",
                    ]
                ],
                use_container_width=True,
            )
        with col_weak:
            st.subheader("Weak Topics")
            weak = usable.sort_values(["accuracy_pct", "attempts"], ascending=[True, False]).head(15)
            st.dataframe(
                weak[
                    [
                        "user_name",
                        "subject_name",
                        "topic_label",
                        "attempts",
                        "accuracy_pct",
                    ]
                ],
                use_container_width=True,
            )

with tabs[2]:
    st.subheader("Daily Activity Trend")
    activity = scoped_stats.copy()
    activity["practice_date"] = activity["practiced_at"].dt.date
    daily = (
        activity.groupby(["practice_date", "user_name"], dropna=False)["attempts"]
        .sum()
        .reset_index()
        .sort_values("practice_date")
    )
    if daily.empty:
        st.info("No activity found in this date range.")
    else:
        daily["practice_date_sort"] = pd.to_datetime(daily["practice_date"])
        daily["practice_date_label"] = daily["practice_date_sort"].dt.strftime("%d-%m-%y")
        bar_base = alt.Chart(daily).encode(
            x=alt.X(
                "practice_date_label:N",
                title="Date",
                sort=alt.SortField(field="practice_date_sort", order="ascending"),
            ),
            y=alt.Y("attempts:Q", title="Attempts"),
        )

        if selected_user_name == "All Users":
            bars = bar_base.mark_bar().encode(
                color=alt.Color("user_name:N", title="User"),
                xOffset="user_name:N",
            )
            labels = bar_base.mark_text(
                color="white",
                baseline="middle",
            ).encode(
                text=alt.Text("attempts:Q", format=".0f"),
                xOffset="user_name:N",
            )
        else:
            bars = bar_base.mark_bar(color="#1f77b4")
            labels = bar_base.mark_text(
                color="white",
                baseline="middle",
            ).encode(
                text=alt.Text("attempts:Q", format=".0f"),
            )

        st.altair_chart((bars + labels).properties(height=360), use_container_width=True)

        activity_table = daily[["practice_date", "user_name", "attempts"]].copy()
        activity_table["practice_date_dt"] = pd.to_datetime(activity_table["practice_date"])
        activity_table = activity_table.sort_values(["user_name", "practice_date_dt"])
        activity_table["activity_gap_days"] = (
            activity_table.groupby("user_name")["practice_date_dt"].diff().dt.days
        )
        activity_table["activity_gap_days"] = activity_table["activity_gap_days"].fillna(0).astype(int)
        activity_table = activity_table[
            ["practice_date", "user_name", "attempts", "activity_gap_days"]
        ].sort_values(["practice_date", "user_name"], ascending=[False, True])
        st.dataframe(activity_table, use_container_width=True, height=280)
        st.caption(f"Active users: {active_users} | Active days: {active_days}")

        st.subheader("Practice Details for Selected Date (Per User)")
        available_users = sorted(
            [u for u in activity["user_name"].dropna().unique().tolist()]
        )
        if not available_users:
            st.info("No users with activity in this selection.")
        else:
            default_user = (
                selected_user_name
                if selected_user_name != "All Users" and selected_user_name in available_users
                else available_users[0]
            )
            detail_user = st.selectbox(
                "Detail User",
                options=available_users,
                index=available_users.index(default_user),
                key="activity_detail_user",
            )

            user_activity = activity[activity["user_name"] == detail_user].copy()
            user_dates = sorted(user_activity["practice_date"].dropna().unique().tolist())
            if not user_dates:
                st.info("No dates available for this user in current filters.")
            else:
                use_all_dates = st.checkbox(
                    "Disable date selection (use all data for selected user)",
                    value=False,
                    key="activity_detail_use_all_dates",
                )
                default_detail_date = max(user_dates)
                selected_detail_date = default_detail_date
                if not use_all_dates:
                    selected_detail_date = st.selectbox(
                        "Detail Date",
                        options=user_dates,
                        index=user_dates.index(default_detail_date),
                        key="activity_detail_date",
                        format_func=lambda d: pd.to_datetime(d).strftime("%d-%m-%y"),
                    )

                day_rows = (
                    user_activity.copy()
                    if use_all_dates
                    else user_activity[user_activity["practice_date"] == selected_detail_date].copy()
                )
                day_rows = day_rows.merge(
                    question_meta_df[
                        [
                            "question_id_num",
                            "type",
                            "question",
                            "answer",
                            "subject_name",
                            "topic_level1",
                            "topic_level2",
                        ]
                    ],
                    how="left",
                    on="question_id_num",
                    suffixes=("", "_qm"),
                )
                day_rows["subject_name"] = day_rows["subject_name"].fillna(day_rows.get("subject_name_qm"))
                day_rows["topic_level1"] = day_rows["topic_level1"].fillna(day_rows.get("topic_level1_qm"))
                day_rows["topic_level2"] = day_rows["topic_level2"].fillna(day_rows.get("topic_level2_qm"))
                for c in ["subject_name_qm", "topic_level1_qm", "topic_level2_qm"]:
                    if c in day_rows.columns:
                        day_rows = day_rows.drop(columns=[c])
                day_rows["question_id_label"] = day_rows["question_id_num"].apply(
                    lambda x: str(int(x)) if pd.notna(x) else "unknown"
                )
                day_rows["question"] = day_rows["question"].fillna(
                    "Missing question text (ID: " + day_rows["question_id_label"] + ")"
                )
                day_rows["answer"] = day_rows["answer"].fillna("Missing answer")

                day_attempts = int(day_rows["attempts"].sum())
                day_correct = int(day_rows["correct"].sum())
                day_wrong = int(day_rows["wrong"].sum())
                day_accuracy = round(_safe_ratio(day_correct, day_attempts) * 100, 1)
                day_questions = int(day_rows["question_id_num"].nunique())
                detail_metrics = st.columns(6)
                detail_metrics[0].metric(
                    "Date",
                    "All Dates" if use_all_dates else pd.to_datetime(selected_detail_date).strftime("%d-%m-%y"),
                )
                detail_metrics[1].metric("Accuracy", f"{day_accuracy}%")
                detail_metrics[2].metric("Attempts", f"{day_attempts:,}")
                detail_metrics[3].metric("Correct", f"{day_correct:,}")
                detail_metrics[4].metric("Wrong", f"{day_wrong:,}")
                detail_metrics[5].metric("Unique Questions", f"{day_questions:,}")

                topic_day = (
                    day_rows.groupby(["subject_name", "topic_level1", "topic_level2"], dropna=False)
                    .agg(
                        attempts=("attempts", "sum"),
                        correct=("correct", "sum"),
                        wrong=("wrong", "sum"),
                    )
                    .reset_index()
                )
                topic_day["accuracy_pct"] = np.where(
                    topic_day["attempts"] > 0,
                    (topic_day["correct"] * 100.0 / topic_day["attempts"]).round(1),
                    0.0,
                )
                topic_day["topic_label"] = np.where(
                    topic_day["topic_level2"].isna(),
                    topic_day["topic_level1"].astype(str),
                    topic_day["topic_level1"].astype(str) + " / " + topic_day["topic_level2"].astype(str),
                )
                st.markdown("**What was practiced by topic**")
                st.dataframe(
                    topic_day[
                        ["subject_name", "topic_label", "accuracy_pct", "attempts", "correct", "wrong"]
                    ].sort_values(["accuracy_pct", "attempts"], ascending=[False, False]),
                    use_container_width=True,
                )

                question_day = (
                    day_rows.groupby(["question_id_num", "type", "question", "answer"], dropna=False)
                    .agg(
                        attempts=("attempts", "sum"),
                        correct=("correct", "sum"),
                        wrong=("wrong", "sum"),
                    )
                    .reset_index()
                )
                question_day["accuracy_pct"] = np.where(
                    question_day["attempts"] > 0,
                    (question_day["correct"] * 100.0 / question_day["attempts"]).round(1),
                    0.0,
                )
                st.markdown("**What was practiced by question**")
                st.dataframe(
                    question_day[
                        ["question_id_num", "type", "question", "answer", "accuracy_pct", "attempts", "correct", "wrong"]
                    ].sort_values(["attempts", "accuracy_pct"], ascending=[False, False]),
                    use_container_width=True,
                    height=260,
                )

with tabs[3]:
    st.subheader("Card Status and Follow-Up Priority")
    if card_status_df.empty:
        st.info("No card data available in the selected scope.")
    else:
        st.dataframe(card_status_df, use_container_width=True)

with tabs[4]:
    st.subheader("User Ranking")
    ranking_df = build_ranking(
        users=users_df if not selected_user_ids else users_df[users_df["user_id"].isin(selected_user_ids)],
        scoped_stats=scoped_stats,
        card_status=card_status_df,
    )
    st.dataframe(ranking_df, use_container_width=True)
    with st.expander("How ranking is calculated", expanded=False):
        st.markdown(
            """
            **Score Formula**

            `score = (0.40*norm(accuracy_pct) + 0.25*norm(log1p(attempts)) + 0.20*norm(active_days) + 0.15*norm(mastered) - 0.10*norm(due_cards)) * 100`

            - Weights: Accuracy `40%`, Attempts `25%`, Active Days `20%`, Mastered `15%`, Due-card penalty `-10%`.
            - `norm(...)`: min-max normalization (`0..1`) within the current filter scope.
            - Higher score ranks higher.
            - Tie-breakers: `accuracy_pct`, then `attempts`.
            """
        )
