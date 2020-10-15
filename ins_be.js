const express = require('express')
const mysql = require('mysql')
const cron = require('node-cron')
const fs = require('fs')
const axios = require('axios')
const config = require('./insbe-config.json')
const key = require('./key.json')

const file_server = config.FILE_SERVER
const project_name = config.PROJECT_NAME
const app = express()
const port = config.SERVER_PORT
const conn = mysql.createConnection(key)

let reqNum = 0

let util = require('util')
const e = require('express')
const { query } = require('express')
let log_file = fs.createWriteStream(__dirname + '/ins_be.log', {flags : 'w'})
let log_stdout = process.stdout

console.log = function(d) {
  log_file.write('[' + (++reqNum) + ']' + util.format(d) + '\n');
  log_stdout.write('[' + (reqNum) + ']' + util.format(d) + '\n');
}

// cron schedule
cron.schedule('*/5 * * * * *', () => {
  console.log('[CRON] excuting cron task')
  axios.get(`${file_server}/${project_name}/events`).then((response) => {
    if (response.data.msg === 'events found') {
      console.log(`GET ${file_server}/${project_name}/events`)
      
      const events = response.data.data.events
      
      for (let i = 0; i < events.length; i++) {
        const event = events[i]
        if (Object.prototype.hasOwnProperty.call(event, 'eventName')) {
          if (event.eventName === '') {
            event.eventName = event.eventId
          }
        } else {
          event.eventName = event.eventId
        }
        event.reconstructMethod = JSON.stringify(event.reconstructMethod)
        event.videos = JSON.stringify(event.videos)

        const sql = 'insert into `events` set ?'
        
        let continueFlag = true
        conn.query(sql, event, (err, result) => {
          if (err) {
            const msg = `[INS_BE] query failed: ${err.message}`
            console.error(msg)
            const sql = 'update `events` set ? where eventId = ?'

            conn.query(sql, [event, event.eventId], (err, result) => {
              if (err) {
                const msg = `[INS_BE] query failed: ${err.message}`
                console.error(msg)
              } else {
                console.log(`UPDATE ${event.eventId}`)
              }
            })
            continueFlag = false
          } else {
            console.log(`INSERT ${event.eventId}`)
          }
        })

        if (!continueFlag) {
          break
        }
      }
    }

  }).catch((err) => {
    console.log(err)
    res.send(null)
  })
  
})

app.use(express.json())

app.get('/insbe/', (req, res) => {
  res.send({data: "[ins_be] server connected."})
})

// File Server
app.get('/insbe/events', (req, res) => {
  const sql = 'select * from `events`'
  conn.query(sql, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`SELECT events`)
      for (let i = 0; i < result.length; i++) {
        result[i].reconstructMethod = JSON.parse(result[i].reconstructMethod)
        result[i].videos = JSON.parse(result[i].videos)
      }
      res.send(result)
    }
  })
})

app.get('/insbe/event', (req, res) => {
  const selectedEvent = req.query.selectedEvent
  axios.get(`${file_server}/${project_name}/events/${selectedEvent}`).then((response) => {
    if (response.data.msg === 'event found') {
      console.log(`GET ${file_server}/${project_name}/events/${selectedEvent}`)
      res.send(response.data.data)
    }
  }).catch((err) => {
    console.log(err)
    res.send(null)
  })
})

app.get('/insbe/process/roi', (req, res) => {
  const selectedEvent = req.query.selectedEvent
  axios.get(`${file_server}/${project_name}/process/${selectedEvent}/roi`).then((response) => {
    if (response.data.msg === 'ROI found') {
      console.log(`GET ${file_server}/${project_name}/process/${selectedEvent}/roi`)
      res.send(response.data.data.videos)
    }
  }).catch((err) => {
    console.log(err)
    res.send(null)
  })
})

app.get('/insbe/process/defaultRoi', (req, res) => {
  axios.get(`${file_server}/${project_name}/process/defaultRoi`).then((response) => {
    if (response.data.msg === 'Default ROI found') {
      console.log(`GET ${file_server}/${project_name}/process/defaultRoi`)
      res.send(response.data.data.videos)
    }
  }).catch((err) => {
    console.log(err)
    res.send(null)
  })
})

app.get('/insbe/process/annotate', (req, res) => {
  const selectedRcEvent = req.query.selectedRcEvent
  axios.get(`${file_server}/${project_name}/process/${selectedRcEvent}/annotate`).then((response) => {
    if (response.data.msg === 'annotation found') {
      console.log(`GET ${file_server}/${project_name}/process/${selectedRcEvent}/annotate`)
      res.send(response.data.data)
    }
  }).catch((err) => {
    console.log(err)
    res.send(null)
  })
})

app.get('/insbe/process/reconstruct', (req, res) => {
  const eventId = req.query.eventId
  const method = req.query.method
  axios.get(`${file_server}/${project_name}/process/${eventId}/reconstruct/${method}`).then((response) => {
    if (response.data.msg === 'reconstruction found') {
      console.log(`GET ${file_server}/${project_name}/process/${eventId}/reconstruct/${method}`)
      res.send(response.data.data)
    }
  }).catch((err) => {
    console.log(err)
    res.send(null)
  })
})

app.get('/insbe/process/defaultTrigger', (req, res) => {
  axios.get(`${file_server}/${project_name}/process/defaultTrigger`).then((response) => {
    if (response.data.msg === 'Default Trigger found') {
      console.log(`GET ${file_server}/${project_name}/process/defaultTrigger`)
      res.send(response.data.data.trigger)
    }
  }).catch((err) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/process/roi', (req, res) => {
  const eventId = req.body.eventId
  const videos = req.body.videos
  axios.post(`${file_server}/${project_name}/process/${eventId}/roi`, {
    eventId: eventId,
    videos: videos
  }).then((response) => {
    if (response.data.msg === 'ROI updated') {
      console.log(`POST ${file_server}/${project_name}/process/${eventId}/roi`)
      res.send('ROI updated')
    }
  }).catch((err) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/process/defaultRoi', (req, res) => {
  const eventId = req.body.eventId
  const videos = req.body.videos
  axios.post(`${file_server}/${project_name}/process/defaultRoi`, {
    eventId: eventId,
    videos: videos
  }).then((response) => {
    if (response.data.msg === 'Default ROI updated') {
      console.log(`POST ${file_server}/${project_name}/process/defaultRoi`)
      res.send('Default ROI updated')
    }
  }).catch((err) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/process/defaultTrigger', (req, res) => {
  const trigger = req.body.trigger
  axios.post(`${file_server}/${project_name}/process/defaultTrigger`, {
    trigger: trigger
  }).then((response) => {
    if (response.data.msg === 'Default Trigger updated') {
      console.log(`POST ${file_server}/${project_name}/process/defaultTrigger`)
      res.send('Default Trigger updated')
    }
  }).catch((err) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/process/trim', (req, res) => {
  const eventId = req.body.eventId
  const videos = req.body.videos
  const delay = req.body.delay
  axios.post(`${file_server}/${project_name}/process/${eventId}/trim`, {
    eventId: eventId,
    videos: videos
  }, {timeout: delay}).then((response) => {
    if (response.data.msg) {
      console.log(`POST ${file_server}/${project_name}/process/${eventId}/trim`)
      res.send('trim success')
    }
  }).catch((err) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/process/annotate', (req, res) => {
  const eventId = req.body.eventId
  axios.post(`${file_server}/${project_name}/process/${eventId}/annotate`, {
    data: null
  }, {timeout: 600 * 1000}).then((response) => {
    if (response.data.msg === 'annotation complete') {
      console.log(`POST ${file_server}/${project_name}/process/${eventId}/annotate`)
      res.send('annotation complete')
    }
  }).catch((err) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/process/reconstruct', (req, res) => {
  const eventId = req.body.eventId
  const method = req.body.method
  axios.post(`${file_server}/${project_name}/process/${eventId}/reconstruct/${method}`, {
    eventId: eventId,
    method: method
  }, {timeout: 120 * 1000}).then((response) => {
    if (response.data.msg === 'reconstruction complete') {
      console.log(`POST ${file_server}/${project_name}/process/${eventId}/reconstruct/${method}`)
      res.send('reconstruction complete')
    }
  }).catch((err) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/process/reset_videos', (req, res) => {
  const eventId = req.body.eventId
  axios.post(`${file_server}/${project_name}/process/${eventId}/reset_videos`, {
    eventId: eventId
  }).then((response) => {
    if (response.data.msg === 'event found') {
      console.log(`POST ${file_server}/${project_name}/process/${eventId}/reset_videos`)
      res.send('event found')
    }
  }).catch((err) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/events/start', (req, res) => {
  const eventId = req.body.eventId
  const cameraIPs = req.body.cameraIPs
  axios.post(`${file_server}/${project_name}/events/start`, {
    eventId: eventId,
    cameraIPs: cameraIPs
  }).then((response) => {
    console.log(`POST ${file_server}/${project_name}/events/start`)
    res.send('record start')
  }).catch((err) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/events/stop', (req, res) => {
  axios.post(`${file_server}/${project_name}/events/stop`, {}).then((response) => {
    if (response) {
      console.log(`POST ${file_server}/${project_name}/events/stop`)
      res.send('record stop')
    }
  }).catch((err) => {
    console.log(err)
    res.send(null)
  })
})

// Database
app.get('/insbe/getUsers', (req, res) => {
  const sql = 'select * from `users`'
  conn.query(sql, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`GET /insbe/getUsers`)
      res.send(result)
    }
  })
})

app.get('/insbe/getProjects', (req, res) => {
  const sql = 'select * from `projects`'
  conn.query(sql, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`GET /insbe/getProjects`)
      res.send(result)
    }
  })
})

app.get('/insbe/getTeams', (req, res) => {
  const sql = 'select * from `teams`'
  conn.query(sql, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`GET /insbe/getTeams`)
      res.send(result)
    }
  })
})

app.post('/insbe/getIndividuals', (req, res) => {
  const teamId = req.body.teamId
  const sql = 'select personId, personName from `individuals` where teamId = ?'
  conn.query(sql, teamId, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`GET /insbe/getIndividuals`)
      res.send(result)
    }
  })
})

app.get('/insbe/getTags', (req, res) => {
  const sql = 'select * from `tags`'
  conn.query(sql, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`GET /insbe/getTags`)
      res.send(result)
    }
  })
})

app.post('/insbe/getUser', (req, res) => {
  const user = req.body.user
  const sql = 'select userId, username from `users` where username = ? and userpass = ?'
  conn.query(sql, [user.username, user.userpass], (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`POST /insbe/getUser`)
      res.send(result)
    }
  })
})

app.post('/insbe/getTeam', (req, res) => {
  const userId = req.body.userId
  const projectId = req.body.projectId
  const sql = 'select teamId, teamName from `teams` where userId = ? and projectId = ?'
  conn.query(sql, [userId, projectId], (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`POST /insbe/getTeam`)
      res.send(result)
    }
  })
})

app.post('/insbe/getIndividual', (req, res) => {
  const personId = req.body.personId
  const sql = 'select events from `individuals` where personId = ?'
  conn.query(sql, personId, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`POST /insbe/getIndividual`)
      res.send(result)
    }
  })
})

app.post('/insbe/getTag', (req, res) => {
  const eventId = req.body.eventId
  const sql = 'select eventId, tagId from `eventTag` where eventId = ?'
  conn.query(sql, eventId, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`POST /insbe/getTag`)
      res.send(result)
    }
  })
})

app.post('/insbe/getPersonEvent', (req, res) => {
  const personId = req.body.personId
  const sql = 'select * from `events` where eventId in (select distinct eventId from `personEvent` where personId = ?)'
  conn.query(sql, personId, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`POST /insbe/getPersonEvent`)
      res.send(result)
    }
  })
})

app.post('/insbe/getTagEvent', (req, res) => {
  const tagIds = req.body.tagIds
  const sql = 'select * from `events` where eventId in (select distinct eventId from `eventTag` where tagId in (?))'
  conn.query(sql, [tagIds], function(err, result) {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`POST /insbe/getTagEvent`)
      res.send(result)
    }
  })
})

app.post('/insbe/getPersonTagEvent', (req, res) => {
  const tagIds = req.body.tagIds
  const personId = req.body.personId
  const sql = 'select * from `events` where eventId in (select a.* from (select distinct eventId from `eventTag` where tagId in (?) union all select distinct eventId from `personEvent` where personId = ?)a GROUP BY a.eventId HAVING COUNT(a.eventId)=2)'
  conn.query(sql, [[tagIds], personId], (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`POST /insbe/getPersonTagEvent`)
      res.send(result)
    }
  })
})

app.post('/insbe/addUser', (req, res) => {
  const user = req.body.user
  const sql = 'insert into `users` set ?'

  conn.query(sql, user, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`POST /insbe/addUser`)
      res.send(result)
    }
  })
})

app.post('/insbe/addProject', (req, res) => {
  const project = req.body.project
  const sql = 'insert into `projects` set ?'

  conn.query(sql, project, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`POST /insbe/addProject`)
      res.send(result)
    }
  })
})

app.post('/insbe/addTeam', (req, res) => {
  const team = req.body.team
  const sql = 'insert into `teams` set ?'

  conn.query(sql, team, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`POST /insbe/addTeam`)
      res.send(result)
    }
  })
})

app.post('/insbe/addPerson', (req, res) => {
  const person = {
    personName: req.body.personName,
    teamId: req.body.teamId
  }
  const sql = 'insert into `individuals` set ?'

  conn.query(sql, person, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`POST /insbe/addPerson`)
      res.send(result)
    }
  })
})

app.post('/insbe/addTag', (req, res) => {
  const tag = {
    tagName: req.body.tagName
  }
  const sql = 'insert into `tags` set ?'

  conn.query(sql, tag, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`POST /insbe/addTag`)
      res.send(result)
    }
  })
})

app.post('/insbe/addPersonEvent', (req, res) => {
  const personEvent = {
    personId: req.body.personId,
    eventId: req.body.eventId
  }
  const sql = 'insert into `personEvent` set ?'

  conn.query(sql, personEvent, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`POST /insbe/addPersonEvent`)
      res.send('personEvent added')
    }
  })
})

app.post('/insbe/addEventTag', (req, res) => {
  const eventTag = {
    eventId: req.body.eventId,
    tagId: req.body.tagId
  }
  const sql = 'insert into `eventTag` set ?'

  conn.query(sql, eventTag, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`POST /insbe/addEventTag`)
      res.send('tag added')
    }
  })
})

app.post('/insbe/delEventTag', (req, res) => {
  const eventTag = {
    eventId: req.body.eventId,
    tagId: req.body.tagId
  }
  const sql = 'delete from `eventTag` where eventId = ? and tagId = ?'

  conn.query(sql, [eventTag.eventId, eventTag.tagId], (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(null)
    } else {
      console.log(`POST /insbe/delEventTag`)
      res.send('tad deleted')
    }
  })
})

app.listen(port, () => {
  console.log(`listening at http://localhost:${port} now`)
})