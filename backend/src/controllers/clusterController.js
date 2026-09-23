const clusterService = require("../services/clusterService");

async function getClusters(req, res) {
  try {
    const clusters = await clusterService.getClusters();

    return res.status(200).json({
      count: clusters.length,
      clusters,
    });
  } catch (error) {
    console.error("Error fetching clusters:", error);

    return res.status(500).json({
      error: "Failed to fetch clusters",
    });
  }
}


async function getClusterById(req, res) {
  try {
    const clusterId = Number(req.params.id);

    if (!Number.isInteger(clusterId) || clusterId <= 0) {
      return res.status(400).json({
        error: "Invalid cluster ID",
      });
    }

    const cluster = await clusterService.getClusterById(
      clusterId
    );

    if (!cluster) {
      return res.status(404).json({
        error: "Cluster not found",
      });
    }

    return res.status(200).json(cluster);
  } catch (error) {
    console.error("Error fetching cluster:", error);

    return res.status(500).json({
      error: "Failed to fetch cluster",
    });
  }
}

async function getTimeline(req, res) {
  try {
    const timeline = await clusterService.getTimeline();

    return res.status(200).json({
      count: timeline.length,
      timeline,
    });
  } catch (error) {
    console.error("Error fetching timeline:", error);

    return res.status(500).json({
      error: "Failed to fetch timeline",
    });
  }
}

module.exports = {
  getClusters,
  getClusterById,
  getTimeline,
};