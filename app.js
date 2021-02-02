//expressの呼び出し

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

//getUserMediaのためのHTTPS化
const https = require('https');
//https鍵読み込み
const options = {
  key: fs.readFileSync(process.env.HOME + '/keys/' + 'privkey.pem'),
  cert: fs.readFileSync(process.env.HOME + '/keys/' + 'cert.pem')
  //key: fs.readFileSync(process.env.HTTPSKEY_PATH + 'privkey.pem'),
  //cert: fs.readFileSync(process.env.HTTPSKEY_PATH + 'cert.pem')
}
const os = require('os');
const { isValidObjectId } = require('mongoose');
const { disconnect } = require('process');

const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json({limit: '100mb'}));
//app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'lib/favicon.ico')));

//app.use('/', routes);

/* GET home page. */
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
//let port = 3333;
let server = https.createServer(options,app).listen(port);
//let io = require('socket.io').listen(server);
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
    console.log(reason)
    //if(String(socket.id) in clientList){
      delete clientList[String(socket.id)]
      delete freqList[String(socket.id)]
      console.log("disconnect:" + String(socket.id))
      //console.log(Object.keys(io.sockets.adapter.rooms))
    //}
  })
/*
  socket.on("initFromClient", (data) => {
    clientList[String(socket.id)] = {
      getUserMedia: false 
    }
    freqList[String(socket.id)] = {
      freq: 440 
    }
    if(data != undefined) {
      if(data) {
        socket.join("getUserMedia")
        console.log("getUserMedia join")
      } else {
        socket.join("notUserMedia")
        console.log("notUserMedia join")
      }
      clientList[String(socket.id)].getUserMedia = data
    }
    
    //if(data.difference != undefined) clientsList[String(socket.id)].difference = data.difference
    console.log("init " + String(socket.id))
    //console.log(Object.keys(clientsList))
  })
  */
  socket.on("freqFromClient", (data) => {
    console.log(data)
    freqList[String(socket.id)] = data
    console.log(freqList)
    //console.log(io.sockets.adapter.rooms)
    //console.log(socket.rooms.has('client'))
    if(socket.rooms.has('listener') || socket.rooms.has('ctrl')){
    //  console.log("debug")
      socket.emit("freqListFromServer", Object.values(freqList))
    }
    /*
    if(io.sockets.manager.roomClients[socket.id]['/listener'] || io.sockets.manager.roomClients[socket.id]['/ctrl']) {
      socket.emit("freqListFromServer", Object.values(freqList))
    }
    */
    //io.to("listner").emit("freqListFromServer", Object.values(freqList))
    //io.to("ctrl").emit("freqListFromServer", Object.values(freqList))
  })

  socket.on("textFromClient", (data) => {
    io.emit("textFromServer", data)
  })
/*
  socket.on("freqFromClient", (data) => {
    for(let id in ios.sockets.adapter.rooms) {
      if(data.target === String(id)) {
        io.to(id).emit("freqFromServer", data.freq)
      }
    }
  })
*/

  socket.on("readyFromClient", (data) => {
    console.log(data)
    switch(data) {
      case "CLIENT":
        socket.join("client")
        freqList[String(socket.id)] = 440 
        /*
        if(data != undefined) {
          if(data) {
            socket.join("getUserMedia")
            console.log("getUserMedia join")
          } else {
            socket.join("notUserMedia")
            console.log("notUserMedia join")
          }
          clientList[String(socket.id)].getUserMedia = data
        }
        */
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
        io.emit("endFromServer")
        break;
      case "CTRL":
        socket.join("ctrl")
        freqList[String(socket.id)] = 440 
        //socket.emit('infoFromServer',freqList)
        break;
    }
  })

  socket.on("chunkFromClient", (data) => {
    recordBuffer.push(data)
    console.log("chunk from:" + String(socket.id) + " " + String(recordBuffer.length))
  })
  //i = 0
  socket.on("reqFromClient", () => {
    /*
    if(data === "CLIENT") {
      if(receiveBuffer.length > 0) {
        let bufferSlice = receiveBuffer.shift()
        socket.emit('chunkFromServer', bufferSlice)
        receiveBuffer.push(bufferSlice)
      } else {
        socket.emit('chunkFromServer', {"target": "NONE"})
      }
    } else if(data === "PARADE") {
      if(clientBuffer.length > i) {
        console.log(clientBuffer.length - i)
        i++
        let bufferSlice = clientBuffer.shift()
        console.log(Object.keys(bufferSlice))
        socket.emit('chunkFromServer', bufferSlice)
        clientBuffer.push(bufferSlice)
      } else {
        io.emit('endFromServer')
      }
      
    }
    */
        let bufferSlice = recordBuffer.shift()
        socket.emit('chunkFromServer', bufferSlice)
        recordBuffer.push(bufferSlice)
  })

});
