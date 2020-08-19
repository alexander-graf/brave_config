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
$(document).ready(function () {
    $('#nsc_enable_watermark').on('change', function () {
        if (localStorage.watermarkEnable === 'false' || (localStorage.watermarkFile === '' && localStorage.watermarkType === 'image')) {
            $(this).prop("checked", false);
            chrome.runtime.sendMessage({operation: 'open_page', 'url': 'options.html?watermark'});
        } else {
            $('#nsc_preview_img').addClass('nsc-hide');
            nimbus_screen.dom.$nsc_indicator.addClass('nsc-hide');
            nimbus_screen.dom.$preview_loading.removeClass('nsc-hide');

            localStorage.watermarkEnable = $(this).prop("checked");

            nimbus_screen.changeWaterMark();
        }
    }).prop('checked', localStorage.watermarkEnable !== 'false');

    $('#nsc_open_watermark_option').on('click', function () {
        chrome.runtime.sendMessage({operation: 'open_page', 'url': 'options.html?watermark'});
    });

    $('#nsc_button_back').click(function () {
        nimbus_screen.dom.$nsc_redactor_page.removeClass('nsc-hide');
        nimbus_screen.dom.$nsc_done_page.addClass('nsc-hide');

        if (!nimbus_screen.canvasManager) {
            nimbus_screen.dom.$nsc_pre_load.removeClass('nsc-hide');
            nimbus_screen.initScreenPage(nimbus_screen.info.file.image.origin_patch);
        } else {
            $(window).trigger('resize');
        }
    });

    $('#nsc_button_save_pdf').on('click', function () {
        if (window.nimbus_core.is_chrome) {
            $(window).off('beforeunload', nimbus_screen.beforeUnload);

            nimbus_screen.pdf.addImage(document.getElementById('nsc_preview_img'), 'JPEG', 0, 0, Math.ceil(nimbus_screen.canvasDone.width), Math.ceil(nimbus_screen.canvasDone.height), '', 'FAST');
            nimbus_screen.pdf.save(nimbus_screen.getFileName() + ".pdf");
            $(this).closest('.nsc-trigger-panel-container').removeClass('active')
        }
    });

    $('#nsc_button_save_image, #nsc_button_save_video, #nsc_main_title').on('click', function () {
        $(window).off('beforeunload', nimbus_screen.beforeUnload);

        if (nimbus_screen.getLocationParam() === 'video') {
            chrome.downloads.download({
                // url: window.URL.createObjectURL(nimbus_screen.info.file.video.blob),
                url: nimbus_screen.info.file.video.patch,
                filename: window.nimbus_core.getVideoFileName(nimbus_screen.info.page, nimbus_screen.info.file.video.format),
                saveAs: localStorage.enableSaveAs !== 'false'
            })
        } else {
            chrome.downloads.download({
                url: window.URL.createObjectURL(nimbus_screen.info.file.image.blob),
                filename: window.nimbus_core.getImageFileName(nimbus_screen.info.page, nimbus_screen.info.file.image.format),
                saveAs: localStorage.enableSaveAs !== 'false'
            })
        }
    });

    if (nimbus_screen.getLocationParam() === 'video') {
        $('#nsc_button_quick_upload').addClass('nsc-hide');
    } else {
        $('#nsc_button_quick_upload').on('click', function () {
            $(window).off('beforeunload', nimbus_screen.beforeUnload);

            let blob = nimbus_screen.info.file.image.blob;
            let title = window.nimbus_core.getImageFileName(JSON.parse(localStorage.pageinfo), nimbus_screen.info.file.image.format);

            $('#nsc_message_view_uploads, #nsc_message_view_uploads_dropbox, #nsc_linked').removeClass('visible');
            $('#nsc_loading_upload_file').addClass('visible');

            nimbusShare.server.send.quick({data: blob, title: title}, function (err, res) {
                if (!err && res) {
                    $('#nsc_loading_upload_file').removeClass('visible');
                    nimbusShare.shortUrl(res.url, function (url) {
                        $('#nsc_linked').addClass('visible').find('input').val(url);
                        nimbus_screen.view.classRoomButton(url);
                        nimbus_screen.copyTextToClipboard(url);
                    });
                } else {
                    $.ambiance({message: chrome.i18n.getMessage("notificationWrong"), type: "error", timeout: 5});
                }
            });
        });
    }

    $('#nsc_button_copy_to_clipboard').click(function () {
        $(window).off('beforeunload', nimbus_screen.beforeUnload);

        window.nimbus_core.dataUrlToArrayBuffer(window.URL.createObjectURL(nimbus_screen.info.file.image.blob), function (buffer) {
            chrome.clipboard.setImageData(buffer, (localStorage.format === 'jpg' ? 'jpeg' : 'png'));

            chrome.notifications.create(null, {
                    type: 'basic',
                    iconUrl: 'images/icons/48x48.png',
                    title: chrome.i18n.getMessage("appName"),
                    message: chrome.i18n.getMessage("notificationCopy")
                },
                function (notificationId) {
                    window.setTimeout(function (id) {
                        chrome.notifications.clear(id)
                    }.bind(this, notificationId), 3000);
                });
        });
    });

    $('#nsc_button_print').click(function () {
        $(window).off('beforeunload', nimbus_screen.beforeUnload);
        let f = $("iframe#print")[0],
            c = f.contentDocument,
            d = f.contentWindow,
            i = c.getElementById("image"),
            t = c.getElementById("link");
        i.onload = function () {
            this.style.width = 718 < this.width ? "100%" : "auto";

            const date = new Date().getDate() < 10 ? '0' + new Date().getDate() : new Date().getDate();
            const month = new Date().getMonth() < 9 ? '0' + (new Date().getMonth() + 1) : (new Date().getMonth() + 1);
            const year = new Date().getFullYear();
            const pageinfo = JSON.parse(localStorage.pageinfo);

            if (localStorage.showInfoPrint === 'true') t.innerHTML = nimbus_screen.getFileName() + '<br>' + pageinfo.url + '<br>' + date + '.' + month + '.' + year;

            d.focus();
            d.print();
            i.setAttribute("src", '');
        };
        i.setAttribute("src", nimbus_screen.info.file.image.patch);
    });

    if (window.nimbus_core.is_chrome) {
        let $nsc_video_convert = $('#nsc_video_convert');
        let $nsc_video_convert_frame_rate = $('#nsc_video_convert_frame_rate');
        $nsc_video_convert.find('button').on('click', function (e) {

            if (e.currentTarget.name === 'editor') {
                if (nimbus_screen.info.file.video.format === 'gif') {
                    alert('The editor works only with video files.');
                    return;
                }
                $('#nsc_stream_video').addClass('nsc-hide')[0].pause();
                $('#nsc_preview_img').addClass('nsc-hide');
                nimbus_screen.dom.$nsc_done_page.addClass('nsc-hide');
                nimbus_screen.dom.$nsc_video_page.removeClass('nsc-hide');
                nimbus_screen.dom.$nsc_pre_load.removeClass('nsc-hide');

                $('#nsc_video_player').attr('src', nimbus_screen.info.file.video.patch + '?' + Date.now());
                nimbus_screen.info.file.video.last_video_name = nimbus_screen.info.file.video.patch.match('(vid[^.]+)')[1];
                nimbus_screen.info.file.video.last_video_format = nimbus_screen.info.file.video.format;

                if (!localStorage.videoEditor) {
                    $('#nsc_popup_video_editor').removeClass('nsc-hide').find('.nsc-button-primary').on('click', function () {
                        localStorage.videoEditor = true;
                    });
                    return;
                }
            }
            if (e.currentTarget.name === 'menu') {
                $nsc_video_convert.find('.nsc-convert-menu').show()
            }

            if (e.currentTarget.name === 'convert') {
                nimbusShare.checkPremium(function (err, premium) {
                    if (err || !premium.capture) return;

                    const format = $nsc_video_convert.find('input[name=format]:checked').val();
                    const size = nacl_module.video_resolution[$nsc_video_convert.find('input[name=size]').val()];
                    const frame_rate = nacl_module.frame_rate[$nsc_video_convert.find('input[name=frame-rate]').val()];

                    $(window).on('beforeunload', nimbus_screen.beforeUnload);

                    $('#nsc_stream_video').addClass('nsc-hide')[0].pause();
                    $('#nsc_preview_img').addClass('nsc-hide');
                    nimbus_screen.dom.$nsc_indicator.addClass('nsc-hide');
                    nimbus_screen.dom.$preview_loading.removeClass('nsc-hide').find('[data-i18n]').text(chrome.i18n.getMessage('labelPreviewLoadingVideo'));

                    if (format === 'gif') {
                        nacl_module.convertGif({format: format, size: size, frame_rate: frame_rate},
                            nimbus_screen.view.video.preview,
                            function (text) {
                                nimbus_screen.dom.$preview_loading.find('[data-i18n]').text(text);
                            });
                    } else {
                        nacl_module.convert({format: format, size: size, frame_rate: frame_rate},
                            nimbus_screen.view.video.preview,
                            function (text) {
                                nimbus_screen.dom.$preview_loading.find('[data-i18n]').text(text);
                            });
                    }

                    $nsc_video_convert.find('.nsc-convert-menu').hide()
                });
            }
        }).end().find('input').on('change', function (e) {
            if (e.currentTarget.name === 'size') {
                localStorage.videoConvertResolution = e.currentTarget.value - 1;
                const size = nacl_module.video_resolution[+localStorage.videoConvertResolution];
                $('#nsc_video_convert_size').text(size.width + 'x' + size.height + 'px')
            }

            if (e.currentTarget.name === 'format' && e.currentTarget.value === 'gif') {
                $nsc_video_convert_frame_rate.closest('.nsc-convert-menu-size').removeClass('nsc-hide');

                let search_key = null;
                for (let key in nacl_module.video_resolution) {
                    let video_resolution = nacl_module.video_resolution[key];

                    if (video_resolution.width > nimbus_screen.info.file.video.width * 0.80) {
                        search_key = key - 1 > 0 ? key - 1 : 1;
                        break;
                    }
                }
                if (search_key) {
                    $('#nsc_video_convert input[name=size]').attr('max', search_key).trigger('change');
                }
            } else if (e.currentTarget.name === 'format' && e.currentTarget.value !== 'gif') {
                $nsc_video_convert_frame_rate.closest('.nsc-convert-menu-size').addClass('nsc-hide');

                $('#nsc_video_convert input[name=size]').attr('max', Object.keys(nacl_module.video_resolution).length).trigger('change');
            }

            if (e.currentTarget.name === 'frame-rate') {
                const frame_rate = nacl_module.frame_rate[e.currentTarget.value];
                localStorage.videoConvertFrameRate = e.currentTarget.value;
                $nsc_video_convert_frame_rate.text(frame_rate)
            }
        }).filter('[name=size]').val(localStorage.videoConvertResolution || 1).trigger('change')
            .end().filter('[name=frame-rate]').val(localStorage.videoConvertFrameRate || 3).trigger('change');

        $('body').on('click', function (e) {
            if (!$(e.target).closest('.nsc-indicator-convert-action').length) $nsc_video_convert.find('.nsc-convert-menu').hide()
        });
    }


    $('.nsc-popup-close button, .nsc-popup a').on('click', function (e) {
        $(this).closest('.nsc-popup').addClass('nsc-hide');
    });

    $('.nsc-rate-us-close button').on('click', function () {
        $(this).closest('.nsc-rate-us').addClass('nsc-hide');
    });

    $('#nsc_nimbus_rate button[name=feedback]').on('click', nimbus_screen.rate_popup.feedback);
    $('#nsc_nimbus_rate button[name=not-show-more]').on('click', nimbus_screen.rate_popup.not_show_more);

    $('#nsc_nimbus_private_share').change(function () {
        localStorage.setItem('nimbusShare', this.checked);
    });

    $('#nsc_form_login_nimbus').on("submit", function () {
        var wrong = false;
        var $form = $(this);
        var email = this.elements['email'];
        var password = this.elements['password'];

        if (password.value.length < 8) {
            $(password).addClass('wrong').focus();
            $.ambiance({message: chrome.i18n.getMessage("tooltipPassInfo"), type: "error", timeout: 5});
            wrong = true;
        }
        if (!/\S+@\S+\.\S+/.test(email.value)) {
            $(email).addClass('wrong').focus();
            $.ambiance({message: chrome.i18n.getMessage("tooltipWrongEmail"), type: "error", timeout: 5});
            wrong = true;
        }

        if (!wrong) {
            nimbusShare.server.user.auth(email.value, password.value, function (res) {
                if (res.errorCode === 0) {
                    $form.find('input').val('');
                    $('.nsc-popup').addClass('nsc-hide');
                    nimbusShare.init();
                    nimbus_screen.togglePanel('nimbus');
                } else if (res.errorCode === -26) {
                    $form.find('input').val('');
                    $('.nsc-popup').addClass('nsc-hide');
                    $('#nsc_popup_connect_nimbus_challenge').removeClass('nsc-hide').find('input[name=state]').val(res.body.challenge.state);
                    if (res.body.challenge.type === 'otp') {
                        $('#nsc_popup_connect_nimbus_challenge').find('img').attr('src', '')
                    } else {
                        $('#nsc_popup_connect_nimbus_challenge').find('img').attr('src', 'data:image/png;base64,' + res.body.challenge.image)
                    }
                } else {
                    $.ambiance({message: chrome.i18n.getMessage("notificationLoginFail"), type: "error", timeout: 5});
                }
            });
        }
        return false;
    }).find('input').on('keyup', function () {
        $(this).removeClass('wrong');

        if ($(this).val().length < 8 ||
            ($(this).attr('name') === 'email' && !/\S+@\S+\.\S+/.test($(this).val()))) {
            $(this).addClass('wrong');
        }
    });

    $('#nsc_form_login_nimbus_challenge').on("submit", function () {
        var password = this.elements['password'];
        var wrong = false;
        var $form = $(this);
        var state = this.elements['state'];
        var code = this.elements['code'];

        if (code.value.length < 0) {
            $(password).addClass('wrong').focus();
            $.ambiance({message: chrome.i18n.getMessage("tooltipPassInfo"), type: "error", timeout: 5});
            wrong = true;
        }

        if (!wrong) {
            nimbusShare.server.user.challenge(state.value, code.value, function (res) {
                if (res.errorCode === 0) {
                    $form.find('input').val('');
                    $('.nsc-popup').addClass('nsc-hide');
                    nimbusShare.init();
                    nimbus_screen.togglePanel('nimbus');
                } else {
                    $.ambiance({message: chrome.i18n.getMessage("notificationLoginFail"), type: "error", timeout: 5});
                }
            });
        }
        return false;
    });

    $('#nsc_form_register_nimbus').on("submit", function () {
        var wrong = false;
        var $form = $(this);
        var email = this.elements['email'];
        var password = this.elements['password'];
        var password_repeat = this.elements['pass-repeat'];

        if (password.value.length < 8) {
            $(password).addClass('wrong').focus();
            $.ambiance({message: chrome.i18n.getMessage("tooltipPassInfo"), type: "error", timeout: 5});
            wrong = true;
        }

        if (password.value !== password_repeat.value) {
            $(password).addClass('wrong');
            $(password_repeat).addClass('wrong').focus();
            $.ambiance({message: chrome.i18n.getMessage("tooltipPassMatch"), type: "error", timeout: 5});
            wrong = true;
        }

        if (!/\S+@\S+\.\S+/.test(email.value)) {
            $(email).addClass('wrong').focus();
            $.ambiance({message: chrome.i18n.getMessage("tooltipWrongEmail"), type: "error", timeout: 5});
            wrong = true;
        }

        if (!wrong) {
            nimbusShare.server.user.register(email.value, password.value, function (res) {
                if (res.errorCode === 0) {
                    $form.find('input').val('');
                    $('.nsc-popup').addClass('nsc-hide');
                    nimbusShare.init();
                    nimbus_screen.togglePanel('nimbus');
                } else if (res.errorCode === -4) {
                    $.ambiance({message: chrome.i18n.getMessage("notificationEmailFail"), type: "error", timeout: 5});
                } else {
                    $.ambiance({message: chrome.i18n.getMessage("notificationRegisterFail"), type: "error", timeout: 5});
                }
            });
        }
        return false;
    }).find('input').on('keyup', function () {
        $(this).removeClass('wrong');

        if ($(this).val().length < 8 ||
            ($(this).attr('name') === 'pass-repeat' && $(this).val() !== $(this).closest('form').find("[name='pass']").val()) ||
            $(this).attr('name') === 'email' && !/\S+@\S+\.\S+/.test($(this).val())) {
            $(this).addClass('wrong');

        }
    });

    $('#nsc_form_remind_password_nimbus').on("submit", function () {
        let wrong = false;
        let email = this.elements['email'];

        if (!/\S+@\S+\.\S+/.test(email.value)) {
            $(email).addClass('wrong').focus();
            $.ambiance({message: chrome.i18n.getMessage("tooltipWrongEmail"), type: "error", timeout: 5});
            wrong = true;
        }

        if (!wrong) {
            nimbusShare.server.user.remindPassword(email.value, function (res) {
                if (res.errorCode === 0) {
                    $.ambiance({message: chrome.i18n.getMessage("notificationRestoreSent"), timeout: 5});
                    $('.nsc-popup').addClass('nsc-hide');
                    $('#nsc_popup_login_nimbus').removeClass('nsc-hide')
                        .find('input[name="email"]').val(email.value).end()
                        .find('input[name="password"]').val('').focus();
                } else {
                    $.ambiance({
                        message: chrome.i18n.getMessage("notificationEmailIncorrect"),
                        type: "error",
                        timeout: 5
                    });
                }
            });
        }
        return false;
    }).find('input').bind('keyup', function () {
        $(this).removeClass('wrong');

        if ($(this).val().length < 1 || !/\S+@\S+\.\S+/.test($(this).val())) {
            $(this).addClass('wrong');
        }
    });

    $('#nsc_button_nimbus').on('click', function () {
        if ($('#nsc_done_nimbus').css('display') === 'flex') {
            $('#nsc_send').trigger('click');
        } else {
            nimbusShare.server.user.authState(function (res) {
                if (res.errorCode === 0 && res.body && res.body.authorized) nimbus_screen.togglePanel('nimbus');
                else $('#nsc_popup_connect_nimbus').removeClass('nsc-hide');
            })
        }
    });

    $('#nsc_nimbus_logout').on('click', function (e) {
        nimbusShare.server.user.logout(function (req) {
            $('#nsc_nimbus_aside_loader').removeClass('nsc-hide');
            $('#nsc_select_organization').addClass('nsc-hide');
            $('#nsc_select_workspaces').addClass('nsc-hide');
            $('#nsc_select_folder').addClass('nsc-hide');
            $('#nsc_done_nimbus').css('display', 'none');
            if (localStorage.slackToken) {
                $('#nsc_send').data('type', 'slack').trigger('change-type');
            } else {
                $('#nsc_send').data('type', '').trigger('change-type');
            }
        });
    });

    let nsc_select_organization = $('#nsc_select_organization');
    nsc_select_organization.find('.nsc-aside-select-button').on('click', function () {
        if (nsc_select_organization.find('.nsc-aside-select-dropdown-item').length) nsc_select_organization.find('.nsc-aside-select-dropdown').toggleClass('active')
    });

    let nsc_select_workspaces = $('#nsc_select_workspaces');
    nsc_select_workspaces.find('.nsc-aside-select-button').on('click', function () {
        console.log(nsc_select_workspaces.find('.nsc-aside-select-dropdown-item').length)
        if (nsc_select_workspaces.find('.nsc-aside-select-dropdown-item').length) nsc_select_workspaces.find('.nsc-aside-select-dropdown').toggleClass('active')
    });

    $(document).on('click', function (e) {
        let $nsc_aside_select = $(e.target).closest('.nsc-aside-select');
        $('.nsc-aside-select').not($nsc_aside_select).find('.nsc-aside-select-dropdown').removeClass('active');
    });

    $('.nsc-open-popup-login-nimbus').on('click', function () {
        $('.nsc-popup').addClass('nsc-hide');
        $('#nsc_popup_connect_nimbus').removeClass('nsc-hide');
        return false;
    });

    $('.nsc-open-popup-register-nimbus').on('click', function () {
        $('.nsc-popup').addClass('nsc-hide');
        $('#nsc_popup_register_nimbus').removeClass('nsc-hide');
        return false;
    });

    $('.nsc-open-popup-remind-pass-nimbus').on('click', function () {
        $('.nsc-popup').addClass('nsc-hide');
        $('#nsc_popup_remind_password_nimbus').removeClass('nsc-hide');
        return false;
    });

    $('#nsc_connect_to_google').on('click', function (e) {
        $('#nsc_popup_connect_nimbus').addClass('nsc-hide');
        window.open('https://nimbus.everhelper.me/auth/openidconnect.php?env=app&provider=google', '_blank');
        return false;
    });

    $('#nsc_connect_to_facebook').on('click', function (e) {
        $('#nsc_popup_connect_nimbus').addClass('nsc-hide');
        window.open('https://nimbus.everhelper.me/auth/openidconnect.php?env=app&provider=facebook', '_blank');
        return false;
    });

    $("#nsc_copy_url").click(function () {
        nimbus_screen.copyTextToClipboard($('#nsc_linked input').val());
    });

    /* slack */

    $('#nsc_button_slack').click(function () {
        window.slackShare.init(function (auth) {
            if (!auth) {
                let $nsc_slack_connect = $('#nsc_slack_connect');
                let $nsc_preview_img = $('#nsc_preview_img');
                $nsc_slack_connect.removeClass('nsc-hide').find('.nsc-popup-box').css({transform: 'translate(-50%,0)', top: ($nsc_preview_img.outerHeight() - $nsc_slack_connect.find('.nsc-popup-box').outerHeight()) / 2 + $nsc_preview_img.offset().top + 'px'});
            } else nimbus_screen.togglePanel('slack');
        });
    });
    $('#nsc_button_connect_slack').click(function () {
        $('#nsc_slack_connect').addClass('nsc-hide');
        window.slackShare.login();
    });
    $('.nsc-slack-connect-close').click(function () {
        $('#nsc_slack_connect').addClass('nsc-hide');
    });
    $('#nsc_slack_logout').click(window.slackShare.logout);

    $('#nsc_slack_toggle').click(function (e) {
        chrome.runtime.sendMessage({operation: 'set_option', key: 'slackPanel', value: false});
        $('#nsc_done_slack').css('display', 'none');
        return false;
    });

    $('#nsc_slack_channel_search').on('keyup', function (e) {
        let $nsc_slack_list_group = $('#nsc_slack_list_group');
        let $list = $nsc_slack_list_group.find('li:visible');
        let index = $list.index($('.nsc-slack-list-selected'));
        $list.eq(index).removeClass('nsc-slack-list-selected');

        if (index === $list.length - 1) {
            index = -1
        }

        if (e.keyCode === 40 /*ArrowDown*/) {
            $list.eq(index + 1).addClass('nsc-slack-list-selected');
        } else if (e.keyCode === 38 /*ArrowUp*/) {
            $list.eq(index - 1).addClass('nsc-slack-list-selected');
        } else {
            let search_text = $(this).val();
            let is_first_item = false;
            $('#nsc_slack_channel, #nsc_slack_user').find('li').each(function () {
                let text = $(this).find('a').text();
                $(this).removeClass('nsc-slack-list-selected');
                if (search_text !== '' && !new RegExp('^' + search_text, 'i').test(text)) {
                    $(this).addClass('nsc-hide');
                } else {
                    $(this).removeClass('nsc-hide');
                    if (!is_first_item) {
                        is_first_item = !is_first_item;
                        $(this).addClass('nsc-slack-list-selected');
                    }
                }
            });
        }
        let $item_active = $('#nsc_slack_list_group .nsc-slack-list-selected');
        if ($item_active.length) {
            let top_active_elem = $item_active.position().top;
            $nsc_slack_list_group.scrollTop(top_active_elem + $nsc_slack_list_group.scrollTop());
        }
    });

    /* end slack */

    /* youtube */

    if (window.nimbus_core.is_chrome) {
        $('#nsc_button_youtube').on('click', function () {
            nimbusShare.checkPremium(function (err, premium) {
                if (err || !premium.capture) return;

                if (youtubeShare.getAccessToken()) {
                    if ($('#nsc_done_youtube').css('display') === 'flex') {
                        $('#nsc_send').trigger('click');
                    } else {
                        nimbus_screen.togglePanel('youtube');
                        youtubeShare.viewPlaylist();
                    }
                } else {
                    youtubeShare.refreshToken('panel');
                }
            });
        });

        $('#nsc_youtube_logout').on('click', youtubeShare.clearData);

        $('#nsc_youtube_playlist_add').find('button[name=cleared]').on('click', function () {
            $('#nsc_youtube_playlist_add').addClass('nsc-hide');
            $('#nsc_youtube_playlist_show_add').removeClass('nsc-hide');
        });

        $('#nsc_youtube_playlist_add').find('button[name=add]').on('click', function (e) {
            var name = $('#nsc_youtube_playlist_add').find('input[name=name]').val();
            if (name === '') return;

            youtubeShare.httpRequest('POST', 'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', JSON.stringify({
                "snippet": {
                    "title": name
                }
            }), function () {
                $('#nsc_youtube_playlist_add').removeClass('nsc-hide').find('input[name=name]').val('');
                window.setTimeout(function () {
                    youtubeShare.viewPlaylist();
                }, 500);
            });
        });

        $('#nsc_youtube_playlist_add').find('input[name=name]').on('keypress', function (e) {
            if (e.keyCode === 13) $('#nsc_youtube_playlist_add').find('button[name=add]').trigger('click')
        });

        $('#nsc_youtube_playlist_show_add').on('click', function () {
            $('#nsc_youtube_playlist_add').removeClass('nsc-hide').find('input[name=name]').focus();
            $('#nsc_youtube_playlist_show_add').addClass('nsc-hide');
        });

        $('input[name=shareOnYoutube]').on('change', function () {
            localStorage.shareOnYoutube = this.value;
        }).filter('[value=' + (localStorage.shareOnYoutube || 'public') + ']').prop('checked', true);
    }

    $('#nsc_done_youtube_name').on('change', function () {
        if (this.value === '') this.value = nimbus_screen.get.fileName(true);
        if (nimbus_screen.info.file.format !== this.value.match(/\.[0-9a-z]+$/i)[0]) {
            this.value = this.value + '.' + nimbus_screen.info.file.video.format;
        }
    });

    /* end youtube */

    /* dropbox */

    $('#nsc_button_dropbox').on('click', function () {
        nimbusShare.checkPremium(function (err, premium) {
            if (err || !premium.capture) return;
            if (dropboxShare.getAccessToken()) {
                $('#nsc_loading_upload_file').addClass('visible');
                $('#nsc_message_view_uploads, #nsc_message_view_uploads_dropbox, #nsc_linked').removeClass('visible');

                let blob = nimbus_screen.info.file.image.blob;
                if (nimbus_screen.getLocationParam() === 'video') blob = nimbus_screen.info.file.video.blob;

                dropboxShare.save(blob, nimbus_screen.get.fileName(true), function (err, res) {
                    if (err) {
                        $('#nsc_loading_upload_file').removeClass('visible');
                    } else {
                        $('#nsc_loading_upload_file').removeClass('visible');
                        $('#nsc_message_view_uploads_dropbox').addClass('visible').attr('href', 'https://www.dropbox.com/home' + res.path_lower);
                        nimbus_screen.copyTextToClipboard(res.path_lower);
                    }
                })
            } else {
                dropboxShare.login();
            }
        });
    });

    $('#nsc_dropbox_open_folders').click(function () {
        dropboxShare.getFolders();
    });

    $('#nsc_dropbox_logout').click(function () {
        if ($(this).closest('.nsc-trigger-panel-container').hasClass('active')) {
            $(this).closest('.nsc-trigger-panel-container').removeClass('active')
        }
        dropboxShare.logout();
    });


    /* end dropbox */

    /**/

    // localStorage.appType = 'google';

    $('#nsc_button_google_drive').on('click', function () {
        if (localStorage.appType === 'google') {
            if (googleShare.story.get.accessToken()) {
                nimbusShare.checkPremium(function (err, premium) {
                    if (err || !premium.capture) return;
                    googleShare.refreshToken('send')
                });
            } else {
                googleShare.refreshToken()
            }
        } else {
            nimbusShare.checkPremium(function (err, premium) {
                if (err || !premium.capture) return;

                if (googleShare.story.get.accessToken()) {
                    googleShare.refreshToken('send')
                } else {
                    googleShare.refreshToken()
                }
            });
        }
    });

    if (localStorage.appType === 'google') {
        nimbusShare.server.user.authState(function (res) {
            if (res.errorCode === 0 && res.body && !res.body.authorized) {

            } else {
                googleShare.server.logout();
                googleShare.story.set.uploadFolder({"id": "root", "title": "Main folder"});
            }
        });
    }

    $(document).on('click', function (e) {
        if (!$(e.target).closest('.nsc-trigger-panel-container').length) {
            $('.nsc-trigger-panel-container').removeClass('active')
        }
        if ($(e.target).hasClass('nsc-choose-trigger-panel')) {
            $(e.target).closest('.nsc-trigger-panel-container').toggleClass('active')
        }
    });

    $('#nsc_google_drive_logout').click(function () {
        if ($(this).closest('.nsc-trigger-panel-container').hasClass('active')) {
            $(this).closest('.nsc-trigger-panel-container').removeClass('active')
        }
        googleShare.server.logout();
        googleShare.story.set.uploadFolder({"id": "root", "title": "Main folder"});
        if (localStorage.appType === 'google') nimbusShare.server.user.logout();
    });

    $('#nsc_google_drive_share').on('change', function () {
        localStorage.shareOnGoogle = !$(this).prop('checked');
    });

    $('#nsc_google_drive_open_folders').click(googleShare.view.folders.bind(this, false));

    $('#nsc_file_manager button[name=done]').on('click', function () {
        if ($('#nsc_file_manager').hasClass('is_dropbox')) {
            let info = {path: $('.current').find('div').data('path'), name: $('.current').find('div').data('name')};
            dropboxShare.setUploadFolder(info);
            dropboxShare.setUploadFolderTooltip();
        } else {
            let info = {id: $('.current').find('div').data('id'), title: $('.current').find('span').text()};
            googleShare.story.set.uploadFolder(info);
            googleShare.view.tooltip();
        }
        $('#nsc_file_manager').fadeOut("fast");
    });

    /**/

    $('#nsc_environment_info').on('change', function () {
        window.scrollTo(0, 10000);
        const checked = $(this).prop('checked');
        const pageinfo = JSON.parse(localStorage.pageinfo);
        const userAgent = navigator.userAgent;
        let browserName = navigator.appName;
        let platform = navigator.platform;
        let fullVersion = '' + parseFloat(navigator.appVersion);
        let verOffset;
        let $comment = $('#nsc_comment');
        if ((verOffset = userAgent.indexOf("Opera")) !== -1) {
            browserName = "Opera";
            fullVersion = userAgent.substring(verOffset + 6);
            if ((verOffset = userAgent.indexOf("Version")) !== -1) fullVersion = userAgent.substring(verOffset + 8);
        } else if ((verOffset = userAgent.indexOf("Chrome")) !== -1) {
            browserName = "Chrome";
            fullVersion = userAgent.substring(verOffset + 7);
        }
        let info = '\n\n-----------------\n' +
            chrome.i18n.getMessage("nimbusInfoPage") + ': ' + pageinfo.url + '\n' +
            chrome.i18n.getMessage("nimbusInfoScreen") + ': ' + screen.width + 'x' + screen.height + '\n' +
            chrome.i18n.getMessage("nimbusInfoBrowser") + ': ' + browserName + ' ' + fullVersion + '\n' +
            chrome.i18n.getMessage("nimbusInfoAgent") + ': ' + userAgent + '\n' +
            chrome.i18n.getMessage("nimbusInfoPlatform") + ': ' + platform;

        localStorage.setItem('environmentInfo', checked);
        if (checked) {
            $comment.val($comment.val() + info).outerHeight(220);
        } else {
            $comment.val($comment.val().match(/([\s|\S]+)?\n\n-----------------[\s|\S]+/)[1]).height(22);
        }

    });

    $('#nsc_send').on('change-type', function () {
        let self = this;
        switch ($(self).data('type')) {
            case 'youtube':
                $(self).find('span').text(chrome.i18n.getMessage("nimbusYoutubeSend"));
                break;
            case 'slack':
                $(self).find('span').text(chrome.i18n.getMessage("nimbusSlackSend"));
                break;
            default :
                $(self).find('span').text(chrome.i18n.getMessage("nimbusSend"));
                break;
        }
    })
        .trigger('change-type')
        .on('click', function () {
            $(window).off('beforeunload', nimbus_screen.beforeUnload);

            let channel = false;
            if ($(this).data('channel')) {
                channel = $(this).data('channel');
                $(this).data('channel', false);
            }

            if ($(this).data('type') === 'youtube') {
                if (nimbus_screen.info.file.format === 'gif') {
                    alert('Youtube doesn\'t support GIF');
                } else {
                    if (channel) localStorage.youtubePlaylist = channel;
                    youtubeShare.refreshToken('send');
                }
            } else if ($(this).data('type') === 'slack') {
                if (nimbus_screen.getLocationParam() === 'video') {
                    // slackShare.sendScreenshot(nimbus_screen.info.file.video.blob, channel);
                } else {
                    window.slackShare.sendScreenshot(nimbus_screen.info.file.image.blob, channel);
                }
            } else {
                nimbusShare.init(function (auth) {
                    if (!auth) {
                        $('#nsc_popup_connect_nimbus').removeClass('nsc-hide');
                    } else {
                        let organization = null;
                        let workspace = null;
                        let blob = nimbus_screen.info.file.image.blob;
                        let comment = $('#nsc_comment').val();

                        if (nimbus_screen.getLocationParam() === 'video') blob = nimbus_screen.info.file.video.blob;

                        for (let work of nimbusShare.info.workspaces) {
                            if (work.globalId === localStorage.numbusWorkspaceSelect) workspace = work;
                        }

                        for (let org of nimbusShare.info.organizations) {
                            if (org.id === localStorage.numbusOrganizationSelect) organization = org;
                        }

                        if (blob.size > workspace.org.limits.attachmentSize) {
                            let user = workspace.user || workspace.org.user;
                            if (workspace.userId === nimbusShare.info.id) {
                                if (user.premium && user.premium.status === 'active') {
                                    $('#nsc_popup_limit').removeClass('nsc-hide');
                                } else {
                                    $('#nsc_popup_limit_free').removeClass('nsc-hide');
                                }
                                return;
                            }

                            if (user.premium && user.premium.status === 'active') {
                                $('#nsc_popup_limit_org_premium').removeClass('nsc-hide');
                            } else {
                                $('#nsc_popup_limit_org_free').removeClass('nsc-hide');
                            }
                            return;
                        }

                        if (blob.size + workspace.org.usage.traffic.current > workspace.org.usage.traffic.max) {
                            $('#nsc_popup_limit_org_limit').removeClass('nsc-hide');
                            return;
                        }

                        $('#nsc_message_view_uploads, #nsc_message_view_uploads_dropbox, #nsc_linked').removeClass('visible');
                        $('#nsc_loading_upload_file').addClass('visible');

                        if (channel) comment = comment.match(/([\s|\S]+)?\n\n-----------------([\s|\S]+)/) ? comment.match(/([\s|\S]+)?\n\n-----------------([\s|\S]+)/)[2] : '';

                        if (nimbus_screen.getLocationParam() === 'video') {
                            nimbusShare.server.send.screencast({data: blob, title: window.nimbus_core.getVideoFileName(nimbus_screen.info.page), name: window.nimbus_core.getVideoFileName(nimbus_screen.info.page, nimbus_screen.info.file.video.format), comment: comment},
                                function (err, res) {
                                    $('#nsc_loading_upload_file').removeClass('visible');

                                    if (!err && res) {
                                        if (res.body.location) {
                                            nimbusShare.shortUrl(res.body.location, function (url) {
                                                $('#nsc_linked').addClass('visible').find('input').val(url);
                                                nimbus_screen.view.classRoomButton(url);
                                                nimbus_screen.copyTextToClipboard(url);
                                                nimbusShare.show.info()
                                            });
                                        } else {
                                            $('#nsc_message_view_uploads')
                                                .addClass('visible')
                                                .attr('href', (organization.type === 'business' ? (organization.domain ? 'https://' + organization.domain : 'https://' + organization.sub + '.nimbusweb.me') : 'https://nimbusweb.me') + '/ws/' + workspace.globalId + '/recent/note/' + res.body.global_id);
                                        }
                                    } else {
                                        $.ambiance({message: err.message, type: "error", timeout: 5});
                                    }
                                });
                        } else {
                            nimbusShare.server.send.screenshot({data: blob, title: window.nimbus_core.getImageFileName(nimbus_screen.info.page), name: window.nimbus_core.getImageFileName(nimbus_screen.info.page, nimbus_screen.info.file.image.format), comment: comment},
                                function (err, res) {
                                    $('#nsc_loading_upload_file').removeClass('visible');

                                    if (!err && res) {
                                        if (res.body.location) {
                                            nimbusShare.shortUrl(res.body.location, function (url) {
                                                $('#nsc_linked').addClass('visible').find('input').val(url);
                                                nimbus_screen.view.classRoomButton(url);
                                                nimbus_screen.copyTextToClipboard(url);
                                                nimbusShare.show.info()
                                            });
                                        } else {
                                            console.log(organization)

                                            $('#nsc_message_view_uploads')
                                                .addClass('visible')
                                                .attr('href', (organization.type === 'business' ? (organization.domain ? 'https://' + organization.domain : 'https://' + organization.sub + '.nimbusweb.me') : 'https://nimbusweb.me') + '/ws/' + workspace.globalId + '/recent/note/' + res.body.global_id);
                                        }
                                    } else {
                                        $.ambiance({message: err.message, type: "error", timeout: 5});
                                    }
                                });
                        }
                    }
                });
            }
        });
});

chrome.runtime.onMessage.addListener(function (req) {
    if (req.action === 'access_nimbus') {
        nimbusShare.init();
        nimbus_screen.togglePanel('nimbus');
    }
    if (req.action === 'access_slack') {
        window.slackShare.init(function (auth) {
            console.log('auth', auth)

            nimbus_screen.togglePanel('slack');
            if (nimbus_screen.getLocationParam() === 'slack') $('#nsc_button_slack').click();
        });
    }
    if (req.action === 'access_dropbox') {
        dropboxShare.setUploadFolderTooltip();
    }

    if (req.operation === 'access_youtube') {
        if (youtubeShare.type === 'panel') {
            youtubeShare.viewPlaylist();
            nimbus_screen.togglePanel('youtube');
        } else {
            $('#nsc_message_view_uploads, #nsc_message_view_uploads_dropbox, #nsc_linked').removeClass('visible');
            $('#nsc_loading_upload_file').addClass('visible').text('');

            youtubeShare.save(nimbus_screen.info.file.video.blob, nimbus_screen.get.fileName(true), function (err, res) {
                $('#nsc_loading_upload_file').removeClass('visible').text('');

                $.ambiance({message: 'Upload has completed', timeout: 5});

                if (localStorage.shareOnYoutube !== 'private') {
                    nimbusShare.shortUrl('https://youtu.be/' + res.id, function (url) {
                        $('#nsc_linked').addClass('visible').find('input').val(url);
                        nimbus_screen.view.classRoomButton(url);
                        nimbus_screen.copyTextToClipboard(url);
                    });
                }

                if (nimbus_screen.getLocationParam() === 'video') {
                    nimbus_screen.tracker.send(nimbus_screen.VIDEO_UPLOAD);
                }
            }, function (percent) {
                $('#nsc_loading_upload_file').text(percent + '%');
            });
        }
        youtubeShare.type = undefined;
    }
    if (req.operation === 'access_google') {
        googleShare.view.tooltip();
        if (googleShare.type === 'send') {
            $(window).off('beforeunload', nimbus_screen.beforeUnload);

            $('#nsc_loading_upload_file').addClass('visible');
            $('#nsc_message_view_uploads, #nsc_message_view_uploads_dropbox, #nsc_linked').removeClass('visible');
            $('#nsc_loading_upload_file').addClass('visible').text('');

            let blob = nimbus_screen.info.file.image.blob;
            if (nimbus_screen.getLocationParam() === 'video') blob = nimbus_screen.info.file.video.blob;

            googleShare.save(blob, nimbus_screen.get.fileName(true), function (err, res) {
                console.log(err, res)
                $('#nsc_loading_upload_file').removeClass('visible').text('');

                $.ambiance({message: 'Upload has completed', timeout: 5});

                if (localStorage.shareOnGoogle === 'true') {
                    googleShare.setPublicGdrive(res.id);
                    nimbusShare.shortUrl('https://drive.google.com/file/d/' + res.id, function (url) {
                        $('#nsc_linked').addClass('visible').find('input').val(url);
                        nimbus_screen.view.classRoomButton(url);
                        nimbus_screen.copyTextToClipboard(url);
                    });
                }

                if (nimbus_screen.getLocationParam() === 'video') nimbus_screen.tracker.send(nimbus_screen.VIDEO_UPLOAD);
            }, function (percent) {
                $('#nsc_loading_upload_file').text(percent + '%');
            })
        }
        googleShare.type = undefined;
    }
});