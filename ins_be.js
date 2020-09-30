const express = require('express')
const mysql = require('mysql')
const fs = require('fs')
const app = express()
const port = 3001
const conn = mysql.createConnection({
  host: '127.0.0.1',
  user: 'dukalee',
  password: 'paopao123',
  database: 'instamove'
})

var util = require('util')
var log_file = fs.createWriteStream(__dirname + '/ins_be.log', {flags : 'w'})
var log_stdout = process.stdout

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
}

app.use(express.json())

app.get('/insbe/', (req, res) => {
  res.send({data: "hello world"})
})

app.get('/insbe/getUsers', (req, res) => {
  const sql = 'select * from `users`'
  conn.query(sql, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(msg)
    }
    res.send(result)
  })
})

app.get('/insbe/getProjects', (req, res) => {
  const sql = 'select * from `projects`'
  conn.query(sql, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(msg)
    }
    res.send(result)
  })
})

app.get('/insbe/getTeams', (req, res) => {
  const sql = 'select * from `teams`'
  conn.query(sql, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(msg)
    }
    res.send(result)
  })
})

app.post('/insbe/getUser', (req, res) => {
  const user = req.body.user
  const sql = 'select userId, username from `users` where username = ? and userpass = ?'
  conn.query(sql, [user.username, user.userpass], (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(msg)
    }
    res.send(result)
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
      res.send(msg)
    }
    res.send(result)
  })
})

app.post('/insbe/getIndividual', (req, res) => {
  const personId = req.body.personId
  const sql = 'select events from `individuals` where personId = ?'
  conn.query(sql, personId, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(msg)
    }
    res.send(result)
  })
})

app.post('/insbe/getIndividuals', (req, res) => {
  const teamId = req.body.teamId
  const sql = 'select personId, personName from `individuals` where teamId = ?'
  conn.query(sql, teamId, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(msg)
    }
    res.send(result)
  })
})

app.post('/insbe/addUser', (req, res) => {
  const user = req.body.user
  const sql = 'insert into `users` set ?'

  conn.query(sql, user, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(msg)
    }

    res.send(result)
  })
})

app.post('/insbe/addProject', (req, res) => {
  const project = req.body.project
  const sql = 'insert into `projects` set ?'

  conn.query(sql, project, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(msg)
    }

    res.send(result)
  })
})

app.post('/insbe/addTeam', (req, res) => {
  const team = req.body.team
  const sql = 'insert into `teams` set ?'

  conn.query(sql, team, (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(msg)
    }

    res.send(result)
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
      res.send(msg)
    }

    res.send(result)
  })
})

app.post('/insbe/appendEvent', (req, res) => {
  const personId = req.body.personId
  const events = req.body.events

  const sql = 'update `individuals` set events = ? where personId = ?'

  conn.query(sql, [events, personId], (err, result) => {
    if (err) {
      const msg = `[INS_BE] query failed: ${err.message}`
      console.error(msg)
      res.send(msg)
    }

    res.send(result)
  })
})

app.listen(port, () => {
  console.log(`listening at http://localhost:${port}`)
})