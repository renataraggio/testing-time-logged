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
  var btnSkip = document.getElementById("btn-skip");
  var btnContinue = document.getElementById("btn-continue");
  var continueTooltip = document.getElementById("continue-tooltip");
  var onboardingRoot = document.getElementById("onboarding");
  var mainAction = document.getElementById("main-action");
  var step2AlertText = document.getElementById("step2-alert-text");

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
    3: {
      title: "Get familiar with Hubstaff",
      body: "Check out the video below and learn more about how to use Hubstaff",
    },
  };

  // Step 2's copy switches once tracking is confirmed — before: generic
  // "start the timer" instructions; after: a demo of what tracking looks like.
  var STEP2_COPY_BEFORE = {
    title: "Install the desktop app and track time to a project",
    body: "Start the timer on the desktop app to confirm your setup",
    alert: "This timer will turn blue when you start tracking time. We’ll make sure everything is set up right.",
  };
  var STEP2_COPY_AFTER = {
    title: "Next, you’ll track time using the Hubstaff desktop app",
    body: "After installing the app you downloaded on the previous step, follow the instructions below to track time",
    alert: "Here’s a demo of how to track time using the Hubstaff app",
  };

  // Tooltip copy for a disabled Continue — only steps with a real gate need one
  var CONTINUE_TOOLTIP_COPY = {
    1: "Click the Download button for the desktop app to continue",
    2: "Wait for the desktop app to confirm tracking",
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

  function applyStep2Copy() {
    var copy = step2TimerStarted ? STEP2_COPY_AFTER : STEP2_COPY_BEFORE;
    document.getElementById("onboarding-title").textContent = copy.title;
    document.getElementById("onboarding-body").textContent = copy.body;
    step2AlertText.textContent = copy.alert;
  }

  function renderStep() {
    // Copy
    if (currentStep === 2) {
      applyStep2Copy();
    } else {
      document.getElementById("onboarding-title").textContent = STEP_COPY[currentStep].title;
      document.getElementById("onboarding-body").textContent = STEP_COPY[currentStep].body;
    }

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

    // Back button hidden only on step 1 (nothing to go back to)
    btnBack.hidden = currentStep === 1;
    btnBack.disabled = currentStep === 1;

    // Skip only makes sense on step 2 (project/tracking edge cases)
    btnSkip.hidden = currentStep !== 2;

    // Continue/Finish button state
    setContinueButtonContent();
    btnContinue.disabled = !isContinueUnlocked();

    // Tooltip explains why Continue is disabled, on any step that has a real gate
    var tooltipText = CONTINUE_TOOLTIP_COPY[currentStep];
    continueTooltip.hidden = !(tooltipText && btnContinue.disabled);
    if (tooltipText) {
      continueTooltip.textContent = tooltipText;
    }

    // The desktop app "confirming tracking" should surface on its own —
    // the button lets someone trigger it right away, but it also starts
    // automatically after a short wait if they don't click it.
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

  function skipOnboarding() {
    window.dispatchEvent(new CustomEvent("onboarding:skip"));
  }

  btnSkip.addEventListener("click", skipOnboarding);

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

  // ── Step 2: timer simulation ──────────────────────────────────────────────
  // The play button simulates the desktop app reporting that tracking has
  // started — a web page can't actually start/stop the real desktop app's
  // timer, so this is a stand-in for that signal, not a real remote control.

  var timerBar = document.getElementById("timer-bar");
  var timerBarReadout = document.getElementById("timer-bar-readout");
  var timerPlay = document.getElementById("timer-play");
  var timerPlayIcon = document.getElementById("timer-play-icon");
  var taskRowPlay = document.getElementById("task-row-play");
  var taskRowPlayIcon = document.getElementById("task-row-play-icon");
  var taskRowTime = document.getElementById("task-row-time");

  var elapsedSeconds = 0;
  var timerInterval = null;
  var pendingTimeout = null;
  var PENDING_DELAY_MS = 3500;

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

  function startPendingSimulation() {
    if (step2TimerStarted || pendingTimeout) return;
    pendingTimeout = window.setTimeout(function () {
      pendingTimeout = null;
      startTimer();
    }, PENDING_DELAY_MS);
  }

  function startTimer() {
    if (pendingTimeout) {
      window.clearTimeout(pendingTimeout);
      pendingTimeout = null;
    }
    timerBar.classList.add("is-running");
    timerPlayIcon.textContent = "pause";
    taskRowPlayIcon.textContent = "pause";
    timerPlay.setAttribute("aria-pressed", "true");
    timerBarReadout.textContent = formatHHMMSS(elapsedSeconds);
    taskRowTime.textContent = formatShort(elapsedSeconds);
    if (!timerInterval) {
      timerInterval = window.setInterval(tick, 1000);
    }

    if (!step2TimerStarted) {
      step2TimerStarted = true;
      if (currentStep === 2) {
        btnContinue.disabled = false;
        continueTooltip.hidden = true;
        applyStep2Copy();
      }
    }
  }

  function pauseTimer() {
    timerBar.classList.remove("is-running");
    timerPlayIcon.textContent = "play_arrow";
    taskRowPlayIcon.textContent = "play_arrow";
    timerPlay.setAttribute("aria-pressed", "false");
    if (timerInterval) {
      window.clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function toggleTimer() {
    if (timerBar.classList.contains("is-running")) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  timerPlay.addEventListener("click", toggleTimer);
  taskRowPlay.addEventListener("click", toggleTimer);

  // ── Step 2: "need help" modal ─────────────────────────────────────────────

  var helpLink = document.getElementById("help-link");
  var helpModalOverlay = document.getElementById("help-modal-overlay");
  var helpModalClose = document.getElementById("help-modal-close");
  var helpModalSkip = document.getElementById("help-modal-skip");

  function openHelpModal() {
    helpModalOverlay.hidden = false;
  }

  function closeHelpModal() {
    helpModalOverlay.hidden = true;
  }

  helpLink.addEventListener("click", openHelpModal);
  helpModalClose.addEventListener("click", closeHelpModal);
  helpModalSkip.addEventListener("click", skipOnboarding);

  helpModalOverlay.addEventListener("click", function (event) {
    if (event.target === helpModalOverlay) closeHelpModal();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !helpModalOverlay.hidden) closeHelpModal();
  });

  renderStep();
})();
