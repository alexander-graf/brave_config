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

var videoRecorder = (function () {
    let recorder = null;
    let socket = null;
    let blobs = [];
    // let blobs_size = 0;
    let user = {
        premium: null,
        notes: {
            current: 0,
            max: 0,
            max_size: 0
        }
    };

    let typeCaptureStream, typeCapture,
        videoTabSoundEnable, videoMicSoundEnable,
        videoCameraEnable, videoDrawingToolsEnable,
        videoResolution,
        // videoAudioBitrate, videoBitrate, videoFps,
        audioPlayer, audioStream,
        videoStream, micStream, camStream;
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

    function mediaAccess() {
        capture({
            media_access: true
        });
    }

    function notesCreate(data) {
        let info = JSON.parse(localStorage.pageinfo);

        if (localStorage.numbusWorkspaceSelect === 'false') {
            nimbusShare.server.workspaces.getAll(function (err, workspaces) {
                for (let i = 0, len = workspaces.length; len > i; i++) {
                    let workspace = workspaces[i];
                    if (workspace.isDefault) {
                        localStorage.numbusWorkspaceSelect = workspace.globalId;
                        notesCreate(data);
                        break;
                    }
                }
            });
            return;
        }

        nimbusShare.send({
            "action": "screencasts:save",
            "features": {
                "noteEditor": true
            },
            "body": {
                "workspaceId": localStorage.numbusWorkspaceSelect,
                "screen": {
                    "title": data.filename,
                    "tempname": data.name,
                    "parent_id": nimbusShare.getUploadFolder().id,
                    "url": window.nimbus_core.is_chrome ? info.url : '',
                    'isStreaming': true
                },
                "share": localStorage.videoPrivateUploadEnable !== 'true'
            },
            "_client_software": nimbusShare.client_software

        }, function (msg) {
            iconService.setDefault();
            nimbus_core.sendAllMessage({operation: 'content_automation_status_upload_end'});

            let url = '';
            if (msg.body.location) url = msg.body.location;
            else url = 'https://nimbusweb.me/ws/' + localStorage.workspaceSelect + '/recent/note/' + msg.body.global_id;

            screenshot.openPage(url);
            window.nimbus_core.copyTextToClipboard(url);

            if (!user.premium && localStorage.streamLimitTime === 'true') {
                localStorage.streamLimitTime = false;
                window.setTimeout(function () {
                    screenshot.insertPopup('nsc_popup_limittime_stream_open');
                }, 1000)
            }
        });
    }

    function createSocket(cb) {
        socket = new WebSocket('wss://stream-uploading.nimbusweb.me');

        socket.onopen = function () {
            console.info("Connected to server ...");
        };

        socket.onmessage = function (event) {
            let msg = JSON.parse(event.data);

            switch (msg.event) {
                case "reject":
                    if (isLog) console.error('socket reject', msg);
                    break;
                case "ready":
                    if (isLog) console.info('socket ready');
                    cb && cb();
                    break;
                case "progress":
                    if (isLog) console.info('socket progress', msg);
                    break;
                case "response":
                    if (isLog) console.info('Response', msg.data);
                    notesCreate(msg.data);
                    break;
            }
        };

        socket.onclose = function (event) {
            if (isLog) console.info('socket onclose', event);
            if (getState() !== 'inactive') stopRecord();
        };

        socket.onerror = function (error) {
            if (isLog) console.error("socket error", error);
            if (getState() !== 'inactive') stopRecord();
        };
    }

    async function createMediaRecorder() {
        timeStart = Date.now();

        if (typeCaptureStream) {
            socket.send(JSON.stringify({
                event: 'meta',
                name: window.nimbus_core.getVideoFileName(JSON.parse(localStorage.pageinfo), 'webm'),
                type: 'video/webm'
            }));
        }

        // console.log(typeCapture === 'desktop', videoCameraEnable)
        // if (typeCapture === 'desktop' && videoCameraEnable) {
        //     localStorage.recordVideoCore = 'advanced';
        //
        //     console.log('init captureStream');
        //
        //     let camStream = await window.nimbus_core.getUserMedia({
        //         video: {
        //             deviceId: {
        //                 exact: localStorage.selectedVideoCamera
        //             },
        //             mandatory: {
        //                 maxFrameRate: 30,
        //                 maxWidth: 1920,
        //                 maxHeight: 1080
        //             }
        //         }
        //     });
        //
        //     videoStream.width = videoResolution.width;
        //     videoStream.height = videoResolution.height;
        //
        //     if (videoResolution === 'auto') {
        //         videoStream.width = screen.width;
        //         videoStream.height = screen.height;
        //     }
        //
        //     videoStream.fullcanvas = true;
        //
        //     camStream.width = 320;
        //     camStream.height = 240;
        //     camStream.top = 0;//screen.height - camStream.height;
        //     camStream.left = 0;//screen.width - camStream.width;
        //
        //     let option = {
        //         disableLogs: true,
        //         type: 'video',
        //         mimeType: 'video/webm; codecs=vp8',
        //         getNativeBlob: true
        //     };
        //
        //     option.timeSlice = 1000;
        //     option.ondataavailable = function (blob) {
        //         if (isLog) console.log('chunk', window.nimbus_core.formatBytes(blob.size));
        //
        //         if (typeCaptureStream && !user.premium && Date.now() - timeStart > 60000 * 5) {
        //             localStorage.streamLimitTime = true;
        //             stopRecord();
        //         } else if (typeCaptureStream) {
        //             socket.send(blob)
        //         } else {
        //             blobs.push(blob);
        //         }
        //     };
        //     recorder = RecordRTC([videoStream, camStream], option);
        //     recorder.startRecording();
        //
        //     return;
        // }

        // let storage = await window.nimbus_core.storageUsageAndQuota();
        // let quota = storage.quota - storage.used;

        console.log('recordVideoCore', localStorage.recordVideoCore);
        if (localStorage.recordVideoCore === 'default') {
            let options = {
                mimeType: 'video/webm; codecs=vp8'
            };

            recorder = new MediaRecorder(videoStream, options);
            recorder.ondataavailable = function (e) {
                // if (isLog) console.log('chunk', window.nimbus_core.formatBytes(e.data.size));

                if (typeCaptureStream && !user.premium && Date.now() - timeStart > 60000 * 5) {
                    localStorage.streamLimitTime = true;
                    return stopRecord();
                } else if (typeCaptureStream) {
                    socket.send(e.data);
                    // blobs_size += e.data.size;
                }
                blobs.push(e.data);
                // blobs_size += e.data.size;

                // if (localStorage.quickVideoStorageLimit === 'true') {
                //     if (quota - blobs_size <= 1024 * 1024 * 500) { // 500 mb
                //         window.nimbus_core.sendMessage({operation: 'content_automation_status_storage_limit'});
                //         pauseRecord();
                //     }
                // }

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
                // if (isLog) console.log('chunk', window.nimbus_core.formatBytes(blob.size));

                if (typeCaptureStream && !user.premium && Date.now() - timeStart > 60000 * 5) {
                    localStorage.streamLimitTime = true;
                    return stopRecord();
                } else if (typeCaptureStream) {
                    socket.send(blob);
                    // blobs_size += blob.size;
                }
                blobs.push(blob);
                // blobs_size += blob.size;

                // if (localStorage.quickVideoStorageLimit === 'true') {
                //     if (quota - blobs_size <= 1024 * 1024 * 500) { // 500 mb
                //         window.nimbus_core.sendMessage({operation: 'content_automation_status_storage_limit'});
                //         pauseRecord();
                //     }
                // }

            };
            recorder = RecordRTC(videoStream, option);
            recorder.startRecording();
        }
    }

    async function preRecord(streamVideo) {
        if (chrome.runtime.lastError) {
            if (/activeTab/.test(chrome.runtime.lastError.message)) {
                isRecording = false;
                alert(chrome.i18n.getMessage('notificationErrorActiveTab'));
            }
        } else {
            // await window.nimbus_core.timeout(500);
            //
            // console.log(streamVideo);
            // // let url = window.URL.createObjectURL(streamVideo);
            //
            // const url = URL.createObjectURL(streamVideo);
            //
            // console.log(url);
            //
            // window.nimbus_core.sendAllMessage({operation: 'stream_camera', stream: streamVideo});

            localStorage.pageinfo = await window.nimbus_core.getPageInfo(typeCapture);
            videoStream = streamVideo;

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
                    let mixedAudioStream = getMixedAudioStream([micStream, streamVideo]);

                    mixedAudioStream.getTracks().forEach(function (track) {
                        // console.log('mixedAudioStream', track)
                        mixedStream.addTrack(track);
                    });

                    streamVideo.getTracks().forEach(function (track) {
                        // console.log('streamVideo', track)
                        mixedStream.addTrack(track);
                    });

                    videoStream = mixedStream;

                } catch (e) {
                    console.error(e)
                }
            }

            if (typeCapture === 'tab' && videoTabSoundEnable) {
                console.log('recordAudioCore', localStorage.recordAudioCore);
                if (localStorage.recordAudioCore === 'default') {
                    audioStream = new MediaStream([streamVideo.getAudioTracks()[0].clone()]);
                    let ctx = new AudioContext({latencyHint: 0.03});
                    let output = ctx.createMediaStreamSource(streamVideo);
                    output.connect(ctx.destination)
                } else {
                    audioPlayer = new Audio();
                    audioPlayer.srcObject = streamVideo;
                    audioPlayer.volume = 1;
                    audioPlayer.play();
                }
            }

            streamVideo.getTracks().forEach(function (track) {
                console.info("stream track", track);
                track.onended = stopRecord;
            });

            await window.nimbus_core.timeout(500);

            if (countdown) {
                await window.nimbus_core.setExtensionBadge(countdown);
                if (typeCapture !== 'desktop' && activeTab) {
                    await window.nimbus_core.setTimerContent(activeTab, countdown);
                }
            }
            startRecord();
        }
    }

    function startRecord() {
        if (typeCaptureStream) {
            createSocket(function () {
                createMediaRecorder();
            });
        } else {
            createMediaRecorder();
        }

        if (typeCaptureStream) iconService.setLoading();
        else iconService.setRec();

        window.nimbus_core.sendAllMessage({operation: 'status_video', type: typeCapture, status: getStatus(), state: getState()});
    }

    function stopRecord() {
        if (isLog) console.log('stopRecord');

        if (!isRecording) return false;

        if (typeCapture === 'tab' || typeCapture === 'camera') nimbus_core.setActiveTab(activeTab);

        if (screenshot.automatic.data.site) nimbus_core.setActiveTab(activeTab);

        isRecording = false;

        screenshot.changeVideoButton();

        let stop = async function () {
            await window.nimbus_core.timeout(500);

            let blob = new Blob(blobs, {'type': 'video/webm'});

            if (typeCaptureStream) {
                if (blob.size > user.notes.max_size || user.notes.current + blob.size > user.notes.max) {
                    getSeekableBlob(blob, function (seekableBlob) {
                        iconService.setDefault();
                        sendPage(seekableBlob)
                    });
                } else {
                    nimbus_core.sendAllMessage({operation: 'content_automation_status_upload_stream'});
                    socket.send(JSON.stringify({event: 'finish'}));
                }
            } else {
                getSeekableBlob(blob, function (seekableBlob) {
                    iconService.setDefault();
                    sendPage(seekableBlob)
                });
            }

            audioStream && audioStream.active && audioStream.stop();
            videoStream && videoStream.active && videoStream.stop();
            micStream && micStream.active && micStream.stop();
            camStream && camStream.active && camStream.stop();

            if (timer) clearInterval(timer);
            if (timerGif) clearInterval(timerGif);

            videoStream = null;
            micStream = null;
            camStream = null;
            timeStart = null;
            activeTab = null;
            typeCapture = null;
            typeCaptureStream = null;
            audioPlayer = null;
            blobs = [];

            window.nimbus_core.sendAllMessage({operation: 'status_video', type: typeCapture, status: getStatus(), state: getState()});
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

        if (recorder.state === 'recording') {
            timePause = Date.now();
            iconService.setPause();

            if (localStorage.recordVideoCore === 'default') recorder.pause();
            else recorder.pauseRecording();
        } else {
            timePause = null;
            iconService.setRec();

            if (localStorage.recordVideoCore === 'default') recorder.resume();
            else recorder.resumeRecording();
        }

        window.nimbus_core.sendAllMessage({operation: 'status_video', type: typeCapture, status: getStatus(), state: getState()});
    }

    function getState() {
        return (recorder && recorder.state);
    }

    function getStatus() {
        return timer || (videoStream && !!videoStream.active);
    }

    function captureTab() {
        if (isLog) console.log('captureTab');
        let constraints = {
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
        };
        if (videoResolution === 'auto') {
            constraints.videoConstraints.mandatory.maxWidth = activeTab.width;
            constraints.videoConstraints.mandatory.maxHeight = activeTab.height;
        }

        chrome.tabCapture.capture(constraints, preRecord);
    }

    async function captureCamera() {
        await window.nimbus_core.timeout(1000);


        if (isLog) console.log('captureCamera');
        let constraints = {
            video: {
                deviceId: {
                    exact: localStorage.selectedVideoCamera
                },
                mandatory: {
                    maxFrameRate: 30,
                    maxWidth: videoResolution.width,
                    maxHeight: videoResolution.height
                }
            }
        };

        if (videoResolution === 'auto') {
            constraints.video.mandatory.maxWidth = screen.width;
            constraints.video.mandatory.maxHeight = screen.height;
        }

        window.navigator.getUserMedia(constraints, preRecord, console.log);

        // const camera = await navigator.mediaDevices.getUserMedia(constraints);
        // const pc = new RTCPeerConnection(null);
        // console.log('RTCPeerConnection', pc)
        //
        // pc.addStream(camera);
        //
        // // console.log('camera.getTracks()', camera.getTracks())
        // for (const track of camera.getTracks()) {
        //     console.log('RTCPeerConnection addTrack')
        //     pc.addTrack(track, camera);
        // }
        // console.log(camera)
        // let url = window.URL.createObjectURL(camera);
        //
        // console.log(url)
        //
        // window.nimbus_core.sendAllMessage({operation: 'stream_camera', stream: url});

        // return preRecord(camera);
    }

    function captureDesktop() {
        if (isLog) console.log('captureDesktop');

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

                if (videoResolution === 'auto') {
                    constraints.video.mandatory.maxWidth = screen.width;
                    constraints.video.mandatory.maxHeight = screen.height;
                }

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
        activeTab = null;

        typeCapture = localStorage.videoRecordType || 'tab';
        typeCaptureStream = localStorage.typeCaptureStream === 'true';
        countdown = +localStorage.videoCountdown;
        videoCameraEnable = localStorage.videoCamera === 'true';
        videoMicSoundEnable = localStorage.videoMicSoundEnable === 'true';
        videoTabSoundEnable = localStorage.videoTabSoundEnable === 'true';
        videoDrawingToolsEnable = localStorage.videoDrawingToolsEnable === 'true';
        videoResolution = localStorage.videoResolution;

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
                        //
                        // if (!user.premium && +localStorage.streamCountStart > 60) {
                        //     screenshot.insertPopup('nsc_popup_limitmonth_stream_open');
                        // } else {
                        localStorage.streamCountStart = +localStorage.streamCountStart + 1;
                        return capture({auth: true});
                        // }
                    });
                } else {
                    screenshot.insertPopup('nsc_popup_login_open');
                }
            });
            return;
        }

        if (typeCaptureStream) videoResolution = 'hd';

        switch (localStorage.videoResolution) {
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

        if (typeCapture === 'desktop' || typeCapture === 'camera') {
            videoTabSoundEnable = false;
            videoDrawingToolsEnable = false;
            // if (typeCapture !== 'desktop')
                videoCameraEnable = false;
        }

        try {
            activeTab = await window.nimbus_core.getActiveTab();

            await window.nimbus_core.executeScript([
                'js/lib/jquery-3.3.1.js',
                'js/lib/progressbar.js',
                'js/content-core.js',
                'js/content-hotkeys.js',
                'js/content-automation.js',
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

            await window.nimbus_core.timeout(100);
        } catch (e) {
            if (typeCapture === 'tab' || typeCapture === 'camera') {
                isRecording = false;
                return alert(chrome.i18n.getMessage('notificationErrorChromeTab'));
            }
        }

        let constraints = {};
        if (videoMicSoundEnable) constraints.audio = {deviceId: localStorage.selectedMicrophone ? {exact: localStorage.selectedMicrophone} : undefined};
        if (videoCameraEnable || typeCapture === 'camera') constraints.video = {deviceId: localStorage.selectedVideoCamera ? {exact: localStorage.selectedVideoCamera} : undefined};

        if ((videoMicSoundEnable || videoCameraEnable || typeCapture === 'camera') && !media_access) {
            isRecording = false;

            try {
                (await window.nimbus_core.getUserMedia(constraints)).stop();

                constraints.media_access = true;
                screenshot.mediaAccess(constraints, true);

                return capture({media_access: true});
            } catch (e) {
                localStorage.isMediaAccess = 'false';
                screenshot.mediaAccess(constraints, false)
            }
        } else {
            if (activeTab) {
                await window.nimbus_core.setActiveTab(activeTab);
                injectionWebCamera();
            }
            if (typeCapture !== 'desktop') {
                injectionWatermarkVideo();
                injectionVideoPanel();
            }

            if (typeCapture === 'tab') captureTab();
            else if (typeCapture === 'camera') captureCamera();
            else captureDesktop();
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

        chrome.tabs.sendMessage(id || activeTab.id, {
            operation: 'video_panel_show',
            videoDrawingToolsEnable: videoDrawingToolsEnable,
            videoDrawingToolsDelete: +localStorage.videoDrawingToolsDelete,
            videoEditorTools: localStorage.videoEditorTools
        });
    }

    function injectionWebCamera(id) {
        if (!id && !activeTab) return;

        console.log('injectionWebCamera', id, activeTab.id);

        chrome.tabs.sendMessage(id || activeTab.id, {
            operation: 'content_camera_show',
            videoCameraPosition: localStorage.videoCameraPosition,
            selectedVideoCamera: localStorage.selectedVideoCamera,
            typeCapture: typeCapture,
            videoCamera: videoCameraEnable
        });
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
                            typeCapture: typeCapture,
                            recordTime: getTimeRecord()
                        })
                    })
                }, 0);
            }
        })
    }

    chrome.tabs.onUpdated.addListener(function (tabId, info) {
        chrome.tabs.get(tabId, async function (tab) {
            if (info.status === "complete" && !/^chrome/.test(tab.url)) {
                if (isRecording && ((activeTab && activeTab.id === tabId) || (typeCapture === 'desktop' && videoCameraEnable))) {
                    await window.nimbus_core.executeScript([
                        'js/lib/jquery-3.3.1.js',
                        'js/lib/progressbar.js',
                        'js/content-core.js',
                        'js/content-hotkeys.js',
                        'js/content-automation.js',
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

                    await window.nimbus_core.timeout(100);

                    if (typeCapture !== 'desktop') {
                        injectionVideoPanel(tabId);
                        injectionWatermarkVideo(tabId);
                    }
                    injectionWebCamera(tabId);
                }
            }
        });
    });

    chrome.tabs.onActivated.addListener(function (tab) {
        chrome.tabs.get(tab.tabId, async function (tab) {
            if (!/^chrome/.test(tab.url)) {
                if (isRecording && typeCapture === 'desktop' && videoCameraEnable) {
                    await window.nimbus_core.executeScript([
                        'js/lib/jquery-3.3.1.js',
                        'js/lib/progressbar.js',
                        'js/content-core.js',
                        'js/content-hotkeys.js',
                        'js/content-automation.js',
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

                    await window.nimbus_core.timeout(100);

                    injectionWebCamera(tab.id);
                }
            }
        });
    });

    chrome.tabs.onRemoved.addListener(function (tabId) {
        if (isRecording && activeTab && activeTab.id === tabId) {
            stopRecord();
        }
    });

    // chrome.windows.onFocusChanged.addListener(function (windowId) {
    //     console.log(windowId)
    // });

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