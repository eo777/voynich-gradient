window.GRADIENTS_RELEASE = {"version":"2026.10.25.5","build":"453014b3d014","date":"2026-10-25"};
// Release stamp and update check, added to the published copy by publish/publish.py (the workspace app has neither).
// GitHub Pages lets a browser reuse a page for up to ten minutes. Every file a page loads carries a hash of its
// contents (?v=...), so a page always gets the files it was released with; to notice a newer release, this script
// asks for version.json, bypassing the cache, and offers a reload.
(function () {
  'use strict';
  var R = window.GRADIENTS_RELEASE;
  function stamp() {
    var nav = document.querySelector('nav.package-nav');
    if (!nav || nav.querySelector('.release-tag')) return;
    var tag = document.createElement('span');
    tag.className = 'release-tag';
    tag.textContent = 'v' + R.version;
    tag.title = 'Release ' + R.version + ' of ' + R.date + ', build ' + R.build;
    tag.style.cssText = 'margin-left:auto;font-size:12px;color:#62727e;align-self:center';
    nav.appendChild(tag);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', stamp); else stamp();

  if (!/^https?:$/.test(location.protocol) || !window.fetch) return;   // a copy opened from disk has no server to ask
  var EVERY = 10 * 60 * 1000, last = 0, offered = false;
  function check() {
    if (offered || Date.now() - last < EVERY) return;
    last = Date.now();
    fetch('version.json?t=' + last, {cache: 'no-store'})
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) { if (v && v.build && v.build !== R.build) offer(v); })
      .catch(function () {});
  }
  function offer(v) {
    offered = true;
    var style = document.createElement('style');
    style.textContent = '.release-update{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:1000;display:flex;'
      + 'align-items:center;gap:10px;max-width:calc(100% - 32px);padding:8px 8px 8px 14px;border:1px solid #cad8d4;'
      + 'border-radius:10px;background:#fff;color:#21313c;box-shadow:0 4px 16px rgba(0,0,0,.12);font:13px/1.4 system-ui,sans-serif}'
      + '.release-update button{font:inherit;cursor:pointer;border:1px solid #087e83;border-radius:6px;padding:3px 10px;'
      + 'background:#087e83;color:#fff}'
      + '.release-update button.release-close{border-color:transparent;background:transparent;color:#62727e;padding:3px 6px}';
    document.head.appendChild(style);
    var bar = document.createElement('div');
    bar.className = 'release-update';
    bar.setAttribute('role', 'status');
    var text = document.createElement('span');
    text.textContent = 'Version ' + v.version + ' is available.';
    var reload = document.createElement('button');
    reload.type = 'button'; reload.textContent = 'Reload';
    reload.onclick = function () { location.reload(); };
    var close = document.createElement('button');
    close.type = 'button'; close.className = 'release-close'; close.textContent = '×';
    close.setAttribute('aria-label', 'Dismiss');
    close.onclick = function () { bar.remove(); };
    bar.append(text, reload, close);
    document.body.appendChild(bar);
  }
  window.addEventListener('load', function () { setTimeout(check, 1500); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') check(); });
})();
