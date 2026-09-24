const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const clusterRoutes = require("./routes/clusterRoutes");
const timelineRoutes = require("./routes/timelineRoutes");
const ingestRoutes = require("./routes/ingestRoutes");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || "0.0.0.0";

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "news-pulse-backend",
  });
});

app.use("/clusters", clusterRoutes);
app.use("/timeline", timelineRoutes);
app.use("/ingest", ingestRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);

  res.status(error.status || 500).json({
    error: error.message || "Internal server error",
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(
    `News Pulse backend running on http://${HOST}:${PORT}`
  );
});

server.on("error", (error) => {
  console.error("Server error:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});