<?php
ini_set('session.name', 'SIPROSES');
session_start();
$_SESSION['websocketChannel'] = 'weiuewiufwef';
$_SESSION['websocketChannelTarget'] = 'weiuewiufweg';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Call and Screen Share</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h1>Video Call and Screen Share</h1>
    <div id="video-container">
        <video id="localVideo" autoplay playsinline muted></video>
        <video id="remoteVideo" autoplay playsinline></video>
    </div>
    <button class="btn btn-primary" id="openCamera">Open Camera</button>
    <button class="btn btn-primary" id="startCall">Start Call</button>
    <button class="btn btn-primary" id="answer">Answer</button>
    <button class="btn btn-primary" id="shareScreen">Share Screen</button>
    <script src="script.js"></script>
    
    
    <div class="modal fade" id="incomming-video-call-dialog" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="exampleModalLabel">Video Call</h5>
                </div>
                <div class="modal-body">
                    Incomming video call
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary accept-call">Accept</button>
                    <button type="button" class="btn btn-secondary reject-call">Reject</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="general-dialog" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="exampleModalLabel">Title</h5>
                </div>
                <div class="modal-body">
                    Body
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary close-modal">Close</button>
                </div>
            </div>
        </div>
    </div>
    
    <div class="toast-wrapper">
        
    </div>
</div>
</body>
</html>
