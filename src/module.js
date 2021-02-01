exports.charEmit = function charEmit(char, socket){
  socket.emit('charFromClient', char);
}

exports.chunkEmit = function chunkEmit(data, socket){
  socket.emit('chunkFromClient', data);
}

exports.toBase64 = function toBase64(buffer, video){
  let bufferContext = buffer.getContext('2d');
  buffer.width = video.videoWidth;
  buffer.height = video.videoHeight;
  bufferContext.drawImage(video, 0, 0);
  //return buffer.toDataURL("image/webp");
  return buffer.toDataURL("image/jpeg");
}

exports.textPrint = function textPrint(ctx, canvas, text){
  if(text != undefined){
  ctx.globalAlpha = 1
  ctx.fillStyle = "black"
  let textArr = [text]
  let fontSize = 20
  ctx.strokeStyle = "white"
  if(text.length > 13) {

    /*
    let wordArr = text.split(" ")
    let line = ""
    textArr = []
    let wordLength = 0
    wordArr.forEach((element, index) => {
      line += element + " "
      if(line.length > 15) { //later //一行消える。要修正
        textArr[textArr.length-1] = line.substr(0,line.length-1)
        if(wordLength < line.length - 1) wordLength = line.length-1
        line = ""
      } else if(textArr[textArr.length - 1] > 15){
        textArr.push(line.substr(0,line.length-1))
        if(wordLength < line.length - 1) wordLength = line.length-1
      } else {
        if(line === element + " "){
          textArr.push(line.substr(0,line.length-1))
        } else {
          textArr[textArr.length-1] = line.substr(0,line.length-1)
        }
      }
    })
    fontSize = Math.floor((canvas.width * 4 / 3) / wordLength)
      */
    fontSize = Math.floor((canvas.width * 4 / 3) / 25)
    textArr = [""]
    let lineNo = 0
    Array.prototype.forEach.call(text, (element,index) =>{
      if(index % 16 > 0 || index === 0) {
        textArr[lineNo] += element
        //console.log(textArr[lineNo])
      } else {
        textArr.push(element)
        lineNo += 1
        //console.log(textArr[lineNo])
      }
    });
  } else if(text.length > 2) {
    fontSize = Math.floor((canvas.width * 4 / 3) / 25)
  } else {
    fontSize = Math.floor((canvas.width * 4 / 3) / 25)
  }
  ctx.font = "bold " + String(fontSize) + "px 'Arial'";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if(textArr.length === 1) {
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  } else {
    textArr.forEach((element,index) => {
      ctx.strokeText(element, canvas.width / 2, canvas.height / 2 + (fontSize * (index - Math.round(textArr.length / 2))));
      ctx.fillText(element, canvas.width / 2, canvas.height / 2 + (fontSize * (index - Math.round(textArr.length / 2))));
    })
  }
  ctx.restore();
  }
}

const textprint = (ctx,canvas,text, color) => {
}

exports.whitePrint = function whitePrint(ctx, canvas) {
ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

exports.erasePrint = function whitePrint(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

exports.ctrlView = function ctrlView(statusList){
  let HTML = "";
  let clients = statusList["clients"];
  let tableHTML = '<table border="1" id="clientList"><tr id="tr"><th>client</th> <th>id</th> <th>room</th><th>CHAT_FROM</th> <th>CHAT_TO</th> <th>RECORD_FROM</th> <th>PLAYBACK_TO</th> <th>TIMELAPSE_TO</th> <th>DRUM_TO</th> <th>SILENCE_TO</th> <th>BEFORE_TO</th> <th>CHAT_RATE</th>';
  for(let key in clients){
    let chatFrom = "",
        chatTo = "",
        recordFrom = "",
        playbackTo = "",
        timelapseTo = "",
        drumTo = "",
        silenceTo = "",
        secbeforeTo = "";
    
    for(let status in clients[key]["STREAMS"]){
      let toString = Object.prototype.toString;
      if(toString.call(clients[key]["STREAMS"][status]) === "[object Object]"){
        if("FROM" in clients[key]["STREAMS"][status] && clients[key]["STREAMS"][status]["FROM"]){
          switch(status){
            case "CHAT":
              chatFrom = ' checked="checked"';
              break;
            case "RECORD":
              recordFrom = ' checked="checked"';
              break;
          }
        }
        if("TO" in clients[key]["STREAMS"][status] && clients[key]["STREAMS"][status]["TO"]){
          switch(status){
            case "CHAT":
              chatTo = ' checked="checked"';
              break;
            case "PLAYBACK":
              playbackTo = ' checked="checked"';
              break;
            case "TIMELAPSE":
              timelapseTo = ' checked="checked"';
              break;
            case "DRUM":
              drumTo = ' checked="checked"';
              break;
            case "SILENCE":
              silenceTo = ' checked="checked"';
              break;
            case "SECBEFORE":
              secbeforeTo = ' checked="checked"';
              break;
          }
        }
      }
    }
    tableHTML = tableHTML + '<tr id="clientTd"><td>'+ clients[key]["type"] + '</td><td id="IdTd">' + clients[key]["No"] + '</td><td>' + clients[key]["room"] + '</td><td><input type="checkbox" id="CHAT_FROM" class="route" name="' + key
    + '"' + chatFrom + '></td><td><input type="checkbox" id="CHAT_TO" class="route" name="' + key + '"' + chatTo + '></td><td><input type="checkbox" id="RECORD_FROM" class="route" name="'
    + key + '"' + recordFrom + '></td><td><input type="checkbox" id="PLAYBACK_TO" class="route" name="' + key + '"' + playbackTo + '></td><td><input type="checkbox" id="TIMELAPSE_TO" class="route" name="'
    + key + '"' + timelapseTo + '></td><td><input type="checkbox" id="DRUM_TO" class="route" name="' + key + '"' + drumTo + '></td><td><input type="checkbox" id="SILENCE_TO" class="route" name="'
    + key + '"' + silenceTo + '></td><td><input type="checkbox" id="SECBEFORE_TO" class="route" name="' + key + '"' + secbeforeTo + '></td><td><label class="sampleRateLabel" id="CHATRATELabel" name="' + key + '"></td>';
  }
  tableHTML = tableHTML + '</tr></table>';

// latencyTable
  let rangeHTML = '<table border="1" id="latencyList">';
  for(let id in clients){
    rangeHTML = rangeHTML = rangeHTML + '<tr id="latency_' + id + '"><td rowspan="2">' + clients[id]["No"] + '</td><td id="LATENCYLabel">latency</td>';
    for(let streamType in clients[id]["STREAMS"]){
      if(streamType != "SECBEFORE" && streamType != "RECORD") rangeHTML = rangeHTML + '<td>' + streamType + '<input type="range" class="range" id="LATENCY_' + streamType + '" name="' + id + '" min="0" max="10" step="0.5" value="' + clients[id]["STREAMS"][streamType]["LATENCY"] + '" /></td>';
    }
    rangeHTML = rangeHTML + '</tr><tr id="rate_' + id + '"><td id="RATELabel"> sampleRate </td>';
    for(let streamType in clients[id]["STREAMS"]){
      if(streamType != "RECORD" && streamType != "SECBEFORE") rangeHTML = rangeHTML + '<td>' + streamType + '<input type="range" class="range" id="RATE_' + streamType + '" name="' + id + '" min="11025" max="88200" step="11025" value="' + clients[id]["STREAMS"][streamType]["RATE"] + '" /></td>';
    }
    rangeHTML = rangeHTML + '</tr>';
  }
  rangeHTML = rangeHTML + '</table>';

// sampleRate list
  let sampleRateHTML = '<div id="sampleRate"> Sample Rate <ul id="sampleRateList">';
  for(let key in statusList["sampleRate"]){
    sampleRateHTML = sampleRateHTML + '<li>' + key + ': <label class="sampleRate" id="sampleRate' + key + 'Label">' + String(statusList["sampleRate"][key]) + '</label><input type="range" class="range" name="sampleRate" id="' + key + '" min="11025" max="88200" step="11025" value="' + statusList["sampleRate"][key] + '" />'
    if(key in statusList.streamStatus.glitch){
      sampleRateHTML = sampleRateHTML + ' glitch<input type="checkbox" id="' + key + '" class="glitch" name="' + '_glitch"'
      if(statusList.streamStatus.glitch[key]) sampleRateHTML = sampleRateHTML + ' checked="checked"'
      sampleRateHTML = sampleRateHTML + '>'
    }
    sampleRateHTML = sampleRateHTML + '</li>'
  }
  sampleRateHTML = sampleRateHTML + '</ul></div>';
 
// gain list
  let gainHTML = '<div id="gainCtrl"> gain; <ul id="gainList">';
  for(let key in statusList["gain"]) {
    gainHTML = gainHTML + '<li>' + key.substr(0,key.length-4).toUpperCase() + ': <input type="range" name="gain" class="range" id="' + key + '" min="0" max="1" value="' + String(statusList["gain"][key]) + '" step="0.05" /> <label id="gain' + key + 'Label" class="gainLabel">' + String(statusList["gain"][key]) + '</label></li>';
  }
  gainHTML = gainHTML + '</ul> </div>';
//fade portament list
  let fadeHTML = '<div id="fadeCtrl"><ul id="fadeList">'
  fadeHTML = fadeHTML + '<li>FADE IN: <input type="range" name="FADE" class="range" id="IN" min="0" max="5" value="' + String(statusList.cmd.FADE.IN) + '" step="0.05" /> <label id="FADEINLabel" class="FADELabel">' + String(statusList.cmd.FADE.IN) + '</label></li>'
  fadeHTML = fadeHTML + '<li>FADE OUT: <input type="range" name="FADE" class="range" id="OUT" min="0" max="5" value="' + String(statusList.cmd.FADE.OUT) + '" step="0.05" /> <label id="FADEOUTLabel" class="FADELabel">' + String(statusList.cmd.FADE.OUT) + '</label></li>'
  fadeHTML = fadeHTML + '<li>PORTAMENT: <input type="range" name="PORTAMENT" class="range" id="PORTAMENT" min="0" max="30" value="' + String(statusList.cmd.PORTAMENT) + '" step="0.05" /> <label id="PORTAMENTPORTAMENTLabel" class="PORTAMENTLabel">' + String(statusList.cmd.PORTAMENT) + '</label></li>'

  HTML = tableHTML + rangeHTML + sampleRateHTML + gainHTML + fadeHTML;
  return HTML;
}

exports.statusPrint = function statusPrint(oscGainValue, freqVal, feedbackGainValue, noiseGainValue, bassFlag){
  let statusText = "";
  if(oscGainValue > 0){
    statusText = String(freqVal) + "Hz";
  }
  if(feedbackGainValue > 0){
    if(statusText === ""){
      statusText = "FEEDBACK";
    } else {
      statusText = statusText + ", FEEDBACK"
    }
  }
  if(noiseGainValue > 0){
    if(statusText === ""){
      statusText = "WHITENOISE";
    } else {
      statusText = statusText + ", WHITENOISE"
    }
  }
  if(bassFlag){
    if(statusText === ""){
      statusText = "BASS";
    } else {
      statusText = statusText + ", BASS"
    }
  }
  return statusText;
}
exports.previousStatus = function previousStatus(audioContext, videoMode){
  let rtnHsh = {}
  return rtnHsh
}
