const {config} = require('./config');
const request = require('request');
const { exec, spawn } = require('child_process');
const express = require('express');
const app = express();
const port = config.port;
const cors = require('cors');
let configServer;

app.use(express.json());
app.use(cors());

request.post(`http://localhost:3000/notify_agent`, {
        json: {
            port: config.port,
            host: config.host,
        }
    }, (error, res, body) => {
        if (error) {
            console.log(error);
        }
        else {
            configServer = body.config;
        }
    }
);

app.post('/build', (req, res) => {
    let result = '';
    exec(`git checkout ${req.body.hashCommit}`, {cwd: `${configServer.repository}`}, (err, out) => {
        timeStart = (new Date).toLocaleString();
        if (err) {
            resExec.end('build error');
        }
        else {
            const buildCommand = req.body.buildCommand.split(' ').shift();
            const buildCommandArgs  = req.body.buildCommand.split(' ').splice(1);
            const bat = spawn(buildCommand, buildCommandArgs, { cwd: configServer.repository , shell: true} );

            bat.stdout.on('data', (data) => {
                req.body.startTime = (new Date).toLocaleString();
                console.log( req.body.startTime);
                result += data
            });

            bat.stderr.on('data', (data) => {
                res.send(`<tr>
                <td><a href="/build/${req.body.buildId}-${req.body.status}">${req.body.buildId}</a></td>
                    <td>${req.body.status}</td>
                </tr>`)
            });

            bat.on('exit', (code) => {
                req.body.startEnd = (new Date).toLocaleString();
                req.body.result = result;
                req.body.status = 'nosuccess'
                if (code === 0) {
                    req.body.status = 'success'
                }

                req.body.html = markup(req.body);
                
                submitResult(req.body);
                
                res.send(`<tr>
                <td><a href="/build/${req.body.buildId}-${req.body.status}">${req.body.buildId}</a></td>
                    <td>${req.body.status}</td>
                </tr>`)
                console.log(`Child exited with code ${code}`);
            });
        }
    })
    
});

app.listen(config.port, () => console.log(`Example app listening on port ${port}!`));

function submitResult (data) {
    request.post(`http://localhost:${configServer.port}/notify_build_result`, {
        json: data
    }, (error) => {
        if (error) {
            console.log(error);
        }
        else {
            console.log('Registration');
        }
    });
} 

function markup (reqBody) {
    return `<!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="ie=edge">
            <title>Document</title>
        </head>
        <body>
            <style>
                body {
                    font-family: monospace;
                }
                .build__table {
                    border: 2px solid;
                    border-collapse: collapse;  
                }

                th, td {
                    padding: 5px 10px;
                    text-align: center;
                }
                .build__result {
                    border: 2px solid;
                    padding: 10px;
                }
            </style>
            <h1>Build №${reqBody.buildId}</h1>
            <table class="build__table"><tbody><tr> <th>Hash commit</th> <th>Date start</th><th>Date end</th><th>Status</th><th>Build command</th></tr> <tr> <td>${reqBody.hashCommit}</td><td>${reqBody.startTime}</td><td>${reqBody.startEnd}</td><td>${reqBody.status}</td><td>${reqBody.buildCommand}</td> </tr></tbody></table><h2>Result</h2><pre>${reqBody.result}</pre>
        </body>
    </html>`
}