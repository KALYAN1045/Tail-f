const fs = require("fs");
const eventEmitter = require("events");

class LogWatcher extends eventEmitter {
  constructor(LogFile) {
    super();
    this.LogFile = LogFile;
    this.FileSize = 0;
  }

  start() {
    fs.stat(this.LogFile, (err, stats) => {
      if (err) {
        console.log("Error getting file stats", err);
        return;
      }
      this.FileSize = stats.size;
      this.watch();
    });
  }

  watch() {
    // watching file for every one second (1s)
    fs.watchFile(this.LogFile, { interval: 1000 }, (curr, prev) => {
      // Modifications to file, size change detection
      if (curr.size > this.FileSize) {
        // start = prev size of file, end = modified size
        const stream = fs.createReadStream(this.LogFile, {
          start: this.FileSize,
          end: curr.size - 1,
        });
        stream.setEncoding("UTF8");
        let data = "";
        stream.on("data", (chunk) => {
          // streaming data
          data += chunk; // adding modified data to chunks
        });
        stream.on("end", () => {
          const lines = data.split("\n").filter((line) => line.length > 0);
          //   console.log(lines);
          if (lines.length > 0) {
            //if modification observed, lines are emitted
            this.emit("update", lines);
          }
        });
      }
      // removed something manually
      else if (curr.size < this.FileSize) {
        this.emit("update", ["File was modified"]);
      }
      this.FileSize = curr.size; // updating file size accordingly
    });
  }

  getLastLines(n) {
    // returning a promise
    return new Promise((resolve, reject) => {
      // gives stats of curr file
      fs.stat(this.LogFile, (err, stats) => {
        // error handler
        if (err) {
          reject(err);
          return;
        }

        // returns empty array for empty file
        if (stats.size === 0) {
          resolve([]);
          return;
        }

        // 10 kb of min read size for safety in chunk reading
        const readSize = Math.min(stats.size, 10000);
        // |---------------------------------------------| => stats.size
        // |--------------------|------------------------|
        //                     start   <---readsize--->
        const start = stats.size - readSize;

        // creating a read stream with given start and till end
        const stream = fs.createReadStream(this.LogFile, {
          start: start,
          end: stats.size - 1,
        });
        stream.setEncoding("UTF8");
        let data = "";
        stream.on("data", (chunk) => {
          // streaming data
          data = chunk + data; // prepend chunks
        });
        // Waited till end event to receive all chunks as one piece
        stream.on("end", () => {
          const lines = data.split("\n");
          resolve(lines.slice(-n));
        });
      });
    });
  }
}

module.exports = LogWatcher;
