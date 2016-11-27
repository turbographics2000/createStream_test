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
    { width: 160, height: 120 },
    { width: 176, height: 144 },
    { width: 320, height: 240 },
    { width: 352, height: 288 },
    { width: 432, height: 240 },
    { width: 640, height: 360 },
    { width: 640, height: 480 },
    { width: 800, height: 448 },
    { width: 864, height: 480 },
    { width: 800, height: 600 },
    { width: 960, height: 720 },
    { width: 1024, height: 576 },
    { width: 1280, height: 720 },
    { width: 1600, height: 896 },
    { width: 1920, height: 1080 }
];

var BisonCamSize = [
    { width: 160, height: 120 },
    { width: 176, height: 144 },
    { width: 320, height: 240 },
    { width: 352, height: 288 },
    { width: 640, height: 360 },
    { width: 640, height: 480 },
    { width: 1280, height: 720 },
    { width: 1280, height: 1024 },
    { width: 1920, height: 1080 }
];

var constraintsPatterns = [
    null,
    { audio: false, video: true },
    { audio: true, video: true },
    { frameRate: 1 },
    { captureType: 'camera', frameRate: 1 },
    // {
    //     video: {
    //         width: 320,
    //         height: 240,
    //         aspectRatio: 16 / 9,
    //         frameRate: 15,
    //         facingMode: 'user',
    //         deviceId: null,
    //         groupId: null
    //     },
    //     audio: {
    //         volume: 0.3,
    //         sampleRate: 1120,
    //         sampleSize: 8,
    //         echoCancellation: true,
    //         latency: 0,
    //         channelCount: 1,
    //         deviceId: null,
    //         groupId: null
    //     }
    // }
]

var dummyPatterns = [
    'dummy'
];

var screenCaptureAPIPatterns = [
    'application',
    'browser',
    'monitor',
    'window',
];

var chromeScreenCapturePatterns = [
    ['screen', 'tab'],
    ['screen', 'window'],
    ['tab', 'window'],
    ['screen', 'tab', 'window'],
    ['screen', 'hoge'],
    ['tab', 'hoge', 'window'],
];

var firefoxScreenCapturePatterns = [
    'window',
    'application',
    'screen'
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

function createButtonContainer(capText) {
    var buttonContainer = document.createElement('div');
    buttonContainer.classList.add('button-container');
    var caption = document.createElement('div');
    caption.textContent = capText;
    caption.classList.add('caption');
    buttonContainer.appendChild(caption);
    testPatternContainer.appendChild(buttonContainer);
    return buttonContainer;
}

function createTestButton(btnText, onclick) {
    let btn = document.createElement('button');
    btn.classList.add('test-button');
    btn.textContent = btnText;
    btn.onclick = onclick.bind(btn);
    return btn;
}

function createSizePatternTestButton() {
    for (let i = 0; i < 3; i++) {
        let buttonContainer = createButtonContainer(`カメラサイズ (${['width = height', 'width = 100 固定', 'height = 100 固定'][i]})`);
        for (let j = 100; j < 3500; j += 100) {
            let width = i === 1 ? 100 : j;
            let height = i === 2 ? 100 : j;
            let [expectWidth, expectHeight] = GetBestFitnessDistance(logicoolSize, { width, height });
            let btn = createTestButton(`${width}x${height} (${expectWidth}x${expectHeight})`, sizePatternButtonOnClick);
            buttonContainer.appendChild(btn);
        }
    }
}

function createExactSizePatternTestButton() {
    let buttonContainer = createButtonContainer(`カメラサイズ (exact)`);
    for (let j = 100; j < 3500; j += 100) {
        let btn = createTestButton(`${j}x${j}`, function () {
            preview.srcObject = createStream({
                captureType: 'camera',
                video: {
                    width: j,
                    height: j
                }
            }).then(stream => {
                errorMessage.textContent = '';
                preview.srcObject = stream;
            }).catch(err => {
                previewSize.textContent = '';
                errorMessage.textContent = err.name + ': ' + err.message;
            });
        });
        buttonContainer.appendChild(btn);
    }
}

function createScreenCaptureAPITestButton() {
    let buttonContainer = createButtonContainer('Screen Capture API 向けテスト');
    screenCaptureAPIPatterns.forEach(pattern => {
        let btn = createTestButton(pattern, function () {
            preview.srcObject = createStream({
                captureType: this.textContent
            }).then(stream => {
                errorMessage.textContent = '';
                preview.srcObject = stream;
            }).catch(err => {
                previewSize.textContent = '';
                errorMessage.textContent = err.name + ': ' + err.message;
            });
        });
        buttonContainer.appendChild(btn);
    });
}

function createChromeScreenCaptureTestButton() {
    let buttonContainer = createButtonContainer('Chrome向けスクリーンキャプチャテスト');
    chromeScreenCapturePatterns.forEach(pattern => {
        let btn = createTestButton(pattern, function () {
            preview.srcObject = createStream({
                captureType: this.textContent
            }).then(stream => {
                errorMessage.textContent = '';
                preview.srcObject = stream;
            }).catch(err => {
                previewSize.textContent = '';
                errorMessage.textContent = err.name + ': ' + err.message;
            });
        });
        buttonContainer.appendChild(btn);
    });
}

function createFirefoxScreenCaptureTestButton() {
    let buttonContainer = createButtonContainer('Firefox向けスクリーンキャプチャテスト');
    firefoxScreenCapturePatterns.forEach(pattern => {
        let btn = createTestButton(pattern, function () {
            preview.srcObject = createStream({
                captureType: this.textContent
            }).then(stream => {
                errorMessage.textContent = '';
                preview.srcObject = stream;
            }).catch(err => {
                previewSize.textContent = '';
                errorMessage.textContent = err.name + ': ' + err.message;
            });
        });
        buttonContainer.appendChild(btn);
    });
}

function createRealSizePatternTestButton() {
    let buttonContainer = createButtonContainer('実サイズ');
    logicoolSize.forEach(({width, height}) => {
        let btn = createTestButton(`${width}x${height}`, function () {
            preview.srcObject = createStream({
                captureType: 'camera',
                video: { width, height }
            }).then(stream => {
                errorMessage.textContent = '';
                preview.srcObject = stream;
            }).catch(err => {
                previewSize.textContent = '';
                errorMessage.textContent = err.name + ': ' + err.message;
            });
        });
        buttonContainer.appendChild(btn);
    });
}

function createCaptureTypeTestButton() {
    let buttonContainer = createButtonContainer('ダミーパターン (画像とWeb Audio APIからストリームを生成)');
    dummyPatterns.forEach(val => {
        let btn = createTestButton([].concat(val).join('-').toString(), function () {
            preview.srcObject = createStream({
                captureType: this.textContent === 'dummy' ? null : this.textContent
            }).then(stream => {
                errorMessage.textContent = '';
                preview.srcObject = stream;
            }).catch(err => {
                previewSize.textContent = '';
                errorMessage.textContent = err.name + ': ' + err.message;
            });
        });
        btn.classList.add('captype');
        buttonContainer.appendChild(btn);
    });
}

function createConstraintsTestButton() {
    let buttonContainer = createButtonContainer('constraints パターン');
    constraintsPatterns.forEach(val => {
        let btn = createTestButton(JSON.stringify(val), function () {
            createStream(val).then(stream => {
                errorMessage.textContent = '';
                preview.srcObject = stream;
            }).catch(err => {
                previewSize.textContent = '';
                errorMessage.textContent = err.name + ': ' + err.message;
            });
        });
        btn.classList.add('captype');
        buttonContainer.appendChild(btn);
    });
}

function sizePatternButtonOnClick() {
    var size = this.textContent.split(' ')[0].split('x');
    var width = +size[0];
    var height = +size[1];
    createStream({
        captureType: 'camera',
        width, height
    }).then(stream => {
        errorMessage.textContent = '';
        preview.srcObject = stream;
    }).catch(err => {
        previewSize.textContent = '';
        errorMessage.textContent = err.name + ': ' + err.message;
    });
}

function rangeCheckProc(...args) {
    return new Promise((resolve, reject) => {
        function loop(trackName, propertyName, subPropertyName, val, half, type, prevState) {
            var constraints = {
                [trackName]: {
                    [propertyName]: {
                        [subPropertyName]: type === 'int' ? ~~val : val
                    }
                }
            };
            navigator.mediaDevices.getUserMedia(constraints).then(stream => {
                stream.getTracks().forEach(track => track.stop());
                if (prevState === 'fail') {
                    if (type === 'int' && half < 1) {
                        resolve(Math.floor(val));
                        return;
                    } else if (type === 'float' && half < 0.00000000001) {
                        resolve(val);
                        return;
                    }
                }
                if (subPropertyName === 'min') {
                    val = val + half;
                    console.log('success', val, half);
                    loop(trackName, propertyName, subPropertyName, val, half / 2, type, 'success');
                } else {
                    val = val - half;
                    console.log('success', val, half);
                    loop(trackName, propertyName, subPropertyName, val, half / 2, type, 'success');
                }
            }).catch(err => {
                console.log(err.name);
                if (subPropertyName === 'min') {
                    val = val - half;
                    console.log('fail', val, half);
                    loop(trackName, propertyName, subPropertyName, val, half / 2, type, 'fail');
                } else {
                    val = val + half;
                    console.log('fail', val, half);
                    loop(trackName, propertyName, subPropertyName, val, half / 2, type, 'fail');
                }
            });
        }
        loop(...args);
    });
}
var constraintableRange = {
    width: { min: 10000, max: 0 },
    height: { min: 10000, max: 0 },
    frameRate: { min: 500, max: 0 },
    aspectRatio: { min: 100, max: 0 },
}
function rangeCheck() {
    Promise.all([
        rangeCheckProc('video', 'width', 'min', 100000, 100000 / 2, 'int'),
        rangeCheckProc('video', 'width', 'max', 0, 100000 / 2, 'int'),
        rangeCheckProc('video', 'height', 'min', 100000, 100000 / 2, 'int'),
        rangeCheckProc('video', 'height', 'max', 0, 100000 / 2, 'int'),
    ]).then(([minWidth, maxWidth, minHeight, maxHeight]) => {
        constraintableRange.width.min = minWidth;
        constraintableRange.width.max = maxWidth;
        constraintableRange.height.min = minHeight;
        constraintableRange.height.max = maxHeight;
        previewSize.innerHTML = JSON.stringify(constraintableRange, null, 2).replace(/\r\n/g, '<br>');
    });
    //     constraintableRange.width.min = val;
    // }).then(_ => {
    //     return rangeCheckProc('video', 'height', 'min', 100000, 100000 / 2, 'int');
    // }).then(val => {
    //     constraintableRange.height.min = val;
    // }).then(_ => {
    //     return rangeCheckProc('video', 'width', 'max', 0, 100000 / 2, 'int');
    // }).then(val => {
    //     constraintableRange.width.max = val;
    // }).then(_ => {
    //     return rangeCheckProc('video', 'height', 'max', 0, 100000 / 2, 'int');
    // }).then(val => {
    //     constraintableRange.height.max = val;
    //     return constraintableRange;
    // }).then(val => {
    //     console.log(JSON.stringify(val, null, 4));
    // });
}

function createRangeCheckButton() {
    let buttonContainer = createButtonContainer('Rangeチェック');
    let rangeCheckButton = document.createElement('button');
    rangeCheckButton.textContent = 'rangeChack';
    rangeCheckButton.onclick = rangeCheck;
    buttonContainer.appendChild(rangeCheckButton);
}

createRangeCheckButton();
createSizePatternTestButton();
createExactSizePatternTestButton();
createRealSizePatternTestButton();
createCaptureTypeTestButton();
createConstraintsTestButton();
createScreenCaptureAPITestButton();
createChromeScreenCaptureTestButton();
createFirefoxScreenCaptureTestButton();



function createStream({
    url = null,
    file = null,
    captureType = null,
    width = 240,
    height = 180,
    audio = false,
    video = true,
    constraints = null,
    frameRate = undefined
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
        if (typeof captureType !== 'string' && !(Array.isArray(captureType) && captureType.every(val => typeof val === 'string'))) {
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
                if (browserType === 'Chrome' && !Array.isArray(captureType)) {
                    var vc = constraints.video;
                    constraints.video = {
                        mandatory: {
                            minWidth: vc.width,
                            maxWidth: vc.width,
                            minHeight: vc.height,
                            maxHeight: vc.height
                        }
                    }
                    //constraints.video.mandatory.sourceId = 'c28afefcbfa5eff956ca96a9e990c2e098ecafd846b2e734c4fa488be25a5704';
                }
                //if(frameRate) constraints.video.frameRate = 30;
                //console.log(JSON.stringify(constraints, null, 4));
                constraints = {
                    video: {
                        width: { min: 2000 },
                        height: 100,
                        frameRate: { min: 30 }
                    },
                }
                console.log(JSON.stringify(constraints, null, 4));
                return navigator.mediaDevices[captureMethod](constraints)
                    .then(stream => ({ stream }))
            })
        }
    } else {
        proc = Promise.resolve();
    }
    return proc.then(({stream = null, file = null} = {}) => {
        if (stream) {
            return { stream };
        } else if (captureType === 'camera') {
            return Promise.reject({ name: 'ConstraintNotSatisfiedError2', message: '' });
        }
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
            ctx.font = '22px arial';
            ctx.strokStyle = 'black';
            ctx.lineWidth = 2;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'right';
            let ratio = Math.min(cnv.width / mediaWidth, cnv.height / mediaHeight);
            let tracks = [cnv.captureStream(frameRate).getVideoTracks()[0]];
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
        return stream;
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
            var dtStr = [dt.getHours(), dt.getMinutes(), dt.getSeconds(), dt.getMilliseconds()].map(v => ('0' + v).slice(-2)).join(':');
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

const UINT32_MAX = 4294967295;
function GetBestFitnessDistance(candidateSet, constraints) {
    var first = true;
    for (var i = 0, l = candidateSet.length; i < l; i++) {
        candidateSet[i].distance = GetFitnessDistance(candidateSet[i], constraints);
        //console.log('distance', candidateSet[i].width + 'x' + candidateSet[i].height, constraints.width + 'x' + constraints.height, candidateSet[i].distance);
    }
    var bestCandidate = TrimLessFitCandidates(candidateSet);
    return [bestCandidate.width, bestCandidate.height];
}

function TrimLessFitCandidates(candidateSet) {
    var best = Math.min(...candidateSet.map(val => val.distance));
    var candidate = candidateSet.filter(val => val.distance === best);
    return candidate[0];
}

function GetFitnessDistance(aCandidate, aConstraints) {
    var distance =
        // (FitnessDistance(aDeviceId, aConstraints.mDeviceId)) +
        // (FitnessDistance(mFacingMode, aConstraints.mFacingMode)) +
        (aCandidate.width ? FitnessDistance(aCandidate.width, aConstraints.width) : 0) +
        (aCandidate.height ? FitnessDistance(aCandidate.height, aConstraints.height) : 0) //+
    // (aCandidate.maxFPS ? FitnessDistance(double(aCandidate.maxFPS), aConstraints.mFrameRate) : 0);
    return distance;
}

function FitnessDistance(aN, aRange) {
    // if (aRange.mMin > aN || aRange.mMax < aN) {
    //     return UINT32_MAX;
    // }
    // if (aN == aRange.mIdeal.valueOr(aN)) {
    //     return 0;
    // }
    if (aN === aRange) return 0;
    return (Math.abs(aN - aRange) * 1000) / Math.max(Math.abs(aN), Math.abs(aRange));
}