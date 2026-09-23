const {
  startIngestionJob,
  getIngestionJobStatus,
} = require("../jobs/ingestJob");


function triggerIngestion(req, res) {
  try {
    const job = startIngestionJob();

    return res.status(202).json({
      message: "Ingestion job started",
      jobId: job.jobId,
      status: job.status,
    });
  } catch (error) {
    if (error.code === "INGESTION_ALREADY_RUNNING") {
      return res.status(409).json({
        error: "An ingestion job is already running",
        jobId: error.jobId,
      });
    }

    console.error("Failed to start ingestion:", error);

    return res.status(500).json({
      error: "Failed to start ingestion job",
    });
  }
}


function getIngestionStatus(req, res) {
  try {
    const { jobId } = req.params;

    const job = getIngestionJobStatus(jobId);

    if (!job) {
      return res.status(404).json({
        error: "Ingestion job not found",
        jobId,
      });
    }

    return res.status(200).json(job);
  } catch (error) {
    console.error("Failed to get ingestion status:", error);

    return res.status(500).json({
      error: "Failed to get ingestion status",
    });
  }
}

module.exports = {
  triggerIngestion,
  getIngestionStatus,
};