import express from 'express'
import mysql from 'mysql'
import cron from 'node-cron'
import fs from 'fs'
import axios, { AxiosAdapter, AxiosError, AxiosInstance, AxiosResponse } from 'axios'
import util from 'util'
import config from './insbe-config.json'
import key from './key.json'

const file_server: string = config.FILE_SERVER
const project_name: string = config.PROJECT_NAME
const app: express.Application = express()
const port: number = config.SERVER_PORT
const conn: mysql.Connection = mysql.createConnection(key)

let reqNum: number = 0

let log_file: fs.WriteStream = fs.createWriteStream(__dirname + '/ins_be.log', { flags: 'w' })
let log_stdout = process.stdout

console.log = function (d: any) {
  log_file.write('[' + (++reqNum) + ']' + util.format(d) + '\n')
  log_stdout.write('[' + (reqNum) + ']' + util.format(d) + '\n')
}

// models
interface Event {
  eventId: string,
  eventName: string,
  reconstructMethod: string[] | string,
  videos: object[] | string,
  preview: string
}

interface Trigger {
  captureDelayMs: number,
  cooldown: number,
  frameBufferSize: number,
  ip: string,
  rectList: object[]
}

interface User {
  username: string,
  userpass: string
}

interface Project {
  projectName: string,
  projectCode: string
}

interface Team {
  teamName: string,
  projectId: number,
  userId: number
}

interface Individual {
  personName: string,
  teamId: number
}

interface Tag {
  tagName: string
}

interface PersonEvent {
  personId: number,
  eventId: string
}

interface EventTag {
  eventId: string,
  tagId: number
}

// cron schedule
cron.schedule('*/5 * * * * *', (): void => {
  console.log('[CRON] excuting cron task')
  axios.get(`${file_server}/${project_name}/events`).then((response: AxiosResponse) => {
    if (response.data.msg === 'events found') {
      console.log(`GET ${file_server}/${project_name}/events`)

      const events: Event[] = response.data.data.events

      for (let i = 0; i < events.length; i++) {
        const event: Event = events[i]
        if (Object.prototype.hasOwnProperty.call(event, 'eventName')) {
          if (event.eventName === '') {
            event.eventName = event.eventId
          }
        } else {
          event.eventName = event.eventId
        }
        event.reconstructMethod = JSON.stringify(event.reconstructMethod)
        event.videos = JSON.stringify(event.videos)

        const sql: string = 'insert into `events` set ?'

        let continueFlag: boolean = true
        conn.query(sql, event, (err: mysql.MysqlError | null) => {
          if (err) {
            console.error(`[INS_BE] query failed: ${err.message}`)
            const sql: string = 'update `events` set ? where eventId = ?'

            conn.query(sql, [event, event.eventId], (err: mysql.MysqlError | null) => {
              if (err) {
                console.error(`[INS_BE] query failed: ${err.message}`)
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

  }).catch((err: AxiosError) => {
    console.log(err)
  })

})

app.use(express.json())

app.get('/insbe/', (req: express.Request, res: express.Response) => {
  res.send({ data: "[ins_be] server connected." })
})

// File Server
app.get('/insbe/event', (req: express.Request, res: express.Response) => {
  const selectedEvent: string = String(req.query.selectedEvent)
  axios.get(`${file_server}/${project_name}/events/${selectedEvent}`).then((response: AxiosResponse) => {
    if (response.data.msg === 'event found') {
      console.log(`GET ${file_server}/${project_name}/events/${selectedEvent}`)
      res.send(response.data.data)
    }
  }).catch((err: AxiosError) => {
    console.log(err)
    res.send(null)
  })
})

app.get('/insbe/process/roi', (req: express.Request, res: express.Response) => {
  const selectedEvent: string = String(req.query.selectedEvent)
  axios.get(`${file_server}/${project_name}/process/${selectedEvent}/roi`).then((response: AxiosResponse) => {
    if (response.data.msg === 'ROI found') {
      console.log(`GET ${file_server}/${project_name}/process/${selectedEvent}/roi`)
      res.send(response.data.data.videos)
    }
  }).catch((err: AxiosError) => {
    console.log(err)
    res.send(null)
  })
})

app.get('/insbe/process/defaultRoi', (req: express.Request, res: express.Response) => {
  axios.get(`${file_server}/${project_name}/process/defaultRoi`).then((response: AxiosResponse) => {
    if (response.data.msg === 'Default ROI found') {
      console.log(`GET ${file_server}/${project_name}/process/defaultRoi`)
      res.send(response.data.data.videos)
    }
  }).catch((err: AxiosError) => {
    console.log(err)
    res.send(null)
  })
})

app.get('/insbe/process/annotate', (req: express.Request, res: express.Response) => {
  const selectedRcEvent: string = String(req.query.selectedRcEvent)
  axios.get(`${file_server}/${project_name}/process/${selectedRcEvent}/annotate`)
    .then((response: AxiosResponse) => {
      if (response.data.msg === 'annotation found') {
        console.log(`GET ${file_server}/${project_name}/process/${selectedRcEvent}/annotate`)
        res.send(response.data.data)
      }
    }).catch((err: AxiosError) => {
      console.log(err)
      res.send(null)
    })
})

app.get('/insbe/process/reconstruct', (req: express.Request, res: express.Response) => {
  const eventId: string = String(req.query.eventId)
  const method: string = String(req.query.method)
  axios.get(`${file_server}/${project_name}/process/${eventId}/reconstruct/${method}`)
    .then((response: AxiosResponse) => {
      if (response.data.msg === 'reconstruction found') {
        console.log(`GET ${file_server}/${project_name}/process/${eventId}/reconstruct/${method}`)
        res.send(response.data.data)
      }
    }).catch((err:AxiosError) => {
      console.log(err)
      res.send(null)
    })
})

app.get('/insbe/process/defaultTrigger', (req: express.Request, res: express.Response) => {
  axios.get(`${file_server}/${project_name}/process/defaultTrigger`).then((response: AxiosResponse) => {
    if (response.data.msg === 'Default Trigger found') {
      console.log(`GET ${file_server}/${project_name}/process/defaultTrigger`)
      res.send(response.data.data.trigger)
    }
  }).catch((err: AxiosError) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/process/roi', (req: express.Request, res: express.Response) => {
  const eventId: string = req.body.eventId
  const videos: object[] = req.body.videos
  axios.post(`${file_server}/${project_name}/process/${eventId}/roi`, {
    eventId: eventId,
    videos: videos
  }).then((response: AxiosResponse) => {
    if (response.data.msg === 'ROI updated') {
      console.log(`POST ${file_server}/${project_name}/process/${eventId}/roi`)
      res.send('ROI updated')
    }
  }).catch((err: AxiosError) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/process/defaultRoi', (req: express.Request, res: express.Response) => {
  const eventId: string = req.body.eventId
  const videos: object[] = req.body.videos
  axios.post(`${file_server}/${project_name}/process/defaultRoi`, {
    eventId: eventId,
    videos: videos
  }).then((response: AxiosResponse) => {
    if (response.data.msg === 'Default ROI updated') {
      console.log(`POST ${file_server}/${project_name}/process/defaultRoi`)
      res.send('Default ROI updated')
    }
  }).catch((err) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/process/defaultTrigger', (req: express.Request, res: express.Response) => {
  const trigger: Trigger = req.body.trigger
  axios.post(`${file_server}/${project_name}/process/defaultTrigger`, {
    trigger: trigger
  }).then((response: AxiosResponse) => {
    if (response.data.msg === 'Default Trigger updated') {
      console.log(`POST ${file_server}/${project_name}/process/defaultTrigger`)
      res.send('Default Trigger updated')
    }
  }).catch((err: AxiosError) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/process/trim', (req: express.Request, res: express.Response) => {
  const eventId: string = req.body.eventId
  const videos: object[] = req.body.videos
  const delay: number = req.body.delay
  axios.post(`${file_server}/${project_name}/process/${eventId}/trim`, {
    eventId: eventId,
    videos: videos
  }, { timeout: delay }).then((response: AxiosResponse) => {
    if (response.data.msg) {
      console.log(`POST ${file_server}/${project_name}/process/${eventId}/trim`)
      res.send('trim success')
    }
  }).catch((err: AxiosError) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/process/annotate', (req: express.Request, res: express.Response) => {
  const eventId: string = req.body.eventId
  axios.post(`${file_server}/${project_name}/process/${eventId}/annotate`, {
    data: null
  }, { timeout: 600 * 1000 }).then((response: AxiosResponse) => {
    if (response.data.msg === 'annotation complete') {
      console.log(`POST ${file_server}/${project_name}/process/${eventId}/annotate`)
      res.send('annotation complete')
    }
  }).catch((err: AxiosError) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/process/reconstruct', (req: express.Request, res: express.Response) => {
  const eventId: string = req.body.eventId
  const method: string = req.body.method
  axios.post(`${file_server}/${project_name}/process/${eventId}/reconstruct/${method}`, {
    eventId: eventId,
    method: method
  }, { timeout: 120 * 1000 }).then((response: AxiosResponse) => {
    if (response.data.msg === 'reconstruction complete') {
      console.log(`POST ${file_server}/${project_name}/process/${eventId}/reconstruct/${method}`)
      res.send('reconstruction complete')
    }
  }).catch((err: AxiosError) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/process/reset_videos', (req: express.Request, res: express.Response) => {
  const eventId: string = req.body.eventId
  axios.post(`${file_server}/${project_name}/process/${eventId}/reset_videos`, {
    eventId: eventId
  }).then((response: AxiosResponse) => {
    if (response.data.msg === 'event found') {
      console.log(`POST ${file_server}/${project_name}/process/${eventId}/reset_videos`)
      res.send('event found')
    }
  }).catch((err: AxiosError) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/events/start', (req: express.Request, res: express.Response) => {
  const eventId: string = req.body.eventId
  const cameraIPs: string[] = req.body.cameraIPs
  axios.post(`${file_server}/${project_name}/events/start`, {
    eventId: eventId,
    cameraIPs: cameraIPs
  }).then((response: AxiosResponse) => {
    console.log(`POST ${file_server}/${project_name}/events/start`)
    res.send('record start')
  }).catch((err: AxiosError) => {
    console.log(err)
    res.send(null)
  })
})

app.post('/insbe/events/stop', (req: express.Request, res: express.Response) => {
  axios.post(`${file_server}/${project_name}/events/stop`, {}).then((response: AxiosResponse) => {
    if (response) {
      console.log(`POST ${file_server}/${project_name}/events/stop`)
      res.send('record stop')
    }
  }).catch((err: AxiosError) => {
    console.log(err)
    res.send(null)
  })
})

// Database
app.get('/insbe/events', (req: express.Request, res: express.Response) => {
  const sql: string = 'select * from `events`'
  conn.query(sql, (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
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

app.get('/insbe/getUsers', (req: express.Request, res: express.Response) => {
  const sql: string = 'select * from `users`'
  conn.query(sql, (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`GET /insbe/getUsers`)
      res.send(result)
    }
  })
})

app.get('/insbe/getProjects', (req: express.Request, res: express.Response) => {
  const sql: string = 'select * from `projects`'
  conn.query(sql, (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`GET /insbe/getProjects`)
      res.send(result)
    }
  })
})

app.get('/insbe/getTeams', (req: express.Request, res: express.Response) => {
  const sql: string = 'select * from `teams`'
  conn.query(sql, (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`GET /insbe/getTeams`)
      res.send(result)
    }
  })
})

app.post('/insbe/getIndividuals', (req: express.Request, res: express.Response) => {
  const teamId: string = req.body.teamId
  const sql: string = 'select personId, personName from `individuals` where teamId = ?'
  conn.query(sql, teamId, (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`GET /insbe/getIndividuals`)
      res.send(result)
    }
  })
})

app.get('/insbe/getTags', (req: express.Request, res: express.Response) => {
  const sql: string = 'select * from `tags`'
  conn.query(sql, (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`GET /insbe/getTags`)
      res.send(result)
    }
  })
})

app.post('/insbe/getUser', (req: express.Request, res: express.Response) => {
  const user: User = req.body.user
  const sql: string = 'select userId, username from `users` where username = ? and userpass = ?'
  conn.query(sql, [user.username, user.userpass], (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`POST /insbe/getUser`)
      res.send(result)
    }
  })
})

app.post('/insbe/getTeam', (req: express.Request, res: express.Response) => {
  const userId: number = req.body.userId
  const projectId: number = req.body.projectId
  const sql: string = 'select teamId, teamName from `teams` where userId = ? and projectId = ?'
  conn.query(sql, [userId, projectId], (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`POST /insbe/getTeam`)
      res.send(result)
    }
  })
})

app.post('/insbe/getIndividual', (req: express.Request, res: express.Response) => {
  const personId: number = req.body.personId
  const sql: string = 'select events from `individuals` where personId = ?'
  conn.query(sql, personId, (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`POST /insbe/getIndividual`)
      res.send(result)
    }
  })
})

app.post('/insbe/getTag', (req: express.Request, res: express.Response) => {
  const eventId: string = req.body.eventId
  const sql: string = 'select eventId, tagId from `eventTag` where eventId = ?'
  conn.query(sql, eventId, (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`POST /insbe/getTag`)
      res.send(result)
    }
  })
})

app.post('/insbe/getPersonEvent', (req: express.Request, res: express.Response) => {
  const personId: number = req.body.personId
  const sql: string = 'select * from `events` where eventId in (select distinct eventId from `personEvent` where personId = ?)'
  conn.query(sql, personId, (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`POST /insbe/getPersonEvent`)
      res.send(result)
    }
  })
})

app.post('/insbe/getTagEvent', (req: express.Request, res: express.Response) => {
  const tagIds: number[] = req.body.tagIds
  const sql: string = 'select * from `events` where eventId in (select distinct eventId from `eventTag` where tagId in (?))'
  conn.query(sql, [tagIds], (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`POST /insbe/getTagEvent`)
      res.send(result)
    }
  })
})

app.post('/insbe/getPersonTagEvent', (req: express.Request, res: express.Response) => {
  const tagIds: number[] = req.body.tagIds
  const personId: number = req.body.personId
  const sql: string = 'select * from `events` where eventId in (select a.* from (select distinct eventId from `eventTag` where tagId in (?) union all select distinct eventId from `personEvent` where personId = ?)a GROUP BY a.eventId HAVING COUNT(a.eventId)=2)'
  conn.query(sql, [tagIds, personId], (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`POST /insbe/getPersonTagEvent`)
      res.send(result)
    }
  })
})

app.post('/insbe/addUser', (req: express.Request, res: express.Response) => {
  const user: User = req.body.user
  const sql: string = 'insert into `users` set ?'

  conn.query(sql, user, (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`POST /insbe/addUser`)
      res.send(result)
    }
  })
})

app.post('/insbe/addProject', (req: express.Request, res: express.Response) => {
  const project: Project = req.body.project
  const sql: string = 'insert into `projects` set ?'

  conn.query(sql, project, (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`POST /insbe/addProject`)
      res.send(result)
    }
  })
})

app.post('/insbe/addTeam', (req: express.Request, res: express.Response) => {
  const team: Team = req.body.team
  const sql: string = 'insert into `teams` set ?'

  conn.query(sql, team, (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`POST /insbe/addTeam`)
      res.send(result)
    }
  })
})

app.post('/insbe/addPerson', (req: express.Request, res: express.Response) => {
  const person: Individual = {
    personName: req.body.personName,
    teamId: req.body.teamId
  }
  const sql: string = 'insert into `individuals` set ?'

  conn.query(sql, person, (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`POST /insbe/addPerson`)
      res.send(result)
    }
  })
})

app.post('/insbe/addTag', (req: express.Request, res: express.Response) => {
  const tag: Tag = {
    tagName: req.body.tagName
  }
  const sql: string = 'insert into `tags` set ?'

  conn.query(sql, tag, (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`POST /insbe/addTag`)
      res.send(result)
    }
  })
})

app.post('/insbe/addPersonEvent', (req: express.Request, res: express.Response) => {
  const personEvent: PersonEvent = {
    personId: req.body.personId,
    eventId: req.body.eventId
  }
  const sql: string = 'insert into `personEvent` set ?'

  conn.query(sql, personEvent, (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`POST /insbe/addPersonEvent`)
      res.send('personEvent added')
    }
  })
})

app.post('/insbe/addEventTag', (req: express.Request, res: express.Response) => {
  const eventTag: EventTag = {
    eventId: req.body.eventId,
    tagId: req.body.tagId
  }
  const sql: string = 'insert into `eventTag` set ?'

  conn.query(sql, eventTag, (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`POST /insbe/addEventTag`)
      res.send('tag added')
    }
  })
})

app.post('/insbe/delEventTag', (req: express.Request, res: express.Response) => {
  const eventTag = {
    eventId: req.body.eventId,
    tagId: req.body.tagId
  }
  const sql: string = 'delete from `eventTag` where eventId = ? and tagId = ?'

  conn.query(sql, [eventTag.eventId, eventTag.tagId], (err: mysql.MysqlError | null, result: any) => {
    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      res.send(null)
    } else {
      console.log(`POST /insbe/delEventTag`)
      res.send('tad deleted')
    }
  })
})

app.post('/insbe/triggerCallback', (req: express.Request, res: express.Response) => {
  const event: Event = req.body.event

  event.reconstructMethod = JSON.stringify(event.reconstructMethod)
  event.videos = JSON.stringify(event.videos)

  const sql: string = 'insert into `events` set ?'

  conn.query(sql, event, (err: mysql.MysqlError | null, result: any) => {

    const resData = {
      "code": 200,
      "msg": "event received",
      "data": {}
    }

    if (err) {
      console.error(`[INS_BE] query failed: ${err.message}`)
      const sql: string = 'update `events` set ? where eventId = ?'

      conn.query(sql, [event, event.eventId], (err: mysql.MysqlError | null, result: any) => {
        if (err) {
          console.error(`[INS_BE] query failed: ${err.message}`)
        } else {
          console.log(`UPDATE ${event.eventId}`)
          res.send(resData)
        }
      })
    } else {
      console.log(`INSERT ${event.eventId}`)
      res.send(resData)
    }
  })
})

app.listen(port, () => {
  console.log(`listening at http://localhost:${port} now`)
})