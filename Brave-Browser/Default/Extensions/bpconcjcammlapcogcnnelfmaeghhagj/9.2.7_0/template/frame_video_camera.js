var p = window.location.href.match(/\?([^&]+)&?(\w+)?/);
var pageUrl = p[1];
var videoCamera = p[2];

window.navigator.getUserMedia({
        video: {
            width: 1280,
            height: 720,
            deviceId: videoCamera ? {exact: videoCamera} : undefined
        }
    }, function (stream) {
        let video = document.getElementsByTagName('video')[0];
        video.onloadedmetadata = function () {
            // let canvas = document.createElement('canvas');
            // let ctx = canvas.getContext('2d');
            // canvas.width = video.videoWidth;
            // canvas.height = video.videoHeight;
            // ctx.drawImage(video, 0, 0);
            //
            // canvas.toBlob(function (blob) {
            //     window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
            //     window.requestFileSystem(window.PERSISTENT, 10 * 1024 * 1024 * 1024, function (fs) {
            //             let truncated = false;
            //             fs.root.getFile('frame_camera.jpg', {create: true}, function (fileEntry) {
            //                 console.log(fileEntry)
            //                 fileEntry.createWriter(function (writer) {
            //                         writer.onwriteend = function (progress) {
            //                             if (!truncated) {
            //                                 truncated = true;
            //                                 this.truncate(this.position);
            //                                 return;
            //                             }
            //                             console.log("Write completed", progress);
            //                         };
            //                         writer.onerror = function (err) {
            //                             console.error("Write failed", err);
            //                         };
            //                         writer.write(blob);
            //
            //                     }, function (err) {
            //                         console.error("Create Writer failed", err);
            //                     }
            //                 );
            //             }, function (err) {
            //                 console.error("Get File failed", err);
            //             });
            //         },
            //         function (err) {
            //             console.error("File System failed", err);
            //         }
            //     );
            // });

            window.parent.postMessage({message: {w: video.videoWidth, h: video.videoHeight}}, pageUrl);
        };
        try {
            video.srcObject = stream;
        } catch (error) {
            video.src = window.URL.createObjectURL(stream);
        }
        video.play();
    }, function (err) {
        console.error('not access camera', err)
    }
);