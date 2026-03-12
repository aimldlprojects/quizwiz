def get_review_changes(conn, user_id, since):

    cur = conn.cursor()

    cur.execute(
        """
        SELECT
            user_id,
            question_id,
            repetition,
            interval,
            ease_factor,
            next_review,
            last_result,
            rev_id
        FROM reviews
        WHERE user_id = %s
        AND rev_id > %s
        ORDER BY rev_id ASC
        """,
        (user_id, since)
    )

    rows = cur.fetchall()

    columns = [desc[0] for desc in cur.description]

    result = [
        dict(zip(columns, row))
        for row in rows
    ]

    cur.close()

    return result


def upsert_reviews(conn, reviews):

    cur = conn.cursor()

    max_rev = 0

    for review in reviews:

        cur.execute(
            """
            INSERT INTO reviews
            (
                user_id,
                question_id,
                repetition,
                interval,
                ease_factor,
                next_review,
                last_result,
                rev_id
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)

            ON CONFLICT (user_id, question_id)
            DO UPDATE SET
                repetition = EXCLUDED.repetition,
                interval = EXCLUDED.interval,
                ease_factor = EXCLUDED.ease_factor,
                next_review = EXCLUDED.next_review,
                last_result = EXCLUDED.last_result,
                rev_id = EXCLUDED.rev_id

            WHERE reviews.rev_id IS NULL
               OR reviews.rev_id < EXCLUDED.rev_id
            """,
            (
                review["user_id"],
                review["question_id"],
                review["repetition"],
                review["interval"],
                review["ease_factor"],
                review["next_review"],
                review["last_result"],
                review["rev_id"]
            )
        )

        if review["rev_id"] > max_rev:
            max_rev = review["rev_id"]

    conn.commit()

    cur.close()

    return max_rev