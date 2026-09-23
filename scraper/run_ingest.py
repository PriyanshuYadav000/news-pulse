from pipeline import run_pipeline
from run_clustering import main as run_clustering


def main():
    print("========================================")
    print("Starting News Pulse ingestion")
    print("========================================")

    print("\n[1/2] Running RSS ingestion pipeline...")
    run_pipeline()

    print("\n[2/2] Running topic clustering...")
    run_clustering()

    print("\n========================================")
    print("News Pulse ingestion completed")
    print("========================================")


if __name__ == "__main__":
    main()