import trafilatura


def extract_article_text(url: str) -> str | None:
    """
    Fetch an article URL and extract its main body text.

    Returns None when the page cannot be fetched or parsed.
    """
    if not url:
        return None

    try:
        downloaded = trafilatura.fetch_url(url)

        if not downloaded:
            return None

        text = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=False,
            favor_precision=True,
        )

        if not text:
            return None

        return " ".join(text.split())

    except Exception as exc:
        print(f"[WARNING] Article extraction failed: {url}")
        print(f"         Reason: {exc}")
        return None


def enrich_article(article: dict) -> dict:
    """
    Add extracted article content to an already normalized article.
    """
    article["content"] = extract_article_text(article.get("url"))
    return article


def enrich_articles(articles: list[dict]) -> list[dict]:
    """
    Extract article content for each normalized article.
    """
    enriched_articles = []

    for index, article in enumerate(articles, start=1):
        print(
            f"Extracting article {index}/{len(articles)}: "
            f"{article.get('title', 'Untitled')}"
        )

        enriched_article = enrich_article(article)
        enriched_articles.append(enriched_article)

    return enriched_articles