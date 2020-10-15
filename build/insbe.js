"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var mysql_1 = __importDefault(require("mysql"));
var node_cron_1 = __importDefault(require("node-cron"));
var fs_1 = __importDefault(require("fs"));
var axios_1 = __importDefault(require("axios"));
var util_1 = __importDefault(require("util"));
var insbe_config_json_1 = __importDefault(require("./insbe-config.json"));
var key_json_1 = __importDefault(require("./key.json"));
var file_server = insbe_config_json_1.default.FILE_SERVER;
var project_name = insbe_config_json_1.default.PROJECT_NAME;
var app = express_1.default();
var port = insbe_config_json_1.default.SERVER_PORT;
var conn = mysql_1.default.createConnection(key_json_1.default);
var reqNum = 0;
var log_file = fs_1.default.createWriteStream(__dirname + '/ins_be.log', { flags: 'w' });
var log_stdout = process.stdout;
console.log = function (d) {
    log_file.write('[' + (++reqNum) + ']' + util_1.default.format(d) + '\n');
    log_stdout.write('[' + (reqNum) + ']' + util_1.default.format(d) + '\n');
};
// cron schedule
node_cron_1.default.schedule('*/5 * * * * *', function () {
    console.log('[CRON] excuting cron task');
    axios_1.default.get(file_server + "/" + project_name + "/events").then(function (response) {
        if (response.data.msg === 'events found') {
            console.log("GET " + file_server + "/" + project_name + "/events");
            var events = response.data.data.events;
            var _loop_1 = function (i) {
                var event_1 = events[i];
                if (Object.prototype.hasOwnProperty.call(event_1, 'eventName')) {
                    if (event_1.eventName === '') {
                        event_1.eventName = event_1.eventId;
                    }
                }
                else {
                    event_1.eventName = event_1.eventId;
                }
                event_1.reconstructMethod = JSON.stringify(event_1.reconstructMethod);
                event_1.videos = JSON.stringify(event_1.videos);
                var sql = 'insert into `events` set ?';
                var continueFlag = true;
                conn.query(sql, event_1, function (err) {
                    if (err) {
                        console.error("[INS_BE] query failed: " + err.message);
                        var sql_1 = 'update `events` set ? where eventId = ?';
                        conn.query(sql_1, [event_1, event_1.eventId], function (err) {
                            if (err) {
                                console.error("[INS_BE] query failed: " + err.message);
                            }
                            else {
                                console.log("UPDATE " + event_1.eventId);
                            }
                        });
                        continueFlag = false;
                    }
                    else {
                        console.log("INSERT " + event_1.eventId);
                    }
                });
                if (!continueFlag) {
                    return "break";
                }
            };
            for (var i = 0; i < events.length; i++) {
                var state_1 = _loop_1(i);
                if (state_1 === "break")
                    break;
            }
        }
    }).catch(function (err) {
        console.log(err);
    });
});
app.use(express_1.default.json());
app.get('/insbe/', function (req, res) {
    res.send({ data: "[ins_be] server connected." });
});
// File Server
app.get('/insbe/event', function (req, res) {
    var selectedEvent = String(req.query.selectedEvent);
    axios_1.default.get(file_server + "/" + project_name + "/events/" + selectedEvent).then(function (response) {
        if (response.data.msg === 'event found') {
            console.log("GET " + file_server + "/" + project_name + "/events/" + selectedEvent);
            res.send(response.data.data);
        }
    }).catch(function (err) {
        console.log(err);
        res.send(null);
    });
});
app.get('/insbe/process/roi', function (req, res) {
    var selectedEvent = String(req.query.selectedEvent);
    axios_1.default.get(file_server + "/" + project_name + "/process/" + selectedEvent + "/roi").then(function (response) {
        if (response.data.msg === 'ROI found') {
            console.log("GET " + file_server + "/" + project_name + "/process/" + selectedEvent + "/roi");
            res.send(response.data.data.videos);
        }
    }).catch(function (err) {
        console.log(err);
        res.send(null);
    });
});
app.get('/insbe/process/defaultRoi', function (req, res) {
    axios_1.default.get(file_server + "/" + project_name + "/process/defaultRoi").then(function (response) {
        if (response.data.msg === 'Default ROI found') {
            console.log("GET " + file_server + "/" + project_name + "/process/defaultRoi");
            res.send(response.data.data.videos);
        }
    }).catch(function (err) {
        console.log(err);
        res.send(null);
    });
});
app.get('/insbe/process/annotate', function (req, res) {
    var selectedRcEvent = String(req.query.selectedRcEvent);
    axios_1.default.get(file_server + "/" + project_name + "/process/" + selectedRcEvent + "/annotate")
        .then(function (response) {
        if (response.data.msg === 'annotation found') {
            console.log("GET " + file_server + "/" + project_name + "/process/" + selectedRcEvent + "/annotate");
            res.send(response.data.data);
        }
    }).catch(function (err) {
        console.log(err);
        res.send(null);
    });
});
app.get('/insbe/process/reconstruct', function (req, res) {
    var eventId = String(req.query.eventId);
    var method = String(req.query.method);
    axios_1.default.get(file_server + "/" + project_name + "/process/" + eventId + "/reconstruct/" + method)
        .then(function (response) {
        if (response.data.msg === 'reconstruction found') {
            console.log("GET " + file_server + "/" + project_name + "/process/" + eventId + "/reconstruct/" + method);
            res.send(response.data.data);
        }
    }).catch(function (err) {
        console.log(err);
        res.send(null);
    });
});
app.get('/insbe/process/defaultTrigger', function (req, res) {
    axios_1.default.get(file_server + "/" + project_name + "/process/defaultTrigger").then(function (response) {
        if (response.data.msg === 'Default Trigger found') {
            console.log("GET " + file_server + "/" + project_name + "/process/defaultTrigger");
            res.send(response.data.data.trigger);
        }
    }).catch(function (err) {
        console.log(err);
        res.send(null);
    });
});
app.post('/insbe/process/roi', function (req, res) {
    var eventId = req.body.eventId;
    var videos = req.body.videos;
    axios_1.default.post(file_server + "/" + project_name + "/process/" + eventId + "/roi", {
        eventId: eventId,
        videos: videos
    }).then(function (response) {
        if (response.data.msg === 'ROI updated') {
            console.log("POST " + file_server + "/" + project_name + "/process/" + eventId + "/roi");
            res.send('ROI updated');
        }
    }).catch(function (err) {
        console.log(err);
        res.send(null);
    });
});
app.post('/insbe/process/defaultRoi', function (req, res) {
    var eventId = req.body.eventId;
    var videos = req.body.videos;
    axios_1.default.post(file_server + "/" + project_name + "/process/defaultRoi", {
        eventId: eventId,
        videos: videos
    }).then(function (response) {
        if (response.data.msg === 'Default ROI updated') {
            console.log("POST " + file_server + "/" + project_name + "/process/defaultRoi");
            res.send('Default ROI updated');
        }
    }).catch(function (err) {
        console.log(err);
        res.send(null);
    });
});
app.post('/insbe/process/defaultTrigger', function (req, res) {
    var trigger = req.body.trigger;
    axios_1.default.post(file_server + "/" + project_name + "/process/defaultTrigger", {
        trigger: trigger
    }).then(function (response) {
        if (response.data.msg === 'Default Trigger updated') {
            console.log("POST " + file_server + "/" + project_name + "/process/defaultTrigger");
            res.send('Default Trigger updated');
        }
    }).catch(function (err) {
        console.log(err);
        res.send(null);
    });
});
app.post('/insbe/process/trim', function (req, res) {
    var eventId = req.body.eventId;
    var videos = req.body.videos;
    var delay = req.body.delay;
    axios_1.default.post(file_server + "/" + project_name + "/process/" + eventId + "/trim", {
        eventId: eventId,
        videos: videos
    }, { timeout: delay }).then(function (response) {
        if (response.data.msg) {
            console.log("POST " + file_server + "/" + project_name + "/process/" + eventId + "/trim");
            res.send('trim success');
        }
    }).catch(function (err) {
        console.log(err);
        res.send(null);
    });
});
app.post('/insbe/process/annotate', function (req, res) {
    var eventId = req.body.eventId;
    axios_1.default.post(file_server + "/" + project_name + "/process/" + eventId + "/annotate", {
        data: null
    }, { timeout: 600 * 1000 }).then(function (response) {
        if (response.data.msg === 'annotation complete') {
            console.log("POST " + file_server + "/" + project_name + "/process/" + eventId + "/annotate");
            res.send('annotation complete');
        }
    }).catch(function (err) {
        console.log(err);
        res.send(null);
    });
});
app.post('/insbe/process/reconstruct', function (req, res) {
    var eventId = req.body.eventId;
    var method = req.body.method;
    axios_1.default.post(file_server + "/" + project_name + "/process/" + eventId + "/reconstruct/" + method, {
        eventId: eventId,
        method: method
    }, { timeout: 120 * 1000 }).then(function (response) {
        if (response.data.msg === 'reconstruction complete') {
            console.log("POST " + file_server + "/" + project_name + "/process/" + eventId + "/reconstruct/" + method);
            res.send('reconstruction complete');
        }
    }).catch(function (err) {
        console.log(err);
        res.send(null);
    });
});
app.post('/insbe/process/reset_videos', function (req, res) {
    var eventId = req.body.eventId;
    axios_1.default.post(file_server + "/" + project_name + "/process/" + eventId + "/reset_videos", {
        eventId: eventId
    }).then(function (response) {
        if (response.data.msg === 'event found') {
            console.log("POST " + file_server + "/" + project_name + "/process/" + eventId + "/reset_videos");
            res.send('event found');
        }
    }).catch(function (err) {
        console.log(err);
        res.send(null);
    });
});
app.post('/insbe/events/start', function (req, res) {
    var eventId = req.body.eventId;
    var cameraIPs = req.body.cameraIPs;
    axios_1.default.post(file_server + "/" + project_name + "/events/start", {
        eventId: eventId,
        cameraIPs: cameraIPs
    }).then(function (response) {
        console.log("POST " + file_server + "/" + project_name + "/events/start");
        res.send('record start');
    }).catch(function (err) {
        console.log(err);
        res.send(null);
    });
});
app.post('/insbe/events/stop', function (req, res) {
    axios_1.default.post(file_server + "/" + project_name + "/events/stop", {}).then(function (response) {
        if (response) {
            console.log("POST " + file_server + "/" + project_name + "/events/stop");
            res.send('record stop');
        }
    }).catch(function (err) {
        console.log(err);
        res.send(null);
    });
});
// Database
app.get('/insbe/events', function (req, res) {
    var sql = 'select * from `events`';
    conn.query(sql, function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("SELECT events");
            for (var i = 0; i < result.length; i++) {
                result[i].reconstructMethod = JSON.parse(result[i].reconstructMethod);
                result[i].videos = JSON.parse(result[i].videos);
            }
            res.send(result);
        }
    });
});
app.get('/insbe/getUsers', function (req, res) {
    var sql = 'select * from `users`';
    conn.query(sql, function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("GET /insbe/getUsers");
            res.send(result);
        }
    });
});
app.get('/insbe/getProjects', function (req, res) {
    var sql = 'select * from `projects`';
    conn.query(sql, function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("GET /insbe/getProjects");
            res.send(result);
        }
    });
});
app.get('/insbe/getTeams', function (req, res) {
    var sql = 'select * from `teams`';
    conn.query(sql, function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("GET /insbe/getTeams");
            res.send(result);
        }
    });
});
app.post('/insbe/getIndividuals', function (req, res) {
    var teamId = req.body.teamId;
    var sql = 'select personId, personName from `individuals` where teamId = ?';
    conn.query(sql, teamId, function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("GET /insbe/getIndividuals");
            res.send(result);
        }
    });
});
app.get('/insbe/getTags', function (req, res) {
    var sql = 'select * from `tags`';
    conn.query(sql, function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("GET /insbe/getTags");
            res.send(result);
        }
    });
});
app.post('/insbe/getUser', function (req, res) {
    var user = req.body.user;
    var sql = 'select userId, username from `users` where username = ? and userpass = ?';
    conn.query(sql, [user.username, user.userpass], function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("POST /insbe/getUser");
            res.send(result);
        }
    });
});
app.post('/insbe/getTeam', function (req, res) {
    var userId = req.body.userId;
    var projectId = req.body.projectId;
    var sql = 'select teamId, teamName from `teams` where userId = ? and projectId = ?';
    conn.query(sql, [userId, projectId], function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("POST /insbe/getTeam");
            res.send(result);
        }
    });
});
app.post('/insbe/getIndividual', function (req, res) {
    var personId = req.body.personId;
    var sql = 'select events from `individuals` where personId = ?';
    conn.query(sql, personId, function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("POST /insbe/getIndividual");
            res.send(result);
        }
    });
});
app.post('/insbe/getTag', function (req, res) {
    var eventId = req.body.eventId;
    var sql = 'select eventId, tagId from `eventTag` where eventId = ?';
    conn.query(sql, eventId, function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("POST /insbe/getTag");
            res.send(result);
        }
    });
});
app.post('/insbe/getPersonEvent', function (req, res) {
    var personId = req.body.personId;
    var sql = 'select * from `events` where eventId in (select distinct eventId from `personEvent` where personId = ?)';
    conn.query(sql, personId, function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("POST /insbe/getPersonEvent");
            res.send(result);
        }
    });
});
app.post('/insbe/getTagEvent', function (req, res) {
    var tagIds = req.body.tagIds;
    var sql = 'select * from `events` where eventId in (select distinct eventId from `eventTag` where tagId in (?))';
    conn.query(sql, [tagIds], function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("POST /insbe/getTagEvent");
            res.send(result);
        }
    });
});
app.post('/insbe/getPersonTagEvent', function (req, res) {
    var tagIds = req.body.tagIds;
    var personId = req.body.personId;
    var sql = 'select * from `events` where eventId in (select a.* from (select distinct eventId from `eventTag` where tagId in (?) union all select distinct eventId from `personEvent` where personId = ?)a GROUP BY a.eventId HAVING COUNT(a.eventId)=2)';
    conn.query(sql, [tagIds, personId], function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("POST /insbe/getPersonTagEvent");
            res.send(result);
        }
    });
});
app.post('/insbe/addUser', function (req, res) {
    var user = req.body.user;
    var sql = 'insert into `users` set ?';
    conn.query(sql, user, function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("POST /insbe/addUser");
            res.send(result);
        }
    });
});
app.post('/insbe/addProject', function (req, res) {
    var project = req.body.project;
    var sql = 'insert into `projects` set ?';
    conn.query(sql, project, function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("POST /insbe/addProject");
            res.send(result);
        }
    });
});
app.post('/insbe/addTeam', function (req, res) {
    var team = req.body.team;
    var sql = 'insert into `teams` set ?';
    conn.query(sql, team, function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("POST /insbe/addTeam");
            res.send(result);
        }
    });
});
app.post('/insbe/addPerson', function (req, res) {
    var person = {
        personName: req.body.personName,
        teamId: req.body.teamId
    };
    var sql = 'insert into `individuals` set ?';
    conn.query(sql, person, function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("POST /insbe/addPerson");
            res.send(result);
        }
    });
});
app.post('/insbe/addTag', function (req, res) {
    var tag = {
        tagName: req.body.tagName
    };
    var sql = 'insert into `tags` set ?';
    conn.query(sql, tag, function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("POST /insbe/addTag");
            res.send(result);
        }
    });
});
app.post('/insbe/addPersonEvent', function (req, res) {
    var personEvent = {
        personId: req.body.personId,
        eventId: req.body.eventId
    };
    var sql = 'insert into `personEvent` set ?';
    conn.query(sql, personEvent, function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("POST /insbe/addPersonEvent");
            res.send('personEvent added');
        }
    });
});
app.post('/insbe/addEventTag', function (req, res) {
    var eventTag = {
        eventId: req.body.eventId,
        tagId: req.body.tagId
    };
    var sql = 'insert into `eventTag` set ?';
    conn.query(sql, eventTag, function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("POST /insbe/addEventTag");
            res.send('tag added');
        }
    });
});
app.post('/insbe/delEventTag', function (req, res) {
    var eventTag = {
        eventId: req.body.eventId,
        tagId: req.body.tagId
    };
    var sql = 'delete from `eventTag` where eventId = ? and tagId = ?';
    conn.query(sql, [eventTag.eventId, eventTag.tagId], function (err, result) {
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            res.send(null);
        }
        else {
            console.log("POST /insbe/delEventTag");
            res.send('tad deleted');
        }
    });
});
app.post('/insbe/triggerCallback', function (req, res) {
    var event = req.body.event;
    event.reconstructMethod = JSON.stringify(event.reconstructMethod);
    event.videos = JSON.stringify(event.videos);
    var sql = 'insert into `events` set ?';
    conn.query(sql, event, function (err, result) {
        var resData = {
            "code": 200,
            "msg": "event received",
            "data": {}
        };
        if (err) {
            console.error("[INS_BE] query failed: " + err.message);
            var sql_2 = 'update `events` set ? where eventId = ?';
            conn.query(sql_2, [event, event.eventId], function (err, result) {
                if (err) {
                    console.error("[INS_BE] query failed: " + err.message);
                }
                else {
                    console.log("UPDATE " + event.eventId);
                    res.send(resData);
                }
            });
        }
        else {
            console.log("INSERT " + event.eventId);
            res.send(resData);
        }
    });
});
app.listen(port, function () {
    console.log("listening at http://localhost:" + port + " now");
});
