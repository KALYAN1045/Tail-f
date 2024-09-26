const express = require("express");
const fs = require("fs");
const LogWatcher = require("./watcher");
const app = express();
const PORT = 5000;

// ---------------------------------------------------------server
// Setup cors for cross origin ref
const cors = require("cors");
app.use(cors());

const { Server } = require("socket.io");

const server = app.listen(PORT, () => {
  console.log(`Listening to ${PORT}`);
});

const io = new Server(server, { cors: { origin: "*" } });

// ---------------------------------------------------------- Logging
let testInterval = null;
let counter = 1;
let isTestRunning = false; // shared state to track whether the test is running among clients

const startLogging = () => {
  testInterval = setInterval(() => {
    const log = Date.now() + ": " + counter;
    fs.appendFile("test.log", "\n" + log, (err) => {
      if (err) console.log(err);
      console.log("log update:" + log);
    });
    counter++;
  }, 1000);
};

// start test end point
app.get("/start-test", (req, res) => {
  if (!testInterval) {
    startLogging();
    isTestRunning = true; // update test state
    io.emit("test-status", isTestRunning);
    return res.status(200).send("test started successfully");
  }
  return res.status(400).send("Test already runs");
});

// stop test endpoint
app.get("/stop-test", (req, res) => {
  if (testInterval) {
    // default aassigning
    clearInterval(testInterval);
    testInterval = null;
    isTestRunning = false; // update test state
    io.emit("test-status", isTestRunning); // notify all clients
    return res.status(200).send("test stopped successfully");
  }
  return res.status(400).send("Test not runs");
});

// ------------------------------------------------ main

const LOG_FILE = "test.log";
const logWatcher = new LogWatcher(LOG_FILE);

// start watching file for changes
logWatcher.start();

io.on("connection", function (socket) {
  console.log("A user connected");

  // test status emit
  socket.emit("test-status", isTestRunning);

  //getting first n lines
  logWatcher.getLastLines(10).then((lines) => {
    socket.emit("start", lines);
  });

  //log update listener app
  const updateListener = (lines) => {
    //emit lines for client
    socket.emit("update-log", lines);
  };

  // subscribing to update listener from watcher
  logWatcher.on("update", updateListener);

  socket.on("disconnect", function () {
    console.log("A user disconnected");
  });
});
