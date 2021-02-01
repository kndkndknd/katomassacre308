const modules = require('./module.js');

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

let audioContext 
let masterGain 
let osc
let oscGain
let initHsh = {}
let freqVal = 440
let tradeFlag =false
let javascriptnode



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
  //modules.erasePrint(ctx, canvas)
  modules.textPrint(ctx, canvas, "撮影してます")
  setTimeout(()=>{
    videoMode.mode = "none"
    modules.erasePrint(ctx, canvas)
    modules.textPrint(ctx, canvas, "撮影終わり")
    socket.emit("readyFromClient", "recordEnd")  //later to app.js
    document.getElementById("video").style.display="none";
    video.muted = true
    //video.muted = "muted"
  },2000)
}

//canvas
const sizing=() =>{
  document.getElementById("cnvs").setAttribute("height", String(window.innerHeight) + "px")
  document.getElementById("cnvs").setAttribute("width", String(window.innerWidth) + "px")
}

sizing();

const renderStart=()=> {
  video = document.getElementById('video');
  buffer = document.createElement('cnvs');
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
//socket.emit('connectFromClient', client);

socket.on('textFromServer', (data) => {
  modules.erasePrint(ctx,canvas)
  modules.textPrint(ctx,canvas,String(data))
})

socket.on("targetSendFromServer", (data) => {
  initHsh.target = data.target
  tradeFlag = !tradeFlag
})
/*
socket.on('freqFromClient',(data) =>{
  originalCoodinate = data.coodinate
  osc.frequency.setValueAtTime(data.freq, 0);
})
socket.on('freqFromServer',(data) =>{
  let currentTime = audioContext.currentTime;
  osc.frequency.setTargetAtTime(data,currentTime,500);
  console.log(data)
})
*/

socket.on('recReqFromServer',()=>{
  if(initHsh.getUserMedia) {
    videoMode.mode = "wait"
    video.muted = false
    document.getElementById("video").style.display="block";
    
    modules.erasePrint(ctx,canvas)
    modules.textPrint(ctx, canvas, message.explain.recordReady)
  } else {
    modules.erasePrint(ctx,canvas)
    modules.textPrint(ctx, canvas, message.err.recordErr)
  }
})

socket.on('playReqFromServer', (data) => {
  modules.erasePrint(ctx,canvas)
  modules.textPrint(ctx, canvas, data)
  setTimeout(()=>{
    socket.emit('reqFromClient',"CLIENT")
    modules.erasePrint(ctx,canvas)
  },1000 + (Math.random() * 1000))
})

let playsampleRate = 96000
let playTarget = ""
socket.on('chunkFromServer', (data) => {
  if(videoMode.mode != "record"){
    modules.erasePrint(ctx, canvas);
    //playAudioStream(data.audio,playsampleRate,1,false)
    if(data.video != "data:,"){
      playVideo(data.video);
    }
    if(data.freq != undefined){
      //let currentTime = audioContext.currentTime;
      //osc.frequency.setValueAtTime(data.freq, currentTime);
      osc.frequency.setValueAtTime(data.freq, 0);
    }
  }
  socket.emit('reqFromClient', "CLIENT")
  //}
});

socket.on('endFromServer', (data) =>{
  videoStop();
  modules.erasePrint(ctx,canvas);
  modules.textPrint(ctx, canvas, data);
  let currentTime = audioContext.currentTime;
  oscGain.gain.setTargetAtTime(0,currentTime,6);
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
  //console.log("width:" + String(wdth) + ",height:" + String(hght) + ", x:"+ x + ", y:"+ y)
  receive_ctx.drawImage(image, 0, 0, wdth, hght);
  }
}
const funcToBase64 = (buffer, video) =>{
  let bufferContext = buffer.getContext('2d');
  modules.textPrint(ctx,canvas,Object.keys(video).join(","))
  buffer.width = video.videoWidth;
  buffer.height = video.videoHeight;
  bufferContext.drawImage(video, 0, 0);
  return buffer.toDataURL("image/png");
}

const onAudioProcess = (e) => {
  if(videoMode.mode === "record"){
    socket.emit('chunkFromClient', {"video":funcToBase64(buffer, video), "target": "CLIENT", "freq": freqVal})
  }
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
//      let currentTime = audioContext.currentTime;
//      if(initHsh.oLongitude != undefined && initHsh.oLatitude != undefined) {
        freqVal = 440 + 80 * (((position.coords.longitude - initHsh.oLongitude) / 0.00010966404715491394 ) + ((position.coords.latitude - initHsh.oLatitude) / 0.000090133729745762 ))
//      }
//      if(!tradeFlag) {
      let currentTime = audioContext.currentTime;
      osc.frequency.setTargetAtTime(freqVal,currentTime,500);
          socket.emit('freqFromClient',{
            freq: freqVal,
            target: "CLIENT"
          })
        /*
        socket.emit('debugFromClient', {
          id:String(socket.id),
          freq:freqVal
        }) //debug
        */
       /*
      } else {
        if(initHsh.target != undefined){
          socket.emit('freqFromClient',{
            freq: freqVal,
            target: initHsh.target
          })
        }
      }
      */
    })
  },3000)
}
const stopGPS = () => {
  clearInterval(gps);
}
/*
const emitGPS = () => {
  gps = setInterval(()=>{
    //later
      navigator.geolocation.getCurrentPosition((position)=>{
        if(initHsh.oLongitude != undefined && initHsh.oLatitude != undefined) {
          freqVal = 440 + ((position.coords.longitude - initHsh.oLongitude) / 0.00010966404715491394 ) + ((position.coords.latitude - initHsh.oLatitude) / 0.000090133729745762 )
        }
        if(initHsh.target != undefined){
          socket.emit('freqFromClient',{
            freq: freqVal,
            target: initHsh.target
          })
        }
      })
  },500)
}
*/

const initialize = () =>{
  if(initFlag === 0) { 
    initFlag++
    audioContext = new AudioContext();
    //masterGain = audioContext.createGain();

    //masterGain.gain.setValueAtTime(1,0)
    //masterGain.connect(audioContext.destination);

    //osc(sinewave)
    osc = audioContext.createOscillator();
    oscGain = audioContext.createGain();
    osc.connect(oscGain);
    osc.frequency.setValueAtTime(freqVal, 0);
    oscGain.gain.setValueAtTime(0,0);
    oscGain.connect(audioContext.destination);
    //osc.connect(audioContext.destination)
    osc.start(0);


  //record/play
    javascriptnode = audioContext.createScriptProcessor(8192, 1, 1);

    // chat
    //chatGain = audioContext.createGain();
    video = document.getElementById('video');
    video.muted = true
    buffer = document.createElement('canvas');
    bufferContext = buffer.getContext('2d');
    //chatGain.gain.setValueAtTime(1,0);
    //chatGain.connect(masterGain);
    console.log(navigator.mediaDevices.getSupportedConstraints())
    if(navigator.mediaDevices.getUserMedia){
    //  navigator.mediaDevices.getUserMedia({
      mediaDevices.getUserMedia({
        //video: { facingMode: { exact: "environment" } }, audio: true
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
        //initHsh.getUserMedia = true
        socket.emit('initFromClient', true)
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx,canvas,"もう一度タップすると音が出ます")//rlater textPrint
      },  (e) =>{
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx,canvas,"カメラの情報がとれませんでした。撮影うんぬんの表示が出たらシカトしてください。もう一度タップすると音が出ます")
        socket.emit('initFromClient',false)
        return console.log(e);
      });
    } else {
      navigator.getUserMedia({
        //video: { facingMode: { exact: "environment" } }, audio: true
        video: true, audio: true
        //video: true, audio: true
      }, (stream) =>{
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
        socket.emit('initFromClient',true)
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx,canvas,"もう一度タップすると音が出ます")//rlater textPrint
      },  (e) =>{
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx,canvas,"カメラの情報がとれませんでした。撮影うんぬんの表示が出たらシカトしてください。もう一度タップすると音が出ます")
        socket.emit('initFromClient',false)
        return console.log(e);
      });
    }
    javascriptnode.onaudioprocess = onAudioProcess;
    //video
    image = document.createElement("img");
    receive = document.getElementById("cnvs");
    receive_ctx = receive.getContext("2d");
    let timelapseFlag = true
    modules.erasePrint(ctx,canvas)
    if(navigator.geolocation){
      /*
      navigator.geolocation.getCurrentPosition((position)=>{
        modules.erasePrint(ctx,canvas)
        modules.textPrint(ctx,canvas,message.explain.next)
        initHsh = {
          oLongitude:position.coords.longitude,
          oLatitude:position.coords.latitude
        }
        console.log(position.coords.longitude)
        socket.emit('initFromClient',initHsh)
      })
      */
    } else {
      modules.erasePrint(ctx,canvas)
      modules.textPrint(ctx,canvas,"GPSの情報がとれませんでした。すみません、周りの音を聴いて楽しんでください")
    }
  } else if(initFlag === 1){
    initFlag++
    let currentTime = audioContext.currentTime;
    oscGain.gain.setTargetAtTime(1,currentTime,3);
    modules.erasePrint(ctx,canvas)
    getGPS()
  } else if(initFlag > 1 && videoMode.mode === "wait") {
    modules.erasePrint(ctx,canvas)
    recordEmit()
  }
};

let eListener = document.getElementById("wrapper")
eListener.addEventListener("click", initialize, false);
//window.addEventListener("load", initialize, false);
window.addEventListener('resize', (e) =>{
  console.log('resizing')
  sizing()
})
modules.textPrint(ctx,canvas,"GPS、カメラを使います。問題なければ画面をタップかクリックしてください。")
