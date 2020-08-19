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


// (function ($) {
if (!window.nimbusConnectInjected) {
    window.nimbusConnectInjected = true;

    var nimbusShare = {
        client_software: 'screens_chrome',
        url: {
             helper: 'https://everhelper.me',
             sync: 'https://sync.everhelper.me',
             nimbus: 'https://nimbusweb.me'
        },
        info: {
            id: null,
            login: '',
            premium: false,
            business: false,
            organization: {},
            workspaces: {},
        },
        getUploadFolder: function () {
            let obj = {id: 'default', title: 'My Notes'};
            if (localStorage.getItem('nimbusUploadFolder_' + localStorage.login)) {
                obj = JSON.parse(localStorage.getItem('nimbusUploadFolder_' + localStorage.login));
            }
            return obj;
        },
        setUploadFolder: function (folder) {
            localStorage.setItem('nimbusUploadFolder_' + localStorage.login, JSON.stringify(folder));
        },
        send: function (url, data, success, error, notification) {
            if (typeof url === 'object') {
                notification = error;
                error = success;
                success = data;
                data = url;
                url = false;
            }
            $.ajax({
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'x-client-software': 'screens_chrome',
                    // 'EverHelper-Session-ID': localStorage.numbusSessionId
                },
                type: 'POST',
                url: url || nimbusShare.url.sync,
                data: JSON.stringify(data),
                dataType: 'json',
                async: true,
                xhrFields: {
                    withCredentials: true
                },
                success: success,
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    if (XMLHttpRequest.readyState === 4) {
                        if ($.ambiance && notification === undefined) {
                            $.ambiance({message: chrome.i18n.getMessage("notificationNetworkError"), timeout: 5});
                        } // server
                    } else if (XMLHttpRequest.readyState === 0) {
                        if ($.ambiance && notification === undefined) {
                            $.ambiance({message: chrome.i18n.getMessage("notificationNetworkError"), timeout: 5}); // network connect
                        }
                    } else {
                        error && error();
                    }
                }
            });
        },
        sendNew: function (action, data, success, error) {
            $.ajax({
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'x-client-software': 'screens_chrome'
                },
                type: 'POST',
                // url: nimbusShare.url.nimbus + '/auth/api/' + action,
                url: nimbusShare.url.helper + '/auth/api/' + action,
                data: JSON.stringify(data),
                dataType: 'json',
                async: true,
                xhrFields: {
                    withCredentials: true
                },
                success: success,
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    if (XMLHttpRequest.readyState === 4) {
                        if ($.ambiance) {
                            $.ambiance({message: chrome.i18n.getMessage("notificationNetworkError"), timeout: 5});
                        } // server
                    } else if (XMLHttpRequest.readyState === 0) {
                        if ($.ambiance) {
                            $.ambiance({message: chrome.i18n.getMessage("notificationNetworkError"), timeout: 5}); // network connect
                        }
                    } else {
                        error && error();
                    }
                }
            });
        },
        shortUrl: function (url, cb) {
            if (localStorage.numbusAutoShortUrl !== 'false') {
                $.post('https://nimb.ws/dantist_api.php', {url: url}, function (data) {
                    cb && cb(JSON.parse(data).short_url);
                });
            } else cb && cb(url)
        },
        checkPremium: function (cb, popup) {
            popup = (popup === undefined ? true : !!popup);

            // return cb && cb(null, {
            //     note: true,
            //     business: true,
            //     capture: true
            // });

            nimbusShare.server.user.info(function (res) {
                if (res.errorCode === 0) {
                    let premium = {
                        note: !!res.body.premium.active,
                        business: !!res.body.premium.is_business,
                        capture: true
                    };

                    if (premium.business) {
                        cb && cb(null, premium);
                    } else {
                        $.ajax({
                            type: 'POST',
                            url: 'https://capture-pro.everhelper.me/v1/premium',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json',
                                'x-client-software': 'screens_chrome',
                                // 'EverHelper-Session-ID': localStorage.numbusSessionId
                            },
                            data: JSON.stringify({
                                "device": {
                                    "globalId": localStorage.appGlobalId
                                }
                            }),
                            dataType: 'json',
                            async: true,
                            xhrFields: {
                                withCredentials: true
                            },
                            success: function () {
                                cb && cb(null, premium)
                            },
                            error: function (jqXHR) {
                                const res = JSON.parse(jqXHR.responseText);
                                if (jqXHR.status === 403) {
                                    if (res.reason === 'banned') {
                                        popup && $('#nsc_capture_pro_device').removeClass('nsc-hide');
                                        cb && cb('banned', premium);
                                    } else if (res.reason === 'devicequota') {
                                        popup && $('#nsc_capture_pro_device').removeClass('nsc-hide');
                                        cb && cb('devicequota', premium);
                                    }
                                } else if (jqXHR.status === 404) {
                                    popup && $(localStorage.appType === 'google' ? '#nsc_popup_google_premium' : '#nsc_popup_premium').removeClass('nsc-hide');
                                    premium.capture = false;
                                    cb && cb(null, premium);
                                } else {
                                    $.ambiance({message: chrome.i18n.getMessage("notificationNetworkError"), timeout: 5});
                                    cb && cb('server', {});
                                }
                            }
                        });
                    }
                } else {
                    popup && $(localStorage.appType === 'google' ? '#nsc_popup_google_premium' : '#nsc_popup_premium').removeClass('nsc-hide');
                    cb && cb('server', {});
                }
            });
        },
        notesIsShared: function () {
            return localStorage.nimbusShare === 'false';
        },
        server: {
            note: {
                share: function (id, cb) {
                    nimbusShare.server.send.request({
                        data: {
                            "action": "notes:share",
                            "body": {
                                "global_id": [id]
                            }
                        }
                    }, function (err, res) {
                        if (err) return cb(err);
                        return cb(null, {url: res.body[id]});
                    });
                },
            },
            send: {
                xhr: null,
                abort: function () {
                    if (nimbusShare.server.send.xhr) nimbusShare.server.send.xhr.abort();
                },
                request: function (req, cb) {
                    nimbusShare.server.send.xhr = $.ajax({
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'x-client-software': 'screens_chrome',
                            // 'EverHelper-Session-ID': localStorage.numbusSessionId
                        },
                        type: 'POST',
                        url: req.url || nimbusShare.url.sync,
                        data: JSON.stringify(req.data),
                        dataType: 'json',
                        async: true,
                        xhrFields: {
                            withCredentials: true
                        },
                        success: function (res) {
                            cb(null, res)
                        },
                        error: function () {
                            cb(new Error(chrome.i18n.getMessage("notificationNetworkError")))
                        }
                    });
                },
                file: function (req, cb) {
                    let fd = new FormData();
                    fd.append(req.type, req.data, req.name);

                    nimbusShare.server.send.xhr = $.ajax({
                        headers: {
                            'x-client-software': 'screens_chrome',
                            // 'EverHelper-Session-ID': localStorage.numbusSessionId
                        },
                        url: nimbusShare.url.sync + '/files:preupload',
                        type: "POST",
                        data: fd,
                        processData: false,
                        contentType: false,
                        xhrFields: {
                            withCredentials: true
                        },
                        success: function (res) {
                            if (res.errorCode === 0) {
                                cb(null, res.body);
                            } else {
                                cb(new Error(chrome.i18n.getMessage("notificationWrong")));
                            }
                        },
                        error: function () {
                            cb(new Error(chrome.i18n.getMessage("notificationNetworkError")))
                        }
                    });
                },
                quick: function (req, cb) {
                    let fd = new FormData();
                    fd.append('title', req.title || '');
                    fd.append('commentText', req.comment || '');
                    fd.append('url', JSON.parse(localStorage.pageinfo).url);
                    fd.append("file", req.data, req.title);

                    $.ajax({
                        headers: {
                            'x-client-software': 'screens_chrome',
                            // 'EverHelper-Session-ID': localStorage.numbusSessionId
                        },
                        url: nimbusShare.url.nimbus + '/nimbus-screenshots/api/upload',
                        type: "POST",
                        data: fd,
                        processData: false,
                        contentType: false,
                        xhrFields: {
                            withCredentials: true
                        },
                    }).done(function (res) {
                        if (res.errorCode === 0) {
                            cb(null, {url: res.body.location})
                        } else {
                            cb && cb(nimbus_core.customError(nimbusShare.server.send.xhr.status, chrome.i18n.getMessage("Unknown error")));
                        }
                    });
                },
                screencast: function (req, cb) {
                    nimbusShare.server.send.file({data: req.data, name: req.name, type: 'video'}, function (err, res) {
                        if (err) return cb(err);
                        nimbusShare.server.send.request({
                            data: {
                                "action": "screencasts:save",
                                "features": {
                                    "noteEditor": true
                                },
                                "body": {
                                    "workspaceId": localStorage.numbusWorkspaceSelect,
                                    "screen": {
                                        "title": req.title || '',
                                        "commentText": req.comment || '',
                                        "tempname": res.files["video"],
                                        "parent_id": nimbusShare.getUploadFolder().id,
                                        "url": JSON.parse(localStorage.pageinfo).url
                                    },
                                    "share": nimbusShare.notesIsShared()
                                },
                                "_client_software": nimbusShare.client_software
                            }
                        }, function (err, res) {
                            if (res.errorCode === -20) {
                                cb && cb(nimbus_core.customError(nimbusShare.server.send.xhr.status, chrome.i18n.getMessage("notificationReachedLimit")));
                            } else if (res.errorCode === 0) {
                                cb(null, {body: res.body})
                            } else {
                                cb && cb(nimbus_core.customError(nimbusShare.server.send.xhr.status, chrome.i18n.getMessage("notificationWrong")));
                            }
                        });
                    });
                },
                screenshot: function (req, cb) {
                    nimbusShare.server.send.file({data: req.data, name: req.name, type: 'screens'}, function (err, res) {
                        if (err) return cb(err);
                        nimbusShare.server.send.request({
                            data: {
                                "action": "screenshots:save",
                                "features": {
                                    "noteEditor": true
                                },
                                "body": {
                                    "workspaceId": localStorage.numbusWorkspaceSelect,
                                    "screen": {
                                        "commentText": req.comment || '',
                                        "title": req.title || '',
                                        "tempname": res.files["screens"],
                                        "parent_id": nimbusShare.getUploadFolder().id,
                                        "url": JSON.parse(localStorage.pageinfo).url
                                    },
                                    "share": nimbusShare.notesIsShared()
                                },
                                "_client_software": nimbusShare.client_software
                            }
                        }, function (err, res) {
                            // console.log(res)
                            if (res.errorCode === -20) {
                                cb && cb(nimbus_core.customError(nimbusShare.server.send.xhr.status, chrome.i18n.getMessage("notificationReachedLimit")));
                            } else if (res.errorCode === 0) {
                                cb(null, {body: res.body})
                            } else {
                                cb && cb(nimbus_core.customError(nimbusShare.server.send.xhr.status, chrome.i18n.getMessage("notificationWrong")));
                            }
                        });
                    });
                }
            },
            organization: {
                getAll: function (cb) {
                    nimbusShare.server.send.request({
                        data: {
                            "action": "orgs:getAll",
                            "_client_software": nimbusShare.client_software
                        }
                    }, function (err, res) {
                        if (err) return cb(err);

                        let globalId = 'u' + nimbusShare.info.id.toString(36);
                        res.body.orgs.unshift({id: globalId, title: 'Personal'});
                        nimbusShare.info.organizations = res.body.orgs;
                        //
                        // console.log('nimbusShare.info.organizations', nimbusShare.info.organizations)
                        cb && cb(null, nimbusShare.info.organizations);
                    });
                }
            },
            workspaces: {
                getAll: function (cb) {
                    nimbusShare.server.send.request({
                        data: {
                            "action": "notes:getWorkspaces",
                            "_client_software": nimbusShare.client_software
                        }
                    }, function (err, res) {
                        if (err) return cb(err);

                        nimbusShare.info.workspaces = res.body.workspaces;
                        // console.log('nimbusShare.info.workspaces', nimbusShare.info.workspaces)
                        cb && cb(null, nimbusShare.info.workspaces);
                    });
                }
            },
            folders: {
                getAll: function (req, cb) {
                    nimbusShare.server.send.request({
                        data: {
                            "action": "notes:getFolders",
                            "body": {
                                "workspaceId": (req && req.workspaceId) ? req.workspaceId : '',
                            },
                            "_client_software": nimbusShare.client_software
                        }
                    }, function (err, res) {
                        if (err) return cb(err);

                        nimbusShare.info.folders = res.body.notes;
                        // console.log('nimbusShare.info.folders', nimbusShare.info.folders);
                        cb && cb(null, nimbusShare.info.folders);
                    });
                }
            },
            user: {
                auth: function (login, password, cb) {
                    (login && password) && nimbusShare.sendNew('auth', {
                        "login": login,
                        "password": password
                    }, function (res) {
                        // console.log('auth', res);

                        localStorage.numbusSessionId = res.body.sessionId;
                        nimbusShare.send(nimbusShare.url.nimbus + '/auth/api/applyAuth', {"sessionId": res.body.sessionId});
                        cb && cb(res)
                    }, cb);
                },
                logout: function (cb) {
                    nimbusShare.send({
                        "action": "user:logout",
                        "_client_software": nimbusShare.client_software
                    }, cb, cb);
                },
                register: function (login, password, cb) {
                    (login && password) && nimbusShare.sendNew('register', {
                        "login": login,
                        "password": password,
                        "service": "nimbus",
                        "languages": [navigator.language]
                    }, function (res) {
                        nimbusShare.send(nimbusShare.url.nimbus + '/auth/api/applyAuth', {"sessionId": res.body.sessionId});
                        localStorage.numbusSessionId = res.body.sessionId;
                        cb && cb(res)
                    }, cb);
                },
                challenge: function (state, answer, cb) {
                    nimbusShare.sendNew('challenge', {
                        "state": state,
                        "answer": answer,
                    }, function (res) {
                        nimbusShare.send(nimbusShare.url.nimbus + '/auth/api/applyAuth', {"sessionId": res.body.sessionId});
                        localStorage.numbusSessionId = res.body.sessionId;
                        cb && cb(res)
                    }, cb);
                },
                info: function (cb) {
                    nimbusShare.send({
                        "action": "user:info"
                    }, cb, cb, 'notification');
                },
                authState: function (cb) {
                    nimbusShare.send({
                        "action": "user:authstate"
                    }, function (res) {
                        localStorage.numbusSessionId = res.body.sessionid;

                        if (res.errorCode === 0 && res.body && res.body.authorized && localStorage.login !== res.body.login) {
                            localStorage.login = res.body.login;
                            localStorage.numbusOrganizationSelect = false;
                            localStorage.numbusWorkspaceSelect = false;
                        }
                        cb && cb(res)
                    }, cb, 'notification');
                },
                remindPassword: function (email, cb) {
                    email && nimbusShare.send({
                        "action": "remind_password",
                        "email": email
                    }, cb, cb);
                }
            }
        },
        show: {
            organization: function () {
                let nsc_select_organization = $('#nsc_select_organization');
                let globalId = 'u' + nimbusShare.info.id.toString(36);
                let ul = nsc_select_organization.find('.nsc-aside-select-dropdown ul').empty();
                let is_select = false;

                for (let organization of nimbusShare.info.organizations) {
                    if (organization.suspended) continue;
                    let workspaces_count = 0;
                    for (let workspace of nimbusShare.info.workspaces) {
                        if (workspace.access && workspace.access.role === 'reader') continue;
                        if (workspace.org.id === organization.id) ++workspaces_count;
                    }
                    if (!workspaces_count) continue;

                    if (localStorage.numbusOrganizationSelect === organization.id) is_select = organization;

                    ul.append(
                        $('<li>', {
                            'class': 'nsc-aside-select-dropdown-item',
                            'flex': '',
                            'layout': '',
                            'layout-align': 'start center'
                        })
                            .data('id', organization.id)
                            .data('title', organization.title)
                            .append($('<div>', {
                                'class': 'nsc-aside-select-dropdown-item-title',
                            }).text(organization.title))
                            .on('click', function () {
                                nsc_select_organization.find('.nsc-aside-select-dropdown').removeClass('active');
                                nsc_select_organization.find('.nsc-aside-select-text').text($(this).data('title')).data('id', $(this).data('id'));

                                localStorage.numbusOrganizationSelect = $(this).data('id');
                                nimbusShare.show.workspaces();
                                nimbusShare.show.folders()
                            })
                    );
                }

                if (is_select) {
                    nsc_select_organization.find('.nsc-aside-select-text').text(is_select.title).data('id', is_select.id);
                } else {
                    localStorage.numbusOrganizationSelect = globalId;
                    nsc_select_organization.find('.nsc-aside-select-text').text('Personal').data('id', globalId);
                }
            },
            workspaces: function () {
                let nsc_select_workspaces = $('#nsc_select_workspaces');
                let ul = nsc_select_workspaces.find('.nsc-aside-select-dropdown ul').empty();
                let is_select = false;
                let is_default = false;

                for (let workspace of nimbusShare.info.workspaces) {
                    if (workspace.access && workspace.access.role === 'reader') continue;
                    if (localStorage.numbusOrganizationSelect === 'u' + nimbusShare.info.id.toString(36) && workspace.org.type === 'business') continue;
                    if (workspace.org.id !== localStorage.numbusOrganizationSelect && localStorage.numbusOrganizationSelect !== 'u' + nimbusShare.info.id.toString(36)) continue;
                    if (localStorage.numbusWorkspaceSelect === workspace.globalId) is_select = workspace;

                    let destruction = '';
                    if (workspace.user) {
                        if (workspace.user.id === nimbusShare.info.id) destruction = 'Business workspace'; // персональные шаренные (пищем количество мемберов)
                        else destruction = workspace.user.email; // бизнес проекты (пишем емайл овнера).
                    } else if (workspace.userId === nimbusShare.info.id) {
                        if (workspace.countMembers > 0) destruction = workspace.countMembers + ' users'; // персональные шаренные (пищем количество мемберов)
                        else destruction = 'Personal workspace'; // персональными (пишем Personal)
                    } else {
                        destruction = workspace.org.user.email; // шаренные (пишем владельца проекта)
                    }

                    if (workspace.isDefault) is_default = workspace;

                    ul.append(
                        $('<li>', {
                            'class': 'nsc-aside-select-dropdown-item',
                            'flex': '',
                            'layout': '',
                            'layout-align': 'start center'
                        })
                            .data('id', workspace.globalId)
                            .data('title', workspace.title)
                            .append($('<div>', {
                                'class': 'nsc-aside-select-dropdown-item-title',
                            }).text(workspace.title))
                            .append($('<div>', {
                                'class': 'nsc-aside-select-dropdown-item-destruction',
                            }).text(destruction))
                            .on('click', function () {
                                nsc_select_workspaces.find('.nsc-aside-select-dropdown').removeClass('active');
                                nsc_select_workspaces.find('.nsc-aside-select-text').text($(this).data('title')).data('id', $(this).data('id'));

                                localStorage.numbusWorkspaceSelect = $(this).data('id');
                                nimbusShare.show.folders()
                            })
                    );
                }

                if (is_select) {
                    nsc_select_workspaces.find('.nsc-aside-select-text').html(is_select.title).data('id', is_select.globalId);
                } else {
                    if (!is_default) is_default = nimbusShare.info.workspaces[0];
                    localStorage.numbusWorkspaceSelect = is_default.globalId;
                    nsc_select_workspaces.find('.nsc-aside-select-text').html(is_default.title).data('id', is_default.globalId);
                }
            },
            folders: function (is_loading, cb) {
                let nsc_select_folder = $('#nsc_select_folder');
                if (!is_loading) nsc_select_folder.addClass('loading');

                nimbusShare.server.folders.getAll({workspaceId: localStorage.numbusWorkspaceSelect}, function (err, folders) {
                    let ul = nsc_select_folder.find('ul').empty();
                    let is_select = false;

                    for (let folder of folders) {
                        if (nimbusShare.getUploadFolder().id === folder.global_id) is_select = folder;

                        ul.append(
                            $('<li>', {
                                'data-id': folder.global_id
                            }).append(
                                $('<a>', {
                                    'href': '#',
                                    'text': folder.title,
                                    'data-id': folder.global_id
                                }).on('click', function () {
                                    nsc_select_folder.find('li').removeClass('nsc-aside-list-selected').filter(this.closest('li')).addClass('nsc-aside-list-selected');
                                    nimbusShare.setUploadFolder({id: $(this).data('id'), title: $(this).text()});
                                    return false;
                                })
                            ).append(
                                $('<span>', {
                                    'class': 'nsc-icon nsc-fast-send',
                                    'title': chrome.i18n.getMessage("tooltipUploadTo") + ' ' + folder.title,
                                    'data-id': folder.global_id
                                }).on('click', function (e) {
                                    $('#nsc_send').data('channel', $(this).data('id')).trigger('click');
                                    nimbusShare.setUploadFolder({id: $(this).data('id'), title: $(this).data('text')});
                                })
                            )
                        );
                    }

                    if (is_select) {
                        nsc_select_folder.find('li[data-id="' + is_select.global_id + '"]').addClass('nsc-aside-list-selected');
                    } else {
                        let folder = folders[0];
                        nimbusShare.setUploadFolder({id: folder.global_id, title: folder.title});
                        nsc_select_folder.find('li[data-id="' + folder.global_id + '"]').addClass('nsc-aside-list-selected');
                    }

                    if (!is_loading) nsc_select_folder.removeClass('loading');

                    cb && cb(true)
                });
            },
            info: function (cb) {
                nimbusShare.server.user.info(function (info) {
                    if (info.errorCode !== 0) return;

                    nimbusShare.info.id = info.body.user_id;

                    // if (info.body.premium.is_business) {
                    nimbusShare.info.premium = !!info.body.premium.active;
                    // nimbusShare.info.usage.current = +info.body.usage.notes.current;
                    // nimbusShare.info.usage.max = +info.body.usage.notes.max;
                    // nimbusShare.info.limits.NOTES_MAX_SIZE = +info.body.limits.NOTES_MAX_SIZE;
                    // nimbusShare.info.limits.NOTES_MONTH_USAGE_QUOTA = +info.body.limits.NOTES_MONTH_USAGE_QUOTA;
                    // nimbusShare.info.limits.NOTES_MAX_ATTACHMENT_SIZE = +info.body.limits.NOTES_MAX_ATTACHMENT_SIZE;

                    let progress = info.body.usage.notes.current / info.body.usage.notes.max * 100;
                    let $usage_group = $('#nsc_nimbus_usage_group');//.removeClass('nsc-hide');

                    $usage_group.find('.nsc-aside-usage-text').text(chrome.i18n.getMessage("nimbusLimitUsage") + ' ' + window.nimbus_core.formatBytes(info.body.usage.notes.current) + ' ' + chrome.i18n.getMessage("nimbusLimitOf") + ' ' + window.nimbus_core.formatBytes(info.body.usage.notes.max));
                    $usage_group.find('.nsc-aside-usage-line-colored').width(progress);
                    $('#nsc_nimbus_email').text(info.body.login);
                    $('#nsc_nimbus_private_share').prop('checked', localStorage.nimbusShare === 'true');

                    if (progress > 90) {
                        $('#nsc_nimbus_upgrade_pro').removeClass('nsc-hide');
                        $usage_group.find('.nsc-aside-usage-line-colored').css({background: '#ff0000'});
                    }

                    cb && cb(info);
                });
            }
        },
        init: function (cb) {
            nimbusShare.server.user.authState(function (res) {
                if (res.errorCode === 0 && res.body && res.body.authorized) {
                    nimbusShare.show.info(function () {
                        nimbusShare.server.organization.getAll(function () {
                            nimbusShare.server.workspaces.getAll(function () {
                                nimbusShare.show.organization();
                                nimbusShare.show.workspaces();
                                nimbusShare.show.folders(true, function () {
                                    $('#nsc_nimbus_aside_loader').addClass('nsc-hide');
                                    $('#nsc_select_organization').removeClass('nsc-hide');
                                    $('#nsc_select_workspaces').removeClass('nsc-hide');
                                    $('#nsc_select_folder').removeClass('nsc-hide');

                                    cb && cb(true)
                                });
                            })
                        });

                        if (localStorage.getItem('nimbusPanel') === 'true') {
                            nimbus_screen.togglePanel('nimbus');
                        }
                    });
                } else cb && cb(false)
            });
        }
    };

}
// });