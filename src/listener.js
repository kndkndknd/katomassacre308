const modules = require('./module.js');

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

let audioContext 
let numOfOsc = 0
for(let i=0;i<100;i++){
  eval("var osc" + String(i) + ";")
  eval("var osc" + String(i) + "gain;")
}
let referenceCoords = {
  oLatitude: 35.667698,
  oLongitude: 139.697131
}
let getUserMediaFlag = false
let freqVal = 440

let image;
let receive;
let receive_ctx;

let canvas = document.getElementById('cnvs');
let ctx = canvas.getContext('2d');
let buffer;
let bufferContext;

const recordEmit = () =>{
  videoMode.mode = "record"
  modules.textPrint(ctx, canvas, "撮影")
  socket.emit('chunkFromClient', {"video":toBase64(buffer, video), "target": "CLIENT", "freq": freqVal})
  videoMode.mode = "none"
  modules.erasePrint(ctx, canvas)
  playVideo(video);
  modules.textPrint(ctx, canvas, "撮影しました")
  document.getElementById("video").style.display="none";
  video.muted = true
  modules.erasePrint(ctx, canvas)
  playVideo(video);
  setTimeout(() => {
    modules.erasePrint(ctx, canvas)
  }, 1000)
}

const sizing=() =>{
  document.getElementById("cnvs").setAttribute("height", String(window.innerHeight) + "px")
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

socket.on('textFromServer', (data) => {
  modules.erasePrint(ctx,canvas)
  modules.textPrint(ctx,canvas,String(data))
})

socket.on('recReqFromServer',()=>{
  if(getUserMediaFlag) {
    videoMode.mode = "wait"
    video.muted = false
    document.getElementById("video").style.display="block";
    
    modules.erasePrint(ctx,canvas)
    modules.textPrint(ctx, canvas, "撮影の準備ができました、画面をタップしてください")
    setTimeout(()=>{
      if(videoMode.mode === "wait") {
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx, canvas, "撮影を取りやめました")
        videoMode.mode = "none"
        video.muted = true
        document.getElementById("video").style.display="none";
      }
    }, 10000)
  } else {
    modules.erasePrint(ctx,canvas)
    modules.textPrint(ctx, canvas, "撮影だめです。音だけ聴いてください")
  }
})

socket.on('playReqFromServer', () => {
  modules.erasePrint(ctx,canvas)
  modules.textPrint(ctx, canvas, "さきほど撮影した写真を回し見しましょう")
  let currentTime = audioContext.currentTime
  for(let i=1;i<numOfOsc;i++) {
    eval("osc" + String(i) + "gain.gain.setTargetAtTime(0,currentTime,10);")
  }
  setTimeout(()=>{
    socket.emit('reqFromClient')
    modules.erasePrint(ctx,canvas)
  },1000 + (Math.random() * 1000))
})

socket.on('chunkFromServer', (data) => {
  if(videoMode.mode != "record"){
    modules.erasePrint(ctx, canvas);
    if(data.video != "data:,"){
      playVideo(data.video);
    }
    if(data.freq != undefined){
      osc0.frequency.setValueAtTime(data.freq, 0);
    }
  }
  socket.emit('reqFromClient', "CLIENT")
});

socket.on('textActivateFromServer', ()=> {
  document.getElementById("text").style.display = "block"
  modules.erasePrint(ctx,canvas);
  modules.textPrint(ctx, canvas, "テキストボックスを生やしました。画面上のボックスにテキスト入れると全員にテキスト送れます。皆にやってほしいことを書きましょう");
})

//manymanyosc
socket.on("freqListFromServer", (data) => {
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
  videoMode.mode = "none"
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
  let wdth = window.innerWidth
  let hght = (wdth * 3) / 4

  image.onload = function(){
    let aspect = image.width / image.height
    if(aspect > (window.innerWidth / window.innerHeight)) {
        wdth = window.innerWidth
        hght = wdth / aspect
      } else {
          hght = window.innerHeight
          wdth = hght * aspect
      }
    receive_ctx.drawImage(image, 0, 0, wdth, hght);
  }
}
const toBase64 = (buffer, video) =>{
  let bufferContext = buffer.getContext('2d');
  modules.textPrint(ctx,canvas,Object.keys(video).join(","))
  buffer.width = video.videoWidth;
  buffer.height = video.videoHeight;
  bufferContext.drawImage(video, 0, 0);
  return buffer.toDataURL("image/png");
}
let mediaDevices = navigator.mediaDevices || ((navigator.mozGetUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia) ? {
  getUserMedia(c) {
    return new Promise(((y, n) => {
      (navigator.mozGetUserMedia || navigator.webkitGetUserMedia).call(navigator, c, y, n);
    }));
  }
} : null);

let initFlag = true

let gps;
const getGPS = () =>{
  gps = setInterval(()=>{
    navigator.geolocation.getCurrentPosition((position)=>{
      let distance = Math.sqrt((position.coords.longitude - referenceCoords.oLongitude) ** 2 + (position.coords.latitude - referenceCoords.oLatitude) ** 2)
      freqVal = 440 + (2021 * distance)
      console.log(freqVal)
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
    video = document.getElementById('video');
    video.muted = true
    buffer = document.createElement('canvas');
    bufferContext = buffer.getContext('2d');
    if(navigator.mediaDevices.getUserMedia){
      mediaDevices.getUserMedia({
        video: true
      }).then((stream) =>{
        video = document.getElementById('video');
        video.srcObject = stream
        video.play();
        video.volume = 0;
        renderStart();
        modules.erasePrint(ctx,canvas)
        getUserMediaFlag = true
      },  (e) =>{
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx,canvas,"カメラの情報がとれませんでした。撮影うんぬんの表示が出たらシカトしてください。もう一度タップすると音が出ます")
        getUserMediaFlag = false
        return console.log(e);
      });
    } else {
      navigator.getUserMedia({
        video: true
      }, (stream) =>{
        video = document.getElementById('video');
        video.srcObject = stream
        video.play();
        video.volume = 0;
        renderStart();
        modules.erasePrint(ctx,canvas)
        getUserMediaFlag = true
      },  (e) =>{
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx,canvas,"カメラの情報がとれませんでした。撮影うんぬんの表示が出たらシカトしてください。もう一度タップすると音が出ます")
        getUserMediaFlag = false
        return console.log(e);
      });
    }
    image = document.createElement("img");
    receive = document.getElementById("cnvs");
    receive_ctx = receive.getContext("2d");
    modules.erasePrint(ctx,canvas)
    if(!navigator.geolocation){
      modules.erasePrint(ctx,canvas)
      modules.textPrint(ctx,canvas,"GPSの情報がとれませんでした。他のひとの動きで音は変化するのでそれを楽しんでください")
    }
    let currentTime = audioContext.currentTime;
    socket.emit("readyFromClient", "LISTENER")
    getGPS()
  } else if(!initFlag && videoMode.mode === "wait") {
    modules.erasePrint(ctx,canvas)
    recordEmit()
  }
};

let textListner = document.getElementById("text")
textListner.addEventListener('input', ((e) => {
  socket.emit("textFromClient", e.target.value)
}))

let eListener = document.getElementById("wrapper")
eListener.addEventListener("click", initialize, false);
window.addEventListener('resize', (e) =>{
  sizing()
})
modules.textPrint(ctx,canvas,"GPS、カメラを使います。あと音が出ます。問題なければ画面をタップかクリックしてください。")