/*
 * "This work is created by NimbusWeb and is copyrighted by NimbusWeb. (c) 2017 NimbusWeb.
 * You may not replicate, copy, distribute, or otherwise create derivative works of the copyrighted
 * material without prior written permission from NimbusWeb.
 *
 * Certain parts of this work contain code licensed under the MIT License.
 * https://www.webrtc-experiment.com/licence/ THE SOFTWARE IS PROVIDED "AS IS",
 * WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 * THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * */
'use strict';

var isLog = true;

iconService.setDefault();

let user = {
    premium: null,
    notes: {
        current: 0,
        max: 0,
        max_size: 0
    }
};

window.socket = {
    ws: null,
    idIntervalReconnect: null,
    status: false,
    triggers: {},
    option: {
        url: 'ws://stream-uploading-server.develop.nimbustest.com',
        timeReconnect: 20000
    },
    file: {
        index: 0,
        uid: null,
        queue: [],
    },

    on: (event, callback) => {
        if (!socket.triggers[event]) socket.triggers[event] = [];
        socket.triggers[event].push(callback);
    },

    trigger: (event, params) => {
        if (socket.triggers[event]) {
            for (let trigger of socket.triggers[event]) trigger(params);
        }
    },

    init: () => {
        socket.file.index = 0;
        socket.file.uid = window.nimbus_core.createUid();
        socket.create();
    },

    create: () => {
        console.log('create socket');
        socket.ws = new WebSocket(socket.option.url);
        socket.ws.onopen = socket.onopen;
        socket.ws.onmessage = socket.onmessage;
        socket.ws.onclose = socket.onclose;
    },

    onopen: () => {
        console.info("socket: open");
        socket.trigger('open');
        if (!socket.file.queue.length) socket.status = true;
    },

    onmessage: (e) => {
        const data = JSON.parse(e.data);
        console.info("socket: message", data, 'queue count', socket.file.queue.length);

        switch (data.type) {
            case "error":
                socket.trigger('error');
                break;
            case "initiated":
                socket.trigger('initiated');
                if (!socket.file.queue.length) socket.start();
                else socket.reconnect();
                break;
            case "ready":
                if (socket.file.queue.length > 0) {
                    let blob = socket.file.queue.shift().blob;
                    socket.send(blob, true)
                } else {
                    socket.trigger('ready');
                }
                break;
            case "progress":
                let index = socket.file.queue.findIndex(e => e.index === data.index);
                index > -1 && socket.file.queue.splice(index, 1);

                // console.info("socket: progress, queue length", socket.file.queue.length, 'message', data);

                if (socket.file.queue.length > 0) {
                    let blob = socket.file.queue.shift().blob;
                    socket.send(blob, true)
                }

                if (socket.file.queue.length === 0 && !socket.status) socket.finish();
                break;
            case "response":
                iconService.setDefault();
                nimbus_core.sendAllMessage({operation: 'content_automation_status_upload_end'});

                screenshot.openPage(data.data.location);
                window.nimbus_core.copyTextToClipboard(data.data.location);

                if (!user.premium && localStorage.streamLimitTime === 'true') {
                    localStorage.streamLimitTime = false;
                    window.setTimeout(function () {
                        screenshot.insertPopup('nsc_popup_limittime_stream_open');
                    }, 1000)
                }
        }
    },

    onclose: () => {
        if (socket.file.queue.length > 0) {
            console.info('socket: reconnect through', socket.option.timeReconnect);

            socket.idIntervalReconnect = window.setTimeout(function () {
                socket.create();
                clearInterval(socket.idIntervalReconnect);
            }, socket.option.timeReconnect);
        } else {
            console.info('socket: close');
        }
    },

    start: () => {
        socket.send(JSON.stringify({
            type: 'start',
            uid: socket.file.uid,
            sessionId: localStorage.numbusSessionId
        }));
    },

    reconnect: () => {
        socket.send(JSON.stringify({
            type: 'reconnect',
            uid: socket.file.uid,
            sessionId: localStorage.numbusSessionId
        }));
    },

    finish: () => {
        socket.send(JSON.stringify({
            type: 'finish',
            uid: socket.file.uid,
            sessionId: localStorage.numbusSessionId,
            name: window.nimbus_core.getVideoFileName(JSON.parse(localStorage.pageinfo), 'webm'),
            share: localStorage.videoPrivateUploadEnable !== 'true',
            parent_id: nimbusShare.getUploadFolder().id,
            workspaceId: localStorage.numbusWorkspaceSelect,
            url: JSON.parse(localStorage.pageinfo).url,
            client_software: nimbusShare.client_software
        }));
    },

    send: (message, save) => {
        save = save !== undefined ? save : false;

        if (socket.file.queue.length === 0 || typeof message === 'string' || save) {

            // if (typeof message === 'string') {
            console.log('socket: send file, queue length', socket.file.queue.length, 'save', save, message);
            // }

            socket.ws.send(message);
        }

        if (typeof message !== 'string' && !save) {
            console.log('socket: save in queue', socket.file.index, message);

            socket.file.queue.push({
                index: socket.file.index,
                blob: message
            });
            socket.file.index += 1;
        }


    },

    stop: () => {
        socket.status = false;

        console.log('socket: stop');
        if (socket.file.queue.length === 0) {
            socket.finish();
            //     // socket.ws.close();
            //     // socket.ws = null;
        }
    }
};

var videoRecorder = (function () {
    let recorder = null;
    let blobs = [];
    let blobs_size = 0;

    let typeCaptureStream, typeCapture,
        videoTabSoundEnable, videoMicSoundEnable,
        videoCamera, videoDrawingToolsEnable,
        videoResolution,
        // videoAudioBitrate, videoBitrate, videoFps,
        audioPlayer, audioStream,
        videoStream, micStream;
    let countdown = 0;
    let gifJs = null;
    let timer = null;
    let timerGif = null;
    let activeTab = null;

    let isRecording = false;
    let timeStart = null;
    let timePause = null;

    function isMediaAccess(cb) {
        window.navigator.getUserMedia({video: true, audio: true}, function (stream) {
                stream.stop();
                cb && cb(true)
            },
            function () {
                cb && cb(false)
            });
    }

    function mediaAccess(data) {
        capture({
            type: data.typeCapture,
            media_access: true
        });
    }

    async function createMediaRecorder(video) {
        let storage = await window.nimbus_core.storageUsageAndQuota();
        let quota = storage.quota - storage.used;

        console.log('localStorage.recordVideoCore', localStorage.recordVideoCore);
        if (localStorage.recordVideoCore === 'default') {
            let options = {
                mimeType: 'video/webm; codecs=vp8'
            };

            recorder = new MediaRecorder(video, options);
            recorder.ondataavailable = function (e) {
                if (isLog) console.log('chunk', window.nimbus_core.formatBytes(e.data.size));

                if (typeCaptureStream && !user.premium && Date.now() - timeStart > 60000 * 5) {
                    localStorage.streamLimitTime = true;
                    return stopRecord();
                } else if (typeCaptureStream) {
                    socket.send(e.data)
                } else {
                    blobs.push(e.data);
                    blobs_size += e.data.size;

                    if (localStorage.quickVideoStorageLimit === 'true') {
                        if (quota - blobs_size <= 1024 * 1024 * 500) { // 500 mb
                            window.nimbus_core.sendMessage({operation: 'content_automation_status_storage_limit'});
                            return pauseRecord();
                        }
                    }
                }
            };
            recorder.start(1000);
        } else {
            let option = {
                disableLogs: true,
                type: 'video',
                mimeType: 'video/webm; codecs=vp8',
                getNativeBlob: true
            };

            option.timeSlice = 1000;
            option.ondataavailable = function (blob) {
                if (isLog) console.log('chunk', window.nimbus_core.formatBytes(blob.size));

                if (typeCaptureStream && !user.premium && Date.now() - timeStart > 60000 * 5) {
                    localStorage.streamLimitTime = true;
                    return stopRecord();
                } else if (typeCaptureStream) {
                    socket.send(blob)
                } else {
                    blobs.push(blob);
                    blobs_size += blob.size;

                    if (localStorage.quickVideoStorageLimit === 'true') {
                        if (quota - blobs_size <= 1024 * 1024 * 500) { // 500 mb
                            window.nimbus_core.sendMessage({operation: 'content_automation_status_storage_limit'});
                            return pauseRecord();
                        }
                    }
                }
            };
            recorder = RecordRTC(video, option);
            recorder.startRecording();
        }

        timeStart = Date.now();
    }

    async function preRecord(streamVideo) {
        if (chrome.runtime.lastError) {
            if (/activeTab/.test(chrome.runtime.lastError.message)) {
                isRecording = false;
                alert(chrome.i18n.getMessage('notificationErrorActiveTab'));
            }
        } else {
            videoStream = streamVideo;

            localStorage.pageinfo = await window.nimbus_core.getPageInfo(typeCapture);

            if (videoMicSoundEnable) {
                try {
                    micStream = await window.nimbus_core.getUserMedia({
                        audio: {
                            deviceId: localStorage.selectedMicrophone ? {exact: localStorage.selectedMicrophone} : undefined,
                            echoCancellation: true,
                            noiseSuppression: true
                        }
                    });

                    let mixedStream = new MediaStream();
                    let mixedAudioStream = getMixedAudioStream([micStream, videoStream]);

                    mixedAudioStream.getAudioTracks().forEach(function (audioTrack) {
                        mixedStream.addTrack(audioTrack);
                    });

                    videoStream.getVideoTracks().forEach(function (videoTrack) {
                        mixedStream.addTrack(videoTrack);
                    });

                    videoStream = mixedStream;
                } catch (e) {

                }
            }

            await window.nimbus_core.timeout(500);

            if (typeCapture === 'tab' && videoTabSoundEnable) {
                console.log('localStorage.recordAudioCore', localStorage.recordAudioCore);
                if (localStorage.recordAudioCore === 'default') {
                    audioStream = new MediaStream([streamVideo.getAudioTracks()[0].clone()]);
                    let ctx = new AudioContext({latencyHint: 0.03, sampleRate: 28000});
                    let output = ctx.createMediaStreamSource(audioStream);
                    output.connect(ctx.destination)
                } else {
                    audioPlayer = new Audio();
                    audioPlayer.srcObject = videoStream;
                    audioPlayer.volume = 1;
                    audioPlayer.play();
                }
            }

            if (countdown) {
                if (typeCapture === 'desktop') {
                    await window.nimbus_core.setExtensionBadge(countdown);
                } else {
                    try {
                        await window.nimbus_core.setTimerContent(activeTab.id, countdown);
                    } catch (err) {
                        return stopRecord();
                    }
                }
            }
            startRecord(videoStream);
        }
    }

    function startRecord(video) {
        if (video === undefined) video = videoStream;

        video.onended = function () {
            console.info("Stream stopped systems window");
            return stopRecord();
        };
        video.getVideoTracks()[0].onended = function () {
            video && video.onended && video.onended()
        };

        if (typeCaptureStream) {
            socket.init();
            socket.on('ready', function () {
                createMediaRecorder(video);
            });
        } else {
            createMediaRecorder(video);
        }

        if (typeCaptureStream) iconService.setLoading();
        else iconService.setRec();

        window.nimbus_core.sendMessage({operation: 'status_video', type: typeCapture, status: getStatus(), state: getState()});

        // localStorage.videoFormat = 'webm';
        // if (localStorage.recordToGif === 'true') {
        //     localStorage.videoFormat = 'gif';
        //     let v = document.createElement('video');
        //
        //     v.onloadedmetadata = function () {
        //         gifJs = new GIF({
        //             workerScript: "js/lib/gif.worker.js",
        //             workers: 20,
        //             quality: 30,
        //             width: v.videoWidth,
        //             height: v.videoHeight,
        //             debug: true
        //         });
        //
        //         timerGif = window.setInterval(function () {
        //             let c = document.createElement('canvas');
        //             let ctx = c.getContext('2d');
        //             c.width = v.videoWidth;
        //             c.height = v.videoHeight;
        //
        //             console.log('save frame');
        //             ctx.drawImage(v, 0, 0);
        //             gifJs.addFrame(ctx);
        //             c.remove();
        //
        //             if (getTimeRecord() >= 30000) stopRecord()
        //         }, 500);
        //         // v.remove();
        //     };
        //     v.srcObject = video;
        //     v.play();
        // }
    }

    function stopRecord() {
        if (isLog) console.log('stopRecord');

        if (!isRecording) return false;

        if (typeCapture === 'tab' || typeCapture === 'camera') nimbus_core.setActiveTab(activeTab);

        if (screenshot.automatic.data.site) nimbus_core.setActiveTab(activeTab);

        isRecording = false;

        audioStream && audioStream.active && audioStream.stop();
        videoStream && videoStream.active && videoStream.stop();
        micStream && micStream.active && micStream.stop();

        if (timer) clearInterval(timer);
        if (timerGif) clearInterval(timerGif);

        videoStream = null;
        micStream = null;
        timeStart = null;
        timePause = null;
        activeTab = null;
        audioPlayer = null;

        screenshot.changeVideoButton();

        let stop = async function () {
            await window.nimbus_core.timeout(500);

            window.nimbus_core.sendMessage({operation: 'status_video', type: typeCapture, status: getStatus(), state: getState()});

            let blob = new Blob(blobs, {'type': 'video/webm'});
            blobs = [];
            blobs_size = 0;

            if (typeCaptureStream) {
                if (blob.size > user.notes.max_size || user.notes.current + blob.size > user.notes.max) {
                    iconService.setDefault();
                    sendPage(blob)
                } else {
                    nimbus_core.sendMessage({operation: 'content_automation_status_upload_stream'});
                    socket.stop();
                }
            }/* else if (localStorage.recordToGif === 'true') {
                gifJs.on('finished', function (blob) {
                    iconService.setDefault();
                    sendPage(blob);
                });

                gifJs.render();
            } */ else {
                getSeekableBlob(blob, function (seekableBlob) {
                    iconService.setDefault();
                    sendPage(seekableBlob)
                });
            }
        };

        if (recorder && recorder.state === 'inactive') return;

        if (localStorage.recordVideoCore === 'default') {
            recorder.stop();
            stop();
        } else {
            recorder.stopRecording(stop);
        }
    }

    function pauseRecord() {
        if (isLog) console.log('pauseRecord');

        iconService.setDefault();

        if (recorder.state === 'recording') {
            timePause = Date.now();
            iconService.setPause();

            if (localStorage.recordVideoCore === 'default') recorder.pause();
            else recorder.pauseRecording();
        } else {
            timePause = null;
            if (typeCaptureStream) iconService.setLoading();
            else iconService.setRec();

            if (localStorage.recordVideoCore === 'default') recorder.resume();
            else recorder.resumeRecording();
        }

        window.nimbus_core.sendMessage({operation: 'status_video', type: typeCapture, status: getStatus(), state: getState()});
    }

    function getState() {
        return (recorder && recorder.state);
    }

    function getStatus() {
        return timer || (videoStream && !!videoStream.active);
    }

    function captureTab() {
        if (isLog) console.log('captureTab');
        chrome.tabCapture.capture({
            audio: videoTabSoundEnable,
            video: true,
            videoConstraints: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    maxFrameRate: 30,
                    maxWidth: videoResolution.width,
                    maxHeight: videoResolution.height
                }
            }
        }, preRecord);
    }

    function captureCamera() {
        if (isLog) console.log('captureCamera');
        window.navigator.getUserMedia({video: {deviceId: localStorage.selectedVideoCamera ? {exact: localStorage.selectedVideoCamera} : undefined}}, preRecord, console.log);
    }

    function captureDesktop() {
        if (isLog) console.log('captureDesktop');
        // navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        chrome.desktopCapture.chooseDesktopMedia(["screen", "window", "tab", "audio"], function (streamId, option) {
            if (!streamId) {
                isRecording = false;
            } else {
                let constraints = {
                    video: {
                        mandatory: {
                            chromeMediaSource: 'desktop',
                            chromeMediaSourceId: streamId,
                            maxFrameRate: 30,
                            maxWidth: videoResolution.width,
                            maxHeight: videoResolution.height
                        }
                    }
                };

                if (option.canRequestAudioTrack) {
                    constraints.audio = {
                        mandatory: {
                            chromeMediaSource: 'desktop',
                            chromeMediaSourceId: streamId
                        }
                    }
                }
                window.navigator.getUserMedia(constraints, preRecord, console.error);
            }
        });
    }

    async function capture(param) {
        if (isLog) console.log('capture', param);
        if (isRecording) return;

        let media_access = false;
        let auth = false;
        isRecording = true;
        typeCapture = localStorage.videoRecordType || 'tab';
        typeCaptureStream = localStorage.typeCaptureStream === 'true';
        countdown = +localStorage.videoCountdown;
        videoCamera = localStorage.videoCamera === 'true';
        videoMicSoundEnable = localStorage.videoMicSoundEnable === 'true';
        videoTabSoundEnable = localStorage.videoTabSoundEnable === 'true';
        videoDrawingToolsEnable = localStorage.videoDrawingToolsEnable === 'true';
        videoResolution = localStorage.videoResolution;
        // videoAudioBitrate = +localStorage.videoAudioBitrate;
        // videoBitrate = +localStorage.videoBitrate;
        // videoFps = +localStorage.videoFps;

        if (param && param.type) typeCapture = param.type;
        if (param && param.media_access) media_access = param.media_access;
        if (param && param.auth) auth = param.auth;

        if (typeCaptureStream && !auth && !media_access) {
            isRecording = false;
            nimbusShare.server.user.authState(function (res) {
                if (res.errorCode === 0 && res.body && res.body.authorized) {
                    nimbusShare.server.user.info(function (info) {
                        if (info.errorCode !== 0) return;

                        user.premium = !!info.body.premium.active;
                        user.notes.current = +info.body.usage.notes.current;
                        user.notes.max = +info.body.usage.notes.max;
                        user.notes.max_size = +info.body.limits.NOTES_MAX_ATTACHMENT_SIZE;

                        if (localStorage.streamMonthStart === undefined) localStorage.streamDataStart = new Date().getMonth();
                        if (localStorage.streamCountStart === undefined) localStorage.streamDataStart = 0;

                        if (+localStorage.streamMonthStart !== new Date().getMonth()) localStorage.streamCountStart = 0;

                        if (!user.premium && +localStorage.streamCountStart > 60) {
                            screenshot.insertPopup('nsc_popup_limitmonth_stream_open');
                        } else {
                            localStorage.streamCountStart = +localStorage.streamCountStart + 1;
                            return capture({auth: true});
                        }
                    });
                } else {
                    screenshot.insertPopup('nsc_popup_login_open');
                }
            });
            return;
        }

        if (typeCaptureStream) {
            videoResolution = 'hd';
            // videoAudioBitrate = 32000;
            // videoBitrate = 1000000;
            // videoFps = 24;
        }

        switch (localStorage.videoResolution) {
            case 'auto':
                videoResolution = {
                    width: screen.width,
                    height: screen.height
                };
                break;
            case 'qhd':
                videoResolution = {
                    width: 854,
                    height: 480
                };
                break;
            case 'hd':
                videoResolution = {
                    width: 1280,
                    height: 720
                };
                break;
            case 'fullhd':
                videoResolution = {
                    width: 1920,
                    height: 1080
                };
                break;
            case '2k':
                videoResolution = {
                    width: 2560,
                    height: 1440
                };
                break;
            case '4k':
                videoResolution = {
                    width: 3840,
                    height: 2160
                };
                break;
        }

        if (typeCapture === 'desktop' && typeCapture === 'camera') {
            videoTabSoundEnable = false;
            videoDrawingToolsEnable = false;
            videoCamera = false;
        }

        if (typeCapture === 'tab' || typeCapture === 'camera') {
            try {
                activeTab = await window.nimbus_core.getActiveTab();
            } catch (e) {
                isRecording = false;
                return alert(chrome.i18n.getMessage('notificationErrorChromeTab'));
            }

            if ((videoMicSoundEnable || videoCamera || typeCapture === 'camera') && !media_access) {
                isRecording = false;

                let constraints = {};
                if (videoMicSoundEnable) constraints.audio = {deviceId: localStorage.selectedMicrophone ? {exact: localStorage.selectedMicrophone} : undefined};
                if (videoCamera || typeCapture === 'camera') constraints.video = {deviceId: localStorage.selectedVideoCamera ? {exact: localStorage.selectedVideoCamera} : undefined};

                try {
                    (await window.nimbus_core.getUserMedia(constraints)).stop();

                    constraints.media_access = true;
                    screenshot.mediaAccess(constraints, true);

                    return capture({media_access: true});
                } catch (e) {
                    screenshot.mediaAccess(constraints, false)
                }
            } else {
                await window.nimbus_core.executeScript([
                    'js/lib/jquery-3.3.1.js',
                    'js/lib/progressbar.js',
                    'js/content-timer.js',
                    'js/content-video-editor.js',
                    'js/content-video-panel.js',
                    'js/content-camera.js',
                    'js/content-watermark.js',
                    'css/flex.min.css',
                    'css/icons.min.css',
                    'css/timer.min.css',
                    'css/video-panel.min.css'
                ]);

                injectionVideoPanel();
                injectionWatermarkVideo();
                injectionWebCamera();

                await window.nimbus_core.timeout(500);

                if (typeCapture === 'tab') chrome.tabs.update(activeTab.id, {active: true}, captureTab);
                else chrome.tabs.update(activeTab.id, {active: true}, captureCamera);
            }
        } else {
            if (videoMicSoundEnable && !media_access) {
                isRecording = false;
                let constraints = {audio: {deviceId: localStorage.selectedMicrophone ? {exact: localStorage.selectedMicrophone} : undefined}};

                try {
                    (await window.nimbus_core.getUserMedia(constraints)).stop();

                    constraints.media_access = true;
                    screenshot.mediaAccess(constraints, true);

                    return capture({media_access: true});
                } catch (e) {
                    screenshot.mediaAccess(constraints, false)
                }
            } else {
                captureDesktop();
            }
        }
    }

    function sendPage(blob) {
        window.requestFileSystem(window.PERSISTENT, 10 * 1024 * 1024 * 1024, function (fs) {
                let truncated = false;
                fs.root.getFile('video.' + localStorage.videoFormat, {create: true}, function (fileEntry) {
                    fileEntry.createWriter(function (writer) {
                            writer.onwriteend = function (progress) {
                                if (!truncated) {
                                    truncated = true;
                                    this.truncate(this.position);
                                    return;
                                }
                                console.log("Write completed", blob, progress);

                                if (localStorage.quickVideoCapture !== 'false' && screenshot.automatic.data.site !== 'github') {
                                    switch (localStorage.enableVideoEdit) {
                                        case 'nimbus':
                                        case 'google':
                                        case 'youtube':
                                        case 'quick':
                                            screenshot.automatic.send(blob);
                                            break;
                                        default:
                                            screenshot.createEditPage('video');
                                            break;
                                    }
                                } else if (localStorage.quickVideoCaptureGithub !== 'false' && screenshot.automatic.data.site === 'github') {
                                    screenshot.automatic.send(blob);
                                } else {
                                    screenshot.createEditPage('video');
                                }
                            };
                            writer.onerror = function (err) {
                                console.error("Write failed", err);
                            };
                            writer.write(blob);

                        }, function (err) {
                            console.error("Create Writer failed", err);
                        }
                    );
                }, function (err) {
                    console.error("Get File failed", err);
                });
            },
            function (err) {
                console.error("File System failed", err);
            }
        );
    }

    function getMixedAudioStream(arrayOfAudioStreams) {
        let audioContext = new AudioContext();

        let audioSources = [];

        let gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 0;

        let audioTracksLength = 0;
        arrayOfAudioStreams.forEach(function (stream) {
            if (!stream.getAudioTracks().length) {
                return;
            }

            audioTracksLength++;

            let audioSource = audioContext.createMediaStreamSource(stream);
            audioSource.connect(gainNode);
            audioSources.push(audioSource);
        });

        if (!audioTracksLength) {
            return;
        }

        let audioDestination = audioContext.createMediaStreamDestination();
        audioSources.forEach(function (audioSource) {
            audioSource.connect(audioDestination);
        });
        return audioDestination.stream;
    }

    function getTimeRecord() {
        const date = Date.now();
        timeStart = timeStart + (timePause ? date - timePause : 0);
        timePause = timePause ? date : null;
        return timeStart ? (date - timeStart) : 0;
    }

    function injectionVideoPanel(id) {
        if (!id && !activeTab) return;

        chrome.tabs.sendMessage(id || activeTab.id, {operation: 'video_panel_show', videoDrawingToolsEnable: videoDrawingToolsEnable, videoDrawingToolsDelete: +localStorage.videoDrawingToolsDelete, videoEditorTools: localStorage.videoEditorTools});
    }

    function injectionWebCamera(id) {
        if (!id && !activeTab) return;

        chrome.tabs.sendMessage(id || activeTab.id, {operation: 'content_camera_show', videoCameraPosition: localStorage.videoCameraPosition, selectedVideoCamera: localStorage.selectedVideoCamera, typeCapture: typeCapture, videoCamera: videoCamera});
    }

    function injectionWatermarkVideo(id) {
        if (!id && !activeTab) return;

        nimbus_core.checkWaterMark(function (check) {
            if (check) {
                nimbus_core.getWaterMark();

                window.setTimeout(function () {
                    nimbus_core.getWaterMark(function (watermark) {
                        nimbus_core.sendMessage({
                            operation: 'set_watermark_video',
                            dataUrl: watermark.toDataURL(),
                            position: localStorage.watermarkPosition,
                            watermarkEnableTime: localStorage.watermarkEnableTime === 'true',
                            watermarkTime: localStorage.watermarkTime,
                            typeCapture: typeCapture
                        })
                    })
                }, 0);
            }
        })
    }

    chrome.tabs.onUpdated.addListener(function (tabId, info) {
        chrome.tabs.get(tabId, async function (tab) {
            if (info.status === "complete" && !/^chrome/.test(tab.url) && activeTab && activeTab.id === tabId) {
                await window.nimbus_core.timeout(500);

                await window.nimbus_core.executeScript([
                    'js/lib/jquery-3.3.1.js',
                    'js/lib/progressbar.js',
                    'js/content-timer.js',
                    'js/content-video-editor.js',
                    'js/content-video-panel.js',
                    'js/content-camera.js',
                    'js/content-watermark.js',
                    'css/flex.min.css',
                    'css/icons.min.css',
                    'css/timer.min.css',
                    'css/video-panel.min.css'
                ]);
                if (typeCapture === 'tab' || typeCapture === 'camera') {
                    injectionVideoPanel();
                    injectionWatermarkVideo();
                    injectionWebCamera();
                }
            }
        });
    });

    chrome.tabs.onRemoved.addListener(function (tabId, info) {
        if (activeTab && activeTab.id === tabId) {
            stopRecord();
        }
    });

    return {
        capture: capture,
        captureTab: captureTab,
        captureDesktop: captureDesktop,
        startRecord: startRecord,
        stopRecord: stopRecord,
        pauseRecord: pauseRecord,
        getStatus: getStatus,
        getState: getState,
        getTimeRecord: getTimeRecord,
        mediaAccess: mediaAccess,
        isMediaAccess: isMediaAccess
    }
})();