const openCamera = document.getElementById('openCamera');
const startCallButton = document.getElementById('startCall');
const shareScreenButton = document.getElementById('shareScreen');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const userIdInput = document.getElementById('userId');
const websocketUrl = 'ws://localhost:8080/path?param=value';

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
    socket = new WebSocket(websocketUrl);
    socket.onopen = async () => {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.send(constructMessageOffer(offer));
    };

    socket.onmessage = async event => {
        const message = JSON.parse(event.data);
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
    };
});

function constructMessageOffer(offer)
{
    return JSON.stringify({ type: 'offer', offer: offer });
}

function constructMessageCandidate(candidate)
{
    return JSON.stringify({ type: 'candidate', candidate: candidate });
}

function constructMessageAnswer(answer)
{
    return JSON.stringify({ type: 'answer', answer: answer });
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