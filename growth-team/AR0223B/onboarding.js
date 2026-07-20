(function () {
  "use strict";

  var TOTAL_STEPS = 3;
  var currentStep = 1;

  var step1Confirmed = false; // gated by clicking "Download the desktop app"
  var step2TimerStarted = false; // gated by pressing play on the timer

  var sidebar = document.getElementById("sidebar-toggle");
  var segmentsRoot = document.getElementById("segments");
  var segments = document.querySelectorAll("#segments .onboarding-segments__item");
  var btnBack = document.getElementById("btn-back");
  var btnContinue = document.getElementById("btn-continue");
  var btnExplore = document.getElementById("btn-explore");
  var continueTooltip = document.getElementById("continue-tooltip");
  var onboardingRoot = document.getElementById("onboarding");
  var mainAction = document.getElementById("main-action");

  var stepPanels = {
    1: document.getElementById("step-panel-1"),
    2: document.getElementById("step-panel-2"),
    3: document.getElementById("step-panel-3"),
  };

  var STEP_COPY = {
    1: {
      title: "Download the desktop app",
      body: "This is used to track time to your projects and tasks",
    },
    2: {
      title: "Install the desktop app and track time to a project",
      body: "Start the timer on the desktop app to confirm your setup.",
    },
    3: {
      title: "Get familiar with Hubstaff",
      body: "Check out the video below and learn more about how to use Hubstaff",
    },
  };

  // Tooltip copy for a disabled Continue — only steps with a real gate the user
  // can act on need one. Step 2 now resolves on its own (no button to click),
  // so it has no tooltip.
  var CONTINUE_TOOLTIP_COPY = {
    1: "Click the Download button for the desktop app to continue",
  };

  function isContinueUnlocked() {
    if (currentStep === 1) return step1Confirmed;
    if (currentStep === 2) return step2TimerStarted;
    return true;
  }

  function setContinueButtonContent() {
    btnContinue.textContent = "";
    var label = document.createElement("span");
    label.textContent = currentStep === TOTAL_STEPS ? "Finish" : "Continue";
    btnContinue.appendChild(label);
    var icon = document.createElement("span");
    icon.className = "material-symbols-rounded";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = currentStep === TOTAL_STEPS ? "check" : "arrow_forward";
    btnContinue.appendChild(icon);
  }

  function renderStep() {
    // Copy
    document.getElementById("onboarding-title").textContent = STEP_COPY[currentStep].title;
    document.getElementById("onboarding-body").textContent = STEP_COPY[currentStep].body;

    // Progress bar (skeleton template's discrete segments)
    segments.forEach(function (segment, index) {
      segment.classList.toggle("is-complete", index < currentStep);
    });
    segmentsRoot.setAttribute("aria-valuenow", String(currentStep));

    // Step panels
    Object.keys(stepPanels).forEach(function (key) {
      stepPanels[key].hidden = Number(key) !== currentStep;
    });

    // Main action button only exists on step 1
    onboardingRoot.classList.toggle("has-main-action", currentStep === 1);

    // Back button hidden on step 1 (nothing to go back to) and on the final step
    btnBack.hidden = currentStep === 1 || currentStep === TOTAL_STEPS;
    btnBack.disabled = currentStep === 1;

    // Hide the skip option during Step 2 — letting someone bail before they've
    // confirmed the timer works undermines the whole point of this step.
    btnExplore.hidden = currentStep === 2;

    // Continue/Finish button state
    setContinueButtonContent();
    btnContinue.disabled = !isContinueUnlocked();

    // Tooltip explains why Continue is disabled, on any step that has a real gate
    var tooltipText = CONTINUE_TOOLTIP_COPY[currentStep];
    continueTooltip.hidden = !(tooltipText && btnContinue.disabled);
    if (tooltipText) {
      continueTooltip.textContent = tooltipText;
    }

    // Step 2's tracking simulation starts the moment the step is shown —
    // there's no button for the user to press, it just resolves on its own.
    if (currentStep === 2) {
      startPendingSimulation();
    }
  }

  sidebar.addEventListener("click", function () {
    var expanded = sidebar.classList.toggle("is-expanded");
    sidebar.setAttribute("aria-expanded", String(expanded));
    sidebar.setAttribute("aria-label", expanded ? "Collapse sidebar" : "Expand sidebar");
  });

  btnBack.addEventListener("click", function () {
    if (currentStep > 1) {
      currentStep -= 1;
      renderStep();
    }
  });

  btnContinue.addEventListener("click", function () {
    if (btnContinue.disabled) return;
    if (currentStep < TOTAL_STEPS) {
      currentStep += 1;
      renderStep();
    } else {
      window.dispatchEvent(new CustomEvent("onboarding:complete"));
    }
  });

  btnExplore.addEventListener("click", function () {
    window.dispatchEvent(new CustomEvent("onboarding:skip"));
  });

  // ── Step 1: "Download the desktop app" main action ──────────────────────

  mainAction.addEventListener("click", function () {
    if (step1Confirmed) return;
    step1Confirmed = true;
    mainAction.disabled = true;
    mainAction.classList.add("is-confirmed");
    mainAction.textContent = "";
    var label = document.createElement("span");
    label.textContent = "Downloaded";
    mainAction.appendChild(label);
    var icon = document.createElement("span");
    icon.className = "material-symbols-rounded";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "check";
    mainAction.appendChild(icon);
    if (currentStep === 1) {
      btnContinue.disabled = false;
      continueTooltip.hidden = true;
    }
  });

  // ── Step 2: passive tracking simulation ──────────────────────────────────
  // There's no real desktop app to detect here, and a web page can't actually
  // start/stop it anyway — so this never exposes a play/pause control. It just
  // waits, then flips to "tracking" on its own, the way the real detection
  // would surface once the desktop app reports in.

  var PENDING_DELAY_MS = 3500;

  var timerBar = document.getElementById("timer-bar");
  var timerBarReadout = document.getElementById("timer-bar-readout");
  var timerStatusIcon = document.getElementById("timer-status-icon");
  var timerStatusText = document.getElementById("timer-status-text");
  var taskRowStatus = document.getElementById("task-row-status");
  var taskRowTime = document.getElementById("task-row-time");

  var elapsedSeconds = 0;
  var timerInterval = null;
  var pendingTimeout = null;

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function formatHHMMSS(totalSeconds) {
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    return pad(h) + ":" + pad(m) + ":" + pad(s);
  }

  function formatShort(totalSeconds) {
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    return h > 0 ? h + ":" + pad(m) + ":" + pad(s) : m + ":" + pad(s);
  }

  function tick() {
    elapsedSeconds += 1;
    timerBarReadout.textContent = formatHHMMSS(elapsedSeconds);
    taskRowTime.textContent = formatShort(elapsedSeconds);
  }

  function beginTracking() {
    timerBar.classList.add("is-running");
    timerStatusIcon.classList.remove("timer-status__icon--pending");
    timerStatusIcon.classList.add("timer-status__icon--tracking");
    timerStatusIcon.textContent = "fiber_manual_record";
    timerStatusText.textContent = "Tracking time…";
    taskRowStatus.classList.add("task-row__status--tracking");
    timerBarReadout.textContent = formatHHMMSS(elapsedSeconds);
    taskRowTime.textContent = formatShort(elapsedSeconds);
    if (!timerInterval) {
      timerInterval = window.setInterval(tick, 1000);
    }

    if (!step2TimerStarted) {
      step2TimerStarted = true;
      if (currentStep === 2) {
        btnContinue.disabled = false;
      }
    }
  }

  function startPendingSimulation() {
    if (step2TimerStarted || pendingTimeout) return;
    pendingTimeout = window.setTimeout(function () {
      pendingTimeout = null;
      beginTracking();
    }, PENDING_DELAY_MS);
  }

  // ── Step 2: expandable "need help" panel ─────────────────────────────────

  var helpPanelTrigger = document.getElementById("help-panel-trigger");
  var helpPanelContent = document.getElementById("help-panel-content");
  var helpPanelChevron = document.getElementById("help-panel-chevron");
  var helpPanelSkip = document.getElementById("help-panel-skip");

  helpPanelTrigger.addEventListener("click", function () {
    var expanded = helpPanelTrigger.getAttribute("aria-expanded") === "true";
    helpPanelTrigger.setAttribute("aria-expanded", String(!expanded));
    helpPanelContent.hidden = expanded;
    helpPanelChevron.textContent = expanded ? "expand_more" : "expand_less";
  });

  helpPanelSkip.addEventListener("click", function () {
    window.dispatchEvent(new CustomEvent("onboarding:skip"));
  });

  renderStep();
})();
