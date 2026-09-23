const pool = require("../db/pool");


async function getClusters() {
  const query = `
    SELECT
      c.id,
      c.label,
      COUNT(ac.article_id)::int AS article_count,
      MIN(a.published_at) AS start_time,
      MAX(a.published_at) AS end_time
    FROM clusters c
    JOIN article_clusters ac
      ON c.id = ac.cluster_id
    JOIN articles a
      ON ac.article_id = a.id
    GROUP BY c.id, c.label
    ORDER BY start_time DESC;
  `;

  const result = await pool.query(query);

  return result.rows;
}


async function getClusterById(clusterId) {
  const clusterQuery = `
    SELECT
      c.id,
      c.label,
      COUNT(ac.article_id)::int AS article_count,
      MIN(a.published_at) AS start_time,
      MAX(a.published_at) AS end_time
    FROM clusters c
    LEFT JOIN article_clusters ac
      ON c.id = ac.cluster_id
    LEFT JOIN articles a
      ON ac.article_id = a.id
    WHERE c.id = $1
    GROUP BY c.id, c.label;
  `;

  const clusterResult = await pool.query(clusterQuery, [clusterId]);

  if (clusterResult.rows.length === 0) {
    return null;
  }

  const cluster = clusterResult.rows[0];

  const articlesQuery = `
    SELECT
      a.id,
      a.title,
      a.source,
      a.published_at,
      a.url
    FROM articles a
    JOIN article_clusters ac
      ON a.id = ac.article_id
    WHERE ac.cluster_id = $1
    ORDER BY a.published_at ASC NULLS LAST;
  `;

  const articlesResult = await pool.query(articlesQuery, [clusterId]);

  return {
    ...cluster,
    articles: articlesResult.rows,
  };
}


async function getTimeline() {
  const query = `
    SELECT
      c.id,
      c.label,
      MIN(a.published_at) AS start_time,
      MAX(a.published_at) AS end_time,
      COUNT(ac.article_id)::int AS article_count,
      COUNT(ac.article_id)::int AS intensity
    FROM clusters c
    JOIN article_clusters ac
      ON c.id = ac.cluster_id
    JOIN articles a
      ON ac.article_id = a.id
    GROUP BY c.id, c.label
    ORDER BY start_time ASC;
  `;

  const result = await pool.query(query);

  return result.rows;
}

module.exports = {
  getClusters,
  getClusterById,
  getTimeline,
};