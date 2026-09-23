const express = require("express");

const {
  getClusters,
  getClusterById,
} = require("../controllers/clusterController");

const router = express.Router();

router.get("/", getClusters);

router.get("/:id", getClusterById);

module.exports = router;