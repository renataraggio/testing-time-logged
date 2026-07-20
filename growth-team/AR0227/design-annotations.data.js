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
      title: "Play button simulates tracking — it isn't real remote control",
      description:
        "Clicking play flips the UI to \"tracking\" and starts a client-side counter (HH:MM:SS). It's a stand-in for the desktop app reporting that a real tracking session started — a web page can't actually start/stop the real desktop app's timer, so this button doesn't reach the app at all.",
      target: "#timer-bar",
      priority: "high",
      sub: [
        "Replace with a real signal: desktop-app heartbeat / tracking-session-started event tied to that specific user",
        "Continue is gated on that same simulated signal — once real, confirm this is the right gate vs. requiring a minimum tracked duration",
        "No failure path exists here — there's no way to test what the UI should do if the real app never reports back",
      ],
    },
    {
      id: "step2-copy-swap-inferred",
      page: "onboarding",
      kind: "suggestion",
      title: "Step 2's title/body/alert swap on tracking start — sequencing inferred",
      description:
        "The Figma file (Growth Central WIP, node 20110-7094) has two frames both showing Step 2 (progress bar on segment 2) with different copy: one with generic \"install + start the timer\" instructions and a grey bar, another headlined \"Next, you'll track time using the Hubstaff desktop app\" with a blue/tracking bar. This build assumed the first is the \"before tracking\" state and the second is the \"after tracking starts\" state, and wires the copy to swap accordingly. That sequencing was not explicitly confirmed — the two frames could equally have been alternate drafts rather than sequential states.",
      target: "#step2-alert-text",
      sub: ["Confirm with design/PM whether this before/after copy swap is the intended behavior before this ships"],
    },
    {
      id: "help-modal-request-project-placeholder",
      page: "onboarding",
      kind: "required",
      title: "\"Request project\" button uses a placeholder mailto:",
      description:
        "The help modal's \"Request project\" button points to a mailto: for your-manager@example.com — there's no real org/manager lookup or in-app request flow wired up yet.",
      target: "#help-modal-overlay",
      sub: ["Wire this to the signed-in user's actual manager/org-owner, or replace mailto: with a real in-app request-a-project flow"],
    },
    {
      id: "skip-reintroduced",
      page: "onboarding",
      kind: "suggestion",
      title: "\"Skip\" was removed, then reintroduced to match this Figma update",
      description:
        "An earlier round of this experiment deliberately removed all skip-onboarding paths (footer \"Explore on my own\" and the help modal's skip link) on the reasoning that skipping doesn't apply to this experiment. This Figma update (Growth Central WIP) reintroduces a lightweight \"Skip\" text link in Step 2's footer and inside the help modal, so it's been added back to match — but that product decision (skip applies after all, at least for Step 2) was inferred from the design file, not explicitly reconfirmed.",
      target: "#btn-skip",
      sub: ["Confirm this reversal is intentional before shipping — it directly contradicts an earlier explicit decision on this same experiment"],
    },
    {
      id: "step1-widgets-approximated",
      page: "onboarding",
      kind: "suggestion",
      title: "Utilization gauge + benchmark bar are CSS approximations",
      description:
        "The gauge (conic-gradient arc + needle) recreates Figma's gray-then-blue dial, and the activity benchmark bar (org/job-type ticks at 40%/72%) recreates that widget's look — but neither is pixel-matched to Figma's assets. In particular, Figma's gauge uses discrete dashed tick marks around the arc; this build uses a smooth two-tone ring instead.",
      target: ".widgets-row",
      sub: ["If this experiment needs exact benchmark values or the dashed-tick gauge style, confirm against Figma node 20110-7094 rather than this approximation"],
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
      title: "Back / Continue / Skip only manage local step state",
      description:
        "Navigation currently just moves an in-memory currentStep counter and dispatches onboarding:complete (Finish) or onboarding:skip (Skip) events. No real routing, progress persistence, or analytics tracking is wired up yet.",
      target: ".onboarding-footer__actions",
      sub: [
        "Wire onboarding:complete / onboarding:skip to real app routing",
        "Add analytics events per step transition before this ships",
      ],
    },
  ],
};
