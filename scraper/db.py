import os

import psycopg2
from dotenv import load_dotenv


load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")


def get_connection():
    """Create and return a PostgreSQL database connection."""
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")

    return psycopg2.connect(DATABASE_URL)


def article_exists(url: str) -> bool:
    """Check whether an article URL already exists in the database."""
    if not url:
        return False

    query = """
        SELECT EXISTS (
            SELECT 1
            FROM articles
            WHERE url = %s
        );
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, (url,))
            return cursor.fetchone()[0]


def insert_article(article: dict):
    """
    Insert a new article into the database.

    Returns:
        tuple[int, bool]:
            article_id: ID of inserted/existing article
            inserted: True if a new row was inserted, False if it already existed
    """

    query = """
        INSERT INTO articles (
            title,
            summary,
            content,
            source,
            url,
            published_at,
            content_hash
        )
        VALUES (
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s
        )
        ON CONFLICT (url) DO NOTHING
        RETURNING id;
    """

    values = (
        article.get("title"),
        article.get("summary"),
        article.get("content"),
        article.get("source"),
        article.get("url"),
        article.get("published_at"),
        article.get("content_hash"),
    )

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, values)

            result = cursor.fetchone()

            # New article inserted successfully.
            if result:
                return result[0], True

            # Article already exists.
            cursor.execute(
                """
                SELECT id
                FROM articles
                WHERE url = %s;
                """,
                (article["url"],),
            )

            existing = cursor.fetchone()

            if not existing:
                raise RuntimeError(
                    "Article conflict occurred, but existing article was not found."
                )

            return existing[0], False


def get_article_count() -> int:
    """Return the total number of stored articles."""
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM articles;")
            return cursor.fetchone()[0]


def get_all_articles() -> list[dict]:
    """Return all stored articles as dictionaries."""

    query = """
        SELECT
            id,
            title,
            summary,
            content,
            source,
            url,
            published_at
        FROM articles
        ORDER BY published_at DESC NULLS LAST, id;
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)

            rows = cursor.fetchall()

            columns = [column[0] for column in cursor.description]

            return [
                dict(zip(columns, row))
                for row in rows
            ]

def replace_clusters(clusters: list[dict]) -> int:
    """
    Replace the current cluster assignments with newly generated clusters.

    Returns:
        Number of clusters stored.
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:

            # Remove existing article-cluster relationships.
            cursor.execute(
                "DELETE FROM article_clusters;"
            )

            # Remove existing clusters.
            cursor.execute(
                "DELETE FROM clusters;"
            )

            # Insert the newly generated clusters.
            for cluster in clusters:

                cursor.execute(
                    """
                    INSERT INTO clusters (label)
                    VALUES (%s)
                    RETURNING id;
                    """,
                    (cluster["label"],),
                )

                cluster_id = cursor.fetchone()[0]

                # Connect articles to this cluster.
                for article_id in cluster["article_ids"]:

                    cursor.execute(
                        """
                        INSERT INTO article_clusters (
                            article_id,
                            cluster_id
                        )
                        VALUES (%s, %s);
                        """,
                        (
                            article_id,
                            cluster_id,
                        ),
                    )

    return len(clusters)