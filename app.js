// ── Config ──────────────────────────────────────────────────────────────────
// PUBLIC_KEY is the account-level Vapi public key (Vapi dashboard → Account → API Keys).
// ASSISTANT_ID is per-assistant (Vapi dashboard → Assistants → select → copy ID).
var PUBLIC_KEY = "07a2396d-9738-4838-af99-f6a18d946f0b";
var ASSISTANT_ID = "e899f5fc-f53e-4318-909b-7876af1accdc";
// ────────────────────────────────────────────────────────────────────────────

var configured = ASSISTANT_ID.indexOf("REPLACE_WITH") !== 0;

var callBtn = document.getElementById("call-btn");
var btnLabel = document.getElementById("call-btn-label");
var btnIcon = callBtn.querySelector(".btn__icon");
var statusDot = document.getElementById("status-dot");
var statusLbl = document.getElementById("status-label");

var calling = false;
var vapi = null;

function setStatus(modifier, label) {
  statusDot.className = "status-pill__dot";
  if (modifier) statusDot.classList.add("status-pill__dot--" + modifier);
  statusLbl.textContent = label;
}

function setIdle() {
  calling = false;
  callBtn.className = "btn btn--green";
  callBtn.disabled = false;
  btnLabel.textContent = "Click to Call";
  btnIcon.textContent = "📞";
  setStatus("", "Ready to connect");
}

function setConnecting() {
  calling = true;
  callBtn.disabled = true;
  btnLabel.textContent = "Connecting…";
  btnIcon.textContent = "⏳";
  setStatus("connecting", "Connecting…");
}

function setActive() {
  calling = true;
  callBtn.className = "btn btn--danger";
  callBtn.disabled = false;
  btnLabel.textContent = "End Call";
  btnIcon.textContent = "🔴";
  setStatus("active", "On a call");
}

function setError() {
  calling = false;
  callBtn.disabled = true;
  setStatus("error", "Connection failed");
  setTimeout(setIdle, 3000);
}

function setUnconfigured() {
  calling = false;
  callBtn.disabled = true;
  btnLabel.textContent = "Click to Call";
  btnIcon.textContent = "📞";
  setStatus("error", "Assistant not configured");
}

function setupButton() {
  callBtn.addEventListener("click", function () {
    if (calling) {
      vapi.stop();
    } else {
      setConnecting();
      vapi.start(ASSISTANT_ID);
    }
  });
}

if (!configured) {
  // No assistant wired up yet — keep the page intact but disable the button
  // rather than letting a click fail with a generic connection error.
  console.warn(
    "[Motorway AI Support] ASSISTANT_ID is still a placeholder. Set it in app.js to enable voice calls."
  );
  setUnconfigured();
} else {
  // Load Vapi via the official html-script-tag CDN loader
  (function (d, t) {
    var g = d.createElement(t);
    var s = d.getElementsByTagName(t)[0];
    g.src =
      "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
    g.defer = true;
    g.async = true;
    s.parentNode.insertBefore(g, s);

    g.onload = function () {
      vapi = window.vapiSDK.run({
        apiKey: PUBLIC_KEY,
        assistant: ASSISTANT_ID,
        config: {
          position: "bottom-right",
          offset: "40px",
          width: "50px",
          height: "50px",
          idle: { color: "transparent", type: "round", title: "", subtitle: "", icon: "" },
          loading: { color: "transparent", type: "round", title: "", subtitle: "", icon: "" },
          active: { color: "transparent", type: "round", title: "", subtitle: "", icon: "" },
        },
      });

      vapi.on("call-start", setActive);
      vapi.on("call-end", setIdle);
      vapi.on("error", setError);

      setupButton();
    };
  })(document, "script");
}
