/*
 *  This file is part of Stream Recorder <https://www.hlsloader.com/>
 *
 *
 *  - Release Note (v1.2.2) to Chrome Web Store Team -
 *
 *  Because Chrome85 blocks CORS requests in content scripts, we have fixed the affected code in this extension.
 *  Technically, We moved the cross-origin fetches to the background page.
 *  Note that the cross-origin fetches are only called by the content script of our own pages, never run on an unspecified page.
 *  Therefore, we believe it is highly unlikely that a compromised renderer process will hijack our content script.
 *  This is a quick fix, so we will be working on a more secure and faster implementation in the near future.
 *  Thanks in advance.
 *
 */

'use strict';
(async() => {
  const WebExtensions = navigator.userAgent.includes("Chrome") ? chrome : browser;
  if (window === window.top) {
    WebExtensions.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.cmd === "cmd_get_title") {
        const favicon = "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(location.origin);
        const titleObj = document.querySelector("title");
        let title = null;
        if (titleObj) {
          title = titleObj.textContent.replace(/^[\s\u3000]+|[\s\u3000]+$/g, "").replace(/[^\S\n\r]{2,}/, " ").replace(/[\r\n]/g, "").replace(/'/g, "");
        }
        if (!title) {
          title = WebExtensions.i18n.getMessage("manifest_name");
        }
        sendResponse({title, favicon});
      }
    });
  }
  const targetId = Number(localStorage._intercept_);
  if (!targetId) {
    return;
  }
  setTimeout(() => {
    delete localStorage._intercept_;
  }, 10 * 1000);
  const eeid = "_intercepter_";
  const transposer = document.createElement("div");
  transposer.id = eeid;
  transposer.addEventListener("click", (evt) => {
    const params = {targetId};
    for (const name of transposer.getAttributeNames()) {
      params[name] = transposer.getAttribute(name);
    }
    WebExtensions.runtime.sendMessage({cmd:"ondata", params});
  });
  document.documentElement.appendChild(transposer);
  const _s = "(" + (() => {
    const transposer = document.querySelector("#_intercepter_");
    if (!transposer) {
      return;
    }
    const transpose = (params) => {
      for (const key in params) {
        transposer.setAttribute(key, params[key]);
      }
      transposer.click();
    };
    const now = () => {
      return (new Date).getTime();
    };
    const mediasource = MediaSource;
    MediaSource = class extends mediasource {
      constructor() {
        super(arguments);
        this._mediaSourceId = Math.floor(Math.random() * 10000000);
      }
      addSourceBuffer(mimeType) {
        const sourceBuffer = super.addSourceBuffer.apply(this, arguments);
        const appendBuffer = sourceBuffer.appendBuffer;
        sourceBuffer._bufferId = Math.floor(Math.random() * 10000000);
        const _self = this;
        sourceBuffer.appendBuffer = function(buffer) {
          if (buffer.length || buffer.byteLength) {
            const a = new Blob([buffer]);
            const url = URL.createObjectURL(a);
            transpose({url, mimeType, mediaSourceId:_self._mediaSourceId, bufferId:this._bufferId, timestamp:now()});
            setTimeout(() => {
              URL.revokeObjectURL(url);
            }, 60 * 1000);
          }
          appendBuffer.apply(this, arguments);
        };
        sourceBuffer.addEventListener("abort", function() {
          transpose({url:"abort", mimeType:"", mediaSourceId:_self._mediaSourceId, bufferId:this._bufferId, timestamp:now()});
        });
        return sourceBuffer;
      }
    };
  }).toString() + ")();";
  const script = new Blob([_s], {type:"text/javascript"});
  const s = document.createElement("script");
  s.innerText = _s;
  setTimeout(() => {
    document.head.appendChild(s);
  }, 0);
})();

