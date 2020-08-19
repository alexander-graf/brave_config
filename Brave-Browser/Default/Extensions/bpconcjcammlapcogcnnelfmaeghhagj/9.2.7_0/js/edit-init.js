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

console.time('start');




$(function () {
    nimbus_screen.dom.$nsc_redactor_page = $('#nsc_redactor_page');
    nimbus_screen.dom.$nsc_video_page = $('#nsc_video_page');
    nimbus_screen.dom.$nsc_done_page = $('#nsc_done_page');
    nimbus_screen.dom.$nsc_linked = $('#nsc_linked');
    nimbus_screen.dom.$edit_canvas = $("#nsc_canvas");
    // nimbus_screen.dom.$origin_image = $('#nsc_origin_image');
    nimbus_screen.dom.$button_done = $("#nsc_done");
    nimbus_screen.dom.$app_title = $('#nsc_main_title span span');
    nimbus_screen.dom.$preview_loading = $('#nsc_preview_loading');
    nimbus_screen.dom.$nsc_indicator = $('#nsc_indicator');
    nimbus_screen.dom.$nsc_drop_file = $('#nsc_drop_file');
    nimbus_screen.dom.$nsc_pre_load = $('#nsc_pre_load');
    nimbus_screen.dom.$nsc_capture_desktop = $('#nsc_redactor_capture_desktop, #nsc_capture_desktop');
    nimbus_screen.dom.$nsc_capture_helper = $('#nsc_capture_helper');

    nimbus_screen.dom.$nsc_linked.find('input').on('focus', function () {
        $(this).select();
    });

    nimbus_screen.dom.$button_done.on('click', nimbus_screen.view.done);

    if (nimbus_screen.getLocationParam() === 'video') {
        nimbus_screen.view.done();
    } else {
        nimbus_screen.dom.$nsc_pre_load.removeClass('nsc-hide');

        chrome.runtime.sendMessage({operation: 'get_file_parts'}, function (res) {
            window.nimbus_core.createCanvasParts(nimbus_screen.info.file.image.info, res.parts, function (canvas, blob) {
                nimbus_screen.info.file.image.patch = canvas.toDataURL('image/' + (nimbus_screen.info.file.image.format === 'jpg' ? 'jpeg' : 'png'));
                nimbus_screen.info.file.image.origin_patch = canvas.toDataURL('image/' + (nimbus_screen.info.file.image.format === 'jpg' ? 'jpeg' : 'png'));
                nimbus_screen.info.file.image.blob = blob;

                switch (nimbus_screen.getLocationParam()) {
                    case 'done':
                        nimbus_screen.view.done();
                        break;
                    case 'nimbus':
                        nimbus_screen.view.done();
                        $('#nsc_button_nimbus').click();
                        break;
                    case 'slack':
                        nimbus_screen.view.done();
                        $('#nsc_button_slack').click();
                        break;
                    case 'google':
                        nimbus_screen.view.done();
                        $('#nsc_button_google_drive').click();
                        break;
                    case 'print':
                        nimbus_screen.view.done();
                        $('#nsc_button_print').click();
                        break;
                    case 'pdf':
                        nimbus_screen.view.done();
                        break;
                    case 'quick':
                        nimbus_screen.view.done();
                        $('#nsc_button_quick_upload').click();
                        break;
                    case 'blank':
                        nimbus_screen.dom.$nsc_pre_load.addClass('nsc-hide');
                        nimbus_screen.dom.$edit_canvas.addClass('nsc-hide');
                        nimbus_screen.dom.$nsc_drop_file.removeClass('nsc-hide');
                        if (window.nimbus_core.is_chrome) nimbus_screen.dom.$nsc_capture_desktop.removeClass('nsc-hide');
                        if (localStorage.popupHelperShow !== 'true') nimbus_screen.dom.$nsc_capture_helper.fadeIn(100);
                        nimbus_screen.dom.$nsc_redactor_page.removeClass('nsc-hide');
                        nimbus_screen.initScreenPage(canvas);
                        break;
                    default:
                        if (localStorage.enableEdit !== 'edit') {
                            nimbus_screen.view.done();
                            $(document).one('ready_done', function () {
                                switch (localStorage.enableEdit) {
                                    case 'nimbus':
                                        $('#nsc_button_nimbus').click();
                                        break;
                                    case 'google':
                                        $('#nsc_button_google_drive').click();
                                        break;
                                    case 'dropbox':
                                        $('#nsc_button_dropbox').click();
                                        break;
                                    case 'quick':
                                        $('#nsc_button_quick_upload').click();
                                        break;
                                }
                            });
                        } else {
                            nimbus_screen.dom.$nsc_pre_load.removeClass('nsc-hide');
                            nimbus_screen.dom.$nsc_redactor_page.removeClass('nsc-hide');
                            nimbus_screen.initScreenPage(canvas);
                            break;
                        }
                }
            });
        });
    }

    $('#hotkeys_send_ns').text('(Ctrl+' + JSON.parse(localStorage.hotkeysSendNS).title + ')');

    $('#nsc_capture_helper button').on('click', function () {
        nimbus_screen.dom.$nsc_capture_helper.fadeOut(100);
        localStorage.popupHelperShow = true;
    });

    $('*[data-i18n]').each(function () {
        // $(this).on('restart-i18n', function () {
        let text = chrome.i18n.getMessage($(this).data('i18n'));
        let attr = $(this).data('i18nAttr');
        if (attr && text) {
            $(this).attr(attr, text);
        } else if (text) {
            $(this).html(text);
        }
        // }).trigger('restart-i18n');
    });

    $('[data-i18n-attr="title"]').tooltip({
        position: {my: "center top+10", at: "center bottom"},
    }).on('click', function () {
        $(this).blur();
        $('.ui-tooltip').fadeOut('fast', function () {
            $('.ui-tooltip').remove();
        });
    });

    if (nimbus_screen.getLocationParam() === 'video') {
        $('#nimbus_help_link').attr('href', 'https://nimbusweb.me/s/share/' + (window.navigator.language === 'ru' ? '3552315/yqgen0wi63dg5mpi5tqi?utm_source=capture&utm_medium=addon&utm_campaign=edit_page' : '3552243/xxvg33d1kcr7thhgtoua?utm_source=capture&utm_medium=addon&utm_campaign=edit_page'));
    } else {
        $('#nimbus_help_link').attr('href', 'https://nimbusweb.me/s/share/' + (window.navigator.language === 'ru' ? '3552389/f4vdbtq17l1zmkrhs5n1?utm_source=capture&utm_medium=addon&utm_campaign=edit_page' : '3552387/mp8nr3ee75mtgyqfonnc?utm_source=capture&utm_medium=addon&utm_campaign=edit_page'));
    }

    $(window).on('resize', function () {
        if (nimbus_screen.canvasManager) nimbus_screen.canvasManager.zoom(true);

        const height = $('#nsc_redactor_panel').height() + 10;
        $('#nsc_redactor_page').css({'paddingTop': height});

        let indicator_width = 550;
        if (nimbus_screen.getLocationParam() === 'video') {
            let $nsc_stream_video = $('#nsc_stream_video');
            if ($nsc_stream_video.width() > indicator_width) indicator_width = $nsc_stream_video.width();
        } else {
            let $nsc_preview_img = $('#nsc_preview_img');
            if ($nsc_preview_img.width() > indicator_width) indicator_width = $nsc_preview_img.width();
        }
        $('#nsc_indicator').css({'max-width': indicator_width});
    });

    $(window).on('beforeunload', nimbus_screen.beforeUnload).click();

    chrome.runtime.onMessage.addListener(function (request) {
        if (request.operation === 'shortcut_load_to_ns_change') {
            $('#hotkeys_send_ns').text('(Ctrl+' + JSON.parse(localStorage.hotkeysSendNS).title + ')');
        }

        if (request.operation === 'event' && nimbus_screen.getLocationParam() !== 'video') {
            switch (request.type) {
                case 'enable-watermark':
                case 'type-watermark':
                case 'percent-watermark':
                case 'alpha-watermark':
                case 'font-watermark':
                case 'size-watermark':
                case 'text-watermark':
                case 'file-watermark':
                case 'color-watermark':
                case 'position-watermark':
                    nimbus_screen.changeWaterMark();
                    break;
            }
        }
    });

    if (window.nimbus_core.is_firefox) {
        $('#nsc_popup_premium').width('320px');
    }

    if (localStorage.appType === 'google') {
        $('#nsc_button_nimbus').addClass('nsc-hide');
        $('#nsc_button_quick_upload').addClass('nsc-hide');
        $('.nsc-trigger-panel-container.dropbox').addClass('nsc-hide');
        $('#nsc_button_slack').addClass('nsc-hide');
        $('.nsc-nimbus-comment').addClass('nsc-hide');
        $('.nsc-indicator-screen-info-enable-watermark').addClass('nsc-hide');
        $('#nsc_button_youtube').addClass('nsc-hide');
        $('#nsc_video_crop').closest('.nsc-ve-actions-button').addClass('nsc-hide');
        $('.nsc-ve-actions-group').css('border', 'none');
        $('#nsc_video_button_cup').removeClass('nsc-hide');
    }
});