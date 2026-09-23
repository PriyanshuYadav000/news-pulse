import re

import numpy as np
from sklearn.cluster import AgglomerativeClustering
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


SIMILARITY_THRESHOLD = 0.10
MIN_SHARED_WORDS = 2


# Words that are common across many news headlines
# and are not strong topic signals.
COMMON_NEWS_WORDS = {
    "news",
    "live",
    "says",
    "said",
    "new",
    "latest",
    "today",
    "year",
    "years",
    "people",
    "official",
    "officials",
    "government",
    "report",
    "reports",
}


def tokenize_title(title: str) -> set[str]:
    """
    Extract meaningful words from a headline.
    """

    words = re.findall(
        r"[a-zA-Z]{3,}",
        (title or "").lower(),
    )

    return {
        word
        for word in words
        if word not in COMMON_NEWS_WORDS
    }


def shared_meaningful_words(
    title_a: str,
    title_b: str,
) -> int:
    """
    Count meaningful words shared by two headlines.
    """

    words_a = tokenize_title(title_a)
    words_b = tokenize_title(title_b)

    return len(words_a.intersection(words_b))


def build_article_text(article: dict) -> str:
    """
    Use headline + summary for TF-IDF.

    The headline is the strongest signal, while the summary
    provides additional context when headlines use different wording.
    """

    title = article.get("title") or ""
    summary = article.get("summary") or ""

    return f"{title} {summary}".strip()


def generate_cluster_label(
    article_indices: list[int],
    tfidf_matrix,
    articles: list[dict],
) -> str:
    """
    Use the most representative headline as the cluster label.
    """

    cluster_matrix = tfidf_matrix[article_indices]

    centroid = np.asarray(
        cluster_matrix.mean(axis=0)
    )

    similarities = cosine_similarity(
        cluster_matrix,
        centroid,
    ).ravel()

    best_article_position = int(
        similarities.argmax()
    )

    best_article_index = article_indices[
        best_article_position
    ]

    title = (
        articles[best_article_index].get("title")
        or "Untitled Topic"
    )

    return title[:120]


def cluster_articles(
    articles: list[dict],
    threshold: float = SIMILARITY_THRESHOLD,
) -> list[dict]:
    """
    Cluster articles using:

    1. TF-IDF
    2. Cosine similarity
    3. Meaningful-word overlap guard
    4. Complete-linkage agglomerative clustering

    Two articles can only belong to the same cluster when:
    - their cosine similarity reaches the threshold, and
    - they share at least MIN_SHARED_WORDS meaningful headline words.

    Complete linkage then prevents weak transitive chains.
    """

    if not articles:
        return []

    texts = [
        build_article_text(article)
        for article in articles
    ]

    valid_indices = [
        index
        for index, text in enumerate(texts)
        if text
    ]

    if not valid_indices:
        return []

    valid_articles = [
        articles[index]
        for index in valid_indices
    ]

    valid_texts = [
        texts[index]
        for index in valid_indices
    ]

    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        min_df=1,
        max_df=0.95,
        sublinear_tf=True,
    )

    tfidf_matrix = vectorizer.fit_transform(valid_texts)

    similarity_matrix = cosine_similarity(
        tfidf_matrix
    )

    number_of_articles = len(valid_articles)

    # Build a distance matrix.
    distance_matrix = 1 - similarity_matrix

    # Exact self-distance must remain zero.
    np.fill_diagonal(distance_matrix, 0)

    # Convert similarity threshold to distance.
    distance_threshold = 1 - threshold

    # Prevent unrelated pairs from ever being merged.
    # Distance 1 means "maximum distance".
    for i in range(number_of_articles):
        for j in range(i + 1, number_of_articles):

            similarity = similarity_matrix[i, j]

            shared_words = shared_meaningful_words(
                valid_articles[i].get("title", ""),
                valid_articles[j].get("title", ""),
            )

            # Both conditions are required.
            if (
                similarity < threshold
                or shared_words < MIN_SHARED_WORDS
            ):
                distance_matrix[i, j] = 1.0
                distance_matrix[j, i] = 1.0

    model = AgglomerativeClustering(
        n_clusters=None,
        distance_threshold=distance_threshold,
        metric="precomputed",
        linkage="complete",
    )

    labels = model.fit_predict(
        distance_matrix
    )

    grouped_clusters = {}

    for article_index, cluster_label in enumerate(labels):
        grouped_clusters.setdefault(
            int(cluster_label),
            [],
        ).append(article_index)

    clusters = []

    sorted_groups = sorted(
        grouped_clusters.values(),
        key=lambda group: group[0],
    )

    for cluster_id, article_indices in enumerate(
        sorted_groups,
        start=1,
    ):
        label = generate_cluster_label(
            article_indices,
            tfidf_matrix,
            valid_articles,
        )

        clusters.append(
            {
                "cluster_id": cluster_id,
                "label": label,
                "article_ids": [
                    valid_articles[index]["id"]
                    for index in article_indices
                ],
                "articles": [
                    valid_articles[index]
                    for index in article_indices
                ],
            }
        )

    return clusters


def print_cluster_summary(
    clusters: list[dict],
):
    """
    Print clustering results.
    """

    print("\n" + "=" * 60)
    print("CLUSTERING RESULTS")
    print("=" * 60)

    print(
        f"Similarity threshold: "
        f"{SIMILARITY_THRESHOLD}"
    )

    print(
        f"Minimum shared words: "
        f"{MIN_SHARED_WORDS}"
    )

    print(
        f"Clusters created: "
        f"{len(clusters)}"
    )

    for cluster in clusters:

        print(
            f"\nCluster {cluster['cluster_id']}: "
            f"{cluster['label']}"
        )

        print(
            f"Articles: "
            f"{len(cluster['articles'])}"
        )

        for article in cluster["articles"][:5]:
            print(
                f"  - [{article['source']}] "
                f"{article['title']}"
            )


if __name__ == "__main__":
    from db import get_all_articles

    articles = get_all_articles()

    clusters = cluster_articles(
        articles
    )

    print_cluster_summary(
        clusters
    )