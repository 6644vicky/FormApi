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
    "#booking-widget-btn{position:fixed;bottom:24px;" + align + ":24px;background:#27272a;color:#fff;padding:14px 24px;border-radius:50px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,0.24);font-weight:500;border:none;font-size:14px;z-index:2147483001;transition:background 0.2s ease,width 0.2s ease,height 0.2s ease;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}" +
    "#booking-widget-btn:hover{background:#3f3f46;}" +
    "#booking-widget-btn.open{width:56px;height:56px;padding:0;background:#fff;color:#18181b;font-size:30px;line-height:1;display:flex;align-items:center;justify-content:center;}" +
    "#booking-widget-btn.open:hover{background:#f4f4f5;}" +
    "#booking-widget-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:2147482999;}" +
    "#booking-widget-overlay.open{display:block;}" +
    "#booking-widget-modal{display:none;position:fixed;bottom:96px;" + align + ":24px;width:400px;max-width:calc(100vw - 32px);height:704px;max-height:calc(100vh - 120px);border-radius:24px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,0.26);z-index:2147483000;background:#fff;}" +
    "#booking-widget-modal.open{display:block;}" +
    "#booking-widget-modal iframe{width:100%;height:100%;border:none;}" +
    "@media (max-width: 480px){#booking-widget-modal{top:16px;left:16px;right:16px;bottom:96px;width:auto;height:auto;max-width:none;max-height:none;border-radius:20px;}}";
  document.head.appendChild(style);

  var btn = document.createElement("button");
  btn.id = "booking-widget-btn";
  btn.textContent = label;

  var overlay = document.createElement("div");
  overlay.id = "booking-widget-overlay";

  var modal = document.createElement("div");
  modal.id = "booking-widget-modal";
  modal.innerHTML = '<iframe title="Booking widget" src="about:blank"></iframe>';

  document.body.appendChild(btn);
  document.body.appendChild(overlay);
  document.body.appendChild(modal);

  var iframe = modal.querySelector("iframe");

  function open() {
    if (iframe.src === "about:blank") iframe.src = origin + "/book/" + eventId + "?mode=widget";
    modal.classList.add("open");
    overlay.classList.add("open");
    btn.classList.add("open");
    btn.innerHTML = "&#8964;";
    btn.setAttribute("aria-label", "Close booking widget");
  }

  function close() {
    modal.classList.remove("open");
    overlay.classList.remove("open");
    btn.classList.remove("open");
    btn.textContent = label;
    btn.setAttribute("aria-label", label);
  }

  btn.setAttribute("aria-label", label);
  btn.addEventListener("click", function () {
    if (modal.classList.contains("open")) close();
    else open();
  });
  overlay.addEventListener("click", close);
  window.addEventListener("message", function (event) {
    if (event.origin === origin && event.data && event.data.type === "booking-widget-close") close();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
})();
