var extensionId = 'ophefhhmblpnpplgcaeihbobllolhpnl';
var browserType = window.chrome ? 'Chrome' :
    window.StyleMedia ? 'Edge' :
        window.InstallTrigger ? 'Firefox' :
            window.safari ? 'Safari' :
                'Unsupported Browser';
var myId = 'cat';
let audioContext = new AudioContext();
var renderStreamId = null;
var streams = {};
streams[myId] = {};
window.MediaStream = window.MediaStream || window.webkitMediaStream;

var logicoolSize = [
    [160, 120],
    [176, 144],
    [320, 240],
    [352, 288],
    [432, 240],
    [640, 360],
    [640, 480],
    [800, 448],
    [864, 480],
    [800, 600],
    [1024, 576],
    [960, 720],
    [1280, 720],
    [1600, 896],
    [1920, 1080]
];

var BisonCamSize = [
    [160, 120],
    [176, 144],
    [320, 240],
    [352, 288],
    [640, 360],
    [640, 480],
    [1280, 720],
    [1280, 1024],
    [1920, 1080]
];


function chromeExtSend(msg) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(extensionId, msg, res => {
            resolve(res);
        })
    });
}

document.body.ondragover = function (evt) {
    evt.preventDefault();
};

document.body.ondrop = function (evt) {
    var video = document.createElement('video');
    evt.preventDefault();
    let files = Array.from(evt.dataTransfer.files);
    var streamCnt = Object.keys(streams[myId]).length;
    var playableFiles = files.filter(file => ['maybe', 'probably'].includes(video.canPlayType(file.type)));
    var addCnt = Math.min(3 - streamCnt, playableFiles.length);
    if (addCnt) {
        for (var i = 0; i < addCnt; i++) {
            createStream({ file: playableFiles[i] });
        }
    }
};

for (let i = 1; i < 4; i++) {
    for (let j = 100; j < 3500; j += 100) {
        let btn = document.createElement('button');
        let width = i === 2 ? 100 : j;
        let height = i === 3 ? 100 : j;
        let [expectWidth, expectHeight] = getExpectSize(width, height);
        btn.textContent = `${width}x${height} (${expectWidth}x${expectHeight})`;
        btn.onclick = function () {
            try {
                var size = this.textContent.split(' ')[0].split('x');
                var width = +size[0];
                var height = +size[1];
                createStream({ captureType: 'camera', width, height }).catch(err => {
                    console.log(err);
                });
            } catch (ex) {
                console.log(ex);
            }
        }
        window['cameraButtonContainer' + i].appendChild(btn);
    }
}

function getExpectSize(width, height) {
    let min = 5000 * 5000;
    let expectWidth, expectHeight;
    for (var i = 0; i < logicoolSize.length; i++) {
        var camWidth = logicoolSize[i][0];
        var camHeight = logicoolSize[i][1];
        //var diffMin = Math.min(Math.abs(width - camWidth), Math.abs(height - camHeight));
        //var diffMin = Math.sqrt(Math.abs(width - camWidth) * Math.abs(width - camWidth) + Math.abs(height - camHeight) * Math.abs(height - camHeight));
        // 実測
        // 100x200 => 176x144
        var fdWidth = Math.abs(camWidth - width) / Math.max(camWidth, width);
        var fdHeight = Math.abs(camHeight - height) / Math.max(camHeight, height);
        //console.log('fd', fdWidth, fdHeight, camWidth, camHeight);
        var diffMin = fdWidth + fdHeight;
        if (min > diffMin) {
            min = diffMin;
            expectWidth = camWidth;
            expectHeight = camHeight;
        }
    }
    console.log(width + 'x' + height, expectWidth + 'x' + expectHeight);
    return [expectWidth, expectHeight];
}

[
    [160, 120],
    [176, 144],
    [320, 240],
    [352, 288],
    [432, 240],
    [640, 360],
    [640, 480],
    [800, 448],
    [864, 480],
    [800, 600],
    [1024, 576],
    [960, 720],
    [1280, 720],
    [1280, 1024],
    [1600, 896],
    [1920, 1080]
].forEach(resolution => {
    var btn = document.createElement('button');
    btn.textContent = resolution[0] + 'x' + resolution[1];
    btn.onclick = function () {
        try {
            var size = this.textContent.split('x');
            var width = +size[0];
            var height = +size[1];
            createStream({ captureType: 'camera', width, height })
                .then(_ => errorMessage.textContent = '')
                .catch(err => {
                    errorMessage.textContent = (err.message);
                });
        } catch (ex) {
            console.log(ex);
        }
    }
    cameraButtonContainer4.appendChild(btn);
});

[
    'camera',
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
    ['tab', 'hoge', 'window'],
    'dummy'
].forEach(val => {
    var btn = document.createElement('button');
    btn.textContent = [].concat(val).join('-').toString();
    btn.onclick = function () {
        try {
            createStream({ captureType: this.textContent === 'dummy' ? null : this.textContent }).catch(err => {
                console.log(err);
            });
        } catch (ex) {
            console.log(ex);
        }
    }
    btnContainer.appendChild(btn);
});


function createStream({
    url = null,
    file = null,
    captureType = null,
    width = 240,
    height = 180,
    audio = false,
    video = true,
    constraints = null
} = {}) {
    // -------------------------------------------------
    // テスト用コード
    if (preview.srcObject) {
        var stream = preview.srcObject;
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        preview.srcObject = null;
    }
    if (renderStreamId) {
        cancelAnimationFrame(renderStreamId);
        renderStreamId = null;
    }
    streams[myId] = {};
    // -------------------------------------------------


    var proc = null;
    if (url) {
        if (typeof url !== 'string') {
            return Promise.reject('createStream TypeError: url is not a string.');
        }
        proc = fetch(url).then(response => response.blob()).then(file => ({ file }));
    } else if (file) {
        if (!file.constructor || file.constructor.name !== 'File') {
            return Promise.reject('createStream TypeError: file is not a File.');
        }
        proc = Promise.resolve({ file });
    } else if (captureType) {
        if(typeof captureType !== 'string' && !(Array.isArray(captureType) && captureType.every(val => typeof val === 'string'))) {
            return Promise.reject('createStream TypeError: captureType is not a string or string array.');
        }
        if (captureType.includes('-')) captureType = captureType.split('-');
        var prevProc = null;
        var captureMethod = 'getUserMedia';
        if (captureType === 'camera') {
            prevProc = Promise.resolve({ width, height });
        } else {
            if (navigator.mediaDevices.getDisplayMedia) {
                if (['application', 'browser', 'monitor', 'window'].includes(captureType)) {
                    prevProc = Promise.resolve({ displaySurface: captureType });
                }
                captureMethod = 'getDisplayMedia';
            }
            if (!prevProc) {
                if (browserType === 'Chrome') {
                    captureType = Array.isArray(captureType) ? captureType : captureType.split('-');
                    captureType = captureType.filter(val => ['screen', 'window', 'tab'].includes(val));
                    if (captureType.length) {
                        prevProc = chromeExtSend(captureType).then(streamId => {
                            if (streamId) {
                                return {
                                    mandatory: {
                                        chromeMediaSource: 'desktop',
                                        chromeMediaSourceId: streamId,
                                        maxWidth: width,
                                        maxHeight: height
                                    }
                                };
                            }
                        });
                    }
                } else if (browserType === 'Firefox') {
                    if (typeof captureType === 'string') {
                        if (['application', 'screen', 'window'].includes(captureType)) {
                            prevProc = Promise.resolve({ mediaSource: captureType });
                        }
                    }
                }
            }
        }
        if (!prevProc) {
            return Promise.reject('captureType error: "' + captureType + '" is not support.');
        } else {
            proc = prevProc.then(videoConstraints => {
                constraints = constraints || {
                    video: !video ? false : typeof video === 'object' ? video : videoConstraints,
                    audio: audio
                }
                if(browserType === 'Chrome' && !Array.isArray(captureType)) {
                    var vc = constraints.video;
                    constraints.video = {
                        optional : [
                            { minWidth: vc.width },
                            { maxWidth: vc.width },
                            { minHeight: vc.height },
                            { maxHeight: vc.height }
                        ]
                    }
                }
                return navigator.mediaDevices[captureMethod](constraints)
                    .then(stream => ({ stream }));
            });
        }
    } else {
        proc = Promise.resolve();
    }
    return proc.then(({stream = null, file = null} = {}) => {
        if (stream) return { stream };
        return new Promise((resolve, reject) => {
            if (file) {
                var media = document.createElement('video');
                if (!media.canPlayType(file.type)) {
                    throw { name: 'createStream', message: file.type + ' is not supported.' };
                }
                var mediaURL = URL.createObjectURL(file);
                media.onloadedmetadata = function () {
                    var ret = {};
                    if (this.captureStream) {
                        this.play();
                        ret.stream = this.captureStream();
                    } else {
                        if (media.audioTracks.length) {
                            var src = audioContext.createMediaElementSource(media);
                            var dst = src.connect(audioContext.createMediaStreamDestination());
                            ret.audioTrack = dst.stream.getAudioTracks()[0];
                        }
                        if (options.file) ret.mediaURL = this.src;
                        ret.media = this;
                        ret.renderCanvas = !!media.videoWidth;
                    }
                    resolve(ret);
                }
                media.src = mediaURL;
            } else {
                var media = new Image();
                media.onload = function (evt) {
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
                media.src = `./${myId}/${0}.jpg`;
            }
        });
    }).then(({stream, media, mediaURL, renderCanvas, audioTrack}) => {
        if (renderCanvas) {
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
            let tracks = [cnv.captureStream().getVideoTracks()[0]];
            if (audioTrack) tracks.push(audioTrack);
            stream = new MediaStream(tracks);
            streams[myId][stream.id] = {
                cnv,
                ctx,
                media,
                mediaURL,
                left: (cnv.width - (mediaWidth * ratio)) / 2,
                top: (cnv.height - (mediaHeight * ratio)) / 2,
                width: mediaWidth * ratio,
                height: mediaHeight * ratio,
                time: media.constructor.name === 'HTMLImageElement',
                stream
            };
            if (!renderStreamId) {
                renderStreamId = requestAnimationFrame(renderDummyVideoTrack);
            }
        } else {
            streams[myId][stream.id] = { stream };
        }
        preview.srcObject = stream;
    });
}

function renderDummyVideoTrack() {
    renderStreamId = requestAnimationFrame(renderDummyVideoTrack);
    var localStreams = streams[myId];
    var keys = Object.keys(localStreams);
    for (var i = keys.length; i--;) {
        var {cnv, ctx, media, left, top, width, height, time = false} = localStreams[keys[i]];
        ctx.clearRect(0, 0, cnv.width, cnv.height);
        ctx.drawImage(media, left, top, width, height);
        if (time) {
            var dt = new Date();
            var dtStr = [dt.getHours(), dt.getMinutes(), dt.getSeconds()].map(v => ('0' + v).slice(-2)).join(':');
            ctx.strokeText(dtStr, cnv.width - left - 1, cnv.height - top - 1);
            ctx.fillText(dtStr, cnv.width - left - 3, cnv.height - top - 3);
        }
    };
}

preview.onloadedmetadata = function () {
    previewSize.textContent = preview.videoWidth + "x" + preview.videoHeight;
}


var constraintsToChrome_ = function (c) {
    if (typeof c !== 'object' || c.mandatory || c.optional) {
        return c;
    }
    var cc = {};
    Object.keys(c).forEach(function (key) {
        if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
            return;
        }
        var r = (typeof c[key] === 'object') ? c[key] : { ideal: c[key] };
        if (r.exact !== undefined && typeof r.exact === 'number') {
            r.min = r.max = r.exact;
        }
        var oldname_ = function (prefix, name) {
            if (prefix) {
                return prefix + name.charAt(0).toUpperCase() + name.slice(1);
            }
            return (name === 'deviceId') ? 'sourceId' : name;
        };
        if (r.ideal !== undefined) {
            cc.optional = cc.optional || [];
            var oc = {};
            if (typeof r.ideal === 'number') {
                oc[oldname_('min', key)] = r.ideal;
                cc.optional.push(oc);
                oc = {};
                oc[oldname_('max', key)] = r.ideal;
                cc.optional.push(oc);
            } else {
                oc[oldname_('', key)] = r.ideal;
                cc.optional.push(oc);
            }
        }
        if (r.exact !== undefined && typeof r.exact !== 'number') {
            cc.mandatory = cc.mandatory || {};
            cc.mandatory[oldname_('', key)] = r.exact;
        } else {
            ['min', 'max'].forEach(function (mix) {
                if (r[mix] !== undefined) {
                    cc.mandatory = cc.mandatory || {};
                    cc.mandatory[oldname_(mix, key)] = r[mix];
                }
            });
        }
    });
    if (c.advanced) {
        cc.optional = (cc.optional || []).concat(c.advanced);
    }
    return cc;
};

var shimConstraints_ = function (constraints, func) {
    constraints = JSON.parse(JSON.stringify(constraints));
    if (constraints && constraints.audio) {
        constraints.audio = constraintsToChrome_(constraints.audio);
    }
    if (constraints && typeof constraints.video === 'object') {
        // Shim facingMode for mobile, where it defaults to "user".
        var face = constraints.video.facingMode;
        face = face && ((typeof face === 'object') ? face : { ideal: face });

        if ((face && (face.exact === 'user' || face.exact === 'environment' ||
            face.ideal === 'user' || face.ideal === 'environment')) &&
            !(navigator.mediaDevices.getSupportedConstraints &&
                navigator.mediaDevices.getSupportedConstraints().facingMode)) {
            delete constraints.video.facingMode;
            if (face.exact === 'environment' || face.ideal === 'environment') {
                // Look for "back" in label, or use last cam (typically back cam).
                return navigator.mediaDevices.enumerateDevices()
                    .then(function (devices) {
                        devices = devices.filter(function (d) {
                            return d.kind === 'videoinput';
                        });
                        var back = devices.find(function (d) {
                            return d.label.toLowerCase().indexOf('back') !== -1;
                        }) || (devices.length && devices[devices.length - 1]);
                        if (back) {
                            constraints.video.deviceId = face.exact ? { exact: back.deviceId } :
                                { ideal: back.deviceId };
                        }
                        constraints.video = constraintsToChrome_(constraints.video);
                        logging('chrome: ' + JSON.stringify(constraints));
                        return func(constraints);
                    });
            }
        }
        constraints.video = constraintsToChrome_(constraints.video);
    }
    //logging('chrome: ' + JSON.stringify(constraints));
    return func(constraints);
};

var cons = {
    video: {
        width: 320,
        height: 240
    }
};

shimConstraints_(cons, res => {
    console.log(JSON.stringify(res, null, 4));
})