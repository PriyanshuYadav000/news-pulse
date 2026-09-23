import hashlib
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime


def clean_text(value):
    """Return cleaned text or None."""
    if not value:
        return None

    return " ".join(str(value).split())


def parse_published_date(value):
    """
    Convert common RSS date strings into a timezone-aware UTC datetime.
    Returns None when the date cannot be parsed.
    """
    if not value:
        return None

    try:
        dt = parsedate_to_datetime(value)

        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        return dt.astimezone(timezone.utc)

    except (TypeError, ValueError, OverflowError):
        pass

    fallback_formats = [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
    ]

    for fmt in fallback_formats:
        try:
            dt = datetime.strptime(value, fmt)

            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)

            return dt.astimezone(timezone.utc)

        except (TypeError, ValueError):
            continue

    return None


def normalize_article(article):
    """
    Convert a raw feed article into our standard internal schema.
    """

    title = clean_text(article.get("title"))
    summary = clean_text(article.get("summary"))
    url = clean_text(article.get("url"))
    source = clean_text(article.get("source"))

    published_at = parse_published_date(article.get("published"))

    return {
        "source": source,
        "title": title,
        "summary": summary,
        "url": url,
        "published_at": published_at,
        "content": None,
        "content_hash": None,
    }


def normalize_articles(articles):
    """Normalize a list of raw articles."""
    normalized = []

    for article in articles:
        normalized_article = normalize_article(article)

        if not normalized_article["title"]:
            continue

        if not normalized_article["url"]:
            continue

        normalized.append(normalized_article)

    return normalized


def generate_content_hash(article: dict) -> str:
    """
    Generate a SHA-256 hash from the article's identifying content.
    """
    raw_text = " ".join(
        [
            article.get("title") or "",
            article.get("content") or "",
            article.get("url") or "",
        ]
    )

    return hashlib.sha256(
        raw_text.encode("utf-8")
    ).hexdigest()