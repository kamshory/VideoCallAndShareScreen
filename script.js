let openCamera = document.getElementById('openCamera');
let startCallButton = document.getElementById('startCall');
let answerButton = document.getElementById('answer');
let shareScreenButton = document.getElementById('shareScreen');
let localVideo = document.getElementById('localVideo');
let remoteVideo = document.getElementById('remoteVideo');
let userIdInput = document.getElementById('userId');
let protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
let port = window.location.port === "https:" ? "" : ":8080";
let host = window.location.host;
let websocketUrl = `${protocol}//${host}${port}/path/to/websocket?param=value`;
let reconnectInterval = 3000;
let localStream;
let remoteStream;
let peerConnection;
let socket;
let sendCall = false;
let acceptCall = false;
let receiveAnswer = false; 
let receiveReject = false; 
let waitingAnswerTime = 10000; // 10 seconds

let servers = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
};

document.addEventListener('DOMContentLoaded', function() {
    initializeWebSocket();
});

/**
 * Initialize websocket
 */
function initializeWebSocket()
{
    socket = new WebSocket(websocketUrl);
    socket.onopen = async () => {

    };
    
    socket.onmessage = async event => {
        console.log(event.data)
        let message = JSON.parse(event.data);
        processIncommingMessage(message);
    };
    
    socket.addEventListener('close', function(event) {
        // reconnect websocket when closed
        setTimeout(initializeWebSocket, reconnectInterval);
    });

    socket.addEventListener('error', function(event) {
        // close websocket when error occured
        socket.close();
    });
}

openCamera.addEventListener('click', async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    // Create an AudioContext to process the audio
    let audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let audioSource = audioContext.createMediaStreamSource(localStream);
    let audioDestination = audioContext.createMediaStreamDestination();
    audioSource.connect(audioDestination);

    // Create a new stream with the processed audio
    let processedStream = new MediaStream([...localStream.getVideoTracks(), ...audioDestination.stream.getAudioTracks()]);

    peerConnection = new RTCPeerConnection(servers);
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.send(constructMessageCandidate(event.candidate));
        }
    };

    peerConnection.ontrack = event => {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
    };

    processedStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, processedStream);
    });
});

startCallButton.addEventListener('click', async () => {
    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.send(constructMessageVideoCall());
    socket.send(constructMessageOffer(offer));
});

answerButton.addEventListener('click', async () => {
    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.send(constructMessageOffer(offer));
});

function processIncommingMessage(message)
{
    if(message.feature == 'video-call')
    {
        processVideoCall(message);
    }
}

async function processVideoCall(message)
{
    if (message.type === 'video-call') {
        // menerima sinyal pangillan masuk
        onReceiveVideoCall();
    }
    if (message.type === 'missed-call') {
        // menerima sinyal pangillan tak terjawab dari orang yang menghubungi
        onReceiveMissedCall();
    }
    if (message.type === 'reject-call') {
        // menerima sinyal penolakan dari orang yang dihubungi
        onReceiveCallRejection();
    }
    else if (message.type === 'offer') {
        // menerima sinyal offer
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
        let answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.send(constructMessageAnswer(answer));
    } else if (message.type === 'answer') {
        // menerima sinyal answer
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
    } else if (message.type === 'candidate') {
        // menerima sinyal candidate
        await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
}

function showToast(message, title, smallText, iconUrl, delay, container)
{
    iconUrl = iconUrl || '';
    delay = delay || 5000;
    container = container || '.toast-wrapper';
    let id = (new Date()).getTime();
    let template = `<div id="${id}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-autohide="false">
        <div class="toast-header">
            <img src="${iconUrl}" class="rounded mr-2 toast-icon" alt="...">
            <strong class="mr-auto">${title}</strong>
            <small class="text-muted">${smallText}</small>
            <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    </div>`;
    
    let toast = $(template);
    if(iconUrl == ''){
        toast.find('.toast-icon').remove();
    }
    toast.prependTo(container).toast('show');
    setTimeout(function(){
        toast.remove();
    }, delay);
}

function onReceiveVideoCall()
{
    $('#incomming-video-call-dialog').modal('show');
}

function onReceiveMissedCall()
{
    $('#incomming-video-call-dialog').modal('hide');
    showToast(
        'Anda melewatkan panggilan video hingga waktu tunggu habis', 
        'Anda Melewatkan Panggilan', 
        'Saat ini juga'
    );
}

function onMissedCall()
{
    showToast(
        'Panggilan Anda tidak dijawab hingga waktu tunggu habis', 
        'Panggilan Anda Tidak Dijawab', 
        'Saat ini juga'
    );
}

function onReceiveCallRejection()
{
    sendCall = false;
    acceptCall = false;
    receiveAnswer = false; 
    receiveReject = false; 
    receiveReject = true;
}

function onReceiveAnswer()
{
    sendCall = false;
    acceptCall = false;
    receiveAnswer = true; 
    receiveReject = false; 
    receiveReject = true;
}

function sendVideoCallCancellation()
{
    sendCall = false;
    acceptCall = false;
    receiveAnswer = false; 
    receiveReject = false; 
    receiveReject = false;
    socket.send(constructMessageMissedCall());
}

function checkReceiveAnswer()
{
    if(sendCall && !receiveAnswer)
    {
        onMissedCall();
        sendVideoCallCancellation();
    }
}

function sendVideoCallRequest()
{
    sendCall = true;
    acceptCall = false;
    receiveAnswer = false; 
    setTimeout(function(){
        checkReceiveAnswer();
    }, waitingAnswerTime);
}

function constructMessageMissedCall()
{
    return JSON.stringify({ 
        feature: 'video-call',
        type: 'missed-call'
    });
}

function constructMessageVideoCall()
{
    sendVideoCallRequest();
    return JSON.stringify({ 
        feature: 'video-call',
        type: 'video-call'
    });
}

function constructMessageRejectCall()
{
    return JSON.stringify({ 
        feature: 'video-call',
        type: 'reject-call'
    });
}

function constructMessageEndCall()
{
    return JSON.stringify({ 
        feature: 'video-call',
        type: 'end-call'
    });
}

function constructMessageOffer(offer)
{
    return JSON.stringify({ 
        feature: 'video-call',
        type: 'offer', 
        offer: offer 
    });
}

function constructMessageCandidate(candidate)
{
    return JSON.stringify({ 
        feature: 'video-call',
        type: 'candidate', 
        candidate: candidate 
    });
}

function constructMessageAnswer(answer)
{
    return JSON.stringify({ 
        feature: 'video-call',
        type: 'answer', 
        answer: answer 
    });
}

shareScreenButton.addEventListener('click', async () => {
    let screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    let screenTrack = screenStream.getVideoTracks()[0];
    let sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
    sender.replaceTrack(screenTrack);
    screenTrack.onended = () => {
        sender.replaceTrack(localStream.getVideoTracks()[0]);
    };
});