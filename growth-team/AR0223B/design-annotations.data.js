window.DESIGN_ANNOTATIONS_DATA = {
  pages: [
    { id: "onboarding", label: "AR0223B — Onboarding", route: "index.html" },
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
        "There's intentionally no play/pause control here — a web page can't start or stop the real desktop app's timer. But right now \"detection\" is just a 3.5s window.setTimeout that flips the UI to tracking and starts a client-side counter (HH:MM:SS). There's no real desktop-app heartbeat behind it.",
      target: "#timer-bar",
      priority: "high",
      sub: [
        "Replace the fixed delay with a real signal: desktop app heartbeat / tracking-session-started event",
        "Continue is gated on that same simulated signal — confirm that's the right gate vs. requiring a minimum tracked duration once this is real",
      ],
    },
    {
      id: "help-panel-mailto-placeholder",
      page: "onboarding",
      kind: "required",
      title: "\"Email your manager\" mailto: uses a placeholder address",
      description:
        "The expanded help panel's manager-contact link points to your-manager@example.com — there's no real org/manager lookup wired up yet.",
      target: "#help-panel-content",
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
      id: "footer-navigation-local-only",
      page: "onboarding",
      kind: "required",
      title: "Back / Continue / Explore only manage local step state",
      description:
        "Navigation currently just moves an in-memory currentStep counter and dispatches onboarding:complete / onboarding:skip events. No real routing, progress persistence, or analytics tracking is wired up yet.",
      target: ".onboarding-footer__actions",
      sub: [
        "Wire onboarding:complete / onboarding:skip listeners to real app routing",
        "Add analytics events per step transition before this ships",
      ],
    },
  ],
};
