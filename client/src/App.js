import { useState } from "react";
import "./App.css";
const { io } = require("socket.io-client");

function App() {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTestRunning, setIsTestRunning] = useState(false); // for test status
  const [socket, setSocket] = useState(null); // socket instance

  const handleConnect = () => {
    if (!isConnected) {
      const newSocket = io.connect("ws://localhost:5000"); //Manual connect to serever on button click

      // geting status
      newSocket.on("test-status", (status) => {
        setIsTestRunning(status);
      });

      // connect event for server
      newSocket.on("connect", () => {
        setIsConnected(true);
      });
      // error handling on connect event
      newSocket.on("connect_error", (err) => {
        setIsConnected(false);
        alert("Failed to connnect server. Make sure server is up!");
        newSocket.disconnect();
      });
      // on start event
      newSocket.on("start", (lines) => {
        setLogs(lines.slice(-10));
      });

      // getting updated logs from socket
      newSocket.on("update-log", (data) => {
        setLogs((prevLogs) => {
          const updateLogs = [...prevLogs, ...data];
          return updateLogs.slice(-10);
        });
      });

      setSocket(newSocket); //  setup socket instance
    } else {
      // disconnecting and assigning values to def
      socket.disconnect();
      setIsConnected(false);
      setSocket(null);
      setLogs([]);
    }
  };

  const handleTest = async () => {
    if (!isTestRunning) {
      try {
        const res = await fetch("http://localhost:5000/start-test");
        if (res.ok) {
        } else {
          alert("Failed to start test");
        }
      } catch (err) {
        alert("Error starting test:" + err.message);
      }
    } else {
      try {
        const res = await fetch("http://localhost:5000/stop-test");
        if (res.ok) {
        } else {
          alert("Failed to stop test");
        }
      } catch (err) {
        alert("Error stoping test:" + err.message);
      }
    }
  };

  return (
    <div className="log-container">
      <h1>Log Watcher</h1>
      <div id="message-container">
        {logs.map((log, index) => (
          <p key={index}>{log}</p>
        ))}
        <div className="button-container">
          <button onClick={handleConnect}>
            {isConnected ? "Disconnect" : "Connect"}
          </button>
          {isConnected && (
            <button onClick={handleTest}>
              {isTestRunning ? "Stop" : "Run"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
