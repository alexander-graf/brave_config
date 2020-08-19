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

//  console.log(s)
//
// localStorage.filePatch = nimbus_screen.path + 'vide.' + localStorage.videoFormat;

let nimbus_screen = {
    canvasManager: null,
    canvasDone: document.createElement('canvas'),
    pdf: null,
    dom: {},
    path: 'filesystem:chrome-extension://' + chrome.i18n.getMessage("@@extension_id") + '/persistent/',
    info: {
        page: JSON.parse(localStorage.pageinfo),
        zoom: window.devicePixelRatio || 1,
        file: {
            image: {
                width: 0,
                height: 0,
                format: localStorage.imageFormat,
                info: JSON.parse(localStorage.imageFileInfo || '{}'),
                patch: localStorage.imageFilePatch,
                origin_patch: localStorage.imageFilePatch,
                blob: null
            },
            video: {
                width: 0,
                height: 0,
                format: localStorage.videoFormat,
                info: localStorage.videoFileInfo,
                patch: 'filesystem:chrome-extension://' + chrome.i18n.getMessage("@@extension_id") + '/persistent/' + 'video.' + localStorage.videoFormat,
                origin_patch: 'filesystem:chrome-extension://' + chrome.i18n.getMessage("@@extension_id") + '/persistent/' + 'video.' + localStorage.videoFormat,
                blob: null,
                last_video_name: 'video',
                last_video_format: localStorage.videoFormat,
                last_convert_name: 'video',
                last_convert_format: localStorage.videoFormat,
                last_convert_patch: 'filesystem:chrome-extension://' + chrome.i18n.getMessage("@@extension_id") + '/persistent/' + 'video.' + localStorage.videoFormat,
            },
        },
        first_canvas_width: null,
        first_canvas_height: null
    },
    get: {
        quickCapture: function (cb) {
            chrome.runtime.sendMessage({operation: 'get_quick_capture'}, cb);
        },
        fileName: function (add_format) {
            let s = nimbus_screen.getLocationParam() === 'video' ? localStorage.fileNamePatternScreencast : localStorage.fileNamePatternScreenshot;
            let info = nimbus_screen.info.page;
            let url = document.createElement('a');
            url.href = info.url || '';
            s = s.replace(/\{url}/, info.url || '')
                .replace(/\{title}/, info.title || '')
                .replace(/\{domain}/, url.host || '')
                .replace(/\{date}/, info.time.split(' ')[0] || '')
                .replace(/\{time}/, info.time.split(' ')[1] || '')
                .replace(/\{ms}/, info.time.split(' ')[2] || '')
                .replace(/\{timestamp}/, info.time.split(' ')[3] || '');

            return s.replace(/[\*\|\\\:\"\<\>\?\/#]+/ig, '_') + (add_format ? '.' + (nimbus_screen.getLocationParam() === 'video' ? nimbus_screen.info.file.video.format : nimbus_screen.info.file.image.format) : '');
        },
        image: {}
    },
    view: {
        classRoomButton: function (url) {
            if (window.nimbus_core.is_chrome) {
                gapi.sharetoclassroom.render("nsc_share_classroom", {"size": "24", "url": url});
            }
        },
        done: function () {
            const done_height = $(window).innerHeight() - 215 - 120 - 65;
            $('.nsc-done-content').height((done_height < 500 ? 500 : done_height));

            nimbus_screen.dom.$nsc_done_page.removeClass('nsc-hide');
            nimbus_screen.dom.$nsc_redactor_page.addClass('nsc-hide');
            nimbus_screen.dom.$nsc_pre_load.addClass('nsc-hide');

            googleShare.view.tooltip();

            if (localStorage.appType !== 'google') {
                dropboxShare.setUploadFolderTooltip();
                slackShare.init();
                nimbusShare.init();
                nimbus_screen.rate_popup.init();
                nimbus_screen.account_popup.init();

                nimbusShare.checkPremium(function (err, premium) {
                    if (!err && premium.capture && nimbus_screen.getLocationParam() === 'video' && window.nimbus_core.is_chrome) {
                        $('#nsc_manage_devices').removeClass('nsc-hide');
                        $('#nsc_increase_limit').removeClass('nsc-hide');
                    }
                    if (err || !premium.capture) {
                        $('#nsc_upgrade_nimbus_pro').removeClass('nsc-hide');
                    }
                }, false);
            }

            if (nimbus_screen.getLocationParam() === 'video' && window.nimbus_core.is_chrome) {
                $('.nsc-trigger-panel-container.save-from-disk').hide();
                $('#nsc_button_slack').hide();
                $('#nsc_button_print').hide();
                $('#nsc_button_back').hide();

                $('#nsc_button_save_video').show();
                nimbus_screen.dom.$app_title.text(chrome.i18n.getMessage("nimbusSaveScreencast"));
                nimbus_screen.dom.$preview_loading.show().find('[data-i18n]').text(chrome.i18n.getMessage('labelPreviewLoading'));

                if (localStorage.appType === 'google') {
                    if (nimbus_screen.info.file.video.patch !== nimbus_screen.info.file.video.origin_patch) {
                        return nimbus_screen.view.video.preview();
                    }

                    window.nimbus_core.blobUrlToBlob(nimbus_screen.info.file.video.patch, function (blob) {
                        nimbus_screen.info.file.video.blob = blob;
                        nimbus_screen.info.file.video.size = Math.floor(blob.size);
                        nimbus_screen.tracker.send(nimbus_screen.VIDEO_USING);

                        nimbus_screen.view.video.preview();

                    });
                } else {
                    nacl_module.init(function () {
                        nimbus_screen.view.video.preview();
                    });
                }
            } else {
                $('#nsc_button_youtube').addClass('nsc-hide');
                $('#nsc_preview_img').addClass('nsc-hide');
                $('#nsc_button_save_video').addClass('nsc-hide');
                $('#nsc_enable_watermark').closest('div').removeClass('nsc-hide');

                nimbus_screen.dom.$app_title.text(chrome.i18n.getMessage("nimbusSaveScreenshot"));
                nimbus_screen.dom.$preview_loading.removeClass('nsc-hide').find('[data-i18n]').text(chrome.i18n.getMessage('labelPreviewLoading'));

                if (nimbus_screen.canvasManager) {
                    nimbus_screen.canvasManager.done();
                    let fon = nimbus_screen.canvasManager.getCanvas().fon.canvas;
                    let bg = nimbus_screen.canvasManager.getCanvas().background.canvas;

                    nimbus_screen.canvasDone.width = fon.width;
                    nimbus_screen.canvasDone.height = fon.height;
                    nimbus_screen.canvasDone.getContext('2d').drawImage(fon, 0, 0);
                    nimbus_screen.canvasDone.getContext('2d').drawImage(bg, 0, 0);

                    nimbus_screen.info.file.image.patch = nimbus_screen.canvasDone.toDataURL('image/' + (nimbus_screen.info.file.image.format === 'jpg' ? 'jpeg' : 'png'));
                    nimbus_screen.canvasDone.toBlob(function (blob) {
                        nimbus_screen.info.file.image.blob = blob;
                        nimbus_screen.view.image.preview();
                    }, 'image/' + (nimbus_screen.info.file.image.format === 'jpg' ? 'jpeg' : 'png'));
                } else {
                    let screen = new Image();
                    screen.onload = function () {
                        nimbus_screen.canvasDone.width = screen.width;
                        nimbus_screen.canvasDone.height = screen.height;
                        nimbus_screen.canvasDone.getContext('2d').drawImage(screen, 0, 0);
                        window.setTimeout(function () {
                            nimbus_screen.setWaterMark(localStorage.watermarkEnable === 'true', function () {
                                nimbus_screen.info.file.image.patch = nimbus_screen.canvasDone.toDataURL('image/' + (nimbus_screen.info.file.image.format === 'jpg' ? 'jpeg' : 'png'));
                                nimbus_screen.canvasDone.toBlob(function (blob) {
                                    nimbus_screen.info.file.image.blob = blob;
                                    nimbus_screen.view.image.preview();
                                }, 'image/' + (nimbus_screen.info.file.image.format === 'jpg' ? 'jpeg' : 'png'));
                            });
                        }, 0);
                    };
                    screen.src = nimbus_screen.info.file.image.origin_patch;
                }
            }

            if (localStorage.getItem('environmentInfo') === 'true') $('#nsc_environment_info').prop('checked', true).trigger('change');
            if (localStorage.slackPanel === 'true' && nimbus_screen.getLocationParam() !== 'video') chrome.runtime.sendMessage({operation: 'get_slack_data'});
            if (localStorage.youtubePanel === 'true' && nimbus_screen.getLocationParam() === 'video') youtubeShare.refreshToken('panel');

            if (window.nimbus_core.language === 'ru') {
                $('#nsc_link_twitter').addClass('nsc-hide');
                $('#nsc_link_facebook').addClass('nsc-hide');
                $('.nsc-heading-actions').append('<span><a href="https://nimbusweb.co/jobs.php" target="_blank"><b>Мы ищем таланты!</b></a></span>')
            }
        },
        image: {
            weight: function () {
                $('#nsc_indicator_weight').text(window.nimbus_core.formatBytes(nimbus_screen.info.file.image.blob.size));
            },
            format: function () {
                $('#nsc_indicator_format').text(nimbus_screen.info.file.image.format.toLowerCase());
            },
            resolution: function () {
                let img = new Image();
                img.onload = function () {
                    nimbus_screen.info.file.image.width = this.width;
                    nimbus_screen.info.file.image.height = this.height;
                    $('#nsc_indicator_size').text(this.width + ' x ' + this.height);
                };
                img.src = nimbus_screen.info.file.image.patch;
            },
            preview: function () {
                $('#nsc_screen_name').val(nimbus_screen.get.fileName());
                $('#nsc_done_youtube_name').val(nimbus_screen.get.fileName(true));
                let $nsc_preview_img = $('#nsc_preview_img');
                let width = 400;
                $nsc_preview_img
                    .attr('src', nimbus_screen.info.file.image.patch)
                    .on("load", function () {
                        if ($nsc_preview_img.width() > width) width = $nsc_preview_img.width();
                        $nsc_preview_img.removeClass('nsc-hide');

                        nimbus_screen.dom.$nsc_indicator.removeClass('nsc-hide');
                        nimbus_screen.dom.$preview_loading.addClass('nsc-hide');
                        $(window).trigger('resize')
                    }).off('click').on('click', function () {
                    chrome.runtime.sendMessage({operation: 'open_page', 'url': nimbus_screen.info.file.image.patch});
                });

                if (window.nimbus_core.is_chrome) {
                    nimbus_screen.pdf = new jsPDF({
                        orientation: nimbus_screen.canvasDone.width > nimbus_screen.canvasDone.height ? 'landscape' : 'portrait',
                        unit: 'px',
                        format: [Math.ceil(nimbus_screen.canvasDone.width), Math.ceil(nimbus_screen.canvasDone.height)],
                        compress: true
                    });

                    if (nimbus_screen.getLocationParam() === 'pdf') {
                        nimbus_screen.pdf.addImage(document.getElementById('nsc_preview_img'), 'JPEG', 0, 0, Math.ceil(nimbus_screen.canvasDone.width), Math.ceil(nimbus_screen.canvasDone.height), '', 'FAST');
                        nimbus_screen.pdf.save(nimbus_screen.getFileName() + ".pdf");
                    }
                }

                nimbus_screen.view.image.weight();
                nimbus_screen.view.image.resolution();
                nimbus_screen.view.image.format();

                $(document).trigger('ready_done');
            },
        },
        video: {
            weight: function () {
                $('#nsc_indicator_weight').text(window.nimbus_core.formatBytes(nimbus_screen.info.file.video.blob.size));
            },
            format: function () {
                $('#nsc_indicator_format').text(nimbus_screen.info.file.video.format.toLowerCase());
            },
            resolution: function () {
                let set = function () {
                    for (const [i, resolution] of nacl_module.video_resolution.entries()) {
                        if (resolution.width > nimbus_screen.info.file.video.width) {
                            $('#nsc_video_convert input[name=size]').val(i - 1 > 0 ? i - 1 : 1).trigger('change');
                            break;
                        }
                    }

                    $('#nsc_indicator_size').text(nimbus_screen.info.file.video.width + ' x ' + nimbus_screen.info.file.video.height);
                };

                if (nimbus_screen.info.file.video.format === 'webm' || nimbus_screen.info.file.video.format === 'mp4') {
                    if (localStorage.appType === 'google') return false;
                    new FFMPEG_CONVERT().info(nimbus_screen.info.file.video.patch, function (info) {
                        if (info.quality) {
                            nimbus_screen.info.file.video.width = info.quality.width;
                            nimbus_screen.info.file.video.height = info.quality.height;
                            set();
                        }
                    });
                } else {
                    let img = new Image();
                    img.onload = function () {
                        nimbus_screen.info.file.video.width = this.width;
                        nimbus_screen.info.file.video.height = this.height;
                        set();
                    };
                    img.src = nimbus_screen.info.file.video.patch;
                }
            },
            preview: function () {
                nimbus_screen.get.quickCapture(function (res) {
                    if (res.quick_video_capture !== 'false') {
                        switch (res.enable_video_edit) {
                            case 'edit':
                                $('#nsc_video_convert button[name=editor]').click();
                                break;
                            case 'nimbus':
                                $('#nsc_button_nimbus').click();
                                break;
                            case 'google':
                                $('#nsc_button_google_drive').click();
                                break;
                            case 'dropbox':
                                $('#nsc_button_dropbox').click();
                                break;
                            case 'youtube':
                                $('#nsc_button_youtube').click();
                                break;
                            case 'save':
                                $('#nsc_button_save_video').click();
                                break;
                        }
                    }
                });

                $('#nsc_screen_name').val(nimbus_screen.get.fileName(true));
                $('#nsc_done_youtube_name').val(nimbus_screen.get.fileName(true));

                let $nsc_stream_video = $('#nsc_stream_video');
                let $nsc_preview_img = $('#nsc_preview_img');
                let indicator_width = 550;
                let nsc_stream_video = $nsc_stream_video[0];

                if (nimbus_screen.info.file.video.format === 'webm' || nimbus_screen.info.file.video.format === 'mp4') {
                    nsc_stream_video.onerror = function () {
                        console.error("Error " + nsc_stream_video.error.code + "; details: " + nsc_stream_video.error.message);
                    };

                    nsc_stream_video.oncanplay = function () {
                        nimbus_screen.dom.$nsc_indicator.removeClass('nsc-hide');
                        $nsc_stream_video.removeClass('nsc-hide');
                        nimbus_screen.dom.$preview_loading.addClass('nsc-hide');

                        if ($nsc_stream_video.width() > indicator_width) indicator_width = $nsc_stream_video.width();
                        nimbus_screen.dom.$nsc_indicator.css({'max-width': indicator_width});
                    };

                    nsc_stream_video.src = nimbus_screen.info.file.video.patch;

                    // if (localStorage.videoReEncoding !== 'true') {
                    //     nsc_stream_video.currentTime = 9999999999;
                    //
                    //     window.setTimeout(function () {
                    //         nsc_stream_video.currentTime = 0;
                    //         nsc_stream_video.play();
                    //     }, 300);
                    // }
                } else {
                    $nsc_preview_img
                        .attr('src', nimbus_screen.info.file.video.patch + '?' + Date.now())
                        .on("load", function () {
                            $nsc_preview_img.removeClass('nsc-hide');
                            nimbus_screen.dom.$nsc_indicator.removeClass('nsc-hide');
                            nimbus_screen.dom.$preview_loading.addClass('nsc-hide');

                            if ($nsc_preview_img.width() > indicator_width) indicator_width = $nsc_preview_img.width();
                            nimbus_screen.dom.$nsc_indicator.css({'max-width': indicator_width});
                        }).off('click').on('click',
                        function () {
                            chrome.runtime.sendMessage({operation: 'open_page', 'url': nimbus_screen.info.file.video.patch});
                        });
                }
                if (localStorage.appType !== 'google') {
                    $('#nsc_video_convert').removeClass('nsc-hide');
                }
                nimbus_screen.view.video.weight();
                nimbus_screen.view.video.resolution();
                nimbus_screen.view.video.format();
            },
        }
    },
    getLocationParam:

        function () {
            const p = window.location.href.replace('#', '').match(/[&|?](\w+)$/);
            return (p && p[1]) || '';
        }

    ,
    // kbToMb: function (size, n) {
    //     return ((size) / 1024 / 1024).toFixed(n || 0) + ' MB';
    // }
    // ,
    urlToBlob: function (url, cb) {
        function errorHandler(e) {
            console.error(e);
        }

        window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
        window.requestFileSystem(window.PERSISTENT, 10 * 1024 * 1024 * 1024, function (fs) {
            fs.root.getFile(url.replace(nacl_module.path, ''), {}, function (fileEntry) {
                fileEntry.file(function (file) {
                    let reader = new FileReader();
                    reader.onloadend = function (e) {
                        cb(new Blob([new Uint8Array(reader.result)]));
                    };
                    reader.readAsArrayBuffer(file);
                }, errorHandler);
            });
        }, errorHandler);
    }
    ,
    dataURLToFile: function (dataURL, name, cb) {
        function errorHandler(e) {
            console.error(e);
        }

        window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
        window.requestFileSystem(window.PERSISTENT, 10 * 1024 * 1024 * 1024, function (fs) {

            fs.root.getFile(name, {create: true}, function (fileEntry) {
                fileEntry.createWriter(function (fileWriter) {
                    fileWriter.onwriteend = function (e) {
                        cb && cb()
                    };

                    fileWriter.onerror = function (e) {
                        console.log('Write failed: ' + e.toString());
                    };

                    let blob = nimbus_screen.dataURLtoBlob(dataURL);
                    fileWriter.write(blob);
                }, errorHandler);
            }, errorHandler);
        }, errorHandler);
    }
    ,
    dataURLtoBlob: function (dataURL) {
        let arr = dataURL.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type: mime});
    }
    ,
    blobTodataURL: function (blob, cb) {
        let a = new FileReader();
        a.onload = function (e) {
            cb && cb(e.target.result);
        };
        a.readAsDataURL(blob);
    },
    copyTextToClipboard: function (text) {
        let element = document.createElement("iframe");
        element.src = chrome.runtime.getURL("blank.html");
        element.style.opacity = "0";
        element.style.width = "1px";
        element.style.height = "1px";
        element.addEventListener("load", function () {
            try {
                let doc = element.contentDocument;
                let el = doc.createElement("textarea");
                doc.body.appendChild(el);
                el.value = text;
                el.select();
                let copied = doc.execCommand("copy");
                element.remove();
                if (copied) {
                    $.ambiance({message: chrome.i18n.getMessage("notificationUrlCopied")});
                }
            } finally {
                element.remove();
            }
        });
        document.body.appendChild(element);
    }
    ,
    getFileName: function (is_format) {
        let is_video = (nimbus_screen.info.file.format === 'webm' || nimbus_screen.info.file.format === 'mp4' || nimbus_screen.info.file.format === 'gif');
        let s = is_video ? localStorage.fileNamePatternScreencast : localStorage.fileNamePatternScreenshot;
        let info = nimbus_screen.info.page;
        let url = document.createElement('a');
        url.href = info.url || '';
        s = s.replace(/\{url}/, info.url || '')
            .replace(/\{title}/, info.title || '')
            .replace(/\{domain}/, url.host || '')
            .replace(/\{date}/, info.time.split(' ')[0] || '')
            .replace(/\{time}/, info.time.split(' ')[1] || '')
            .replace(/\{ms}/, info.time.split(' ')[2] || '')
            .replace(/\{timestamp}/, info.time.split(' ')[3] || '');

        return s.replace(/[\*\|\\\:\"\<\>\?\/#]+/ig, '_') + (is_format ? '.' + nimbus_screen.info.file.format : '');
    },
    getEditCanvasSize: function () {
        let width = nimbus_screen.dom.$edit_canvas.width();
        let height = nimbus_screen.dom.$edit_canvas.height();
        if (nimbus_screen.info.first_canvas_width == null) {
            nimbus_screen.info.first_canvas_width = width;
        }
        if (nimbus_screen.info.first_canvas_height == null) {
            nimbus_screen.info.first_canvas_height = height;
        }

        return {
            w: width,
            h: height,
            fW: nimbus_screen.info.first_canvas_width,
            fH: nimbus_screen.info.first_canvas_height
        };
    },
    setImageToRedactor: function (dataURL, cb) {
        nimbus_screen.canvasManager.undoAll();
        nimbus_screen.canvasManager.loadBackgroundImage(dataURL, function () {
            $('#nsc_drop_file').addClass('nsc-hide');
            $('#nsc_canvas').removeClass('nsc-hide');
            cb && cb()
        });
    },
    setWaterMark: function (enable, cb) {
        if (localStorage.appType === 'google') return cb && cb();
        $('#nsc_enable_watermark').prop("checked", enable);

        let canvas = nimbus_screen.canvasDone;
        if (nimbus_screen.canvasManager) canvas = nimbus_screen.canvasManager.getCanvas().fon.canvas;

        nimbus_core.checkWaterMark(function (check) {
            nimbusShare.checkPremium(function (err, premium) {
                if (err || !premium.capture) enable = true;

                if (!enable || !check) {
                    if (nimbus_screen.canvasManager) {
                        nimbus_screen.canvasManager.setWaterMark();
                        return cb && cb();
                    } else {
                        let screen = new Image();
                        screen.onload = function () {
                            nimbus_screen.canvasDone.getContext('2d').drawImage(screen, 0, 0);
                            return cb && cb();
                        };
                        screen.src = nimbus_screen.info.file.image.origin_patch;
                    }
                } else {
                    nimbus_core.getWaterMark(function (watermark) {
                        let x, y, shift = 10;
                        switch (localStorage.watermarkPosition) {
                            case 'lt':
                                x = shift;
                                y = shift;
                                break;
                            case 'rt':
                                x = canvas.width - watermark.width - shift;
                                y = shift;
                                break;
                            case 'lb':
                                x = shift;
                                y = canvas.height - watermark.height - shift;
                                break;
                            case 'rb':
                                x = canvas.width - watermark.width - shift;
                                y = canvas.height - watermark.height - shift;
                                break;
                            case 'c':
                                x = Math.floor((canvas.width - watermark.width) / 2);
                                y = Math.floor((canvas.height - watermark.height) / 2);
                                break;
                        }
                        if (nimbus_screen.canvasManager) {
                            nimbus_screen.canvasManager.setWaterMark(watermark.toDataURL(), {
                                x: x,
                                y: y,
                                width: watermark.width,
                                height: watermark.height
                            }, cb);
                        } else {
                            console.log(watermark)
                            let screen = new Image();
                            screen.onload = function () {
                                nimbus_screen.canvasDone.width = screen.width;
                                nimbus_screen.canvasDone.height = screen.height;
                                nimbus_screen.canvasDone.getContext('2d').drawImage(screen, 0, 0);
                                nimbus_screen.canvasDone.getContext('2d').drawImage(watermark, x, y, watermark.width, watermark.height);
                                return cb && cb();
                            };
                            screen.src = nimbus_screen.info.file.image.origin_patch;
                        }
                    });
                }
            }, false);
        });
    },
    saveFile: function (blob, name, cb) {
        window.requestFileSystem(window.PERSISTENT, 10 * 1024 * 1024 * 1024, function (fs) {
                let truncated = false;
                fs.root.getFile(name, {create: true, exclusive: false}, function (fileEntry) {
                    fileEntry.createWriter(function (writer) {
                            writer.onwriteend = function (progress) {
                                if (!truncated) {
                                    truncated = true;
                                    this.truncate(this.position);
                                    return;
                                }
                                console.log("Write completed", blob, progress);

                                cb && cb()
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
    },
    changeWaterMark: function () {
        if (nimbus_screen.canvasManager) {
            nimbus_screen.canvasManager.done();
            nimbus_screen.setWaterMark(localStorage.watermarkEnable === 'true', function () {
                let fon = nimbus_screen.canvasManager.getCanvas().fon.canvas;
                let bg = nimbus_screen.canvasManager.getCanvas().background.canvas;

                nimbus_screen.canvasDone.width = fon.width;
                nimbus_screen.canvasDone.height = fon.height;
                nimbus_screen.canvasDone.getContext('2d').drawImage(fon, 0, 0);
                nimbus_screen.canvasDone.getContext('2d').drawImage(bg, 0, 0);

                nimbus_screen.info.file.image.patch = nimbus_screen.canvasDone.toDataURL('image/' + (nimbus_screen.info.file.format === 'jpg' ? 'jpeg' : 'png'));
                nimbus_screen.canvasDone.toBlob(function (blob) {
                    nimbus_screen.info.file.image.blob = blob;
                    nimbus_screen.view.image.preview();
                });
            })
        } else {
            let screen = new Image();
            screen.onload = function () {
                nimbus_screen.setWaterMark(localStorage.watermarkEnable === 'true', function () {
                    nimbus_screen.info.file.image.patch = nimbus_screen.canvasDone.toDataURL('image/' + (nimbus_screen.info.file.format === 'jpg' ? 'jpeg' : 'png'));
                    nimbus_screen.canvasDone.toBlob(function (blob) {
                        nimbus_screen.info.file.image.blob = blob;
                        nimbus_screen.view.image.preview();
                    });
                })
            };
            screen.src = nimbus_screen.info.file.image.origin_patch;
        }
    },
    sizeFont: function (data) {
        let body = document.getElementsByTagName("body")[0];
        let dummy = document.createElement("div");
        dummy.appendChild(document.createTextNode(data.text));
        dummy.setAttribute("style", "font-family: " + data.family + "; font-size: " + data.size + "px; float: left; white-space: nowrap; overflow: hidden;");
        body.appendChild(dummy);
        const result = {w: dummy.offsetWidth + (data.size * 0.4), h: dummy.offsetHeight};
        body.removeChild(dummy);
        return result;
    },
    initScreenPage: function (canvas) {
        nimbus_screen.canvasManager = nimbus_screen.dom.$edit_canvas.canvasPaint();
        nimbus_screen.canvasManager.loadBackgroundImage(canvas, function () {
            nimbus_screen.dom.$nsc_pre_load.addClass('nsc-hide');

            nimbus_screen.dropFileInit();

            nimbus_screen.canvasManager.changeStrokeSize(localStorage.redactorStrokeSize);
            nimbus_screen.canvasManager.changeStrokeColor(localStorage.redactorStrokeColor);
            nimbus_screen.canvasManager.changeFillColor(localStorage.redactorFillColor);
            nimbus_screen.canvasManager.changeShadow({enable: localStorage.redactorShadow === 'true', blur: localStorage.redactorShadowBlur, color: localStorage.redactorShadowColor});
            nimbus_screen.canvasManager.setEnableNumbers(localStorage.redactorEnableNumbers === 'true');
            nimbus_screen.canvasManager.setFontFamily(localStorage.redactorFontFamily);
            nimbus_screen.canvasManager.setFontSize(localStorage.redactorFontSize);
            nimbus_screen.canvasManager.undoAll();

            $(window).trigger('resize');
            $(document).trigger('ready_redactor');

            if (localStorage.appType !== 'google') {
                nimbus_screen.setWaterMark(localStorage.watermarkEnable === 'true');

                window.setTimeout(function (canvas) {
                    nimbus_screen.setWaterMark(localStorage.watermarkEnable === 'true');
                }, 0);
            }

            if (localStorage.redactorDefaultTool === undefined) {
                localStorage.redactorDefaultTool = nimbus_screen.canvasManager.getTools();
                window.nimbus_core.setOption('defaultTool', localStorage.redactorDefaultTool);
            }
            $('[data-tool-id=' + localStorage.redactorDefaultTool + ']').trigger('click');

            let event;
            $(document).on('mousemove', function (e) {
                event = e;
            }).on('keydown', function (e) {
                let k = e.keyCode;
                let hotkeysSend = JSON.parse(localStorage.hotkeysSendNS);

                if (k === 37 /*left*/ || k === 38 /*up*/ || k === 39 /*right*/ || k === 40 /*down*/) nimbus_screen.canvasManager.move(k);
                if (k === 46 || k === 8) nimbus_screen.canvasManager.delete(e);

                if (e.ctrlKey) {
                    if (k === 86) nimbus_screen.canvasManager.paste(event);
                    if (k === 67) nimbus_screen.canvasManager.copy(event);
                    if (k === 90) nimbus_screen.canvasManager.undo();
                    if (k === 89) nimbus_screen.canvasManager.redo();
                    if (k === +hotkeysSend.key) {
                        if (!nimbus_screen.dom.$nsc_done_page.is(':visible')) nimbus_screen.dom.$button_done.click();

                        $(document).one('ready_done', function () {
                            $('#nsc_send').trigger('click');
                        });
                    }
                }

                return true;
            });
        });
    }
    ,
    dropFileInit: function () {
        let setFile = function (file) {
            nimbus_screen.blobTodataURL(file, function (dataURL) {
                if (nimbus_screen.getLocationParam() === 'blank') {
                    nimbus_screen.setImageToRedactor(dataURL, function () {
                        nimbus_screen.setWaterMark(localStorage.watermarkEnable === 'true');
                    });
                } else {
                    nimbus_screen.canvasManager.loadImageObject(dataURL, {}, function () {
                        nimbus_screen.setWaterMark(localStorage.watermarkEnable === 'true');
                    });
                }
            });
        };

        $(document).on('paste', function (e) {
            if (nimbus_screen.canvasManager) {
                // e.stopPropagation();
                // e.preventDefault();
                let files = e.originalEvent.clipboardData.items;
                for (let index in files) {
                    let file = files[index];
                    if (file.kind === 'file') {
                        file = file.getAsFile();
                        setFile(file);
                    }
                }
            }

        });

        function handleFileSelect(e) {
            e.stopPropagation();
            e.preventDefault();

            let files = e.target.files || (e.dataTransfer && e.dataTransfer.files);
            if (files[0].type.match('image.*')) setFile(files[0]);
        }

        function handleDragOver(e) {
            e.stopPropagation();
            e.preventDefault();
        }

        let dropZone = document.getElementById('nsc_drop_file');
        dropZone.addEventListener('dragover', handleDragOver, false);
        dropZone.addEventListener('drop', handleFileSelect, false);

        // $('#nsc_drop_file .receiver').on('dragover', false).on('dragleave', false).on('drop', function (e) {
        //     const files = e.originalEvent.dataTransfer.files;
        //     if (files[0].type.match('image.*')) setFile(files[0]);            //
        // });

        $('#nsc_redactor_open_image').prev('input').on('change', function (e) {
            e.stopPropagation();
            e.preventDefault();

            if (this.files[0].type.match('image.*')) setFile(this.files[0]);
        });
    }
    ,
    beforeUnload: function (e) {
        let message = "Вы уверены, что хотите покинуть страницу?";
        if (typeof e === "undefined") e = window.event;
        if (e) e.returnValue = message;
        return message;
    },
    rate_popup: {
        info: function (show, date) {
            let obj = JSON.parse(localStorage.getItem('popupRate'));

            if (show !== undefined || date !== undefined) {
                obj = {show: show !== undefined ? show : obj.show, date: date !== undefined ? Date.now() : obj.date};
                localStorage.popupRate = JSON.stringify(obj);
                window.nimbus_core.setOption('popupRate', localStorage.popupRate)
            }
            return obj;
        }
        ,
        not_show_more: function () {
            nimbus_screen.rate_popup.info(false);
            $('#nsc_nimbus_rate').addClass('nsc-hide')
        }
        ,
        feedback: function () {
            nimbus_screen.rate_popup.info(false);
            if (window.nimbus_core.is_chrome) chrome.runtime.sendMessage({
                operation: 'open_page',
                'url': 'https://chrome.google.com/webstore/detail/bpconcjcammlapcogcnnelfmaeghhagj/reviews'
            });
            else chrome.runtime.sendMessage({
                operation: 'open_page',
                'url': 'https://addons.mozilla.org/en-US/firefox/addon/nimbus-screenshot/reviews/'
            });
            $('#nsc_nimbus_rate').addClass('nsc-hide')
        }
        ,
        init: function () {
            let info = nimbus_screen.rate_popup.info();
            if (info.show && +info.date + 3600 * 24 * 6 * 1000 < Date.now()) {
                nimbus_screen.rate_popup.info(true, true);
                $('#nsc_nimbus_rate').removeClass('nsc-hide')
            }
        }
    },
    account_popup: {
        init: function () {
            if (localStorage.popupAccountShow === 'true') {
                nimbusShare.server.user.authState(function (res) {
                    if (res.errorCode !== 0 || !res.body || !res.body.authorized) {
                        $('#nsc_account_popup').removeClass('nsc-hide');
                        localStorage.popupAccountShow = false;
                        window.nimbus_core.setOption('popupAccountShow', localStorage.popupAccountShow)
                    }
                });
            }
        }
    },
    togglePanel: function (panel) {
        $('#nsc_send').data('type', panel).trigger('change-type');
        $('#nsc_done_slack').css('display', panel === 'slack' ? 'flex' : 'none');
        $('#nsc_done_nimbus').css('display', panel === 'nimbus' ? 'flex' : 'none');
        $('#nsc_done_youtube').css('display', panel === 'youtube' ? 'flex' : 'none');
        localStorage.nimbusPanel = panel === 'nimbus';
        localStorage.slackPanel = panel === 'slack';
        localStorage.youtubePanel = panel === 'youtube';
        window.nimbus_core.setOption('nimbusPanel', localStorage.nimbusPanel);
        window.nimbus_core.setOption('slackPanel', localStorage.slackPanel);
        window.nimbus_core.setOption('youtubePanel', localStorage.youtubePanel);
    }
};

if (window.nimbus_core.is_chrome) {
    let service = analytics.getService('screens_chrome');
    nimbus_screen.tracker = service.getTracker('UA-67774717-13');
    nimbus_screen.tracker.sendAppView('MainView');

    nimbus_screen.SCREEN_DAY_10 = analytics.EventBuilder.builder().category('screenshot').action('screenDay10');
    nimbus_screen.SCREEN_DAY_10_FOR_MONTH = analytics.EventBuilder.builder().category('screenshot').action('screenDay10ForMonth');

    let timeMouthAgo = new Date().setMonth(new Date().getMonth() + 1);
    let timeDayAgo = new Date().setDate(new Date().getDate() + 1);

    nimbus_screen.SLACK_UPLOAD = analytics.EventBuilder.builder().category('screenshot').action('uploadSlack');
    nimbus_screen.VIDEO_USING = analytics.EventBuilder.builder().category('screenshot').action('videoUsing');
    nimbus_screen.VIDEO_CONVERT = analytics.EventBuilder.builder().category('screenshot').action('videoConvert');
    nimbus_screen.VIDEO_UPLOAD = analytics.EventBuilder.builder().category('screenshot').action('videoUpload');

    if (localStorage.statisticTimeDayAgo === undefined) localStorage.statisticTimeDayAgo = timeDayAgo;
    if (localStorage.statisticTimeMouthAgo === undefined) localStorage.statisticTimeMouthAgo = timeMouthAgo;
    if (localStorage.statisticDayScreens === undefined) localStorage.statisticDayScreens = 0;
    if (localStorage.statisticMouthScreens === undefined) localStorage.statisticMouthScreens = 0;

    if (+localStorage.statisticTimeDayAgo < new Date().setHours(0, 0, 0, 0)) {
        if (+localStorage.statisticDayScreens >= 10) {
            nimbus_screen.tracker.send(nimbus_screen.SCREEN_DAY_10);
            localStorage.statisticMouthScreens = +localStorage.statisticMouthScreens + 1;
        }
        localStorage.statisticTimeDayAgo = timeDayAgo;
        localStorage.statisticDayScreens = 0;
    }

    if (+localStorage.statisticTimeDayAgo < new Date().setMonth(new Date().getMonth())) {
        if (+localStorage.statisticMouthScreens >= 10) {
            nimbus_screen.tracker.send(nimbus_screen.SCREEN_DAY_10_FOR_MONTH);
        }
        localStorage.statisticTimeMouthAgo = timeMouthAgo;
        localStorage.statisticMouthScreens = 0;
    }
}