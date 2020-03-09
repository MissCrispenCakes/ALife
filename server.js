#!/usr/bin/env node

const http = require('http');
const url = require('url');
const fs = require("fs");
const path = require("path");
const os = require("os");
const assert = require("assert");

const express = require('express');
const WebSocket = require('ws');
const { vec2, vec3, vec4, quat, mat3, mat4 } = require("gl-matrix");

const tmpmat = mat4.create();

const project_path = process.cwd();
const server_path = __dirname;
const client_path = path.join(server_path, "client");

const app = express();
app.use(express.static(client_path))
app.get('/', function(req, res) {
	res.sendFile(path.join(client_path, 'index.html'));
});
//app.get('*', function(req, res) { console.log(req); });
const server = http.createServer(app);
// add a websocket service to the http server:
const wss = new WebSocket.Server({ 
	server: server,
	maxPayload: 1024 * 1024, 
});

function send_all_clients(msg, ignore) {
	wss.clients.forEach(function each(client) {
		if (client == ignore) return;
		try {
			client.send(msg);
		} catch (e) {
			console.error(e);
		};
	});
}


// whenever a client connects to this websocket:
let sessionId = 0;
wss.on('connection', function(ws, req) {

	// do any
	console.log("server received a connection");

	console.log("server has "+wss.clients.size+" connected clients");
	//	ws.id = uuid.v4();
	const id = ++sessionId;
	const location = url.parse(req.url, true);
	// You might use location.query.access_token to authenticate or share sessions
	// or req.headers.cookie (see http://stackoverflow.com/a/16395220/151312)
	
	ws.on('error', function (e) {
		if (e.message === "read ECONNRESET") {
			// ignore this, client will still emit close event
		} else {
			console.error("websocket error: ", e.message);
		}
	});

	// what to do if client disconnects?
	ws.on('close', function(connection) {
		console.log("connection closed");
        console.log("server has "+wss.clients.size+" connected clients");
	});
	
	// respond to any messages from the client:
	ws.on('message', function(msg) {
		if (msg instanceof Buffer) {
			// get an arraybuffer from the message:
			const ab = msg.buffer.slice(msg.byteOffset,msg.byteOffset+msg.byteLength);
			console.log("received arraybuffer", ab);
			// as float32s:
			//console.log(new Float32Array(ab));
		} else {
			console.log("received message from client:", id, msg);
		}
	});
	
	// // Example sending binary:
	// const array = new Float32Array(5);
	// for (var i = 0; i < array.length; ++i) {
	// 	array[i] = i / 2;
	// }
    // ws.send(array);
    
    //send_all_clients("hi")
});

server.listen(8080, function() {
	console.log(`\n\n\n****************`);
	console.log(`****************`);
	console.log(`server listening`);
	console.log(`client view on http://localhost:${server.address().port}/index.html\n\n`);
});