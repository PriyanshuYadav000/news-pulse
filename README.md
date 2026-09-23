# News Pulse — Topic-Clustered News Timeline

> A full-stack news aggregation and topic-clustering platform that turns live RSS feeds into a clean, interactive, time-oriented view of current stories.

News Pulse collects recent articles from multiple public RSS feeds, normalizes inconsistent feed data, filters stale entries, extracts article content, prevents duplicate storage, groups related stories using TF-IDF-based similarity and agglomerative clustering, persists the result in PostgreSQL, and exposes the processed data through a Node.js/Express REST API.

The Next.js/React frontend consumes the API and presents the result as an interactive timeline with search, sorting, day filtering, pagination, cluster details, and manual ingestion controls.

---

## Project Status

| Area | Status |
|---|---|
| RSS ingestion | ✅ Complete |
| Article normalization | ✅ Complete |
| Seven-day freshness filtering | ✅ Complete |
| Article extraction | ✅ Complete |
| URL-based deduplication | ✅ Complete |
| PostgreSQL persistence | ✅ Complete |
| TF-IDF topic clustering | ✅ Complete |
| Express REST API | ✅ Complete |
| Ingestion job API | ✅ Complete |
| Next.js frontend | ✅ Complete |
| Search | ✅ Complete |
| Sorting | ✅ Complete |
| Day filtering | ✅ Complete |
| 10-cluster pagination | ✅ Complete |
| Local end-to-end testing | ✅ Complete |
| Frontend linting | ✅ Passing |
| Source filter | ✅ Complete |
| Production deployment | 🚧 Upcoming |
| Production verification | 🚧 Upcoming |
| Demo video | 🚧 Upcoming |

> The deployment and final submission sections below describe the planned production phase. They are intentionally marked as upcoming until the system is actually deployed and verified.

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Goals](#goals)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [End-to-End Data Flow](#end-to-end-data-flow)
- [Python Ingestion Pipeline](#python-ingestion-pipeline)
- [RSS Sources](#rss-sources)
- [Normalization](#normalization)
- [Freshness Filtering](#freshness-filtering)
- [Article Extraction](#article-extraction)
- [Deduplication and Idempotency](#deduplication-and-idempotency)
- [Topic Clustering](#topic-clustering)
- [Database Design](#database-design)
- [Backend Architecture](#backend-architecture)
- [API Reference](#api-reference)
- [Ingestion Job Lifecycle](#ingestion-job-lifecycle)
- [Frontend Architecture](#frontend-architecture)
- [Timeline Experience](#timeline-experience)
- [Search, Filtering and Sorting](#search-filtering-and-sorting)
- [Pagination](#pagination)
- [Cluster Detail View](#cluster-detail-view)
- [Refresh and Ingestion UX](#refresh-and-ingestion-ux)
- [Error Handling](#error-handling)
- [Environment Variables](#environment-variables)
- [Local Setup](#local-setup)
- [Running the Project](#running-the-project)
- [Testing](#testing)
- [Deployment Plan](#deployment-plan)
- [Upcoming Production Phase](#upcoming-production-phase)
- [Production Configuration](#production-configuration)
- [Engineering Decisions](#engineering-decisions)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)
- [Final Submission Checklist](#final-submission-checklist)
- [Author](#author)

---

# Overview

News Pulse transforms a stream of RSS articles into a structured topic timeline.

Instead of treating every headline as an isolated item, the application processes the feed data through a pipeline:

```text
                    ┌─────────────────────┐
                    │    Public RSS Feeds │
                    │ BBC / NPR / Guardian │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Python Ingestion    │
                    │ Fetch + Normalize   │
                    │ Filter + Extract    │
                    │ Deduplicate         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     PostgreSQL      │
                    │ Articles + Clusters │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Topic Clustering    │
                    │ TF-IDF + Similarity │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Node.js / Express   │
                    │ REST API            │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Next.js / React UI  │
                    │ Interactive Timeline│
                    └─────────────────────┘
```

---

# Problem Statement

RSS feeds provide useful article metadata, but raw feed entries do not directly provide a topic-oriented view of the news cycle.

News Pulse is designed to make it easier to answer questions such as:

- Which stories are related?
- How many articles belong to a topic?
- When did a topic first appear?
- Over what time window was a topic active?
- Which source published a particular article?
- Which articles belong to a cluster?
- Can the ingestion pipeline be rerun without continuously creating duplicates?

---

# Goals

The project was built around five main goals:

1. **Reliable ingestion** — collect current stories from multiple public feeds.
2. **Clean data** — normalize, filter, extract and deduplicate articles before persistence.
3. **Topic discovery** — group related articles into interpretable clusters.
4. **API-first access** — expose the processed data through clear REST endpoints.
5. **Useful UI** — make topic activity easy to explore through a timeline.

---

# Key Features

## News Ingestion

- BBC News RSS
- NPR News RSS
- The Guardian World RSS
- RSS parsing with `feedparser`
- Common article normalization
- UTC timestamp normalization
- Seven-day freshness window
- Full-article extraction using Trafilatura
- URL-level deduplication
- Content hashing
- PostgreSQL persistence

## Topic Clustering

- TF-IDF vectorization
- Cosine similarity
- Agglomerative clustering
- Similarity threshold
- Meaningful-word overlap guard
- Generic/common news-word filtering
- Persisted cluster relationships

## Backend

- Node.js
- Express.js
- PostgreSQL via `pg`
- Cluster endpoints
- Timeline endpoint
- Ingestion trigger endpoint
- Ingestion status endpoint
- Health endpoint
- Validation and error handling
- Asynchronous Python subprocess execution

## Frontend

- Next.js App Router
- React
- Tailwind CSS
- Timeline-style topic presentation
- Search
- Sorting
- Day filtering
- 10-cluster pagination
- Expandable cluster details
- Loading / empty / error states
- Ingestion status feedback
- Manual ingestion trigger
- Timeline refresh

---

# Architecture

The application is intentionally divided into independent layers.

```text
┌─────────────────────────────────────────────────────────────┐
│                        RSS Sources                           │
│                 BBC | NPR | The Guardian                    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Python Data Pipeline                     │
│                                                             │
│  feeds.py → normalizer.py → pipeline.py → extractor.py    │
│                               │                             │
│                               └────→ PostgreSQL             │
│                                                             │
│  clustering.py / run_clustering.py                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                         PostgreSQL                          │
│              articles / clusters / article_clusters        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Node.js / Express API                    │
│                                                             │
│ /health                                                     │
│ /clusters                                                    │
│ /clusters/:id                                                │
│ /timeline                                                    │
│ /ingest/trigger                                              │
│ /ingest/status/:jobId                                       │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     Next.js / React UI                      │
│                                                             │
│ Timeline • Search • Sorting • Filters • Pagination          │
│ Cluster Details • Refresh • Ingestion Status               │
└─────────────────────────────────────────────────────────────┘
```

---

# Project Structure

```text
news-pulse/
│
├── scraper/
│   ├── feeds.py
│   ├── normalizer.py
│   ├── extractor.py
│   ├── db.py
│   ├── pipeline.py
│   ├── clustering.py
│   ├── run_clustering.py
│   ├── run_ingest.py
│   └── requirements.txt
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── clusterController.js
│   │   │   └── ingestController.js
│   │   │
│   │   ├── jobs/
│   │   │   └── ingestJob.js
│   │   │
│   │   ├── routes/
│   │   │   ├── clusterRoutes.js
│   │   │   ├── timelineRoutes.js
│   │   │   └── ingestRoutes.js
│   │   │
│   │   ├── services/
│   │   │   └── clusterService.js
│   │   │
│   │   ├── db/
│   │   │   └── pool.js
│   │   │
│   │   └── server.js
│   │
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── page.js
│   │       ├── layout.js
│   │       └── globals.css
│   │
│   ├── package.json
│   └── next.config.mjs
│
├── README.md
└── .gitignore
```

### Responsibilities by major module

| Module | Responsibility |
|---|---|
| `feeds.py` | Fetch RSS feeds |
| `normalizer.py` | Normalize titles, summaries and timestamps |
| `extractor.py` | Extract full article content |
| `pipeline.py` | Orchestrate ingestion, freshness filtering, deduplication and persistence |
| `db.py` | Python-side PostgreSQL operations |
| `clustering.py` | TF-IDF and similarity-based clustering |
| `run_clustering.py` | Load articles, run clustering, persist clusters |
| `run_ingest.py` | Run ingestion followed by clustering |
| `server.js` | Start Express and register routes |
| `clusterService.js` | Cluster/timeline database queries |
| `ingestJob.js` | Launch and track the Python ingestion subprocess |
| `page.js` | Main frontend experience |

---

# Technology Stack

## Data Pipeline

| Technology | Purpose |
|---|---|
| Python 3.11 | Data processing |
| feedparser | RSS parsing |
| Trafilatura | Article extraction |
| psycopg2-binary | PostgreSQL access |
| python-dotenv | Environment configuration |
| scikit-learn | TF-IDF + clustering |
| lxml_html_clean | HTML parsing/cleaning |

## Backend

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express.js | REST API |
| `pg` | PostgreSQL client |
| CORS | Cross-origin API access |
| dotenv | Environment configuration |
| nodemon | Development workflow |

## Frontend

| Technology | Purpose |
|---|---|
| Next.js | React application framework |
| React | UI layer |
| JavaScript | Application code |
| Tailwind CSS | Styling |
| Fetch API | Backend communication |

## Database

- PostgreSQL

---

# End-to-End Data Flow

```text
RSS Feed
   │
   ▼
Fetch entries
   │
   ▼
Normalize data
   │
   ▼
Convert timestamps to UTC
   │
   ▼
Apply 7-day freshness rule
   │
   ▼
Extract article content
   │
   ▼
Check URL uniqueness
   │
   ├── Existing → Skip
   │
   └── New → Continue
            │
            ▼
       Calculate content hash
            │
            ▼
       Insert into PostgreSQL
            │
            ▼
       Load all current articles
            │
            ▼
       TF-IDF vectorization
            │
            ▼
       Similarity calculation
            │
            ▼
       Agglomerative clustering
            │
            ▼
       Persist clusters
            │
            ▼
       Express API
            │
            ▼
       Next.js timeline
```

---

# Python Ingestion Pipeline

The Python pipeline is the data-processing core of the application.

The main stages are:

```text
1. Fetch
2. Normalize
3. Filter
4. Extract
5. Deduplicate
6. Persist
7. Cluster
```

The complete pipeline is available through:

```bash
python run_ingest.py
```

---

# RSS Sources

The current implementation uses three public feeds.

### BBC News

```text
https://feeds.bbci.co.uk/news/rss.xml
```

### NPR News

```text
https://feeds.npr.org/1001/rss.xml
```

### The Guardian World

```text
https://www.theguardian.com/world/rss
```

Each feed is fetched independently and the source identifier is retained in the normalized article record.

---

# Normalization

RSS providers do not always expose identical metadata structures or timestamp formats.

The normalization stage converts each feed entry into a consistent internal representation:

```python
{
    "title": "...",
    "summary": "...",
    "source": "...",
    "url": "...",
    "published_at": "...",
    "content": "...",
    "content_hash": "..."
}
```

Publication times are normalized to UTC so timeline sorting behaves consistently across sources.

---

# Freshness Filtering

The ingestion pipeline uses a fixed seven-day freshness window.

```text
Current UTC time
      │
      ▼
Current time - 7 days
      │
      ▼
Keep recent articles
Skip older/invalid entries
```

This prevents old RSS entries from dominating the active timeline.

Articles without a usable publication timestamp are also skipped.

---

# Article Extraction

RSS feeds generally provide only a summary, so News Pulse fetches the original article URL and uses Trafilatura to extract readable article content.

```text
RSS entry
   │
   ▼
Original article URL
   │
   ▼
Trafilatura
   │
   ▼
Clean article content
   │
   ▼
PostgreSQL
```

Extraction is isolated per article so a single problematic page does not stop the entire ingestion cycle.

---

# Deduplication and Idempotency

The pipeline is designed to be rerunnable.

The primary deduplication mechanism is the article URL.

The database enforces:

```sql
url TEXT NOT NULL UNIQUE
```

The insertion logic uses conflict handling so an existing article URL is skipped rather than inserted again.

Example:

```text
Run #1
  └── Article A → inserted

Run #2
  └── Article A → existing URL → skipped
```

This makes repeated ingestion safe and prevents unnecessary growth from repeated RSS runs.

---

# Content Hashing

A SHA-256-style content hash is generated for article content and stored in:

```text
content_hash
```

The URL remains the primary uniqueness constraint, while the content hash provides an additional compact representation of article content for comparison and future deduplication improvements.

---

# Topic Clustering

News Pulse uses a lightweight, explainable NLP approach:

```text
Article text
   │
   ▼
TF-IDF
   │
   ▼
Vector representation
   │
   ▼
Cosine similarity
   │
   ▼
Similarity filtering
   │
   ▼
Agglomerative clustering
   │
   ▼
Topic clusters
```

---

## Why TF-IDF?

TF-IDF was chosen because it is:

- Easy to explain
- Fast for the current dataset size
- Locally executable
- Deterministic
- Free of external inference/API dependencies
- Straightforward to debug

---

## Input to the Model

The current clustering representation is built primarily from:

```text
headline + summary
```

rather than the complete extracted article body.

This keeps clustering lightweight while preserving useful topic signals from the most information-dense fields.

---

## Similarity Guard

A similarity threshold is used to prevent very weak relationships from becoming clusters.

The implementation also checks meaningful-word overlap and excludes generic high-frequency news vocabulary.

This reduces cases where unrelated stories happen to share common terms.

---

## Example

Input:

```text
Article A:
Japan hit by heavy rain as typhoon triggers landslides

Article B:
Heavy rain and landslides disrupt communities in Japan

Article C:
Football club announces new manager
```

Expected grouping:

```text
Cluster A
─────────
Japan
Typhoon
Rain
Landslides

Cluster B
─────────
Football
Manager
```

---

# Database Design

PostgreSQL is the persistent source of truth for the application.

The main tables are:

```text
articles
clusters
article_clusters
```

---

## `articles`

```sql
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    source VARCHAR(100) NOT NULL,
    url TEXT NOT NULL UNIQUE,
    published_at TIMESTAMPTZ,
    content_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Columns

| Column | Purpose |
|---|---|
| `id` | Article identifier |
| `title` | Headline |
| `summary` | RSS summary |
| `content` | Extracted article content |
| `source` | Feed/source name |
| `url` | Original article URL |
| `published_at` | Original publication time |
| `content_hash` | Content hash |
| `created_at` | Storage timestamp |

---

## `clusters`

```sql
CREATE TABLE clusters (
    id SERIAL PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The cluster record represents a generated topic grouping.

---

## `article_clusters`

```sql
CREATE TABLE article_clusters (
    article_id INTEGER NOT NULL
        REFERENCES articles(id) ON DELETE CASCADE,

    cluster_id INTEGER NOT NULL
        REFERENCES clusters(id) ON DELETE CASCADE,

    PRIMARY KEY (article_id, cluster_id)
);
```

This table stores the relationship between articles and their generated clusters.

---

# Backend Architecture

The backend follows a simple layered structure:

```text
Route
  │
  ▼
Controller
  │
  ▼
Service
  │
  ▼
PostgreSQL
```

This keeps HTTP concerns separate from database/business logic.

The ingestion flow is additionally handled through a job module that starts the Python process.

---

# API Reference

Base URL for local development:

```text
http://127.0.0.1:5001
```

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Backend health check |
| `GET` | `/clusters` | List topic clusters |
| `GET` | `/clusters/:id` | Get one cluster and its articles |
| `GET` | `/timeline` | Timeline-ready cluster data |
| `POST` | `/ingest/trigger` | Start ingestion |
| `GET` | `/ingest/status/:jobId` | Check ingestion job status |

---

## `GET /health`

Example:

```bash
curl http://127.0.0.1:5001/health
```

Response:

```json
{
  "status": "ok",
  "service": "news-pulse-backend"
}
```

---

## `GET /clusters`

Returns topic clusters with:

- cluster ID
- label
- article count
- earliest article time
- latest article time

Example:

```bash
curl http://127.0.0.1:5001/clusters
```

---

## `GET /clusters/:id`

Returns a complete cluster and its articles sorted chronologically.

Example:

```bash
curl http://127.0.0.1:5001/clusters/12
```

The article detail includes:

- headline
- source
- published timestamp
- original URL

---

## `GET /timeline`

Returns compact timeline-ready data.

Example response shape:

```json
{
  "count": 113,
  "timeline": [
    {
      "id": 12,
      "label": "Example topic",
      "start_time": "2026-09-23T10:00:00.000Z",
      "end_time": "2026-09-23T12:00:00.000Z",
      "article_count": 2,
      "intensity": 2
    }
  ]
}
```

The frontend uses the response to render the timeline without requesting full article content for every cluster up front.

---

## `POST /ingest/trigger`

Starts the Python ingestion and clustering pipeline asynchronously.

Example:

```bash
curl -X POST http://127.0.0.1:5001/ingest/trigger
```

Example response:

```json
{
  "message": "Ingestion started",
  "jobId": "example-job-id",
  "status": "queued"
}
```

---

## `GET /ingest/status/:jobId`

Returns the state of an ingestion job.

Possible states:

```text
queued
running
completed
failed
```

Example:

```bash
curl http://127.0.0.1:5001/ingest/status/<JOB_ID>
```

---

# HTTP Status Codes

| Status | Meaning |
|---|---|
| `200` | Successful request |
| `202` | Ingestion accepted / started |
| `400` | Invalid request or identifier |
| `404` | Resource not found |
| `409` | Another ingestion is already running |
| `500` | Unexpected server-side error |

---

# Ingestion Job Lifecycle

The backend starts the Python pipeline as a subprocess.

```text
POST /ingest/trigger
        │
        ▼
Create job ID
        │
        ▼
Status = queued
        │
        ▼
Spawn Python process
        │
        ▼
Status = running
        │
        ├── RSS ingestion
        │
        ├── PostgreSQL inserts
        │
        └── TF-IDF clustering
        │
        ▼
Status = completed / failed
```

Only one ingestion job is allowed to run at a time in the current implementation.

---

# Frontend Architecture

The frontend uses the Next.js App Router:

```text
frontend/
└── src/
    └── app/
        ├── page.js
        ├── layout.js
        └── globals.css
```

### `layout.js`

Responsible for:

- root HTML structure
- global body wrapper
- global CSS import
- metadata
- global font setup

### `globals.css`

Contains global styling and the application's global CSS/Tailwind layer.

### `page.js`

Contains the main News Pulse experience, including:

- timeline loading
- filtering
- sorting
- pagination
- cluster details
- ingestion controls
- status polling
- refresh
- loading states
- error states

---

# Timeline Experience

The frontend is designed around a topic-oriented timeline rather than a raw article list.

Each cluster communicates:

- topic label
- time position
- article count
- relative intensity

The UI also groups time-based views by day to make recent coverage easier to scan.

---

# Search, Filtering and Sorting

## Search

Users can search cluster labels on the client.

Example:

```text
Search → "Japan"
```

The visible set is reduced to matching cluster labels.

## Day Filtering

The user can select a specific day from the timeline coverage visualization.

## Sorting

The available sort modes are:

- Latest first
- Oldest first
- Most articles
- Highest intensity

For time-based sorting, clusters are grouped under day headings.

---

# Pagination

The frontend uses client-side pagination.

Processing order:

```text
GET /timeline
      │
      ▼
Apply search / day filter
      │
      ▼
Apply sorting
      │
      ▼
Paginate
      │
      ▼
Display 10 clusters
```

Current page size:

```text
10 clusters
```

Navigation:

```text
← Previous     Page X of Y     Next →
```

Pagination resets when relevant filters or sorting controls change.

---

# Cluster Detail View

Cluster details are fetched on demand.

Initial load:

```text
GET /timeline
```

User opens a cluster:

```text
GET /clusters/:id
```

The UI then displays:

- article headline
- source
- published time
- original article link

This keeps the initial timeline payload smaller and avoids loading all article details unnecessarily.

Cluster details are cached in frontend state to avoid repeating the same request after a successful load.

---

# Refresh and Ingestion UX

There are two different actions in the frontend:

### Refresh Timeline

Fetches the latest cluster state already stored in the backend.

```text
GET /timeline
```

### Run Ingestion

Runs the complete pipeline.

```text
POST /ingest/trigger
        │
        ▼
Poll /ingest/status/:jobId
        │
        ▼
Wait for completed
        │
        ▼
GET /timeline
```

When ingestion finishes successfully, the frontend clears relevant cached cluster state and reloads the timeline.

---

# Error Handling

The application explicitly handles:

- failed timeline requests
- missing clusters
- invalid cluster IDs
- failed cluster-detail requests
- duplicate ingestion triggers
- failed ingestion jobs
- empty search/filter results
- loading states
- aborted requests

The frontend avoids silently failing when the backend is unavailable.

---

# Environment Variables

## Backend

Create:

```text
backend/.env
```

Local example:

```env
DATABASE_URL=postgresql://localhost:5432/news_pulse
PORT=5001
```

## Frontend

Create:

```text
frontend/.env.local
```

Local example:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:5001
```

For production, `NEXT_PUBLIC_API_URL` will point to the deployed backend.

> Do not commit credentials, connection strings containing secrets, or local environment files.

---

# Local Setup

## Prerequisites

Install:

- Git
- Python 3.11+
- Node.js
- npm
- PostgreSQL

---

## 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd news-pulse
```

---

## 2. Set up Python

```bash
cd scraper

python3 -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
```

---

## 3. Create PostgreSQL database

Create:

```text
news_pulse
```

Configure the backend database connection:

```env
DATABASE_URL=postgresql://localhost:5432/news_pulse
```

---

## 4. Run the pipeline

```bash
cd scraper
source .venv/bin/activate

python run_ingest.py
```

This runs:

```text
Fetch
  ↓
Normalize
  ↓
Freshness filter
  ↓
Extract
  ↓
Deduplicate
  ↓
Persist
  ↓
Cluster
```

---

## 5. Start the backend

In another terminal:

```bash
cd backend
npm install
node src/server.js
```

Backend:

```text
http://localhost:5001
```

---

## 6. Start the frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

---

# Running the Project

Recommended local development setup:

### Terminal 1

```bash
cd ~/Documents/news-pulse/backend
node src/server.js
```

### Terminal 2

```bash
cd ~/Documents/news-pulse/frontend
npm run dev
```

### Terminal 3 — optional manual pipeline

```bash
cd ~/Documents/news-pulse/scraper
source .venv/bin/activate
python run_ingest.py
```

---

# Development Commands

## Frontend

```bash
npm run dev
```

```bash
npm run lint
```

```bash
npm run build
```

## Backend

```bash
node src/server.js
```

## Python

```bash
python run_ingest.py
```

```bash
python run_clustering.py
```

---

# API Testing Examples

## Health

```bash
curl http://127.0.0.1:5001/health
```

## Clusters

```bash
curl http://127.0.0.1:5001/clusters
```

## Cluster detail

```bash
curl http://127.0.0.1:5001/clusters/1
```

## Timeline

```bash
curl http://127.0.0.1:5001/timeline
```

## Start ingestion

```bash
curl -X POST http://127.0.0.1:5001/ingest/trigger
```

## Check ingestion

```bash
curl http://127.0.0.1:5001/ingest/status/<JOB_ID>
```

---

# Testing

The application has been tested locally across the major components.

## Python Pipeline

Validated through:

- RSS fetches
- normalization
- freshness filtering
- duplicate detection
- article extraction
- PostgreSQL insertion
- clustering
- reruns

## Backend

Validated endpoints:

- `/health`
- `/clusters`
- `/clusters/:id`
- `/timeline`
- `/ingest/trigger`
- `/ingest/status/:jobId`

Error cases and status codes were also checked.

## Frontend

Validated behavior:

- initial timeline loading
- timeline rendering
- cluster expansion
- search
- sorting
- day filtering
- 10-cluster pagination
- ingestion trigger
- ingestion status polling
- refresh after ingestion
- loading states
- empty states
- error states

## Linting

The frontend currently passes:

```bash
npm run lint
```

without ESLint errors.

---

# Deployment Plan

The target production architecture is:

```text
                     ┌────────────────┐
                     │     Vercel     │
                     │  Next.js App   │
                     └───────┬────────┘
                             │
                          HTTPS API
                             │
                             ▼
                     ┌────────────────┐
                     │ Backend Host  │
                     │ Node + Express│
                     └───────┬────────┘
                             │
                  ┌──────────┴───────────┐
                  │                      │
                  ▼                      ▼
          ┌──────────────┐      ┌────────────────┐
          │ Python       │      │ Hosted         │
          │ Ingestion    │      │ PostgreSQL     │
          │ + Clustering │      │                │
          └──────┬───────┘      └────────────────┘
                 │
                 ▼
          Public RSS Sources
```

Planned deployment responsibilities:

| Component | Planned hosting |
|---|---|
| Next.js frontend | Vercel |
| Node.js backend | Render / Railway |
| PostgreSQL | Hosted PostgreSQL |
| Python pipeline | Same backend runtime or dedicated scheduled/job runtime |
| Environment variables | Hosting platform secrets/configuration |

> Exact providers may change during the final deployment phase. This README will be updated after the live architecture is confirmed.

---

# Upcoming Production Phase

Production deployment is the next major phase and is **not yet marked complete**.

## Phase 1 — Final feature completion

Before deployment:

- [ ] Complete source filtering
- [ ] Re-run frontend lint
- [ ] Run production build
- [ ] Verify all required backend endpoints
- [ ] Verify ingestion end-to-end one final time

## Phase 2 — Database deployment

- [ ] Create hosted PostgreSQL database
- [ ] Create production schema
- [ ] Configure `DATABASE_URL`
- [ ] Seed/ingest initial production data

## Phase 3 — Backend deployment

- [ ] Deploy Express API
- [ ] Configure production environment variables
- [ ] Ensure Python 3.11+ is available
- [ ] Install Python dependencies
- [ ] Verify the backend can launch `run_ingest.py`
- [ ] Verify `/health`

## Phase 4 — Frontend deployment

- [ ] Deploy Next.js application
- [ ] Set `NEXT_PUBLIC_API_URL`
- [ ] Verify frontend → backend communication
- [ ] Verify cluster expansion and ingestion

## Phase 5 — Live verification

Test:

```text
Homepage
Timeline
Search
Sorting
Source filtering
Day filtering
Pagination
Cluster details
Refresh
Run ingestion
Ingestion status
```

## Phase 6 — Final submission assets

- [ ] Add production URLs to README
- [ ] Record 2–3 minute walkthrough
- [ ] Review Git history
- [ ] Verify no secrets are committed
- [ ] Final repository cleanup
- [ ] Submit project

---

# Production Configuration

## Frontend

Production environment variable:

```env
NEXT_PUBLIC_API_URL=<DEPLOYED_BACKEND_URL>
```

## Backend

Production environment:

```env
DATABASE_URL=<HOSTED_POSTGRES_CONNECTION_STRING>
PORT=<PLATFORM_PORT>
```

The exact values will be supplied by the chosen hosting platform.

---

# Engineering Decisions

## Why PostgreSQL?

The application has clear relational entities:

```text
Articles
   │
   └── article_clusters ──► Clusters
```

PostgreSQL provides:

- foreign-key relationships
- unique constraints
- cascading deletes
- timestamp support
- aggregation queries
- reliable persistence

---

## Why Python for ingestion?

Python has mature libraries for:

- RSS parsing
- HTML extraction
- text processing
- TF-IDF
- clustering

Keeping ingestion in Python also keeps the data-processing logic independent of the HTTP API.

---

## Why Node.js / Express for the API?

Node.js provides a lightweight REST layer between the frontend and the data-processing/database layer.

It is also used to launch the Python pipeline asynchronously when the frontend requests fresh ingestion.

---

## Why Next.js?

Next.js provides:

- a structured React application
- App Router
- production builds
- straightforward deployment
- clean component/page organization

---

## Why TF-IDF instead of an external LLM?

The clustering problem can be handled with classical NLP for the current scope.

TF-IDF was chosen because it:

- is inexpensive
- is locally executable
- is explainable
- is easy to debug
- avoids external inference dependencies

---

## Why client-side pagination?

The current cluster dataset is small enough for the frontend to retrieve timeline metadata once and then perform:

```text
Filter → Sort → Paginate
```

on the client.

If the dataset grows significantly, server-side pagination can be introduced later.

---

# Known Limitations

## Lexical rather than semantic clustering

TF-IDF focuses on word-level overlap, so two articles that describe the same event with very different language may not always cluster together.

## Occasional false positives

Unrelated articles can occasionally share generic terms.

The current implementation reduces this through:

- similarity thresholding
- meaningful-word overlap
- common-word filtering

## In-memory ingestion job state

Job state is currently maintained in application memory.

A production-scale system would benefit from a persistent job queue such as Redis/BullMQ, Celery, or database-backed job records.

## One active ingestion job

The current backend prevents overlapping ingestion jobs.

## Source filtering

The required source filter is the remaining frontend feature before the final deployment phase.

---

# Future Improvements

## Semantic embeddings

A future version could replace or supplement TF-IDF with embeddings:

```text
Article
   ↓
Embedding Model
   ↓
Vector Representation
   ↓
Semantic Similarity
   ↓
Topic Clustering
```

## Cross-source story merging

Detect the same real-world event across publishers even when headline wording differs significantly.

## Scheduled ingestion

Run ingestion automatically on a recurring schedule.

## Persistent job queue

Add retryable background jobs with durable job history.

## Richer timeline visualization

Potential additions:

- cluster duration bars
- source distribution
- article density
- cluster growth
- temporal overlap visualization

## Observability

Add:

- structured logging
- latency metrics
- ingestion success/failure metrics
- extraction success rate
- cluster statistics
- monitoring and alerting

---

# Final Submission Checklist

## Functional

- [ ] Source filter complete
- [x] Timeline complete
- [x] Cluster detail complete
- [x] Search complete
- [x] Sorting complete
- [x] Day filtering complete
- [x] 10-cluster pagination complete
- [x] Manual ingestion complete
- [x] Ingestion status polling complete
- [x] Timeline refresh complete

## Backend

- [x] `/health`
- [x] `/clusters`
- [x] `/clusters/:id`
- [x] `/timeline`
- [x] `/ingest/trigger`
- [x] `/ingest/status/:jobId`

## Data Pipeline

- [x] RSS ingestion
- [x] normalization
- [x] freshness filtering
- [x] article extraction
- [x] deduplication
- [x] PostgreSQL persistence
- [x] TF-IDF clustering
- [x] cluster persistence

## Quality

- [x] Local end-to-end testing
- [x] Frontend linting
- [ ] Production build verification
- [ ] Production smoke testing

## Deployment

- [ ] Hosted PostgreSQL
- [ ] Backend deployment
- [ ] Python runtime in production
- [ ] Frontend deployment
- [ ] Environment variables
- [ ] Live API testing
- [ ] Live ingestion testing
- [ ] Live frontend testing

## Submission

- [ ] Production URLs added to README
- [ ] 2–3 minute video recorded
- [ ] GitHub repository reviewed
- [ ] Secrets checked
- [ ] Final submission sent

---

# Author

## Priyanshu Yadav

B.Tech (Hons.) Computer Science Engineering

**GitHub:**  
https://github.com/PriyanshuYadav000

**LinkedIn:**  
https://www.linkedin.com/in/priyanshu-yadav-337p

---

## Project Summary

News Pulse combines a Python data-processing pipeline, PostgreSQL storage, a Node.js/Express API, and a Next.js frontend into one end-to-end application for collecting, clustering, and exploring current news.

The current implementation is locally complete across ingestion, clustering, persistence, API integration, and the main frontend experience. The remaining phase is production deployment, final source filtering, live verification, and submission preparation.
