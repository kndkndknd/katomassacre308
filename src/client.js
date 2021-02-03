const modules = require('./module.js');

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

let audioContext 
let masterGain 
let osc
let oscGain
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
  modules.erasePrint(ctx, canvas)
  modules.textPrint(ctx, canvas, "撮影")
  socket.emit('chunkFromClient', {"video":toBase64(buffer, video), "target": "CLIENT", "freq": freqVal})
  document.getElementById("video").style.display="none";
  video.muted = true
  videoMode.mode = "none"
  document.getElementById("video").style.display="none";
  modules.erasePrint(ctx, canvas)
  playVideo(video);
  modules.textPrint(ctx, canvas, "撮影しました")
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
  console.log(data)
  modules.erasePrint(ctx,canvas)
  modules.textPrint(ctx,canvas,String(data))
})

socket.on('recReqFromServer',()=>{
  if(getUserMediaFlag) {
    videoMode.mode = "wait"
    video.muted = false
    document.getElementById("video").style.display="block";
    
    modules.erasePrint(ctx,canvas)
    modules.textPrint(ctx, canvas, "撮影の準備ができました、画面をタップしてください、自分を撮りたくない場合は壁とか取ってもらうか、タッチ/クリックをしないようにしてください")
    setTimeout(()=>{
      if(videoMode.mode === "wait") {
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx, canvas, "撮影を取りやめました")
        videoMode.mode = "none"
        video.muted = true
        document.getElementById("video").style.display="none";
      }
    },10000)
  } else {
    modules.erasePrint(ctx,canvas)
    modules.textPrint(ctx, canvas, "撮影だめです。音だけ聴いてください")
  }
})

socket.on('playReqFromServer', () => {
  modules.erasePrint(ctx,canvas)
  modules.textPrint(ctx, canvas, "さきほど撮影した写真を回し見しましょう")
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
      osc.frequency.setValueAtTime(data.freq, 0);
    }
  }
  if(videoMode.mode != "none") {
    socket.emit('reqFromClient', "CLIENT")
  }
});

socket.on('textActivateFromServer', ()=> {
  console.log("debug")
  document.getElementById("text").style.display = "block"
  modules.erasePrint(ctx,canvas);
  modules.textPrint(ctx, canvas, "テキストボックスを生やしました。画面上のボックスにテキスト入れると全員にテキスト送れます。皆にやってほしいことを書きましょう");
})

socket.on('endFromServer', (data) =>{
  videoMode.mode = "none"
  videoMode.option = "none"
  modules.erasePrint(ctx,canvas);
  modules.textPrint(ctx, canvas, data);
  let currentTime = audioContext.currentTime;
  oscGain.gain.setValueAtTime(0, 0);
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
      let currentTime = audioContext.currentTime;
      osc.frequency.setTargetAtTime(freqVal,currentTime,500);
      socket.emit('freqFromClient', freqVal)
    })
  },3000)
}
const stopGPS = () => {
  clearInterval(gps);
}

const initialize = () =>{
  if(initFlag) { 
    initFlag = false
    audioContext = new AudioContext();
    osc = audioContext.createOscillator();
    oscGain = audioContext.createGain();
    osc.connect(oscGain);
    osc.frequency.setValueAtTime(freqVal, 0);
    oscGain.gain.setValueAtTime(0,0);
    oscGain.connect(audioContext.destination);
    osc.start(0);

    video = document.getElementById('video');
    video.muted = true
    buffer = document.createElement('canvas');
    bufferContext = buffer.getContext('2d');
    console.log(navigator.mediaDevices.getSupportedConstraints())
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
      modules.textPrint(ctx,canvas,"GPSの情報がとれませんでした。すみません、周りの音を聴いて楽しんでください")
    }
    let currentTime = audioContext.currentTime;
    oscGain.gain.setTargetAtTime(1,currentTime,3);
    socket.emit("readyFromClient", "CLIENT")
    getGPS()
  } else if(!initFlag && videoMode.mode === "wait") {
    console.log("video")
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
  console.log('resizing')
  sizing()
})
modules.textPrint(ctx,canvas,"GPS、カメラを使います。あと音が出ます。問題なければ画面をタップしてください。")