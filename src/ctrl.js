const modules = require('./module.js');

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

let audioContext 
let masterGain 
let javascriptnode
let osc
let oscGain
let streamBuffer = []
let lookBackBuffer = []
let loopBuffer = {}
let chatBuffer = {}
let bufferSize = 8192;
let bufferRate = 96000;
let chatGain
let initHsh = {}
let freqVal = 440

//let originalCoodinate = {x:0,y:0}

let timelapseFlag = false;
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
  modules.textPrint(ctx, canvas, message.explain.recording)
  setTimeout(()=>{
    videoMode.mode = "none"
    modules.erasePrint(ctx, canvas)
    modules.textPrint(ctx, canvas, message.explain.recordEnd)
    socket.emit("readyFromClient", "recordEnd")  //later to app.js
    video.muted = true
  },5000)
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

// socket
socket.emit('readyFromClient', "CTRL");

socket.on('infoFromServer',(data) =>{
  let list = ""
  for(let key in data) {
    if(key != String(socket.id)) list = list + key + ", "
  }
  document.getElementById('list').innerHTML = list
})

socket.on('recReqFromServer',()=>{
  videoMode.mode = "wait"
  video.muted = false
  modules.textPrint(ctx, canvas, message.explain.recordReady)
  setTimeout(()=>{
    modules.erasePrint(ctx,canvas)
  },1500)
})
socket.on('playReqFromServer', () => {
  modules.erasePrint(ctx,canvas)
  modules.textPrint(ctx, canvas, message.explain.playReady)
})
socket.on('textFromServer', (data) => {
  modules.erasePrint(ctx,canvas)
  modules.textPrint(ctx,canvas,String(data))
})


let playsampleRate = 96000
let playTarget = ""
socket.on('chunkFromServer', (data) => {
  if(videoMode.mode != "record"){
    if(data.target === "CHAT"){
      modules.erasePrint(ctx, canvas);
//      playAudioStream(data.audio,playsampleRate,1,false)
      playVideo(data.video);
    } else if(data.target === "NONE") {
      modules.erasePrint(ctx, canvas);
      modules.textPrint(ctx, canvas, "まだ演奏していません");
    }
    socket.emit('reqFromClient')
  }
});

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
const funcToBase64 = (buffer, video) =>{
  let bufferContext = buffer.getContext('2d');
  buffer.width = video.videoWidth;
  buffer.height = video.videoHeight;
  bufferContext.drawImage(video, 0, 0);
  return buffer.toDataURL("image/jpeg");
}

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
      socket.emit('chunkFromClient', {"audio":bufferData, "video":funcToBase64(buffer, video), "target": "INTERNET"})
    }
}
const playAudioStream = (flo32arr, sampleRate, volume, glitch) => {
    let audio_src = audioContext.createBufferSource();
    if(!glitch){
      let audio_buf = audioContext.createBuffer(1, bufferSize, sampleRate)
      if(audio_buf.copyToChannel != undefined) {
        let audioData = new Float32Array(bufferSize);
        for(let i = 0; i < audioData.length; i++){
          audioData[i] = flo32arr[i] * volume;
        }
        audio_buf.copyToChannel(audioData, 0);
      } else {
        let audioData = audio_buf.getChannelData(0)
        for(let i = 0; i < audioData.length; i++){
          audioData[i] = flo32arr[i] * volume;
        }
      }
      audio_src.buffer = audio_buf;
      audio_src.connect(masterGain);
    } else {
      let audio_buf = audioContext.createBuffer(1, bufferSize, convolver.context.sampleRate)
      //if(copyToChannel in audio_buf) {
      if(audio_buf.copyToChannel != undefined) {
        let audioData = new Float32Array(bufferSize);
        for(let i = 0; i < audioData.length; i++){
          audioData[i] = flo32arr[i] * volume;
        }
        audio_buf.copyToChannel(audioData, 0);
      } else {
        let audioData = audio_buf.getChannelData(0)
        for(let i = 0; i < audioData.length; i++){
          audioData[i] = flo32arr[i] * volume;
        }
      }
      audio_src.buffer = audio_buf;
      convolver.buffer = audio_buf;
      audio_src.connect(convolver);
    }
    //let timeOut = audio_src.buffer.duration * 1000;
    audio_src.start(0);
}
//video record/play ここまで

//let micLevel = 0.5
//
let mediaDevices = navigator.mediaDevices || ((navigator.mozGetUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia) ? {
    getUserMedia(c) {
        return new Promise(((y, n) => {
            (navigator.mozGetUserMedia || navigator.webkitGetUserMedia).call(navigator, c, y, n);
        }));
    }
} : null);

let initFlag = 0

let gps;
const getGPS = () =>{
  gps = setInterval(()=>{
      navigator.geolocation.getCurrentPosition((position)=>{
        let currentTime = audioContext.currentTime;
        if(initHsh.originX != undefined && initHsh.originY != undefined) {
          freqVal = 440 + ((position.coords.longitude - initHsh.originX) / 0.00010966404715491394 ) + ((position.coords.latitude - initHsh.originY) / 0.000090133729745762 )
        }
        osc.frequency.setTargetAtTime(freqVal,currentTime,500);
        //socket.emit('initFromClient',initHsh)
      })
  },500)
}
const stopGPS = () => {
  clearInterval(gps);
}

const emitGPS = () => {
  gps = setInterval(()=>{
    //later
    let gpsVal
    socket.emit("gpsFromClient",gpsVal)
  },500)
}

const initialize = () =>{
  if(initFlag === 0) { 
    initFlag++
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();

    masterGain.gain.setValueAtTime(1,0)
    masterGain.connect(audioContext.destination);

    //osc(sinewave)
    osc = audioContext.createOscillator();
    oscGain = audioContext.createGain();
    osc.connect(oscGain);
    osc.frequency.setValueAtTime(freqVal, 0);
    oscGain.gain.setValueAtTime(0,0);
    oscGain.connect(masterGain);
    osc.start(0);


  //record/play
    javascriptnode = audioContext.createScriptProcessor(8192, 1, 1);

    // chat
    chatGain = audioContext.createGain();
    video = document.getElementById('video');
    video.muted = true
    buffer = document.createElement('canvas');
    bufferContext = buffer.getContext('2d');
    chatGain.gain.setValueAtTime(1,0);
    chatGain.connect(masterGain);
    if(navigator.mediaDevices.getUserMedia){
    //  navigator.mediaDevices.getUserMedia({
      mediaDevices.getUserMedia({
        video: true, audio: true
      }).then((stream) =>{
        let mediastreamsource = void 0;
        mediastreamsource = audioContext.createMediaStreamSource(stream);
        mediastreamsource.connect(javascriptnode);
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
        initHsh.getUserMedia = true
        socket.emit('initFromClient',initHsh)
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx,canvas,message.explain.next)//rlater textPrint
      },  (e) =>{
        initHsh.getUserMedia = false
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx,canvas,message.err.getUserMedia)
        socket.emit('initFromClient',initHsh)
        return console.log(e);
      });
    } else {
      navigator.getUserMedia({
        video: true, audio: true
      }, (stream) =>{
        let mediastreamsource = void 0;
        mediastreamsource = audioContext.createMediaStreamSource(stream);
        mediastreamsource.connect(javascriptnode);
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
        initHsh.getUserMedia = true
        socket.emit('initFromClient',initHsh)
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx,canvas,message.explain.next)//rlater textPrint
      },  (e) =>{
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx,canvas,message.err.getUserMedia)//rlater textPrint
        initHsh.getUserMedia = false
        socket.emit('initFromClient',initHsh)
        return console.log(e);
      });
    }
    //rec
    javascriptnode.onaudioprocess = onAudioProcess;
    // javascriptnode.connect(audioContext.destination);
    //javascriptnode.connect(masterGain);
    //video
    image = document.createElement("img");
    receive = document.getElementById("cnvs");
    receive_ctx = receive.getContext("2d");
    let timelapseFlag = true
    modules.erasePrint(ctx,canvas)
    if(navigator.geolocation){

      navigator.geolocation.getCurrentPosition((position)=>{
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx,canvas,message.explain.next)
        initHsh = {
          originX:position.coords.longitude,
          originY:position.coords.latitude
        }
        console.log(position.coords.longitude)
        socket.emit('initFromClient',initHsh)
      })
    } else {
      modules.erasePrint(ctx,canvas)
      modules.textPrint(ctx,canvas,message.err.gps)
    }
    console.log(initFlag)
  } else if(initFlag === 1){
    initFlag++
    let currentTime = audioContext.currentTime;
    //oscGain.gain.setTargetAtTime(1,currentTime,3);
    modules.erasePrint(ctx,canvas)
    getGPS()
    console.log(initFlag)
  } else if(initFlag > 1 && videoMode.mode === "wait") {
    initFlag++
    modules.erasePrint(ctx,canvas)
    recordEmit()
    console.log(initFlag)
  }
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
modules.textPrint(ctx,canvas,message.explain.init)

let recButton = document.getElementById("rec")
//document.getElementById("rec").addEventListener("click", () =>{
recButton.addEventListener("click", () =>{
  socket.emit("readyFromClient", "RECORD")
},false)

let tradeButton = document.getElementById("gpsTrade")
//document.getElementById("gpsTrade").addEventListener("click", () =>{
  tradeButton.addEventListener("click", () =>{
  socket.emit("readyFromClient", "TRADE")
},false)

let playButton = document.getElementById("playback")
  playButton.addEventListener("click", () =>{
  socket.emit("readyFromClient", "PLAYBACK")
},false)

let playButton = document.getElementById("playback")
  playButton.addEventListener("click", () =>{
  socket.emit("readyFromClient", "PLAYBACK")
},false)

const keyDown = (e) => {
  socket.emit("textFromClient",document.getElementById("inst").value)
}

document.addEventListener('keydown', (e) => {
  console.log(e)
  keyDown(e)
})
