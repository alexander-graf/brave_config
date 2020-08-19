$(function () {
    let constraints = {};
    if (/\?(.+)$/.test(window.location.href)) constraints = JSON.parse(window.location.href.match(/\?(.+)$/)[1].replace(/%22/g, '"'));

    window.navigator.getUserMedia(constraints,
        function (stream) {
            if (!constraints.media_access) chrome.runtime.sendMessage({operation: 'activate_record', 'key': 'start'});
            stream.stop();
            window.parent.postMessage({message: {nsc_access: true}}, '*');
        },
        function () {
            if (constraints.video) chrome.runtime.sendMessage({operation: 'set_option', key: 'videoCamera', value: 'false'});
            if (constraints.audio) chrome.runtime.sendMessage({operation: 'set_option', key: 'videoMicSoundEnable', value: 'false'});
            if (!constraints.media_access) chrome.runtime.sendMessage({operation: 'activate_record', 'key': 'start'});
            window.parent.postMessage({message: {nsc_access: false}}, '*');
        });
});