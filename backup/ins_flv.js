const express = require('express')
const expressWebSocket = require("express-ws")
const ffmpeg = require("fluent-ffmpeg")
const webSocketStream = require("websocket-stream/stream")
const fs = require('fs')
const config = require('./insbe-config.json')

const CAMERA_IP = config.CAMERA_IP
const PORT = config.STREAM_SERVER_PORT

let util = require('util')
let log_file = fs.createWriteStream(__dirname + '/ins_flv.log', {flags : 'w'})
let log_stdout = process.stdout

console.log = function(d) {
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
}

function localServer() {
  let app = express();
  app.use(express.static(__dirname));
  // extend express app with app.ws()
  expressWebSocket(app, null, {
    perMessageDeflate: true
  });
  app.ws("/rtsp/:id/", rtspRequestHandle)
  app.listen(PORT);
  console.log("express listened")
}

function rtspRequestHandle(ws, req) {
  console.log("rtsp request handle");
  // convert ws instance to stream
  const stream = webSocketStream(ws, {
    binary: true,
    browserBufferTimeout: 1000000
  }, {
    browserBufferTimeout: 1000000
  });
  let url = CAMERA_IP[req.query.url];
  console.log("rtsp url: " + url);
  console.log("rtsp params: " + JSON.stringify(req.params));
  
  // ffmpet转码
  let ffmpegCommand = ffmpeg(url)
    .addInputOption("-rtsp_transport", "tcp", "-buffer_size", "102400")  // 这里可以添加一些 RTSP 优化的参数
    .on("start", function () {
      console.log(url, "Stream started.");
      ws.send('')
    })
    .on("codecData", function () {
      console.log(url, "Stream codecData.")
      // 摄像机在线处理
    })
    .on("error", function (err) {
      console.log(url, "An error occured: ", err.message);
      stream.end();
    })
    .on("end", function () {
      console.log(url, "Stream end!");
      stream.end();
      // 摄像机断线的处理
    })
    .outputFormat("flv").videoCodec("copy").noAudio(); // 输出格式flv 无音频

  stream.on("close", function () {
    ffmpegCommand.kill('SIGKILL');
  });
  try {
    ffmpegCommand.pipe(stream);
  } catch (error) {
    console.log(error);
  }
 
}

localServer()