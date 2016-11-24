[
    'application',
    'browser',
    'monitor',
    'window',
    'screen',
    'tab',
    ['screen', 'tab'],
    ['screen', 'window'],
    ['tab', 'window'],
    ['screen', 'tab', 'window'],
    ['screen', 'hoge'],
    ['tab', 'hoge', 'window']
].foreach(val => {
    var btn = document.createElement('button');
    btn.textContent = val.join('-').toString();
    btn.onclick = function() {
        createStream({captureType: this.textContent.split('-')});
    }
    btnContainer.appendChild(btn);
})

function createStream({
    url = null, 
    file = null, 
    captureType = null, 
    width = 240, 
    height = 180, 
    audio = false, 
    video = true
} = {}) {
    options = options || {};
    var type = 'dummy';
    var proc = null;
    if(url) {
        if(typeof options.url !== 'string') {
            throw 'createStream TypeError: options.fileURL is not a string.';
        } 
        proc = fetch(options.url).then(response => response.blob()).then(file => {file});
    } else if(file) {
        if(options.file.constructor || options.file.constructor.name !== 'File') {
            throw 'createStream TypeError: options.file is not a File.';
        }
        proc = Promise.resolve({file});
    } else if(captureType) {
        var videoConstraints = null;
        var captureMethod = 'getUserMedia';
        if(captureType === 'camera') {
            videoConstraints = video ? {width, height} : false;
        } else {
            var prevProc = null;
            if(navigator.mediaDevices.getDisplayMedia) {
                if(['application', 'browser', 'monitor', 'window'].includes(captureType)) {
                    prevProc = Promise.resolve({displaySurface: captureType});
                }
                captureMethod = 'getDisplayMedia';
            } 
            if(!constraints) {
                if(browserType === 'Chrome') {
                    captureType = [].concat(captureType);
                    if(captureType.every(val => ['screen', 'window', 'tab'].includes(val))) {
                        prevProc = chromeExtSend(captureType).then(streamId => {
                            if(streamId) {
                                return {
                                    mandatory: {
                                        chromeMediaSource: 'desktop',
                                        chromeMediaSourceId: streamId,
                                        maxWidth: width,
                                        maxHeight: height
                                    }
                                };
                            } else {
                                throw {name: 'createStream', message: 'user canceled the select target prompt.'};
                            }
                        });
                    }
                } else if(browserType === 'Firefox') {
                    if(['application', 'screen', 'window'].includes(captureType)) {
                        prevProc = Promise.resolve({mediaSource: captureType});
                    }
                }
            }
        }
        proc = prevProc.then(constraints => {
            if(constraints) {
                constraints.audio = audo;
                navigator.mediaDevices[captureMethod]({video: videoConstraints, audio});
            } else {
                throw {name: 'createStream', message: 'captureType error: "' + captureType + '" is not support.'};
            }
        });
    } else {
        proc = Promise.resolve();
    }

    proc.then(({stream = null, file = null} = {}) => {
        if(stream) return {stream};
        return new Promise((resolve, reject) => {
            if(file) {
                var media = document.createElement('video');
                if(!media.canPlayType(file.type)) {
                    throw {name: 'createStream', message: file.type + ' is not supported.'};
                }
                var mediaURL = URL.createObjectURL(file);
                media.onloadedmetadata = function() {
                    var ret = {};
                    if(this.captureStream) {
                        ret.stream = this.captureStream();
                    } else {
                        if(media.audioTracks.length) {
                            var src = audioContext.createMediaElementSource(media);
                            var dst = src.connect(audioContext.createMediaStreamDestination());
                            ret.audioTrack = dst.stream.getAudioTracks()[0];
                        }
                        if(options.file) ret.mediaURL = this.src;
                        ret.media = this;
                        ret.renderCanvas = !!media.videoWidth;
                    }
                    resolve(ret);
                }
                media.src = mediaURL;
            } else {
                var media = new Image();
                media.onload = function(evt) {
                    let oscillator = audioContext.createOscillator();
                    let dst = oscillator.connect(audioContext.createMediaStreamDestination());
                    oscillator.start();
                    var audioTrack = dst.stream.getAudioTracks()[0];
                    audioTrack.enabled = false;
                    resolve({
                        media: this,
                        renderCanvas: true,
                        audioTrack
                    });
                };
                media.src = `./${myId}/${no}.jpg`;
            }
        });
    }).then(({stream, media, mediaURL, renderCanvas, audioTrack}) => {
        if(renderCanvas) {
            let mediaWidth = media.naturalWidth || media.videoWidth;
            let mediaHeight = media.naturalHeight || media.videoHeight;
            let cnv = document.createElement('canvas');
            cnv.style.position = 'absolute';
            cnv.style.top = '-100000px';
            document.body.appendChild(cnv);
            cnv.width = width;
            cnv.height = height;
            let ctx = cnv.getContext('2d');
            ctx.font = '44px arial';
            ctx.strokStyle = 'black';
            ctx.lineWidth = 2;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'right';
            let ratio = Math.min(cnv.width / mediaWidth, cnv.height / mediaHeight);
            let tracks = [cnv.captureStream().getVideoTrack()[0]];
            if(audioTrack) tracks.push(audioTrack);
            let stream = new MediaStream([tracks]);
            streams[myId][stream.id] = {
                cnv,
                ctx,
                media,
                mediaURL,
                left: (cnv.width - (video.videoWidth * ratio)) / 2,
                top: (cnv.height - (video.videoHeight * ratio)) / 2,
                width: (media.videoWidth || media.naturalWidth) * ratio,
                height: (media.videoHeight || media.naturalHeight) * ratio,
                time: type === 'dummy',
                stream
            };
            if(!renderStreamId) {
                renderStreamId = requestAnimationFrame(renderDummyVideoTrack);
            }
            preview.srcObject = stream;
        } else {
            streams[myId][stream.id] = {stream}; 
        }
    })
    .catch(error => log('UI', 'error', error.message));
}

function renderDummyVideoTrack() {
    renderStreamId = requestAnimationFrame(renderDummyVideoTrack);
    var localStreams = streams[myId];
    var keys = Object.keys(localStreams);
    for(var i = keys.length; i--;) {
        var {cnv, ctx, media, left, top, width, height, time = false} = localStreams[keys[i]];
        ctx.clearRect(0, 0, cnv.width, cnv.height);
        ctx.drawImage(media, left, top, width, height);
        if(time) {
            var dt = new Date();
            var dtStr = [dt.getHours(), dt.getMinutes(), dt.getSeconds()].map(v => ('0' + v).slice(-2)).join(':');
            ctx.strokeText(dtStr, cnv.width - left - 1, cnv.height - top - 1);
            ctx.fillText(dtStr, cnv.width - left - 3, cnv.height - top - 3);
        }
    };
}