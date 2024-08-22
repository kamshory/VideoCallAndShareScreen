const openCamera = document.getElementById('openCamera');
const startCallButton = document.getElementById('startCall');
const shareScreenButton = document.getElementById('shareScreen');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const userIdInput = document.getElementById('userId');
const websocketUrl = 'ws://localhost:8080/path?param=value';

let reconnectInterval = 3000;
let localStream;
let remoteStream;
let peerConnection;
let socket;

const servers = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
};

document.addEventListener('DOMContentLoaded', function() {
    
    
    initializeWebSocket();
});

function initializeWebSocket()
{
    socket = new WebSocket(websocketUrl);
    socket.onopen = async () => {

    };
    
    socket.onmessage = async event => {
        console.log(event.data)
        const message = JSON.parse(event.data);
        processIncommingMessage(message);
    };
    
    socket.addEventListener('close', function(event) {
        console.log('WebSocket terputus:', event);
        setTimeout(initializeWebSocket, reconnectInterval);
    });

    socket.addEventListener('error', function(event) {
        console.error('WebSocket error:', event);
        socket.close();
    });
}

openCamera.addEventListener('click', async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    // Create an AudioContext to process the audio
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioSource = audioContext.createMediaStreamSource(localStream);
    const audioDestination = audioContext.createMediaStreamDestination();
    audioSource.connect(audioDestination);

    // Create a new stream with the processed audio
    const processedStream = new MediaStream([...localStream.getVideoTracks(), ...audioDestination.stream.getAudioTracks()]);

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
    const offer = await peerConnection.createOffer();
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
    if (message.type === 'offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.send(constructMessageAnswer(answer));
    } else if (message.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
    } else if (message.type === 'candidate') {
        await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
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
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];
    const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
    sender.replaceTrack(screenTrack);
    screenTrack.onended = () => {
        sender.replaceTrack(localStream.getVideoTracks()[0]);
    };
});