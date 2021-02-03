const modules = require('./module.js');

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
let initFlag = true
let getUserMediaFlag = false

let audioContext 
let masterGain 
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

let image;
let receive;
let receive_ctx;

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
  document.getElementById("video").style.display="none";
  video.muted = true
  setTimeout(() => {
    modules.erasePrint(ctx, canvas)
  }, 1000)
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
    playVideo(data.video);
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
  videoMode.mode = "none";
  videoMode.option = "none"
  modules.erasePrint(ctx,canvas);
  modules.textPrint(ctx, canvas, data);
  let currentTime = audioContext.currentTime;
  for(let i=0;i<numOfOsc;i++) {
    eval("osc" + String(i) + "gain.gain.setValueAtTime(0, 0);")
  }
  stopGPS();
})

const videoStop = () => {
  videoMode.mode = "none";
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
const toBase64 = (buffer, video) =>{
  let bufferContext = buffer.getContext('2d');
  buffer.width = video.videoWidth;
  buffer.height = video.videoHeight;
  bufferContext.drawImage(video, 0, 0);
  return buffer.toDataURL("image/jpeg");
}
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
      let distance = Math.sqrt((position.coords.longitude - referenceCoords.oLongitude) ** 2 + (position.coords.latitude - referenceCoords.oLatitude) ** 2)
      freqVal = 440 + (2021 * distance)
      socket.emit('freqFromClient', freqVal)
    })
  },5000)
}
const stopGPS = () => {
  clearInterval(gps);
}

const initialize = () =>{
  if(initFlag) { 
    initFlag = false
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();

    masterGain.gain.setValueAtTime(1,0)
    masterGain.connect(audioContext.destination);

    video = document.getElementById('video');
    video.muted = true
    buffer = document.createElement('canvas');
    bufferContext = buffer.getContext('2d');
    if(navigator.mediaDevices.getUserMedia){
      mediaDevices.getUserMedia({
        video: true, audio: true
      }).then((stream) =>{
        video = document.getElementById('video');
        video.srcObject = stream
        video.play();
        video.volume = 0;
        renderStart();
        getUserMediaFlag = true
        modules.erasePrint(ctx,canvas)
      },  (e) =>{
        getUserMediaFlag = false
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx,canvas,"camera missed")
        return console.log(e);
      });
    } else {
      navigator.getUserMedia({
        video: true, audio: true
      }, (stream) =>{
        video = document.getElementById('video');
        video.srcObject = stream
        video.play();
        video.volume = 0;
        renderStart();
        getUserMediaFlag = true
        modules.erasePrint(ctx,canvas)
      },  (e) =>{
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx,canvas,"camera missed")
        getUserMediaFlag = false
        return console.log(e);
      });
    }
    image = document.createElement("img");
    receive = document.getElementById("cnvs");
    receive_ctx = receive.getContext("2d");
    modules.erasePrint(ctx,canvas)
    getGPS()
  } else if(!initFlag && videoMode.mode === "wait") {
    modules.erasePrint(ctx,canvas)
    recordEmit()
  }
  socket.emit('readyFromClient', "CTRL");
};

let eListener = document.getElementById("wrapper")
eListener.addEventListener("click", initialize, false);
window.addEventListener('resize', (e) =>{
  console.log('resizing')
  sizing()
})
modules.textPrint(ctx,canvas,"init")

let recButton = document.getElementById("rec")
recButton.addEventListener("click", () =>{
  socket.emit("readyFromClient", "RECORD")
},false)

let textButton = document.getElementById("textActivate")
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