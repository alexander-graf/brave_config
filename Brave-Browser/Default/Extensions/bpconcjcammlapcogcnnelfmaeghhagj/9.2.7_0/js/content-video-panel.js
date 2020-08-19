/**
 * Created by hasesanches on 2017.
 */

(function () {
    if (window.__nscContentScriptVideoPanel) return;
    window.__nscContentScriptVideoPanel = true;

    // console.log('start video panel');

    let nsc_content_video_panel = {
        editor: null,
        interval: null,
        panel_move: false,
        option: {
            editor_tools: null,
            drawing_tools: false,
            delete_drawing: null
        },
        event: function () {
            let activateTools = function (e) {
                // console.log('click event', $(this).data('event'), $(this).data('eventParam'))
                nsc_content_video_panel.editor.trigger($(this).data('event'), $(this).data('eventParam'));
                if ($(this).data('event') === 'nimbus-editor-active-tools') {
                    nsc_content_video_panel.option.editor_tools = $(this).data('eventParam');
                    chrome.runtime.sendMessage({operation: 'set_video_editor_tools', tools: $(this).data('eventParam')});
                }
                return false;
            };

            nsc_content_video_panel.editor.on('nimbus-editor-change', function (e, tools, color) {
                // console.log('nimbus-editor-change', tools, color)
                if (tools) {
                    let dropdown_icon = $('.nsc-panel-dropdown-icon[data-event-param=' + tools + ']');
                    if (dropdown_icon.length) {
                        dropdown_icon.closest('.nsc-panel-button').removeClass('opened')
                            .find('.nsc-panel-text').data('event', dropdown_icon.data('event')).data('event-param', dropdown_icon.data('event-param')).data('i18n', dropdown_icon.data('i18n'))
                            .attr('data-event', dropdown_icon.data('event')).attr('data-event-param', dropdown_icon.data('event-param')).attr('data-i18n', dropdown_icon.data('i18n'))
                            .empty().append(dropdown_icon.find('.nsc-icon').clone());
                    }

                    let $button = $('.nsc-panel-button[data-event-param=' + tools + ']');
                    $button = $button.length ? $button : $('.nsc-panel-text[data-event-param=' + tools + ']').closest('.nsc-panel-button');
                    if ($button.length) $('.nsc-panel-button').removeClass('active').filter($button).addClass('active');
                }
                if (color) $('#nsc_panel_button_colors').css('background-color', color).closest('.nsc-panel-button').removeClass('opened');
            });

            nsc_content_video_panel.editor.on('nimbus-editor-not-set-color', function () {
                $('#nsc_panel_button_colors').closest('.nsc-panel-button').removeClass('opened');
            });

            $('*[data-event^=nimbus-editor]').on('click touchend', activateTools);

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
            }).on('mouseenter touchenter', function () {
                    $('.nsc-panel-tooltip-layout').text($(this).attr('title'));
                    $('.nsc-panel.nsc-panel-compact').addClass('nsc-tooltip');
                })
                .on('mouseleave touchleave', function () {
                    $('.nsc-panel.nsc-panel-compact').removeClass('nsc-tooltip')
                });

            $('.nsc-panel-toggle-button').on('click', function () {
                $('.nsc-panel.nsc-panel-compact').addClass('nsc-hide');
            });

            $('.nsc-panel-trigger').on('click touchend', function () {
                let $this_button = $(this).closest('.nsc-panel-button');
                $('.nsc-panel-button').not($this_button).removeClass('opened');
                if ($this_button.find('.nsc-panel-dropdown').length) $this_button.toggleClass('opened');
            });

            function panelKeyDown(e) {
                if ((e.altKey || e.metaKey) && nsc_content_video_panel.option.drawing_tools) {
                    switch (e.keyCode) {
                        case 86: // v
                            if ($('.nsc-panel.nsc-panel-compact:visible').length) {
                                $('.nsc-panel.nsc-panel-compact').addClass('nsc-hide');
                            } else {
                                $('.nsc-panel.nsc-panel-compact').removeClass('nsc-hide');
                            }
                            break;
                        case 83: // s
                            nsc_content_video_panel.editor.trigger('nimbus-editor-active-tools', 'cursorDefault');
                            nsc_content_video_panel.option.editor_tools = 'cursorDefault';
                            chrome.runtime.sendMessage({operation: 'set_video_editor_tools', tools: 'cursorDefault'});
                            break;
                        case 71: // g
                            nsc_content_video_panel.editor.trigger('nimbus-editor-active-tools', 'cursorShadow');
                            nsc_content_video_panel.option.editor_tools = 'cursorShadow';
                            chrome.runtime.sendMessage({operation: 'set_video_editor_tools', tools: 'cursorShadow'});
                            break;
                        case 76: // l
                            nsc_content_video_panel.editor.trigger('nimbus-editor-active-tools', 'cursorRing');
                            nsc_content_video_panel.option.editor_tools = 'cursorRing';
                            chrome.runtime.sendMessage({operation: 'set_video_editor_tools', tools: 'cursorRing'});
                            break;
                        case 80: // p
                            nsc_content_video_panel.editor.trigger('nimbus-editor-active-tools', 'pen');
                            nsc_content_video_panel.option.editor_tools = 'pen';
                            chrome.runtime.sendMessage({operation: 'set_video_editor_tools', tools: 'pen'});
                            break;
                        case 65: // a
                            nsc_content_video_panel.editor.trigger('nimbus-editor-active-tools', 'arrow');
                            nsc_content_video_panel.option.editor_tools = 'arrow';
                            chrome.runtime.sendMessage({operation: 'set_video_editor_tools', tools: 'arrow'});
                            break;
                        case 82: // r
                            nsc_content_video_panel.editor.trigger('nimbus-editor-active-tools', 'square');
                            nsc_content_video_panel.option.editor_tools = 'square';
                            chrome.runtime.sendMessage({operation: 'set_video_editor_tools', tools: 'square'});
                            break;
                        case 77: // m
                            nsc_content_video_panel.editor.trigger('nimbus-editor-active-tools', 'notifRed');
                            nsc_content_video_panel.option.editor_tools = 'notifRed';
                            chrome.runtime.sendMessage({operation: 'set_video_editor_tools', tools: 'notifRed'});
                            break;
                        case 81: // q
                            nsc_content_video_panel.editor.trigger('nimbus-editor-active-tools', 'notifBlue');
                            nsc_content_video_panel.option.editor_tools = 'notifBlue';
                            chrome.runtime.sendMessage({operation: 'set_video_editor_tools', tools: 'notifBlue'});
                            break;
                        case 67: // c
                            nsc_content_video_panel.editor.trigger('nimbus-editor-active-tools', 'notifGreen');
                            nsc_content_video_panel.option.editor_tools = 'notifGreen';
                            chrome.runtime.sendMessage({operation: 'set_video_editor_tools', tools: 'notifGreen'});
                            break;
                        // case 78: // n
                        //     videoEditor && videoEditor.trigger('nimbus-editor-active-tools', 'clear');
                        //     break;
                        case 85: // u
                            nsc_content_video_panel.editor.trigger('nimbus-editor-active-tools', 'clearAll');
                            break;
                    }
                }
            }

            $('.nsc-panel.nsc-panel-compact .nsc-panel-move')
                .on('mousedown', function () {
                    nsc_content_video_panel.panel_move = true;
                })
                .on('mouseup', function () {
                    nsc_content_video_panel.panel_move = false;
                });

            $(window).on('keydown', panelKeyDown)
                .on('mousemove', function (e) {
                    if (nsc_content_video_panel.panel_move) {
                        let $panel = $('.nsc-panel.nsc-panel-compact');
                        let left = e.clientX - 2;
                        let bottom = $(window).height() - e.clientY - 46 / 2;

                        if (left <= 5) return;
                        if (left > $(window).width() - $panel.width() - 5) return;
                        if (bottom <= 5) return;
                        if (bottom > $(window).height() - $panel.height() - 5) return;

                        $('.nsc-panel.nsc-panel-compact').css({left: left, bottom: bottom});
                    }
                })
                .on('mouseup', function () {
                    nsc_content_video_panel.panel_move = false;
                });

            let $web_camera = $('#nimbus_web_camera_toggle');
            let $button_play = $('#nsc_panel_button_play').addClass('nsc-hide');
            let $button_pause = $('#nsc_panel_button_pause');
            let $button_stop = $('#nsc_panel_button_stop');

            $web_camera.on('click', function () {
                chrome.runtime.sendMessage({operation: 'web_camera_toggle_panel'});
            });

            $button_play.on('click touchend', function () {
                chrome.runtime.sendMessage({operation: 'status_video_change', status: 'play'});
            });
            $button_pause.on('click touchend', function () {
                chrome.runtime.sendMessage({operation: 'status_video_change', status: 'pause'});
            });
            $button_stop.on('click touchend', function () {
                chrome.runtime.sendMessage({operation: 'status_video_change', status: 'stop'});
            });
        },
        init: function (cb) {
            if ($('.nsc-video-editor').length) return cb && cb();
            $.get(chrome.runtime.getURL('template/panel-video-compact.html'), function (data) {
                $('body').append(data).append($('<div>').addClass('nsc-video-editor').addClass('nsc-hide'));

                nsc_content_video_panel.editor = $('.nsc-video-editor');
                // nsc_content_video_panel.event();
                cb && cb()
            })
        }
    };

    chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
        console.log(req);
    // case 'stream_camera':
    //     console.log(request);
    //     break;

        if (req.operation === 'status_video') {
            let $button_play = $('#nsc_panel_button_play');
            let $button_pause = $('#nsc_panel_button_pause');

            if (!req.status) {
                nsc_content_video_panel.editor.trigger('nimbus-editor-active-tools', 'clearAll');
                $('.nsc-panel.nsc-panel-compact').addClass('nsc-hide');
                nsc_content_video_panel.editor.addClass('nsc-hide');
                clearInterval(nsc_content_video_panel.interval);
                $('#nsc_content_pix_video').remove();
            }

            if (req.state === 'recording') {
                $button_play.addClass('nsc-hide');
                $button_pause.removeClass('nsc-hide');
            } else if (req.state === 'paused') {
                $button_pause.addClass('nsc-hide');
                $button_play.removeClass('nsc-hide');
            }
        }
        if (req.operation === 'video_panel_show') {
            $('body').append($('<div>').addClass('nsc-content-pix-video').attr('id', 'nsc_content_pix_video'));

            nsc_content_video_panel.option.drawing_tools = req.videoDrawingToolsEnable;
            nsc_content_video_panel.option.delete_drawing = req.videoDrawingToolsDelete;
            nsc_content_video_panel.option.editor_tools = req.videoEditorTools;

            let start = function () {
                let page_w = window.innerWidth;
                let page_h = window.innerHeight;

                nsc_content_video_panel.editor = window.nsc_content_video_editor.init(nsc_content_video_panel.editor, {w: page_w, h: page_h});
                nsc_content_video_panel.event();
                // nsc_content_video_panel.editor.videoEditor({w: page_w, h: page_h});
                if (nsc_content_video_panel.option.delete_drawing && nsc_content_video_panel.option.drawing_tools) {
                    nsc_content_video_panel.interval = setInterval(function () {
                        nsc_content_video_panel.editor.trigger('nimbus-editor-delete-drawing', nsc_content_video_panel.option.delete_drawing);
                    }, 500)
                }
                if (nsc_content_video_panel.option.drawing_tools) {
                    // nsc_content_video_panel.editor.trigger('nimbus-editor-active-tools', nsc_content_video_panel.option.editor_tools);
                    nsc_content_video_panel.editor.trigger('nimbus-editor-active-tools', 'cursorRing');
                    $('.nsc-panel.nsc-panel-compact').removeClass('nsc-hide');
                } else {
                    nsc_content_video_panel.editor.trigger('nimbus-editor-active-tools', 'cursorRing');
                }
                nsc_content_video_panel.editor.removeClass('nsc-hide');
            };

            if (nsc_content_video_panel.editor) {
                if (nsc_content_video_panel.option.delete_drawing && nsc_content_video_panel.option.drawing_tools) {
                    nsc_content_video_panel.interval = setInterval(function () {
                        nsc_content_video_panel.editor.trigger('nimbus-editor-delete-drawing', nsc_content_video_panel.option.delete_drawing);
                    }, 500)
                }
                if (nsc_content_video_panel.option.drawing_tools) {
                    nsc_content_video_panel.editor.trigger('nimbus-editor-active-tools', 'cursorRing');
                    $('.nsc-panel.nsc-panel-compact').removeClass('nsc-hide');
                } else {
                    nsc_content_video_panel.editor.trigger('nimbus-editor-active-tools', 'cursorRing');
                }
                nsc_content_video_panel.editor.removeClass('nsc-hide');
            } else nsc_content_video_panel.init(start);
        }
    });
})();