let data = {};
if (/\?(.+)$/.test(window.location.href)) data = JSON.parse(window.location.href.match(/\?(.+)$/)[1].replace(/%22/g, '"'));

window.navigator.getUserMedia({video: {deviceId: data.videoSelectedCamera ? {exact: data.videoSelectedCamera} : undefined}},
    function (stream) {
        let video = document.getElementsByTagName('video')[0];
        video.onloadedmetadata = async function () {
            window.parent.postMessage({message: {w: video.videoWidth, h: video.videoHeight}}, data.locationOrigin);
            // if (document.pictureInPictureEnabled && data.videoTypeCapture === 'desktop') {
            //     if (video.hasAttribute('__pip__')) {
            //         await document.exitPictureInPicture();
            //     } else {
            //         await video.requestPictureInPicture();
            //         video.setAttribute('__pip__', true);
            //         video.addEventListener('leavepictureinpicture', event => {
            //             video.removeAttribute('__pip__');
            //         }, {once: true});
            //     }
            // }
        };
        video.oncanplay = function() {
            window.parent.postMessage({message: {w: video.videoWidth, h: video.videoHeight}}, data.locationOrigin);
        };
        video.srcObject = stream;
        video.play();
    }, function (err) {
        console.error('not access camera', err)
    }
);

window.addEventListener("message", function (e) {
    let req = JSON.parse(e.data);
    let watermark = new Image();
    watermark.onload = function () {
        let x, y, shift = 10;
        switch (req.position) {
            case 'lt':
                x = shift;
                y = shift;
                break;
            case 'rt':
                x = window.innerWidth - watermark.width - shift;
                y = shift;
                break;
            case 'lb':
                x = shift;
                y = window.innerHeight - watermark.height - shift;
                break;
            case 'rb':
                x = window.innerWidth - watermark.width - shift;
                y = window.innerHeight - watermark.height - shift;
                break;
            case 'c':
                x = Math.floor((window.innerWidth - watermark.width) / 2);
                y = Math.floor((window.innerHeight - watermark.height) / 2);
                break;
        }

        if ($('#nsc_watermark_video').length) $('#nsc_watermark_video').remove();
        $('body').append($('<img>').attr('src', req.dataUrl).attr('id', 'nsc_watermark_video').css({display: 'block', position: 'fixed', top: y, left: x, 'z-index': 9999999999999}));

        if (req.watermarkEnableTime) {
            let recordTime = req.recordTime || -1000; // 1 sec timeout video
            let watermarkTime = req.watermarkTime * 1000;

            (function checkTime() {
                if (recordTime >= watermarkTime) $('#nsc_watermark_video').remove();
                else {
                    recordTime += 100;
                    window.setTimeout(checkTime, 100);
                }
            })();
        }
    };
    watermark.src = req.dataUrl;
});