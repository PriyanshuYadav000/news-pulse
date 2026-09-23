const express = require("express");

const { getTimeline } = require("../controllers/clusterController");

const router = express.Router();

router.get("/", getTimeline);

module.exports = router;