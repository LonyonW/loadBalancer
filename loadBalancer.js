const express = require('express');
const request = require('request');

const app = express();

// list of servers 

const servers = [
    'http://192.168.80.16:3001',
    'http://192.168.80.16:3002',
    'http://192.168.80.16:3003'
];

let cur = 0;
const ipServerMap = {};

const handler = (req, res) => {
    const _req = request({url: servers[cur] + req.url});
    console.log('redirecting to server', servers[cur]);
    console.log('Client ip: ', req.ip)

    _req.on('error', function(err) {
        console.log(`Error: Server connection refused ${servers[cur]} is not available.`);
        //console.log('error:', err);
        cur = (cur + 1) % servers.length;
        handler(req, res);
    });

    req.pipe(_req).pipe(res);
    cur = (cur + 1) % servers.length;
}

const server = app.get('*', handler).post('*', handler);

server.listen(8888);