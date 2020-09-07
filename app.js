const express = require('express')
const Stream = require('node-rtsp-stream')
const app = express()
const port = 3000

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
      new Stream({
        name: 'camera0',
        streamUrl: 'rtsp://192.168.3.98:554/av0_1',
        wsPort: 9999,
        ffmpegOptions: {
          '-stats': '',
          '-r': 30
        }
      })
      console.log('camera0 created')
      resolve(0)
    }),
    // new Promise((resolve) => {
    //   new Stream({
    //     name: 'camera1',
    //     streamUrl: 'rtsp://192.168.3.94:554/av0_1',
    //     wsPort: 9998,
    //     ffmpegOptions: {
    //       '-stats': '',
    //       '-r': 30
    //     }
    //   })
    //   console.log('camera1 created')
    //   resolve(1)
    // }),
    // new Promise((resolve) => {
    //   new Stream({
    //     name: 'camera2',
    //     streamUrl: 'rtsp://192.168.3.95:554/av0_1',
    //     wsPort: 9997,
    //     ffmpegOptions: {
    //       '-stats': '',
    //       '-r': 30
    //     }
    //   })
    //   console.log('camera2 created')
    //   resolve(2)
    // }),
    // new Promise((resolve) => {
    //   new Stream({
    //     name: 'camera3',
    //     streamUrl: 'rtsp://192.168.3.96:554/av0_1',
    //     wsPort: 9996,
    //     ffmpegOptions: {
    //       '-stats': '',
    //       '-r': 30
    //     }
    //   })
    //   console.log('camera3 created')
    //   resolve(3)
    // }),
  ]).then(() => {
    res.send(`established ${port}`)
    console.log(`established ${port}`)
  })
})

app.listen(port, () => {
  console.log(`listening at http://localhost:${port}`)
})