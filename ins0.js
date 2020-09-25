const Stream = require('node-rtsp-stream')

let stream = null
if (!stream) {
  stream = new Stream({
    name: 'camera0',
    streamUrl: 'rtsp://192.168.3.96:554/av0_1',
    wsPort: 9988,
    ffmpegOptions: {
      '-stats': '',
      '-r': 30
    }
  })
  console.log('camera0 created')
}