const modules = require('./module.js');

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
let initFlag = true
let getUserMediaFlag = false

let audioContext 
let masterGain 
//let javascriptnode
//let osc
//let oscGain
let bufferSize = 8192;
let bufferRate = 96000;
let chatGain
let initHsh = {}
let freqVal = 440

//manymanyosc
let numOfOsc = 0
for(let i=0;i<100;i++){
  eval("var osc" + String(i) + ";")
  eval("var osc" + String(i) + "gain;")
}

let gps;
let referenceCoords = {
  oLatitude: 35.667698,
  oLongitude: 139.697131
}

//let originalCoodinate = {x:0,y:0}

//let timelapseFlag = false;
//video record/play ここから
let image;
let receive;
let receive_ctx;
// 関数
// canvas

let canvas = document.getElementById('cnvs');
let ctx = canvas.getContext('2d');
let buffer;
let bufferContext;

const recordEmit = () =>{
  videoMode.mode = "record"
  modules.erasePrint(ctx, canvas)
  modules.textPrint(ctx, canvas, "recording")
  socket.emit('chunkFromClient', {"video":toBase64(buffer, video), "target": "CLIENT", "freq": freqVal})
  videoMode.mode = "none"
  modules.erasePrint(ctx, canvas)
  modules.textPrint(ctx, canvas, "撮影終わり")
  //socket.emit("readyFromClient", "recordEnd")  //later to app.js
  document.getElementById("video").style.display="none";
  video.muted = true
  setTimeout(() => {
    modules.erasePrint(ctx, canvas)
  }, 1000)
  //video.muted = "muted"
  /*
  setTimeout(()=>{
    videoMode.mode = "none"
    modules.erasePrint(ctx, canvas)
    modules.textPrint(ctx, canvas, "record end")
    socket.emit("readyFromClient", "recordEnd")  //later to app.js
    video.muted = true
  },5000)
  */
}

//canvas
const sizing=() =>{
  document.getElementById("cnvs").setAttribute("height", String(window.innerHeight - 400) + "px")
  document.getElementById("cnvs").setAttribute("width", String(window.innerWidth) + "px")
}

sizing();

const renderStart=()=> {
  video = document.getElementById('video');
  buffer = document.createElement('canvas');
  bufferContext = buffer.getContext('2d');

  let render = () => {
    requestAnimationFrame(render);
    let width = video.videoWidth;
    let height = video.videoHeight;
    if(width == 0 || height ==0) {return;}
    buffer.width = width;
    buffer.height = height;
    bufferContext.drawImage(video, 0, 0);
  }
  render();
}


/*
socket.on('infoFromServer',(data) =>{
  let list = ""
  for(let key in data) {
    if(key != String(socket.id)) list = list + key + ", "
  }
  document.getElementById('list').innerHTML = list
})
*/

socket.on('recReqFromServer',()=>{
  if(getUserMediaFlag) {
    videoMode.mode = "wait"
    video.muted = false
    modules.textPrint(ctx, canvas, "record ready")
    setTimeout(()=>{
      modules.erasePrint(ctx,canvas)
    },1500)
  }
})
socket.on('playReqFromServer', () => {
  modules.erasePrint(ctx,canvas)
  modules.textPrint(ctx, canvas, "playback ready")
  //manymanyosc
  let currentTime = audioContext.currentTime
  for(let i=1;i<numOfOsc;i++) {
    eval("osc" + String(i) + "gain.gain.setTargetAtTime(0,currentTime,10);")
  }
  setTimeout(()=>{
    socket.emit('reqFromClient')
    modules.erasePrint(ctx,canvas)
  },1000 + (Math.random() * 1000))
})
socket.on('textFromServer', (data) => {
  modules.erasePrint(ctx,canvas)
  modules.textPrint(ctx,canvas,String(data))
})


socket.on('chunkFromServer', (data) => {
  if(videoMode.mode != "record"){
    // if(data.target === "CHAT"){
      // modules.erasePrint(ctx, canvas);
//      playAudioStream(data.audio,playsampleRate,1,false)
      playVideo(data.video);
    // } else if(data.target === "NONE") {
      // modules.erasePrint(ctx, canvas);
      // modules.textPrint(ctx, canvas, "まだ演奏していません");
    // }
  }
  if(data.freq != undefined){
    osc0.frequency.setValueAtTime(data.freq, 0);
  }
  console.log(videoMode.mode)
  if(videoMode.mode != "none") {
    socket.emit('reqFromClient')

  }
});


//manymanyosc
socket.on("freqListFromServer", (data) => {
  console.log(data)
  let currentTime = audioContext.currentTime
  data.forEach((element, index) =>{
    if(eval("osc" + String(index) + " === undefined")) {
      eval("osc" + String(index) + " = audioContext.createOscillator();")
      eval("osc" + String(index) + ".frequency.setTargetAtTime(440,currentTime,0);")
      eval("osc" + String(index) + "gain = audioContext.createGain();")
      eval("osc" + String(index) + ".connect(osc" + String(index) + "gain);") 
      eval("osc" + String(index) + "gain.connect(audioContext.destination);") 
      eval("osc" + String(index) + ".start(0);") 
    }
    eval("osc" + index + "gain.gain.setTargetAtTime(1,currentTime,1000);")
    eval("osc" + index + ".frequency.setTargetAtTime("+ String(element) + ",currentTime,1000);")
  })
  if(data.length < numOfOsc) {
    for(let i=data.length;i<numOfOsc;i++) {
      eval("osc" + String(i) + "gain.gain.setTargetAtTime(0,currentTime,10);")
    }
  } else {
    numOfOsc = data.length
  }
})

socket.on('endFromServer', (data) =>{
  //videoStop();
  videoMode.mode = "none";
  videoMode.option = "none"
  modules.erasePrint(ctx,canvas);
  modules.textPrint(ctx, canvas, data);
  let currentTime = audioContext.currentTime;
  //osc0Gain.gain.setTargetAtTime(0,currentTime,1000);
  for(let i=0;i<numOfOsc;i++) {
//    eval("osc" + String(i) + "gain.gain.setTargetAtTime(0,currentTime,1000);")
    eval("osc" + String(i) + "gain.gain.setValueAtTime(0, 0);")
    //eval("osc" + String(i) + "gain.gain.setTargetAtTime(0,currentTime,1000);")
  }
  stopGPS();
})

const videoStop = () => {
  videoMode.mode = "none";

  /*
const videoStop = () => {
  switch (videoMode.mode) {
    case "chunkEmit":
      break;
    case "beforePlay":
    case "beforeBuff":
    default:
      videoMode.mode = "none";
      break;
  }
  */
  videoMode.option = "none"
}


const playVideo = (video) => {
  image = new Image();
  image.src = video;
  const wdth = window.innerWidth
  const hght = (wdth * 3) / 4

  image.onload = function(){
    receive_ctx.drawImage(image, 0, 0, wdth, hght);
  }
}
/*
const lapseInterval = 120000;
let setLapse;

const timeLapse = ()=>{
  setLapse = setInterval(() => {
      timelapseFlag = true;
  }, lapseInterval);
}

const stopLapse = ()=>{
  clearInterval(setLapse);
}
*/
const toBase64 = (buffer, video) =>{
  let bufferContext = buffer.getContext('2d');
  buffer.width = video.videoWidth;
  buffer.height = video.videoHeight;
  bufferContext.drawImage(video, 0, 0);
  return buffer.toDataURL("image/jpeg");
}
/*
const onAudioProcess = (e) => {
    if(videoMode.mode === "record"){
      let bufferData = new Float32Array(bufferSize);
      if(e.inputBuffer.copyFromChannel != undefined){
        e.inputBuffer.copyFromChannel(bufferData, 0);
      } else {
        let input = e.inputBuffer.getChannelData(0);
        for (let i=0; i<bufferSize; i++ ){
          bufferData[i] = input[i];
        }
      }
      socket.emit('chunkFromClient', {"audio":bufferData, "video":toBase64(buffer, video), "target": "INTERNET"})
    }
}
*/

//let micLevel = 0.5
//
let mediaDevices = navigator.mediaDevices || ((navigator.mozGetUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia) ? {
    getUserMedia(c) {
        return new Promise(((y, n) => {
            (navigator.mozGetUserMedia || navigator.webkitGetUserMedia).call(navigator, c, y, n);
        }));
    }
} : null);

const getGPS = () =>{
  gps = setInterval(()=>{
      navigator.geolocation.getCurrentPosition((position)=>{
        //let currentTime = audioContext.currentTime;
        //if(initHsh.originX != undefined && initHsh.originY != undefined) {
          //freqVal = 440 + ((position.coords.longitude - initHsh.originX) / 0.00010966404715491394 ) + ((position.coords.latitude - initHsh.originY) / 0.000090133729745762 )
          let distance = Math.sqrt((position.coords.longitude - referenceCoords.oLongitude) ** 2 + (position.coords.latitude - referenceCoords.oLatitude) ** 2)
          //console.log(distance)
          freqVal = 440 + (2021 * distance)
        //}
//        osc0.frequency.setTargetAtTime(freqVal,currentTime,500);
        socket.emit('freqFromClient', freqVal)
        //socket.emit('initFromClient',initHsh)
      })
  },5000)
}
const stopGPS = () => {
  clearInterval(gps);
}
/*
const emitGPS = () => {
  gps = setInterval(()=>{
    //later
    let gpsVal
    socket.emit("gpsFromClient",gpsVal)
  },500)
}
*/

const initialize = () =>{
  if(initFlag) { 
    initFlag = false
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();

    masterGain.gain.setValueAtTime(1,0)
    masterGain.connect(audioContext.destination);

    //osc(sinewave)
    /*
    osc0 = audioContext.createOscillator();
    osc0Gain = audioContext.createGain();
    osc0.connect(osc0Gain);
    osc0.frequency.setValueAtTime(freqVal, 0);
    osc0Gain.gain.setValueAtTime(0,0);
    osc0Gain.connect(audioContext.destination);
    osc0.start(0);
    */


  //record/play
    //javascriptnode = audioContext.createScriptProcessor(8192, 1, 1);

    // chat
    //chatGain = audioContext.createGain();
    video = document.getElementById('video');
    video.muted = true
    buffer = document.createElement('canvas');
    bufferContext = buffer.getContext('2d');
    //chatGain.gain.setValueAtTime(1,0);
    //chatGain.connect(masterGain);
    if(navigator.mediaDevices.getUserMedia){
    //  navigator.mediaDevices.getUserMedia({
      mediaDevices.getUserMedia({
        video: true, audio: true
      }).then((stream) =>{
        /*
        let mediastreamsource = void 0;
        mediastreamsource = audioContext.createMediaStreamSource(stream);
        mediastreamsource.connect(javascriptnode);
        */
        //video
        video = document.getElementById('video');
        video.srcObject = stream
        /*if(video.srcObject != undefined){
          video.srcObject = stream
        } else {
          video.src = window.URL.createObjectURL(stream);
        }*/
        video.play();
        video.volume = 0;
        renderStart();
        //initHsh.getUserMedia = true
        getUserMediaFlag = true
        //socket.emit('initFromClient',initHsh)
        modules.erasePrint(ctx,canvas)
        //modules.textPrint(ctx,canvas,message.explain.next)//rlater textPrint
      },  (e) =>{
        //initHsh.getUserMedia = false
        getUserMediaFlag = false
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx,canvas,"camera missed")
        //socket.emit('initFromClient',initHsh)
        return console.log(e);
      });
    } else {
      navigator.getUserMedia({
        video: true, audio: true
      }, (stream) =>{
        /*
        let mediastreamsource = void 0;
        mediastreamsource = audioContext.createMediaStreamSource(stream);
        mediastreamsource.connect(javascriptnode);
        */
        //video
        video = document.getElementById('video');
        //video.src = window.URL.createObjectURL(stream);
        video.srcObject = stream
        /*
        if(video.srcObject != undefined){
          video.srcObject = stream
        } else {
          video.src = window.URL.createObjectURL(stream);
        }*/
        video.play();
        video.volume = 0;
        renderStart();
        //initHsh.getUserMedia = true
        getUserMediaFlag = true
        //socket.emit('initFromClient',initHsh)
        modules.erasePrint(ctx,canvas)
        //modules.textPrint(ctx,canvas,essage.explain.next)//rlater textPrint
      },  (e) =>{
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx,canvas,"camera missed")
        getUserMediaFlag = false
        //initHsh.getUserMedia = false
        //socket.emit('initFromClient',initHsh)
        return console.log(e);
      });
    }
    //rec
    //javascriptnode.onaudioprocess = onAudioProcess;
    // javascriptnode.connect(audioContext.destination);
    //javascriptnode.connect(masterGain);
    //video
    image = document.createElement("img");
    receive = document.getElementById("cnvs");
    receive_ctx = receive.getContext("2d");
    //let timelapseFlag = true
    modules.erasePrint(ctx,canvas)
    /*
    if(navigator.geolocation){

      navigator.geolocation.getCurrentPosition((position)=>{
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx,canvas,"GPS gotten")
        initHsh = {
          originX:position.coords.longitude,
          originY:position.coords.latitude
        }
        console.log(position.coords.longitude)
        //socket.emit('initFromClient',initHsh)
      })
    } else {
      modules.erasePrint(ctx,canvas)
      modules.textPrint(ctx,canvas,"GPS missed")
    }
    */
    console.log(initFlag)
    getGPS()
    /*
  } else if(initFlag === 1){
    initFlag++
    let currentTime = audioContext.currentTime;
    //oscGain.gain.setTargetAtTime(1,currentTime,3);
    modules.erasePrint(ctx,canvas)
    getGPS()
    console.log(initFlag)
  } else if(initFlag > 1 && videoMode.mode === "wait") {
    */
    //initFlag++
  //} else {
  } else if(!initFlag && videoMode.mode === "wait") {
    modules.erasePrint(ctx,canvas)
    recordEmit()
    //console.log(initFlag)
  }
// socket
  socket.emit('readyFromClient', "CTRL");
};

//document.getElementById("wrapper").onclick = function() {
//  initialize
//}
let eListener = document.getElementById("wrapper")
eListener.addEventListener("click", initialize, false);
//window.addEventListener("load", initialize, false);
window.addEventListener('resize', (e) =>{
  console.log('resizing')
  sizing()
})
modules.textPrint(ctx,canvas,"init")

let recButton = document.getElementById("rec")
//document.getElementById("rec").addEventListener("click", () =>{
recButton.addEventListener("click", () =>{
  socket.emit("readyFromClient", "RECORD")
},false)

let textButton = document.getElementById("textActivate")
//document.getElementById("rec").addEventListener("click", () =>{
textButton.addEventListener("click", () =>{
  socket.emit("readyFromClient", "TEXT")
},false)


let playButton = document.getElementById("playback")
playButton.addEventListener("click", () =>{
  socket.emit("readyFromClient", "PLAYBACK")
},false)

let endButton = document.getElementById("end")
endButton.addEventListener("click", () =>{
  socket.emit("readyFromClient", "END")
},false)

let textListner = document.getElementById("text")
textListner.addEventListener('input', ((e) => {
  console.log(e.target.value)
  socket.emit("textFromClient", e.target.value)
}))