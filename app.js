require("dotenv").config();

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const ffmpeg = require("fluent-ffmpeg");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*"
  }
});

const rtspStreamUrl = process.env.RTPS_URL;

// Function to start streaming
const startStreaming = () => {
  const ffmpegCommand = ffmpeg(rtspStreamUrl)
    .inputFormat("rtsp")
    .outputFormat("mpegts")
    .videoCodec("mpeg1video")
    .audioCodec("mp2")
    .size("640x480")
    .videoBitrate(800)
    .audioBitrate(128)
    .inputFPS(30)
    .outputFPS(30)
    .on("end", () => console.log("Streaming ended"))
    .on("error", err => console.error("Error:", err))
    .pipe(io.emit("stream")); // Emit to all connected clients

  return ffmpegCommand;
};

io.on("connection", socket => {
  console.log("Client connected");

  let ffmpegProcess;

  // Start streaming when a client connects
  if (!ffmpegProcess) {
    ffmpegProcess = startStreaming();
  }

  socket.on("disconnect", () => {
    console.log("Client disconnected");

    // Stop streaming when the last client disconnects
    if (io.engine.clientsCount === 0 && ffmpegProcess) {
      ffmpegProcess.kill("SIGINT");
      ffmpegProcess = null;
    }
  });
});

app.use(express.static("client/build"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
