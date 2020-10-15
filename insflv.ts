import express from 'express'
import expressWs from 'express-ws'
import ffmpeg from 'fluent-ffmpeg'
const webSocketStream = require('websocket-stream/stream')
import ws from 'ws'
import fs from 'fs'
import util from 'util'
import config from './insbe-config.json'

const CAMERA_IP: string[] = config.CAMERA_IP
const PORT: number = config.STREAM_SERVER_PORT

let log_file: fs.WriteStream = fs.createWriteStream(__dirname + '/ins_flv.log', { flags: 'w' })
let log_stdout = process.stdout

console.log = function (d: any): void {
  log_file.write(util.format(d) + '\n')
  log_stdout.write(util.format(d) + '\n')
}

function localServer(): void {
  let appBase: express.Application = express()
  appBase.use(express.static(__dirname))
  // extend express app with app.ws()
  let app = expressWs(appBase, undefined, {
    wsOptions: {
      perMessageDeflate: true
    }
  }).app
  app.ws('/rtsp/:id/', rtspRequestHandle)
  app.listen(PORT);
  console.log('express listened')
}

function rtspRequestHandle(ws: ws, req: express.Request): void {
  console.log('rtsp request handle')
  // convert ws instance to stream
  const stream: any = webSocketStream(ws, {
    binary: true,
    browserBufferTimeout: 1000000
  }, {
    browserBufferTimeout: 1000000
  })

  let url: string = CAMERA_IP[Number(req.query.url)]

  console.log('rtsp url: ' + url);
  console.log('rtsp params: ' + JSON.stringify(req.params))
  
  // ffmpet转码
  let ffmpegCommand: ffmpeg.FfmpegCommand = ffmpeg(url)
    .addInputOption('-rtsp_transport', 'tcp', '-buffer_size', '102400')  // 这里可以添加一些 RTSP 优化的参数
    .on('start', function (): void {
      console.log(url, 'Stream started.')
      ws.send('')
    })
    .on('codecData', function (): void {
      console.log(url, 'Stream codecData.')
      // 摄像机在线处理
    })
    .on('error', function (err): void {
      console.log(url, 'An error occured: ', err.message)
      stream.end()
    })
    .on('end', function (): void {
      console.log(url, 'Stream end!')
      stream.end()
      // 摄像机断线的处理
    })
    .outputFormat('flv').videoCodec('copy').noAudio()// 输出格式flv 无音频

  stream.on('close', function (): void {
    ffmpegCommand.kill('SIGKILL');
  });
  try {
    ffmpegCommand.pipe(stream)
  } catch (error) {
    console.log(error)
  }
 
}

localServer()