const Stream = require('node-rtsp-stream')

let stream = null

if (!stream) {
  stream = new Stream({
    name: 'camera1',
    streamUrl: 'rtsp://192.168.3.98:554/av0_1',
    wsPort: 9987,
    ffmpegOptions: {
      '-stats': '',
      '-r': 30
    }
  })
  console.log('camera1 created')
}
