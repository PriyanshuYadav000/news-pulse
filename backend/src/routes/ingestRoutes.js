const express = require("express");

const {
  triggerIngestion,
  getIngestionStatus,
} = require("../controllers/ingestController");

const router = express.Router();

// Start ingestion
router.post("/trigger", triggerIngestion);

// Check ingestion status
router.get("/status/:jobId", getIngestionStatus);

module.exports = router;