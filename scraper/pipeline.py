from datetime import datetime, timedelta, timezone

from db import article_exists, get_article_count, insert_article
from extractor import extract_article_text
from feeds import fetch_all_feeds
from normalizer import generate_content_hash, normalize_articles


# Only process articles published within the last 7 days.
ARTICLE_MAX_AGE_DAYS = 7


def run_pipeline(limit: int | None = None):
    print("Starting News Pulse ingestion pipeline...\n")

    # Step 1: Fetch articles from all RSS feeds
    raw_articles = fetch_all_feeds()

    print(f"\nFetched: {len(raw_articles)} RSS articles")

    # Step 2: Normalize RSS data
    normalized_articles = normalize_articles(raw_articles)

    print(f"Normalized: {len(normalized_articles)} articles")

    # Step 3: Remove stale articles
    cutoff_time = datetime.now(timezone.utc) - timedelta(
        days=ARTICLE_MAX_AGE_DAYS
    )

    fresh_articles = []
    stale_count = 0

    for article in normalized_articles:
        published_at = article.get("published_at")

        # Ignore articles without a valid publication timestamp
        if published_at is None:
            stale_count += 1
            continue

        # Make sure datetime is timezone-aware
        if published_at.tzinfo is None:
            published_at = published_at.replace(
                tzinfo=timezone.utc
            )
        else:
            published_at = published_at.astimezone(timezone.utc)

        # Keep only articles from the last 7 days
        if published_at >= cutoff_time:
            fresh_articles.append(article)
        else:
            stale_count += 1

    normalized_articles = fresh_articles

    print(
        f"Fresh articles: {len(normalized_articles)} "
        f"(last {ARTICLE_MAX_AGE_DAYS} days)"
    )
    print(f"Stale/invalid articles skipped: {stale_count}")

    # Optional limit for safe testing
    if limit is not None:
        normalized_articles = normalized_articles[:limit]
        print(
            f"Testing with first {len(normalized_articles)} "
            f"fresh articles"
        )

    inserted_count = 0
    skipped_count = 0
    extraction_failed_count = 0

    # Step 4: Process each fresh article
    for index, article in enumerate(
        normalized_articles,
        start=1
    ):
        title = article["title"]
        url = article["url"]

        print(
            f"\n[{index}/{len(normalized_articles)}] {title}"
        )

        # Step 5: Skip articles already stored
        if article_exists(url):
            print("  → Already exists. Skipping.")
            skipped_count += 1
            continue

        # Step 6: Extract full article content
        print("  → Extracting article content...")

        content = extract_article_text(url)

        if content:
            print("  → Content extracted successfully.")
        else:
            print(
                "  → Content extraction failed. "
                "Using RSS data."
            )
            extraction_failed_count += 1

        article["content"] = content

        # Step 7: Generate content hash
        article["content_hash"] = generate_content_hash(
            article
        )

        # Step 8: Insert into PostgreSQL
        article_id, inserted = insert_article(article)

        if inserted:
            print(
                f"  → Inserted article ID: {article_id}"
            )
            inserted_count += 1
        else:
            print(
                f"  → Article already exists with ID: "
                f"{article_id}"
            )
            skipped_count += 1

    total_articles = get_article_count()

    print("\n" + "=" * 50)
    print("PIPELINE COMPLETE")
    print("=" * 50)
    print(f"Fetched:                    {len(raw_articles)}")
    print(f"Normalized:                 {len(normalized_articles) + stale_count}")
    print(f"Fresh/processed:            {len(normalized_articles)}")
    print(f"Stale/invalid skipped:      {stale_count}")
    print(f"Inserted:                   {inserted_count}")
    print(f"Already existed:            {skipped_count}")
    print(f"Extraction failures:        {extraction_failed_count}")
    print(f"Database total:             {total_articles}")
    print("=" * 50)


if __name__ == "__main__":
    run_pipeline()