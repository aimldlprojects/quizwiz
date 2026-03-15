import psycopg2
from db import get_db_config

def main():
    config = get_db_config()
    with psycopg2.connect(**config) as conn:
        with conn.cursor() as cur:
            cur.execute(
                '''
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
                '''
            )
            tables = [row[0] for row in cur.fetchall()]

            for table in tables:
                print(f'Table: {table}')
                cur.execute(
                    '''
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = %s
                    ORDER BY ordinal_position
                    ''',
                    (table,)
                )
                for column in cur.fetchall():
                    print('  ', *column)

                cur.execute(
                    '''
                    SELECT
                        tc.constraint_type,
                        tc.constraint_name,
                        kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_name = kcu.table_name
                    WHERE tc.table_name = %s
                    ORDER BY tc.constraint_type, kcu.ordinal_position
                    ''',
                    (table,)
                )
                constraint_rows = cur.fetchall()
                if constraint_rows:
                    print('  Constraints:')
                    for constraint_type, constraint_name, column_name in constraint_rows:
                        print('    ', constraint_type, constraint_name, column_name)

                cur.execute(
                    '''
                    SELECT indexname, indexdef
                    FROM pg_indexes
                    WHERE tablename = %s
                    ORDER BY indexname
                    ''',
                    (table,)
                )
                indexes = cur.fetchall()
                if indexes:
                    print('  Indexes:')
                    for index_name, index_def in indexes:
                        print('    ', index_name)
                        print('      ', index_def)

                print()

if __name__ == '__main__':
    main()
