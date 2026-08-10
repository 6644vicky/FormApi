(function () {
  var scriptEl = document.currentScript;
  if (!scriptEl) return;

  var eventId = scriptEl.dataset.eventId;
  if (!eventId) return;

  var origin = new URL(scriptEl.src).origin;
  var label = scriptEl.dataset.label || "Book a meeting";
  var align = scriptEl.dataset.align === "left" ? "left" : "right";

  var style = document.createElement("style");
  style.innerHTML =
    "#booking-widget-btn{position:fixed;bottom:24px;" + align + ":24px;background:#27272a;color:#fff;padding:14px 24px;border-radius:50px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-weight:500;border:none;font-size:14px;z-index:2147483000;transition:background 0.2s ease;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}" +
    "#booking-widget-btn:hover{background:#3f3f46;}" +
    "#booking-widget-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:2147482999;}" +
    "#booking-widget-overlay.open{display:block;}" +
    "#booking-widget-modal{display:none;position:fixed;bottom:24px;" + align + ":24px;width:760px;max-width:92vw;height:600px;max-height:85vh;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.25);z-index:2147483000;background:#fff;}" +
    "#booking-widget-modal.open{display:block;}" +
    "#booking-widget-modal iframe{width:100%;height:100%;border:none;}" +
    "#booking-widget-close{position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:50%;border:none;background:rgba(0,0,0,0.06);cursor:pointer;font-size:14px;color:#3f3f46;z-index:1;}" +
    "@media (max-width: 640px){#booking-widget-modal{top:0;left:0;right:0;bottom:0;width:100%;height:100%;max-width:100%;max-height:100%;border-radius:0;}}";
  document.head.appendChild(style);

  var btn = document.createElement("button");
  btn.id = "booking-widget-btn";
  btn.textContent = label;

  var overlay = document.createElement("div");
  overlay.id = "booking-widget-overlay";

  var modal = document.createElement("div");
  modal.id = "booking-widget-modal";
  modal.innerHTML = '<button id="booking-widget-close" aria-label="Close">&#10005;</button><iframe src="about:blank"></iframe>';

  document.body.appendChild(btn);
  document.body.appendChild(overlay);
  document.body.appendChild(modal);

  var iframe = modal.querySelector("iframe");
  var closeBtn = modal.querySelector("#booking-widget-close");

  function open() {
    if (iframe.src === "about:blank") iframe.src = origin + "/book/" + eventId;
    modal.classList.add("open");
    overlay.classList.add("open");
  }

  function close() {
    modal.classList.remove("open");
    overlay.classList.remove("open");
  }

  btn.addEventListener("click", open);
  overlay.addEventListener("click", close);
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
})();
