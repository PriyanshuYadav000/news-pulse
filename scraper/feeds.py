import feedparser
from normalizer import normalize_articles
from extractor import enrich_articles

RSS_FEEDS = {
    "BBC": "https://feeds.bbci.co.uk/news/rss.xml",
    "NPR": "https://feeds.npr.org/1001/rss.xml",
    "The Guardian": "https://www.theguardian.com/world/rss",
}


def fetch_feed(source: str, url: str):
    """Fetch entries from a single RSS feed."""
    feed = feedparser.parse(url)

    if feed.bozo:
        print(f"[WARNING] Problem parsing {source}: {feed.bozo_exception}")

    articles = []

    for entry in feed.entries:
        articles.append(
            {
                "source": source,
                "title": entry.get("title"),
                "summary": entry.get("summary") or entry.get("description"),
                "url": entry.get("link"),
                "published": entry.get("published")
                or entry.get("updated"),
            }
        )

    return articles


def fetch_all_feeds():
    """Fetch articles from all configured RSS feeds."""
    all_articles = []

    for source, url in RSS_FEEDS.items():
        print(f"Fetching {source}...")
        articles = fetch_feed(source, url)
        print(f"{source}: {len(articles)} articles")
        all_articles.extend(articles)

    return all_articles


if __name__ == "__main__":
    articles = fetch_all_feeds()

    print(f"\nTotal articles: {len(articles)}")

    normalized_articles = normalize_articles(articles)

    print(f"Normalized articles: {len(normalized_articles)}")

    # Test extraction on only the first 3 articles.
    test_articles = normalized_articles[:3]

    enriched_articles = enrich_articles(test_articles)

    for article in enriched_articles:
        print("\n---")
        print("Source:", article["source"])
        print("Title:", article["title"])
        print("Published:", article["published_at"])
        print("Content extracted:", bool(article["content"]))

        if article["content"]:
            print("Content preview:")
            print(article["content"][:300])