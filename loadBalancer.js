require('dotenv').config();
const express = require('express');
const request = require('request');
const cors = require('cors');
//const moment = require('moment');

const app = express();

app.use(cors());

//app.use(express.json());


app.use((req, res, next) => {
    const now = new Date();
    const formattedDate = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}:${now.getHours()}/${now.getMinutes()}/${now.getSeconds()}`;
    const clientIp = req.ip.split(':').pop();
    //console.log(`${clientIp} ${formattedDate} ${req.method} ${req.originalUrl}`);
    console.log(`[${clientIp}] [${formattedDate}]`);
    //[${JSON.stringify(req.body)}] [${req.method}] [${req.originalUrl}]

    next();
});


const SERVER_IP_1 = process.env.SERVER_IP_1;
const SERVER_IP_2 = process.env.SERVER_IP_2;
const SERVER_IP_3 = process.env.SERVER_IP_3;

//console.log('SERVER_IP_1:', SERVER_IP_1);

const servers = [
    SERVER_IP_1,
    SERVER_IP_2,
    SERVER_IP_3
];

let cur = 0;
const ipServerMap = {};
let errorCount = 0;

const handler = (req, res) => {
    const clientIp = req.ip;
    let serverUrl;

    if (ipServerMap[clientIp]) {
        serverUrl = ipServerMap[clientIp];
    } else {
        serverUrl = servers[cur];
        ipServerMap[clientIp] = serverUrl;
        cur = (cur + 1) % servers.length;
    }

    const _req = request({url: serverUrl + req.url});
    console.log('Request sent to server:', serverUrl);

    _req.on('error', function(err) {
        console.log(`Error: Server refused connection ${serverUrl} is not available.`);
        console.log('Error time:', new Date().toISOString());
        console.log('Error payload:', err);
        delete ipServerMap[clientIp];
        errorCount++;
        if (errorCount < servers.length) {
            handler(req, res);
        } else {
            console.log('Error count exceeded. Sending 500.');
            res.status(500).send('No se pudo conectar a ninguno de los servidores');
            errorCount = 0; // reset the error count
        }
    });

    _req.on('response', function() {
        errorCount = 0; // reset the error count on successful connection
    }); 

    req.pipe(_req).pipe(res);
}



const server = app.get('*', handler).post('*', handler);

server.listen(8888);
