# User Testing Script — Manager Multi-Member Time Logged View

Prototype: hosted at [https://renataraggio.github.io/testing-time-logged/](https://renataraggio.github.io/testing-time-logged/) — no local server needed. (Ctrl + Shift + R  "hard refresh)  

- Manager session: [https://renataraggio.github.io/testing-time-logged/index.html?role=admin](https://renataraggio.github.io/testing-time-logged/index.html?role=admin)
- Regular user session: [https://renataraggio.github.io/testing-time-logged/index.html?role=member](https://renataraggio.github.io/testing-time-logged/index.html?role=member)

⚠️ This repo and site are public — it's an unreleased internal feature. Take the repo private or delete it once testing wraps up.

Two separate tracks, run independently with their own recruits. This single document covers both the moderator script and the worksheets you'll fill in live — everything you need for a session is in one place.  
Scoring companion: open scoring-companion.html (in the project root)

## Setup

| | Manager | User |
|---|---|---|
| **Goal** | Confirm, unprompted, that they discover: (1) Time Logged now defaults to a multi-member view, (2) it can be filtered/selected by team, (3) time can be batch-added for the whole team at once, (4) a member's detail view is a real destination they can navigate within. | Confirm no regression — they can still add their own time and view it weekly. |
| **Recruit** | 5–6 org owners/managers/team leads managing 2+ people. Mix of familiarity. Exclude anyone who's seen this prototype. | 3–4 individual contributors tracking their own time. Exclude anyone who's seen this prototype. |
| **Length** | ~30–35 min | ~15 min |

Moderated, screen-share, record with permission, one moderator + notetaker if possible. Reload the page between manager participants so the announcement modal resets — the member link has no modal to reset.

---

## 1. Intro & first impressions (5 min manager / 3 min regular user)

> "Thanks for making time. I'll ask you to think out loud — tell me what you expect and why, even if it seems obvious. There are no wrong answers."

**Warm-up:** Manager — "How do you track/review your team's time today? How do you add time on someone's behalf?" Regular user — "How do you log and check your own time today — daily or weekly?"

**Manager only:** load the page, let the announcement modal play fully, then ask "What did that just tell you was new?" (Member link has no modal — skip straight to landing on the page.)

**Once landed (both tracks):** "What are you looking at? Whose time is this? Explain this screen in one sentence." Then, fresh eyes: *"The page is called 'Time logged' — does that name fit? What would you call it?"*

**Manager listen-for:** do they say "my whole team" / "everyone I manage" unprompted?

---

## 2. Manager tasks 

**Task 1 — View the team's daily time** (3 min)
- Prompt: *"Select your team, and show me everyone's time for today."*
- Watch: do they find the team selector, and land on the Daily view?

**Task 2 — Add time for the whole team at once** (7 min — core task)
- Prompt: *"Add 2 hours for today, for everyone on your team, in one go."*
- Watch: do they open Add Time from the team view and select **all** members in one action, vs. one-by-one?
- Note: this prompt states the batch goal directly — it tests efficiency once the goal is known, not blind discovery. Swap in the old indirect prompt ("three people forgot to log hours Tuesday") for a subset of participants if you also want the discovery read.
- Success: one 2-hour entry applied to the whole team in a single save.

**Task 3 — Drill into one member** (3 min)
- Prompt: *"Show me [member]'s daily view in detail."*
- Watch: row click vs. Actions menu; do they know how to get back to the team view?

**Task 4 — Add time from the detail view** (3 min)
- Prompt: *"Add time for [that member] from here."*
- Note: this view caps Add Time at one entry (no "Add time span") — expected, but flag it if a participant seems surprised they can't add more here.

**Task 5 — Return to the multi-member view** (2 min)
- Prompt: *"If you had to go back from this single view to the multi-member view, where would you go?"*
- Watch: do they find a clear path back (breadcrumb, back button, team link) without hunting, or do they reach for browser back?

**Task 6 — View time for yourself** (3 min)
- Prompt: *"Now show me your own time, in that same kind of detail."*
- Watch: do they find their own row in the team table and click into it, or look for a separate "my time" entry point?

## 3. User tasks 

**Task 1 — Add time for yourself** (3 min)
- Prompt: *"Add some time for yourself, today."*

**Task 2 — View your time weekly** (2 min)
- Prompt: *"Now show me this week instead of by day."*

---

## 4. Closing (5 min manager / 3 min regular user)

**Comparison**
- Manager: *"Compare that to how you add time for your team today — better, worse, same? Anything confusing?"*
- Regular user: *"Compare that to how you normally log and check your own time — better, worse, same? Anything confusing?"*

**Wrap-up**
- Manager: *"Explain this page to a teammate who manages people — what's it for?"* (cleanest comprehension check)
- Regular user: *"Explain this page to a coworker — what's it for?"*
- Manager: clarity rating 1–5 — "how clear was it that you could see and add time for your whole team from one screen?" + why
- Regular user: rating 1–5 — "how much did this feel like your usual page?" + why
- Both: *"Now that you've used it, does 'Time logged' still fit, or would you rename it?"* (compare to their fresh-eyes answer — a name that holds up after real use is a stronger signal than a first glance)
- Both: *"Anything you expected but couldn't find?"*

---

## 5. Scoring

| Outcome | Definition | Score |
|---|---|---|
| Success | Completed unaided | 1 |
| Partial | Completed with 1+ nudges, or in a degraded way | 0.5 |
| Failed | Not completed even after nudging | 0 |

Track **prompt count** (number of nudges) alongside each score. Right after each task, also ask the standardized **Single Ease Question**: *"How easy or difficult was that?"* on a 1–5 scale (1 = very difficult, 5 = very easy). Unlike the Outcome/Score rubric, this isn't an interviewer judgment call — it's the participant's own rating, so it's directly comparable across interviewers and sessions. Interviewers record per-participant scores in their own `notes-and-scoring.md`; combine into task averages below once everyone's done.

| Task                                                 | Avg. score |
| ---------------------------------------------------- | ---------- |
| Manager Task 1 — View team's daily time              |            |
| Manager Task 2 — Add time for whole team (core task) |            |
| Manager Task 3 — Drill into one member               |            |
| Manager Task 4 — Add time from detail view           |            |
| Manager Task 5 — Return to multi-member view         |            |
| Manager Task 6 — View time for yourself              |            |
| User Task 1 — Add time for yourself                  |            |
| User Task 2 — View time weekly                       |            |

**Legend:** 1.0 = all good · 0.5 = needs rework · below 0.5 = fix before launch.

Once scored, feed all interviewers' notes into `interview-synthesis` or `qualitative-analysis` for a findings summary and recommendations, or `affinity-mapping` on a CSV of highlights.
