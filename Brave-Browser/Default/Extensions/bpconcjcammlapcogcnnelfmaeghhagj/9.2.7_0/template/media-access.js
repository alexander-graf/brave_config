$(function () {
    let constraints = {};
    if (/\?(.+)$/.test(window.location.href)) constraints = JSON.parse(window.location.href.match(/\?(.+)$/)[1].replace(/%22/g, '"'));

    window.navigator.getUserMedia(constraints,
        function (stream) {
            stream.stop();
            chrome.extension.getBackgroundPage().videoRecorder.mediaAccess();
            window.close();
        },
        function () {
            $('.access_error').show();
        });
});