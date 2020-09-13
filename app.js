const express = require('express')
const Stream = require('node-rtsp-stream')
const Recorder = require('node-rtsp-recorder').Recorder
const app = express()
const port = 3000

let filePath = null
let timer = null
let stream = null
let rec = null

if (!stream) {
  stream = new Stream({
    name: 'camera0',
    streamUrl: 'rtsp://192.168.1.97:554/av0_0',
    wsPort: 9999,
    ffmpegOptions: {
      '-stats': '',
      '-r': 30
    }
  })
  console.log('camera0 created')
}

app.use(express.static('public'))
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-Width, Content-type, Accept')
  next()
})

app.get('/', (req, res) => {
  res.send('hello world')
})

app.get('/video', (req, res) => {
  console.log(`establishing ws... ${port}`)
  Promise.all([
    new Promise((resolve) => {
      if (!rec) {
        rec = new Recorder({
          url: 'rtsp://192.168.1.97:554/av0_0',
          timeLimit: 3000, // time in seconds for each segmented video file
          folder: './public/videos/',
          name: 'cam97',
        })
        // Starts Recording
        rec.startRecording();
  
        timer = setTimeout(() => {
            console.log('Stopping Recording')
            filePath = rec.fileName
            rec.stopRecording()
            rec = null
            // stream.stop()
            // stream = null
        }, 3000000)
      }
      resolve(0)
    })
  ]).then(() => {
    res.send(`established ${port}`)
  })
})

app.get('/stop', (req, res) => {
  console.log('Stopping Recording')
  if (rec) {
    filePath = rec.fileName
    rec.stopRecording()
    rec = null
    clearTimeout(timer)
    timer = null
    // if (stream) {
    //   stream.stop()
    //   stream = null
    // }
  }
  res.send(`${filePath}`)
})

app.listen(port, () => {
  console.log(`listening at http://localhost:${port}`)
})