import './style.css';
import AgoraRTC from "agora-rtc-sdk-ng";

const appid = "a3293544e35f4d4fa895590c806556b6";
const token = null;
const rtcUid = Math.floor(Math.random() * 2032);
let roomId = "main";

// Audio tracks object to handle local and remote tracks
let audioTracks = {
    localAudioTrack: null,
    remoteAudioTracks: {},
};

let rtcClient;

// Initialize RTC
const initRtc = async () => {
    // Agora RTC Client setup
    rtcClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    rtcClient.on('user-joined', handleUserJoined);
    rtcClient.on("user-published", handleUserPublished);
    rtcClient.on("user-left", handleUserLeft);

    await rtcClient.join(appid, roomId, token, rtcUid);

    // Setup microphone for local audio track
    audioTracks.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    await rtcClient.publish(audioTracks.localAudioTrack);

    // Add the local user to the members section
    document.getElementById('members').insertAdjacentHTML('beforeend', 
        `<div class="speaker user-rtc-${rtcUid}" id="${rtcUid}"><p>${rtcUid}</p></div>`
    );
};

// Handle user joined
let handleUserJoined = async (user) => {
    document.getElementById('members').insertAdjacentHTML('beforeend', 
        `<div class="speaker user-rtc-${user.uid}" id="${user.uid}"><p>${user.uid}</p></div>`
    );
};

// Handle user published audio
let handleUserPublished = async (user, mediaType) => {
    await rtcClient.subscribe(user, mediaType);

    if (mediaType == "audio") {
        audioTracks.remoteAudioTracks[user.uid] = [user.audioTrack];
        user.audioTrack.play();
    }
};

// Handle user left
let handleUserLeft = async (user) => {
    delete audioTracks.remoteAudioTracks[user.uid];
    document.getElementById(user.uid).remove();
};

// Form to enter room
let lobbyForm = document.getElementById('form');
const enterRoom = async (e) => {
    e.preventDefault();
    initRtc();
    lobbyForm.style.display = 'none';
    document.getElementById('room-header').style.display = "flex";
};

// Form submit event listener
lobbyForm.addEventListener('submit', enterRoom);

// Leave room function
let leaveRoom = async () => {
    audioTracks.localAudioTrack.stop();
    audioTracks.localAudioTrack.close();
    rtcClient.unpublish();
    rtcClient.leave();
    document.getElementById('form').style.display = 'block';
    document.getElementById('room-header').style.display = 'none';
    document.getElementById('members').innerHTML = '';
};

// Leave room event listener
document.getElementById('leave-icon').addEventListener('click', leaveRoom);

const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
let drawing = false;
let prevX = null;
let prevY = null;

// Set canvas width and height
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

// WebSocket connection
const socket = new WebSocket('ws://localhost:8080/');  // Update with your WebSocket URL

// WebSocket event for receiving data from the server
socket.onmessage = (event) => {
    if (event.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = function() {
            try {
                const message = JSON.parse(reader.result);
                handleMessage(message);
            } catch (error) {
                console.error('Error parsing message as JSON:', error);
            }
        };
        reader.readAsText(event.data);
    } else {
        try {
            const message = JSON.parse(event.data);
            handleMessage(message);
        } catch (error) {
            console.error('Error parsing message as JSON:', error);
        }
    }
};

const handleMessage = ({ type, data }) => {
    if (type === 'draw') {
        drawOnCanvas(data.x, data.y, data.prevX, data.prevY, false);
    } else if (type === 'history') {
        renderHistory(data);
    }
};

// Function to start drawing on mouse down
canvas.addEventListener('mousedown', (event) => {
    drawing = true;
    const canvasRect = canvas.getBoundingClientRect();
    prevX = event.clientX - canvasRect.left; // Adjust for canvas position
    prevY = event.clientY - canvasRect.top;  // Adjust for canvas position
});

// Function to draw when mouse is moved
canvas.addEventListener('mousemove', (event) => {
    if (!drawing) return;
    const canvasRect = canvas.getBoundingClientRect();
    const x = event.clientX - canvasRect.left; // Adjust for canvas position
    const y = event.clientY - canvasRect.top;  // Adjust for canvas position

    // Send drawing data to WebSocket
    socket.send(JSON.stringify({
        type: 'draw',
        data: { x, y, prevX, prevY }
    }));

    // Draw on the canvas locally
    drawOnCanvas(x, y, prevX, prevY, true);

    // Update previous coordinates
    prevX = x;
    prevY = y;
});

// Function to stop drawing on mouse up
canvas.addEventListener('mouseup', () => {
    drawing = false;
    prevX = null;
    prevY = null;
});

// Function to draw on canvas
function drawOnCanvas(x, y, prevX, prevY, isLocal) {
    if (prevX === null || prevY === null) return;

    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();
}

// Function to render history of drawing (if needed)
function renderHistory(history) {
    history.forEach(({ x, y, prevX, prevY }) => {
        drawOnCanvas(x, y, prevX, prevY, false);
    });
}
