window.DESIGN_ANNOTATIONS_DATA = {
  pages: [
    { id: "onboarding", label: "AR0227 — Onboarding", route: "index.html" },
  ],

  annotations: [
    {
      id: "step1-download-simulated",
      page: "onboarding",
      kind: "required",
      title: "\"Download the desktop app\" is simulated",
      description:
        "Clicking the button just flips local UI state (button becomes an outline \"Downloaded\" state, Continue unlocks). It doesn't detect OS, trigger a real download, or confirm the app was actually installed.",
      target: "#main-action",
      priority: "high",
      sub: [
        "Wire to real OS detection + the actual desktop app installer link",
        "Consider gating Continue on a real \"app installed\" signal instead of the click alone",
      ],
    },
    {
      id: "step2-timer-simulated",
      page: "onboarding",
      kind: "required",
      title: "Tracking detection is a fixed setTimeout, not the real desktop app",
      description:
        "Intended behavior: the timer should only flip to \"tracking\" once the user has (1) downloaded/installed the desktop app AND (2) actually started a tracking session inside it. Today only half of that is real — Step 1's Continue is genuinely gated on the download click — but Step 2's \"tracking started\" signal is faked: a flat 3.5s window.setTimeout fires regardless of whether the app was installed or a timer was ever pressed for real. There's intentionally no play/pause control on this page, since a web page can't start/stop the real desktop app's timer either way.",
      target: "#timer-bar",
      priority: "high",
      sub: [
        "Replace the fixed delay with a real signal: desktop-app heartbeat / tracking-session-started event tied to that specific user",
        "Continue is gated on that same simulated signal — once real, confirm this is the right gate vs. requiring a minimum tracked duration",
        "Simulation always resolves to \"success\" after 3.5s — there's no path here for testing what the UI should do if the real app never reports back",
      ],
    },
    {
      id: "help-modal-mailto-placeholder",
      page: "onboarding",
      kind: "required",
      title: "\"Email your manager\" mailto: uses a placeholder address",
      description:
        "The \"need help\" modal's manager-contact link points to your-manager@example.com — there's no real org/manager lookup wired up yet.",
      target: "#help-modal-overlay",
      sub: ["Wire this to the signed-in user's actual manager/org-owner email, or replace with an in-app request flow instead of mailto:"],
    },
    {
      id: "step1-widgets-approximated",
      page: "onboarding",
      kind: "suggestion",
      title: "Utilization gauge + benchmark bar are CSS approximations",
      description:
        "The gauge (conic-gradient arc + needle) and the activity benchmark bar (org/job-type ticks at 40%/72%) recreate the Figma widgets' look, but the exact color-band angles and tick positions were not pixel-matched to Figma's arc/ellipse assets.",
      target: ".widgets-row",
      sub: ["If this experiment needs exact benchmark values, confirm against Figma node 20030-524 rather than the placeholder 40%/72% ticks used here"],
    },
    {
      id: "step3-video-descoped",
      page: "onboarding",
      kind: "suggestion",
      title: "Step 3 uses a static image, not a real video embed",
      description:
        "Originally scoped as an embedded video (support.hubstaff.com quick-start guide), but that page has no actual video. Per stakeholder decision, this step currently just shows the Figma promo screenshot as a static image with no playback.",
      target: ".step3-image",
      sub: ["If a real onboarding video becomes available, swap this for a real embed and revisit the \"Finish\" CTA placement relative to it"],
    },
    {
      id: "step3-necessity-open-question",
      page: "onboarding",
      kind: "suggestion",
      title: "Open question: does this experiment need Step 3 at all?",
      description:
        "Unlike Steps 1-2, Step 3 doesn't gate on any real activation behavior — it's just a static promo image with a Finish button. Steps 1-2 alone already cover this experiment's core activation loop (download the app, confirm tracking works). Cutting Step 3 would shorten the flow and likely reduce drop-off, at the cost of losing the one touchpoint that surfaces the quick-start video/further-help content to new users.",
      target: "#step-panel-3",
      sub: [
        "If kept: consider it optional/skippable rather than a required step",
        "If cut: fold the quick-start link into Step 2's help modal so that content isn't lost entirely",
      ],
    },
    {
      id: "footer-navigation-local-only",
      page: "onboarding",
      kind: "required",
      title: "Back / Continue only manage local step state",
      description:
        "Navigation currently just moves an in-memory currentStep counter and dispatches an onboarding:complete event on Finish. No real routing, progress persistence, or analytics tracking is wired up yet.",
      target: ".onboarding-footer__actions",
      sub: [
        "Wire onboarding:complete to real app routing",
        "Add analytics events per step transition before this ships",
      ],
    },
  ],
};
