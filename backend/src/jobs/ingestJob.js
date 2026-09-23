const { spawn } = require("child_process");
const path = require("path");
const crypto = require("crypto");

const jobs = new Map();

let activeJobId = null;


function startIngestionJob() {
  // Prevent two ingestion processes from running together
  if (activeJobId) {
    const error = new Error("An ingestion job is already running");
    error.code = "INGESTION_ALREADY_RUNNING";
    error.jobId = activeJobId;
    throw error;
  }

  const jobId = crypto.randomUUID();

  const job = {
    jobId,
    status: "queued",
    startedAt: null,
    completedAt: null,
    error: null,
    output: "",
  };

  jobs.set(jobId, job);
  activeJobId = jobId;

  // Start asynchronously so the HTTP request can return immediately
  setImmediate(() => {
    runIngestionJob(jobId);
  });

  return {
    jobId,
    status: job.status,
  };
}

function runIngestionJob(jobId) {
  const job = jobs.get(jobId);

  if (!job) {
    return;
  }

  job.status = "running";
  job.startedAt = new Date().toISOString();

  const scraperDirectory = path.resolve(
    __dirname,
    "../../../scraper"
  );

  const defaultPythonPath = path.join(
    scraperDirectory,
    ".venv",
    "bin",
    "python"
  );

  // PYTHON_PATH can be overridden through environment variables
  const pythonPath = process.env.PYTHON_PATH || defaultPythonPath;

  const scriptPath = path.join(
    scraperDirectory,
    "run_ingest.py"
  );

  console.log(`Starting ingestion job: ${jobId}`);
  console.log(`Python: ${pythonPath}`);
  console.log(`Script: ${scriptPath}`);

  const pythonProcess = spawn(
    pythonPath,
    [scriptPath],
    {
      cwd: scraperDirectory,
      env: process.env,
    }
  );

  pythonProcess.stdout.on("data", (data) => {
    const output = data.toString();

    job.output += output;

    // Keep memory usage reasonable
    if (job.output.length > 10000) {
      job.output = job.output.slice(-10000);
    }

    process.stdout.write(output);
  });

  pythonProcess.stderr.on("data", (data) => {
    const errorOutput = data.toString();

    job.output += errorOutput;

    if (job.output.length > 10000) {
      job.output = job.output.slice(-10000);
    }

    process.stderr.write(errorOutput);
  });

  pythonProcess.on("error", (error) => {
    console.error(`Failed to start ingestion job ${jobId}:`, error);

    job.status = "failed";
    job.error = error.message;
    job.completedAt = new Date().toISOString();

    activeJobId = null;
  });

  pythonProcess.on("close", (code) => {
    job.completedAt = new Date().toISOString();

    if (code === 0) {
      job.status = "completed";
      job.error = null;

      console.log(
        `Ingestion job ${jobId} completed successfully`
      );
    } else {
      job.status = "failed";
      job.error = `Python process exited with code ${code}`;

      console.error(
        `Ingestion job ${jobId} failed with exit code ${code}`
      );
    }

    activeJobId = null;
  });
}

function getIngestionJobStatus(jobId) {
  return jobs.get(jobId) || null;
}

module.exports = {
  startIngestionJob,
  getIngestionJobStatus,
};