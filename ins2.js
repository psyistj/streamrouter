const Stream = require('node-rtsp-stream')

let stream = null

if (!stream) {
  stream = new Stream({
    name: 'camera2',
    streamUrl: 'rtsp://192.168.3.99:554/av0_1',
    wsPort: 9986,
    ffmpegOptions: {
      '-stats': '',
      '-r': 30
    }
  })
  console.log('camera2 created')
}
