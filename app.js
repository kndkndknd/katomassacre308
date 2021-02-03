const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs');
const favicon = require('serve-favicon');
const dateUtils = require('date-utils');

const routes = require('./routes/index');
const users = require('./routes/users');

const https = require('https');
const options = {
  key: fs.readFileSync(process.env.HOME + '/keys/' + 'privkey.pem'),
  cert: fs.readFileSync(process.env.HOME + '/keys/' + 'cert.pem')
}
const os = require('os');
const { isValidObjectId } = require('mongoose');
const { disconnect } = require('process');

const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'lib/favicon.ico')));


process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

app.get('/', (req, res, next) => {
  res.render('client', {
    title: 'katomassacre308'
  });
})
app.get('/listen', (req, res, next) => {
  res.render('listener', {
    title: 'katomassacre308'
  });
})
app.get('/ctrl', (req, res, next) => {
  res.render('ctrl', {
    title: 'ctrl'
  });
})

module.exportComponent = app;

let port = 8888;
let server = https.createServer(options,app).listen(port);
let io = require('socket.io')(server);

console.log("server start")
if("en0" in os.networkInterfaces()){
  console.log("server start in " + os.networkInterfaces().en0[0]["address"] + ":" + String(port));
  console.log("server start in " + os.networkInterfaces().en0[1]["address"] + ":" + String(port));
} else {
  console.log("server start in :8888")
}

let clientList = {}
let freqList = {}
let recordBuffer = []


io.sockets.on('connection',(socket)=>{
  socket.on("disconnect", (reason) =>{
    delete clientList[String(socket.id)]
    delete freqList[String(socket.id)]
    console.log("disconnect:" + String(socket.id))
  })

  socket.on("freqFromClient", (data) => {
    freqList[String(socket.id)] = data
    if(socket.rooms.has('listener') || socket.rooms.has('ctrl')){
      socket.emit("freqListFromServer", Object.values(freqList))
    }
  })

  socket.on("textFromClient", (data) => {
    io.emit("textFromServer", data)
  })

  socket.on("readyFromClient", (data) => {
    switch(data) {
      case "CLIENT":
        socket.join("client")
        freqList[String(socket.id)] = 440 
        break;
      case "LISTENER":
        socket.join("listner")
        freqList[String(socket.id)] = 440 
        break;
      case "TEXT":
        io.emit("textActivateFromServer")
        break;
      case "RECORD":
        io.emit("recReqFromServer")
        break;
      case "PLAYBACK":
        io.emit("playReqFromServer")
        break;
      case "END":
        io.emit("endFromServer", "終わります。お疲れさまでした")
        break;
      case "CTRL":
        socket.join("ctrl")
        freqList[String(socket.id)] = 440 
        break;
    }
  })

  socket.on("chunkFromClient", (data) => {
    recordBuffer.push(data)
  })
  socket.on("reqFromClient", () => {
    let bufferSlice = recordBuffer.shift()
    socket.emit('chunkFromServer', bufferSlice)
    recordBuffer.push(bufferSlice)
  })

});
