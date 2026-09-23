from clustering import cluster_articles
from db import get_all_articles, replace_clusters


def main():
    print("Loading articles from PostgreSQL...")

    articles = get_all_articles()

    print(f"Articles loaded: {len(articles)}")

    print("Generating topic clusters...")

    clusters = cluster_articles(articles)

    print(f"Clusters generated: {len(clusters)}")

    stored_count = replace_clusters(clusters)

    print(
        f"Successfully stored {stored_count} clusters "
        "in PostgreSQL."
    )


if __name__ == "__main__":
    main()