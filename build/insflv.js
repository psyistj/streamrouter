"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var express_ws_1 = __importDefault(require("express-ws"));
var fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
var webSocketStream = require('websocket-stream/stream');
var fs_1 = __importDefault(require("fs"));
var util_1 = __importDefault(require("util"));
var insbe_config_json_1 = __importDefault(require("./insbe-config.json"));
var CAMERA_IP = insbe_config_json_1.default.CAMERA_IP;
var PORT = insbe_config_json_1.default.STREAM_SERVER_PORT;
var log_file = fs_1.default.createWriteStream(__dirname + '/ins_flv.log', { flags: 'w' });
var log_stdout = process.stdout;
console.log = function (d) {
    log_file.write(util_1.default.format(d) + '\n');
    log_stdout.write(util_1.default.format(d) + '\n');
};
function localServer() {
    var appBase = express_1.default();
    appBase.use(express_1.default.static(__dirname));
    // extend express app with app.ws()
    var app = express_ws_1.default(appBase, undefined, {
        wsOptions: {
            perMessageDeflate: true
        }
    }).app;
    app.ws('/rtsp/:id/', rtspRequestHandle);
    app.listen(PORT);
    console.log('express listened');
}
function rtspRequestHandle(ws, req) {
    console.log('rtsp request handle');
    // convert ws instance to stream
    var stream = webSocketStream(ws, {
        binary: true,
        browserBufferTimeout: 1000000
    }, {
        browserBufferTimeout: 1000000
    });
    var url = CAMERA_IP[Number(req.query.url)];
    console.log('rtsp url: ' + url);
    console.log('rtsp params: ' + JSON.stringify(req.params));
    // ffmpet转码
    var ffmpegCommand = fluent_ffmpeg_1.default(url)
        .addInputOption('-rtsp_transport', 'tcp', '-buffer_size', '102400') // 这里可以添加一些 RTSP 优化的参数
        .on('start', function () {
        console.log(url, 'Stream started.');
        ws.send('');
    })
        .on('codecData', function () {
        console.log(url, 'Stream codecData.');
        // 摄像机在线处理
    })
        .on('error', function (err) {
        console.log(url, 'An error occured: ', err.message);
        stream.end();
    })
        .on('end', function () {
        console.log(url, 'Stream end!');
        stream.end();
        // 摄像机断线的处理
    })
        .outputFormat('flv').videoCodec('copy').noAudio(); // 输出格式flv 无音频
    stream.on('close', function () {
        ffmpegCommand.kill('SIGKILL');
    });
    try {
        ffmpegCommand.pipe(stream);
    }
    catch (error) {
        console.log(error);
    }
}
localServer();
