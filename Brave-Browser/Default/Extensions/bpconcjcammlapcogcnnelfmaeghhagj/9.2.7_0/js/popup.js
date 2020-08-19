let t = null;
let actions;

$('#capture_options').addClass('nsc-hide');
$('#record_options').addClass('nsc-hide');
$('#record_status').addClass('nsc-hide');
$('#record_setting').addClass('nsc-hide');

function setOption(key, value) {
    if (window.nimbus_core.is_chrome) return;
    chrome.runtime.sendMessage({operation: 'set_option', key: key, value: value});
}

function checkRecord() {
    chrome.runtime.sendMessage({operation: 'get_info_record'}, function (res) {
        if (res.status) {
            showTime(res.time);
            showRecordStatus();
        } else {
            showCaptureOptions();
            clearTimeout(t)
        }
        t = setTimeout(checkRecord, 500);
    });
}

async function getUserMedia() {
    $('.nsc-capture-button-media-access').addClass('nsc-hide');

    if (localStorage.videoRecordType === 'desktop') return;

    console.log(localStorage.videoMicSoundEnable !== 'false', localStorage.videoCamera !== 'false')

    if (localStorage.videoMicSoundEnable !== 'false' && localStorage.videoCamera !== 'false') {
        try {
            await window.nimbus_core.getUserMedia({audio: localStorage.videoMicSoundEnable !== 'false'});
        } catch (e) {
            return $('.nsc-capture-button-media-access').removeClass('nsc-hide').find('span span').text('Allow Webcam & Audio Permissions');
        }
    }
    if (localStorage.videoMicSoundEnable !== 'false') {
        try {
            await window.nimbus_core.getUserMedia({audio: localStorage.videoMicSoundEnable !== 'false'});
        } catch (e) {
            return $('.nsc-capture-button-media-access').removeClass('nsc-hide').find('span span').text('Allow Audio Permissions');
        }
    }
    if (localStorage.videoCamera !== 'false') {
        try {
            await window.nimbus_core.getUserMedia({video: localStorage.videoCamera !== 'false'});
        } catch (e) {
            return $('.nsc-capture-button-media-access').removeClass('nsc-hide').find('span span').text('Allow Webcam Permissions');
        }
    }
}

function showCaptureOptions() {
    $('#capture_options').removeClass('nsc-hide');
    $('#record_options').addClass('nsc-hide');
    $('#record_status').addClass('nsc-hide');
    $('#record_setting').addClass('nsc-hide');
    $('#workspaces_setting').addClass('nsc-hide');
    $('#progress_capture_option').addClass('nsc-hide');

    $('body').removeClass('resize');
}

function showRecordOptions() {
    $('#capture_options').addClass('nsc-hide');
    $('#record_options').removeClass('nsc-hide');
    $('#record_status').addClass('nsc-hide');
    $('#record_setting').addClass('nsc-hide');
    $('#workspaces_setting').addClass('nsc-hide');
    $('#progress_capture_option').addClass('nsc-hide');

    getUserMedia();

    $('body').removeClass('resize');
}

function showRecordSetting() {
    $('#capture_options').addClass('nsc-hide');
    $('#record_options').addClass('nsc-hide');
    $('#record_status').addClass('nsc-hide');
    $('#record_setting').removeClass('nsc-hide');
    $('#workspaces_setting').addClass('nsc-hide');
    $('#progress_capture_option').addClass('nsc-hide');

    $('body').removeClass('resize');
}

function showSelectWorkspace() {
    $('#capture_options').addClass('nsc-hide');
    $('#record_options').addClass('nsc-hide');
    $('#record_status').addClass('nsc-hide');
    $('#record_setting').addClass('nsc-hide');
    $('#workspaces_setting').removeClass('nsc-hide');
    $('#progress_capture_option').addClass('nsc-hide');

    $('body').removeClass('resize');
}

function showRecordStatus() {
    $('#capture_options').addClass('nsc-hide');
    $('#record_options').addClass('nsc-hide');
    $('#record_status').removeClass('nsc-hide');
    $('#record_setting').addClass('nsc-hide');
    $('#workspaces_setting').addClass('nsc-hide');
    $('#progress_capture_option').addClass('nsc-hide');

    $('body').addClass('resize');
}

function showCaptureProgress() {
    $('#capture_options').addClass('nsc-hide');
    $('#record_options').addClass('nsc-hide');
    $('#record_status').addClass('nsc-hide');
    $('#record_setting').addClass('nsc-hide');
    $('#workspaces_setting').addClass('nsc-hide');
    $('#progress_capture_option').removeClass('nsc-hide');

    $('body').removeClass('resize');
}

function showTime(date) {
    let time = new Date(date),
        m = time.getUTCMonth(),
        d = time.getUTCDate() - 1,
        h = time.getUTCHours(),
        M = time.getUTCMinutes(),
        s = time.getUTCSeconds(),
        time_str = '';
    if (m > 0) time_str += ('0' + m).slice(-2) + ':';
    if (d > 0) time_str += ('0' + d).slice(-2) + ':';
    if (h > 0) time_str += ('0' + h).slice(-2) + ':';
    time_str += ('0' + M).slice(-2) + ':';
    time_str += ('0' + s).slice(-2);

    $('#record_time').text(time_str);
}

function handleError(error) {
    console.log('navigator.getUserMedia error: ', error);
}

function setDevices(devices) {
    let $camera = $('select[name=selected-video-camera]');
    let $microphone = $('select[name=selected-microphone]');
    let mic_is = false, cam_is = false;

    for (let i = 0; i !== devices.length; ++i) {
        const device = devices[i];
        let $option = $('<option>').val(device.deviceId);
        if (device.kind === 'audioinput') {
            if (localStorage.selectedMicrophone === device.deviceId) {
                $option.attr('selected', 'selected');
                mic_is = true;
            }
            $microphone.append($option.text(device.label));
        } else if (device.kind === 'videoinput') {
            if (localStorage.selectedVideoCamera === device.deviceId) {
                $option.attr('selected', 'selected');
                cam_is = true;
            }
            $camera.append($option.text(device.label));
        } else {
            console.log('Some other kind of source/device: ', device);
        }
    }

    if (!mic_is) localStorage.removeItem('selectedMicrophone');
    if (!cam_is) localStorage.removeItem('selectedVideoCamera');
}

$(document).ready(function () {
    const main_menu_item = JSON.parse(localStorage.appMenuItem);

    $("button").on('click', function () {
        switch (this.name) {
            case 'capture-visible':
            case 'capture-fragment':
            case 'capture-fragment-scroll':
            case 'capture-selected':
            case 'capture-delayed':
            case 'capture-scroll':
            case 'capture-entire':
            case 'capture-window':
            case 'capture-blank':

                if (this.name === 'capture-fragment-scroll' && localStorage.captureFragmentScrollWelcome !== "true") {
                    chrome.runtime.sendMessage({operation: 'content_popup', action: 'nsc_popup_fragment_scroll_welcome_open'});
                    localStorage.captureFragmentScrollWelcome = true;
                    window.close();
                    return false;
                }

                if (localStorage.quickCapture === 'true') {
                    chrome.runtime.sendMessage({operation: 'content_automation', action: 'image', type: this.name, auth: localStorage.enableEdit});
                } else {
                    chrome.runtime.sendMessage({operation: 'activate_capture', value: this.name});
                }

                if (this.name === 'capture-entire') showCaptureProgress();

                break;
            case 'nimbus-capture-desktop':
                if (window.nimbus_core.is_chrome) {
                    if (window.navigator.language === 'ru') {
                        chrome.runtime.sendMessage({
                            operation: 'open_page',
                            'url': 'https://nimbusweb.me/aredirect.php?url=https://chrome.google.com/webstore/detail/web-clipper-nimbus/kiokdhlcmjagacmcgoikapbjmmhfchbi?hl=ru&utm_source=nimbus&utm_medium=extension_menu&utm_campaign=capture_chrome_en'
                        });
                    } else {
                        chrome.runtime.sendMessage({
                            operation: 'open_page',
                            'url': 'https://nimbusweb.me/aredirect.php?url=https://chrome.google.com/webstore/detail/web-clipper-nimbus/kiokdhlcmjagacmcgoikapbjmmhfchbi?hl=en&utm_source=nimbus&utm_medium=extension_menu&utm_campaign=capture_chrome_ru'
                        });
                    }
                } else {
                    if (window.navigator.language === 'ru') {
                        chrome.runtime.sendMessage({operation: 'open_page', 'url': 'https://nimbusweb.me/ru/clipper.php'});
                    } else {
                        chrome.runtime.sendMessage({operation: 'open_page', 'url': 'https://nimbusweb.me/clipper.php'});
                    }
                }

                localStorage.captureButtonAdvertising = true;
                $(this).addClass('nsc-hide');
                break;
            case 'open-option':
                chrome.runtime.sendMessage({operation: 'open_page', 'url': 'options.html'});
                break;
            case 'capture-video':
                showRecordOptions();
                break;
            case 'back-to-capture':
                showCaptureOptions();
                break;
            case 'back-to-capture-setting':
                showRecordOptions();
                break;
            case 'record-start':
                localStorage.typeCaptureStream = false;
                localStorage.videoCountdown = $('#video_countdown').val();
                setOption('videoCountdown', localStorage.videoCountdown);
                setOption('videoStream', localStorage.videoStream);

                if (localStorage.quickVideoCapture === 'true') {
                    chrome.runtime.sendMessage({operation: 'content_automation', action: 'video', type: $('input[name=record-type]:checked').val(), auth: localStorage.enableVideoEdit});
                } else {
                    chrome.runtime.sendMessage({operation: 'activate_record', 'key': 'start'});
                }
                break;
            case 'record-stream-start':
                // if (localStorage.streamWelcome !== "true") {
                //     localStorage.typeCaptureStream = false;
                //     localStorage.streamWelcome = true;
                //     chrome.runtime.sendMessage({operation: 'content_popup', action: 'nsc_popup_streamwelcome_open'});
                // } else {
                localStorage.typeCaptureStream = true;
                localStorage.videoCountdown = $('#video_countdown').val();
                setOption('videoCountdown', localStorage.videoCountdown);
                setOption('videoStream', localStorage.videoStream);
                chrome.runtime.sendMessage({operation: 'activate_record', 'key': 'start'});
                // }
                break;
            case 'record-stop':
                chrome.runtime.sendMessage({operation: 'activate_record', 'key': 'stop'});
                break;
            case 'record-pause':
                chrome.runtime.sendMessage({operation: 'activate_record', 'key': 'pause'});
                chrome.runtime.sendMessage({operation: 'get_info_record'}, function (res) {
                    $('button[name=record-pause] .nsc-button-layout').text(res.state === 'recording' ? chrome.i18n.getMessage("popupBtnStopPause") : chrome.i18n.getMessage("popupBtnStopResume"));
                });
                break;
            case 'video-setting':
                showRecordSetting();
                break;
            case 'select-workspace':
                nimbusShare.server.user.authState(function (res) {
                    if (res.errorCode === 0 && res.body && res.body.authorized) {
                        nimbusShare.server.workspaces.getAll(null, function (err, res) {
                            $('#workspaces_list').empty().append(function () {
                                let $workspaces = [];

                                for (let i = 0, len = res.body.workspaces.length; len > i; i++) {
                                    let workspace = res.body.workspaces[i];

                                    if (workspace.access && workspace.access.role === 'reader') continue;

                                    let destruction = '';
                                    if (workspace.org.type === 'business') {
                                        destruction = workspace.user.email; // бизнес проекты (пишем емайл овнера).
                                    } else {
                                        if (workspace.access === undefined) {
                                            if (workspace.countMembers > 0) destruction = workspace.countMembers + (window.navigator.language === 'ru' ? ' пользователей' : ' users'); // персональные шаренные (пищем количество мемберов)
                                            else destruction = window.navigator.language === 'ru' ? 'Персональный проект' : 'Personal Workspace'; // персональными (пишем Personal)
                                        } else {
                                            destruction = workspace.org.user.username; // шаренные (пишем владельца проекта)
                                        }
                                    }

                                    $workspaces.push(
                                        $('<div class="nsc-workspace-item">').data('id', workspace.globalId).attr('id', workspace.globalId).attr('isDefault', (workspace.isDefault && workspace.access === undefined)).append([
                                            $('<div class="nsc-workspace-logo">').text(workspace.title[0]),
                                            $('<div class="nsc-workspace-info">').append([
                                                $('<div class="nsc-workspace-title">').text(workspace.title),
                                                $('<div class="nsc-workspace-destruction">').text(destruction)
                                            ])
                                        ]).on('click', function () {
                                            localStorage.numbusWorkspaceSelect = $(this).data('id');
                                            $('.nsc-workspace-item').removeClass('select').filter(this).addClass('select');
                                        }).addClass(function () {
                                            return $(this).data('id') === localStorage.numbusWorkspaceSelect ? 'select' : '';
                                        })
                                    )
                                }

                                return $workspaces;
                            });

                            if (localStorage.numbusWorkspaceSelect === 'false') {
                                $('.nsc-workspace-item[isDefault=true]').addClass('select');
                            } else {
                                $('.nsc-workspace-item[id=' + localStorage.numbusWorkspaceSelect + ']').addClass('select');
                            }

                            showSelectWorkspace();
                        });
                    } else {
                        chrome.runtime.sendMessage({operation: 'content_popup', action: 'nsc_popup_login_open'});
                        window.close();
                    }
                });
                break;
            case 'open-help':
                if (window.navigator.language === 'ru') {
                    chrome.runtime.sendMessage({
                        operation: 'open_page',
                        'url': 'https://s.nimbusweb.me/share/3552315/yqgen0wi63dg5mpi5tqi'
                    });
                } else {
                    chrome.runtime.sendMessage({
                        operation: 'open_page',
                        'url': 'https://s.nimbusweb.me/share/3552243/xxvg33d1kcr7thhgtoua'
                    });
                }
                break;
            case 'open-record-want-help':
                chrome.runtime.sendMessage({
                    operation: 'open_page',
                    'url': 'https://s.nimbusweb.me/share/3267935/99q972riouoi0b4fs19s'
                });
                break;
            case 'open-private-upload-help':
                chrome.runtime.sendMessage({
                    operation: 'open_page',
                    'url': 'https://s.nimbusweb.me/share/3267939/40p7p3pmtp7q4yhz63vd'
                });
                break;
            case 'open-extensions':
                chrome.runtime.sendMessage({operation: 'open_page', 'url': 'chrome://extensions/?id=bpconcjcammlapcogcnnelfmaeghhagj'});
                break;
            case 'open-nimbus-client':
                chrome.runtime.sendMessage({operation: 'open_page', 'url': 'https://nimbusweb.me/client/?utm_source=capture&utm_medium=addon&utm_campaign=my_uploads'});
                break;
            case 'open-media-access':
                chrome.runtime.sendMessage({operation: 'content_media_access', access: false});
                break;
            case 'reset-video-setting':
                localStorage.videoResolution = 'hd';
                localStorage.videoBitrate = '4000000';
                localStorage.videoAudioBitrate = '96000';
                localStorage.videoFps = '24';
                localStorage.videoDrawingToolsDelete = '6';

                setOption('videoResolution', localStorage.videoResolution);
                setOption('videoBitrate', localStorage.videoBitrate);
                setOption('videoAudioBitrate', localStorage.videoAudioBitrate);
                setOption('videoFps', localStorage.videoFps);
                setOption('videoDrawingToolsDelete', localStorage.videoDrawingToolsDelete);

                $("input[name=video-size]").prop('checked', false).filter('[value=' + localStorage.videoResolution + ']').prop('checked', true);
                $("select[name=audio-bitrate]").val(localStorage.videoAudioBitrate);
                $("select[name=video-bitrate]").val(localStorage.videoBitrate);
                $("select[name=video-fps]").val(localStorage.videoFps);
                $("select[name=delete-drawing]").val(localStorage.videoDrawingToolsDelete);
                break;
            case 'upload-option-show':
                $("html, body").stop().animate({scrollTop: 1000}, 500, 'swing');
                $('#nsc_capture_upload_options').stop().slideDown(500, 'swing');

                $('button[name=upload-option-hide]').removeClass('nsc-hide');
                $('button[name=upload-option-show]').addClass('nsc-hide');
                break;
            case 'upload-option-hide':
                $('#nsc_capture_upload_options').stop().slideUp(500, 'swing');
                $('button[name=upload-option-hide]').addClass('nsc-hide');
                $('button[name=upload-option-show]').removeClass('nsc-hide');
                break;
            case 'stop-capture':
                chrome.runtime.sendMessage({operation: 'content_message', message: {operation: 'content_stop_capture'}});
                break;
        }

        if ($(this).data('closeWindow')) {
            window.close();
        }
    });

    $("input").on('change', function () {
        switch (this.name) {
            case 'record-type':
                localStorage.videoRecordType = $(this).val();
                setOption('videoRecordType', localStorage.videoRecordType);
                getUserMedia();

                if ($(this).val() === 'desktop' || $(this).val() === 'camera') {
                    $('input[name=record-tab-sound]').prop("checked", false).prop("disabled", true).closest('.nsc-capture-switcher').attr('title', chrome.i18n.getMessage("notificationDesktopTabSound")).addClass('disabled');
                    $('input[name=show-drawing-tools]').prop("checked", false).prop("disabled", true).closest('.nsc-capture-switcher').attr('title', chrome.i18n.getMessage("notificationDesktopCursorAnimation")).addClass('disabled');
                    // if (localStorage.videoRecordType !== 'desktop')
                        $('input[name=record-camera]').prop("checked", false).prop("disabled", true).closest('.nsc-capture-switcher').attr('title', chrome.i18n.getMessage("notificationDesktopCursorAnimation")).addClass('disabled');
                } else {
                    $('input[name=record-tab-sound]').prop("checked", localStorage.videoTabSoundEnable !== 'false').prop("disabled", false).closest('.nsc-capture-switcher').attr('title', '').removeClass('disabled');
                    $('input[name=show-drawing-tools]').prop("checked", localStorage.videoDrawingToolsEnable !== 'false').prop("disabled", false).closest('.nsc-capture-switcher').attr('title', '').removeClass('disabled');
                    $('input[name=record-camera]').prop("checked", localStorage.videoCamera !== 'false').prop("disabled", false).closest('.nsc-capture-switcher').attr('title', '').removeClass('disabled');
                }
                break;
            case 'record-mic':
                localStorage.videoMicSoundEnable = $(this).prop("checked");
                setOption('videoMicSoundEnable', localStorage.videoMicSoundEnable);
                getUserMedia();
                break;
            case 'record-camera':
                localStorage.videoCamera = $(this).prop("checked");
                setOption('videoCamera', localStorage.videoCamera);
                getUserMedia();
                break;
            case 'record-tab-sound':
                localStorage.videoTabSoundEnable = $(this).prop("checked");
                setOption('videoTabSoundEnable', localStorage.videoTabSoundEnable);
                break;
            case 'show-drawing-tools':
                localStorage.videoDrawingToolsEnable = $(this).prop("checked");
                setOption('videoDrawingToolsEnable', localStorage.videoDrawingToolsEnable);
                break;
            case 'enable-watermark':
                if (localStorage.watermarkEnable === 'false' || (localStorage.watermarkFile === '' && localStorage.watermarkType === 'image')) {
                    $(this).prop("checked", false);
                    chrome.runtime.sendMessage({operation: 'open_page', 'url': 'options.html?watermark'});
                } else {
                    localStorage.watermarkEnable = $(this).prop("checked");
                    window.nimbus_core.setOption('watermarkEnable', localStorage.watermarkEnable);
                }
                break;
            case 'record-to-gif':
                localStorage.recordToGif = $(this).prop("checked");
                setOption('recordToGif', localStorage.recordToGif);
                break;
            case 'video-size':
                localStorage.videoResolution = $(this).val();
                setOption('videoResolution', localStorage.videoResolution);
                break;
            case 'video-re-encoding':
                localStorage.videoReEncoding = $(this).prop("checked");
                setOption('videoReEncoding', localStorage.videoReEncoding);
                break;
            case 'private-upload-video':
                localStorage.videoPrivateUploadEnable = $(this).prop("checked");
                setOption('videoPrivateUploadEnable', localStorage.videoPrivateUploadEnable);
                break;

        }
    }).filter('[name=record-mic]').prop('checked', localStorage.videoMicSoundEnable !== 'false').end()
        .filter('[name=record-camera]').prop('checked', localStorage.videoCamera !== 'false').end()
        .filter('[name=record-tab-sound]').prop('checked', localStorage.videoTabSoundEnable !== 'false').end()
        .filter('[name=show-drawing-tools]').prop('checked', localStorage.videoDrawingToolsEnable !== 'false').end()
        .filter('[name=enable-watermark]').prop('checked', localStorage.watermarkEnable !== 'false').end()
        .filter('[name=record-to-gif]').prop('checked', localStorage.recordToGif !== 'false').end()
        .filter('[name=video-re-encoding]').prop('checked', localStorage.videoReEncoding !== 'false').end()
        .filter('[name=private-upload-video]').prop('checked', localStorage.videoPrivateUploadEnable !== 'false').end()
        .filter('[name=record-type][value=' + localStorage.videoRecordType + ']').prop('checked', true).end()
        .filter('[name=video-size][value=' + localStorage.videoResolution + ']').prop('checked', true).end();

    if (localStorage.videoRecordType === 'desktop' || localStorage.videoRecordType === 'camera') {
        $('input[name=record-tab-sound]').prop("checked", false).prop("disabled", true).closest('.nsc-capture-switcher').attr('title', chrome.i18n.getMessage("notificationDesktopTabSound")).addClass('disabled');
        $('input[name=show-drawing-tools]').prop("checked", false).prop("disabled", true).closest('.nsc-capture-switcher').attr('title', chrome.i18n.getMessage("notificationDesktopCursorAnimation")).addClass('disabled');
        // if (localStorage.videoRecordType !== 'desktop')
            $('input[name=record-camera]').prop("checked", false).prop("disabled", true).closest('.nsc-capture-switcher').attr('title', chrome.i18n.getMessage("notificationDesktopCursorAnimation")).addClass('disabled');
    }

    if (localStorage.quickVideoStreamMenuEnable === 'true' && localStorage.appType !== 'google') {
        $('.nsc-video-stream-menu-enable').removeClass('nsc-hide')
    }

    $("select[name=record-video-core]").val(localStorage.recordVideoCore).on("change", function (e) {
        localStorage.recordVideoCore = e.target.value;
        setOption('recordVideoCore', localStorage.recordVideoCore);
    });

    $("select[name=record-audio-core]").val(localStorage.recordAudioCore).on("change", function (e) {
        localStorage.recordAudioCore = e.target.value;
        setOption('recordAudioCore', localStorage.recordAudioCore);
    });

    $("select[name=audio-bitrate]").val(localStorage.videoAudioBitrate).on("change", function (e) {
        localStorage.videoAudioBitrate = e.target.value;
        setOption('videoAudioBitrate', localStorage.videoAudioBitrate);
    });

    $("select[name=video-bitrate]").val(localStorage.videoBitrate).on("change", function (e) {
        localStorage.videoBitrate = e.target.value;
        setOption('videoBitrate', localStorage.videoBitrate);
    });

    $("select[name=video-fps]").val(localStorage.videoFps).on("change", function (e) {
        localStorage.videoFps = e.target.value;
        setOption('videoFps', localStorage.videoFps);
    });

    $("select[name=edit-before]").val(localStorage.enableEdit).on("change", function (e) {
        localStorage.enableEdit = e.target.value;
        setOption('enableEdit', localStorage.enableEdit);
    });

    $("select[name=delete-drawing]").val(localStorage.videoDrawingToolsDelete).on("change", function (e) {
        localStorage.videoDrawingToolsDelete = e.target.value;
        setOption('videoDrawingToolsDelete', localStorage.videoDrawingToolsDelete);
    });

    $("select[name=selected-video-camera]").on("change", function (e) {
        localStorage.selectedVideoCamera = e.target.value;
        setOption('selectedVideoCamera', localStorage.selectedVideoCamera);
    });

    $("select[name=selected-microphone]").on("change", function (e) {
        localStorage.selectedMicrophone = e.target.value;
        setOption('selectedMicrophone', localStorage.selectedMicrophone);
    });

    $('#video_countdown').val(localStorage.videoCountdown).on('input', function () {
        if (this.value < 0) this.value = 0;
        if (this.value > 9999) this.value = 9999;
        localStorage.videoCountdown = this.value;
        setOption('videoCountdown', localStorage.videoCountdown);
    });

    $('#nsc_open_option_watermark').on('click', function () {
        chrome.runtime.sendMessage({operation: 'open_page', 'url': 'options.html?watermark'});
    });

    navigator.mediaDevices.enumerateDevices().then(setDevices).catch(handleError);

    let hotkeys = JSON.parse(localStorage.appHotkeys);
    let hotkeys_assoc = {
        49: '1',
        50: '2',
        51: '3',
        52: '4',
        53: '5',
        54: '6',
        55: '7',
        56: '8',
        57: '9',
        65: 'A',
        66: 'B',
        67: 'C',
        68: 'D',
        69: 'E',
        70: 'F',
        71: 'G',
        72: 'H',
        73: 'I',
        74: 'J',
        75: 'K',
        76: 'L',
        77: 'M',
        78: 'N',
        79: 'O',
        80: 'P',
        81: 'Q',
        82: 'R',
        83: 'S',
        84: 'T',
        85: 'U',
        86: 'V',
        87: 'W',
        88: 'X',
        89: 'Y',
        90: 'Z',
        0: false,
    };

    for (let key in hotkeys) {
        let hk = 'Ctrl+Shift+';
        if (window.nimbus_core.is_macintosh) hk = '⌘+Shift+';
        if (hotkeys[key]) $('[name=capture-' + key + ']').attr({'data-i18n': hk + hotkeys_assoc[hotkeys[key]], 'data-i18n-attr': 'title'})
    }

    if (window.nimbus_core.is_chrome) {
        chrome.commands.getAll(function (commands) {
            for (let command of commands) {
                $('[data-command-name="' + command.name + '"]').text(command.shortcut)
            }
        });
    }

    $('*[data-i18n]').each(function () {
        $(this).on('restart-i18n', function () {
            const text = chrome.i18n.getMessage($(this).data('i18n')) || $(this).data('i18n');
            const attr = $(this).data('i18nAttr');
            if (attr && text) {
                $(this).attr(attr, text);
            } else if (text) {
                $(this).html(text);
            }
        }).trigger('restart-i18n');
    });

    $('[data-i18n-attr="title"]').not('[data-i18n="popupAutoDeleteDrawingDescription"]').tooltip({
        position: {my: "center top+10", at: "center bottom"},
        show: {
            delay: 2000,
            duration: 0
        }
    }).end().filter('[data-i18n="popupAutoDeleteDrawingDescription"]').tooltip({
        disabled: true,
        close: function (event, ui) {
            $(this).tooltip('disable');
        }
    }).on("click", function () {
            $(this).tooltip('enable').tooltip('open');
        }
    );

    // if (!localStorage.captureButtonAdvertising) {
    //     $('.nsc-capture-button-advertising').removeClass('nsc-hide');
    // }

    for (let key in main_menu_item) {
        if (!main_menu_item[key]) {
            $('button[name=\'capture-' + key + '\']').addClass('nsc-hide')
        }
    }

    chrome.runtime.onMessage.addListener(function (request) {
        console.log('request', request);
        if (request.operation === 'check_tab_action' && request.action === 'back_is_page') {
            actions = JSON.parse(request.value);

            chrome.extension.isAllowedFileSchemeAccess(function (access) {
                if (/^file/.test(actions.url) && !access) {
                    $('#capture_options').addClass('nsc-hide');
                    $('#capture_message').removeClass('nsc-hide');
                    return true;
                }
            });

            let $nsc_button_main = $('.nsc-button-main');

            if (actions.chrome) {
                $nsc_button_main.not('[name=capture-window], [name=capture-blank], [name=capture-video], [name=nimbus-capture-desktop]').attr('disabled', 'disabled').css({opacity: 0.5});
                $('input[name=record-type][value=desktop]').prop('checked', true);
                localStorage.videoRecordType = 'desktop';


                $('input[name=record-type][value=tab]').attr('disabled', 'disabled').closest('.nsc-capture-flag').css({opacity: 0.5});
                $('input[name=record-type][value=camera]').attr('disabled', 'disabled').closest('.nsc-capture-flag').css({opacity: 0.5});
                $('input[name=record-tab-sound]').attr('disabled', 'disabled').closest('.nsc-capture-switcher').css({opacity: 0.5});
                // $('input[name=record-camera]').attr('disabled', 'disabled').closest('.nsc-capture-switcher').css({opacity: 0.5});
                $('input[name=show-drawing-tools]').attr('disabled', 'disabled').closest('.nsc-capture-switcher').css({opacity: 0.5});
                if (localStorage.appType === 'google') {
                    $('input[name=enable-watermark]').attr('disabled', 'disabled').closest('.nsc-capture-switcher').css({opacity: 0.5});
                }
            }
            if (actions.fragment) $nsc_button_main.attr('disabled', 'disabled').not('[name=capture-fragment]').css({opacity: 0.5});
            if (actions.crop) $nsc_button_main.attr('disabled', 'disabled').not('[name=capture-area]').css({opacity: 0.5});
            if (actions.scroll_crop) $nsc_button_main.attr('disabled', 'disabled').not('[name=capture-scroll]').css({opacity: 0.5});
        }

        if (request.operation === 'content_capture_fragment_scroll_detected') {
            $('button[name=capture-fragment-scroll]').removeClass('nsc-hide')
        }

        if (request.operation === 'content_capture_area') {
            showCaptureProgress();
            let percent = Math.floor(request.offset / request.pageHeight * 100);
            $('#progress_capture_line').width(percent + '%');
            $('#progress_capture_text').text(percent + '%');

            if (request.offset > 5000) $('button[name=stop-capture]').removeClass('nsc-hide');
            if (request.status === 'finish') window.close();
        }
    });

    chrome.runtime.sendMessage({operation: 'get_quick_capture'}, function (res) {
        if (nimbus_core.is_chrome) {
            chrome.runtime.sendMessage({operation: 'get_info_record'}, function (record) {
                if (res.quick_capture !== 'false' && !record.status && !res.entire_status) {
                    $('button[name=\'capture-' + res.quick_capture_type + '\']').click();
                } else {
                    if (res.quick_video_capture !== 'false') {
                        if (record.status) {
                            checkRecord();
                        } else {
                            showRecordOptions();
                        }
                    } else if (record.status) {
                        checkRecord();
                    } else {
                        if (res.entire_status) $('#progress_capture_option').addClass('nsc-hide');
                        else $('#capture_options').removeClass('nsc-hide');
                    }

                    $('button[name=record-pause] .nsc-button-layout').text(record.state === 'recording' ? chrome.i18n.getMessage("popupBtnStopPause") : chrome.i18n.getMessage("popupBtnStopResume"));
                }
            });
        } else {
            if (res.quick_capture !== 'false' && !res.entire_status) {
                $('button[name=\'capture-' + res.quick_capture_type + '\']').click();
            } else {
                if (res.entire_status) $('#progress_capture_option').addClass('nsc-hide');
                else $('#capture_options').removeClass('nsc-hide');
            }
        }

    });

    chrome.runtime.sendMessage({operation: 'check_tab_action', 'action': 'insert_page'});

    chrome.tabs.query({active: true, lastFocusedWindow: true}, function (tabs) {
        for (let i = 0; i < tabs.length; i++) chrome.tabs.sendMessage(tabs[i].id, {operation: 'content_capture_fragment_scroll_search'});
    });

    // chrome.runtime.sendMessage({operation: 'content_popup', action: 'nsc_popup_streamstart_open'});
    // chrome.runtime.sendMessage({operation: 'content_popup', action: 'nsc_popup_limittime_stream'});

    if (localStorage.appType === 'google') {
        $('.nsc-capture-my .nsc-button').addClass('nsc-hide');
        $('select[name=edit-before] option[value=nimbus]').addClass('nsc-hide');
        $('select[name=edit-before] option[value=dropbox]').addClass('nsc-hide');
        $('select[name=edit-before] option[value=quick]').addClass('nsc-hide');
        $('input[name=video-re-encoding]').closest('.nsc-capture-flag').addClass('nsc-hide');
    }

    $('#capture_options').addClass('nsc-hide');
    $('#record_options').addClass('nsc-hide');
    $('#record_status').addClass('nsc-hide');
    $('#record_setting').addClass('nsc-hide');
    $('#workspaces_setting').addClass('nsc-hide');
    $('#progress_capture_option').addClass('nsc-hide');
});