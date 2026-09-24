# News Pulse — Topic-Clustered News Timeline

A full-stack news aggregation system that collects recent RSS articles, groups related stories into topic clusters, and displays them as an interactive timeline.

## Live

- **Frontend:** https://news-pulse-steel.vercel.app/
- **Backend:** https://news-pulse-backend-962p.onrender.com
- **GitHub:** https://github.com/PriyanshuYadav000/news-pulse

## Architecture

```text
BBC / NPR / The Guardian
          │
          ▼
   Python ingestion
   Fetch → Normalize
   Filter → Extract
   Deduplicate
          │
          ▼
      PostgreSQL
 articles / clusters /
 article_clusters
          │
          ▼
   TF-IDF + similarity
   + agglomerative
      clustering
          │
          ▼
    Node.js / Express
          │
          ▼
     Next.js / React
       timeline UI
```

### Production

```text
Vercel
└── Next.js frontend

Render
└── Node.js + Express
    └── Python ingestion + clustering

Neon
└── PostgreSQL
```

## Features

### Data pipeline
- BBC News, NPR, The Guardian RSS feeds
- Feed normalization and UTC timestamps
- Seven-day freshness window
- Full article extraction with Trafilatura
- URL-based deduplication
- Content hashing
- PostgreSQL persistence

### Topic clustering
- TF-IDF vectorization
- Cosine similarity
- Agglomerative clustering
- Similarity threshold
- Meaningful-word overlap guard
- Common-word filtering

### Backend
- `GET /health`
- `GET /clusters`
- `GET /clusters/:id`
- `GET /timeline`
- `POST /ingest/trigger`
- `GET /ingest/status/:jobId`

### Frontend
- Timeline-style topic view
- Search
- Source filter
- Day and intensity filters
- Sorting
- 10-cluster pagination
- Expandable cluster details
- Article source/time/link
- Light/dark mode
- Refresh and ingestion status

## Data Flow

```text
RSS
 ↓
Fetch
 ↓
Normalize
 ↓
Keep last 7 days
 ↓
Extract article content
 ↓
Check URL
 ├─ exists → skip
 └─ new → insert
        ↓
   PostgreSQL
        ↓
   TF-IDF clustering
        ↓
   Express API
        ↓
   Next.js UI
```

The ingestion job is triggered asynchronously:

```text
POST /ingest/trigger
        ↓
Python subprocess
        ↓
RSS + PostgreSQL + clustering
        ↓
GET /ingest/status/:jobId
        ↓
completed
        ↓
GET /timeline
```

## Database

Three main tables:

```text
articles
clusters
article_clusters
```

`articles` stores the headline, summary, extracted content, source, URL, publication time, and content hash.

`clusters` stores generated topic labels.

`article_clusters` links articles to clusters.

The article URL is unique, so rerunning ingestion does not insert the same article twice.

## Why TF-IDF?

TF-IDF was chosen because it is:

- Explainable
- Lightweight for the current dataset
- Deterministic
- Easy to debug
- Free of external LLM/API dependencies

The main limitation is that TF-IDF is lexical rather than semantic, so stories using very different wording may not always cluster together.

## Project Structure

```text
news-pulse/
├── scraper/
│   ├── feeds.py
│   ├── normalizer.py
│   ├── extractor.py
│   ├── db.py
│   ├── pipeline.py
│   ├── clustering.py
│   ├── run_clustering.py
│   └── run_ingest.py
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── jobs/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── db/
│   │   └── server.js
│   └── package.json
│
├── frontend/
│   ├── src/app/
│   │   ├── page.jsx
│   │   ├── layout.js
│   │   └── globals.css
│   └── package.json
│
├── Dockerfile
├── .dockerignore
└── README.md
```

## Local Setup

### Requirements

- Git
- Python 3.11+
- Node.js + npm
- PostgreSQL

### 1. Clone

```bash
git clone https://github.com/PriyanshuYadav000/news-pulse.git
cd news-pulse
```

### 2. Python environment

```bash
cd scraper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Backend environment

Create `backend/.env`:

```env
DATABASE_URL=postgresql://localhost:5432/news_pulse
PORT=5001
```

### 4. Frontend environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:5001
```

### 5. Run backend

```bash
cd backend
npm install
npm start
```

### 6. Run frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

### 7. Run ingestion manually

```bash
cd scraper
source .venv/bin/activate
python run_ingest.py
```

## Verification

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Backend:

```bash
curl http://127.0.0.1:5001/health
```

Production:

```bash
curl https://news-pulse-backend-962p.onrender.com/health
```

## Known Limitations

- TF-IDF can produce occasional false positives.
- Job state is currently stored in memory.
- Only one ingestion job runs at a time.
- Clustering currently rebuilds clusters from the current article dataset.

## Future Improvements

- Semantic embeddings
- Cross-source story merging
- Incremental clustering
- Scheduled ingestion
- Persistent job queue
- Server-side pagination
- Richer timeline visualization
- Monitoring and metrics

## Submission

- **GitHub:** https://github.com/PriyanshuYadav000/news-pulse
- **Frontend:** https://news-pulse-steel.vercel.app/
- **Backend:** https://news-pulse-backend-962p.onrender.com
- **Video:** _Add your 2–3 minute walkthrough link_

## Status

```text
✅ Ingestion
✅ Normalization
✅ 7-day freshness filtering
✅ Article extraction
✅ URL deduplication
✅ PostgreSQL
✅ TF-IDF clustering
✅ Express API
✅ Next.js frontend
✅ Source filtering
✅ Cluster details
✅ Ingestion trigger + polling
✅ Production deployment
✅ Production verification
⬜ Demo video
```

## Author

**Priyanshu Yadav**

GitHub: https://github.com/PriyanshuYadav000  
LinkedIn: https://www.linkedin.com/in/priyanshu-yadav-337p
