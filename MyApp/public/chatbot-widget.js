(function () {
  var scriptEl = document.currentScript;
  if (!scriptEl) return;

  var config = {
    apiBase: new URL(scriptEl.src).origin,
    name: scriptEl.dataset.name || "Chat",
    welcomeMessage: scriptEl.dataset.welcomeMessage || "Hi there! 👋 How can I help you today?",
    placeholder: scriptEl.dataset.placeholder || "Type your message...",
    footerText: scriptEl.dataset.footerText || "",
    tone: scriptEl.dataset.tone || "Professional",
    responseLength: scriptEl.dataset.responseLength || "Standard",
    businessContext: scriptEl.dataset.businessContext || "",
    align: scriptEl.dataset.align === "left" ? "left" : "right",
  };

  var messages = [];
  var isSending = false;

  var style = document.createElement("style");
  style.innerHTML =
    "#weav-chatbot-launcher{position:fixed;bottom:24px;" + config.align + ":24px;width:56px;height:56px;border-radius:50%;background:#27272a;color:#fff;border:none;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,0.25);z-index:2147483000;display:flex;align-items:center;justify-content:center;font-size:24px;transition:background 0.2s ease;}" +
    "#weav-chatbot-launcher:hover{background:#3f3f46;}" +
    "#weav-chatbot-panel{position:fixed;bottom:92px;" + config.align + ":24px;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 140px);background:#fff;border-radius:20px;box-shadow:0 20px 40px rgba(0,0,0,0.18);z-index:2147483000;display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}" +
    "#weav-chatbot-panel.open{display:flex;animation:weav-chatbot-slideup 0.2s ease;}" +
    "@keyframes weav-chatbot-slideup{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}" +
    "#weav-chatbot-header{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #f4f4f5;}" +
    "#weav-chatbot-avatar{width:28px;height:28px;border-radius:50%;background:#27272a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0;}" +
    "#weav-chatbot-title{flex:1;font-size:15px;font-weight:600;color:#27272a;}" +
    "#weav-chatbot-close{background:none;border:none;cursor:pointer;color:#71717a;font-size:16px;padding:4px;}" +
    "#weav-chatbot-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;}" +
    ".weav-chatbot-row{display:flex;gap:10px;align-items:flex-start;}" +
    ".weav-chatbot-row.user{justify-content:flex-end;}" +
    ".weav-chatbot-bubble{max-width:80%;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.4;white-space:pre-wrap;word-break:break-word;}" +
    ".weav-chatbot-row.assistant .weav-chatbot-bubble{background:#f4f4f5;color:#27272a;}" +
    ".weav-chatbot-row.user .weav-chatbot-bubble{background:#27272a;color:#fff;}" +
    ".weav-chatbot-avatar-sm{width:24px;height:24px;border-radius:50%;background:#e4e4e7;color:#3f3f46;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0;margin-top:2px;}" +
    "#weav-chatbot-inputrow{display:flex;align-items:center;gap:6px;border:1px solid #e4e4e7;border-radius:999px;margin:0 16px 12px;padding:4px 6px 4px 14px;}" +
    "#weav-chatbot-input{flex:1;border:none;outline:none;font-size:14px;padding:8px 0;font-family:inherit;}" +
    "#weav-chatbot-send{width:28px;height:28px;border-radius:50%;border:none;cursor:pointer;background:#e4e4e7;color:#71717a;display:flex;align-items:center;justify-content:center;flex-shrink:0;}" +
    "#weav-chatbot-send.active{background:#27272a;color:#fff;cursor:pointer;}" +
    "#weav-chatbot-footer{text-align:center;font-size:12px;color:#a1a1aa;margin:0 16px 10px;}" +
    "#weav-chatbot-powered{text-align:center;font-size:12px;color:#71717a;padding:10px;border-top:1px solid #f4f4f5;background:#fafafa;}";
  document.head.appendChild(style);

  var launcher = document.createElement("button");
  launcher.id = "weav-chatbot-launcher";
  launcher.setAttribute("aria-label", "Open chat");
  launcher.innerHTML = "&#128172;";

  var panel = document.createElement("div");
  panel.id = "weav-chatbot-panel";
  panel.innerHTML =
    '<div id="weav-chatbot-header">' +
      '<div id="weav-chatbot-avatar"></div>' +
      '<div id="weav-chatbot-title"></div>' +
      '<button id="weav-chatbot-close" aria-label="Close chat">&#10005;</button>' +
    "</div>" +
    '<div id="weav-chatbot-messages"></div>' +
    '<div id="weav-chatbot-inputrow">' +
      '<input id="weav-chatbot-input" type="text" />' +
      '<button id="weav-chatbot-send" aria-label="Send message">&#8593;</button>' +
    "</div>" +
    (config.footerText ? '<div id="weav-chatbot-footer"></div>' : "") +
    '<div id="weav-chatbot-powered">Powered by Weav</div>';

  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  panel.querySelector("#weav-chatbot-avatar").textContent = config.name.charAt(0).toUpperCase();
  panel.querySelector("#weav-chatbot-title").textContent = config.name;
  panel.querySelector("#weav-chatbot-input").placeholder = config.placeholder;
  if (config.footerText) panel.querySelector("#weav-chatbot-footer").textContent = config.footerText;

  var messagesEl = panel.querySelector("#weav-chatbot-messages");
  var inputEl = panel.querySelector("#weav-chatbot-input");
  var sendBtn = panel.querySelector("#weav-chatbot-send");

  function renderMessages() {
    messagesEl.innerHTML = "";
    var all = [{ role: "assistant", content: config.welcomeMessage }].concat(messages);
    all.forEach(function (message) {
      var row = document.createElement("div");
      row.className = "weav-chatbot-row " + message.role;
      if (message.role === "assistant") {
        var avatar = document.createElement("div");
        avatar.className = "weav-chatbot-avatar-sm";
        avatar.textContent = config.name.charAt(0).toUpperCase();
        row.appendChild(avatar);
      }
      var bubble = document.createElement("div");
      bubble.className = "weav-chatbot-bubble";
      bubble.textContent = message.content;
      row.appendChild(bubble);
      messagesEl.appendChild(row);
    });
    if (isSending) {
      var typingRow = document.createElement("div");
      typingRow.className = "weav-chatbot-row assistant";
      var typingAvatar = document.createElement("div");
      typingAvatar.className = "weav-chatbot-avatar-sm";
      typingAvatar.textContent = config.name.charAt(0).toUpperCase();
      var typingBubble = document.createElement("div");
      typingBubble.className = "weav-chatbot-bubble";
      typingBubble.style.color = "#a1a1aa";
      typingBubble.textContent = "Typing...";
      typingRow.appendChild(typingAvatar);
      typingRow.appendChild(typingBubble);
      messagesEl.appendChild(typingRow);
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function updateSendButtonState() {
    if (inputEl.value.trim() !== "" && !isSending) {
      sendBtn.classList.add("active");
    } else {
      sendBtn.classList.remove("active");
    }
  }

  function sendMessage() {
    var text = inputEl.value.trim();
    if (text === "" || isSending) return;

    messages.push({ role: "user", content: text });
    inputEl.value = "";
    isSending = true;
    updateSendButtonState();
    renderMessages();

    fetch(config.apiBase + "/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages,
        tone: config.tone,
        responseLength: config.responseLength,
        businessContext: config.businessContext,
      }),
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) throw new Error(data.error || "The chatbot failed to respond.");
          return data;
        });
      })
      .then(function (data) {
        messages.push({ role: "assistant", content: data.reply });
      })
      .catch(function () {
        messages.push({ role: "assistant", content: "Sorry, I couldn't respond just now. Please try again." });
      })
      .finally(function () {
        isSending = false;
        updateSendButtonState();
        renderMessages();
      });
  }

  launcher.addEventListener("click", function () {
    panel.classList.add("open");
    launcher.style.display = "none";
    inputEl.focus();
  });

  panel.querySelector("#weav-chatbot-close").addEventListener("click", function () {
    panel.classList.remove("open");
    launcher.style.display = "flex";
  });

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });
  inputEl.addEventListener("input", updateSendButtonState);

  renderMessages();
  updateSendButtonState();
})();
