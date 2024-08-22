<?php
session_start()
?>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Call and Screen Share</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h1>Video Call and Screen Share</h1>
    <div id="video-container">
        <video id="localVideo" autoplay playsinline></video>
        <video id="remoteVideo" autoplay playsinline></video>
    </div>
    <button id="openCamera">Open Camera</button>
    <button id="startCall">Start Call</button>
    <button id="shareScreen">Share Screen</button>
    <script src="script.js"></script>
</body>
</html>
