# Agent Team Prompt

Copy and paste everything below the line into Claude Code.

---

Read `AGENTPLAN.md` and `CLAUDE.md` in this repo. Then spin up an agent team to implement the video editor described in the plan.

Create a team with these agents working in parallel:

1. **timeline-store** — Handles Task 1 (store extensions: `moveClip`, `deleteClip`, `addClip`, `addTrack`, `removeTrack`) and Task 3 (wire Delete/Backspace keybinding in `use-keyboard-shortcuts.ts`). This agent must finish first since other agents depend on the new store actions.

2. **timeline-ui** — Handles Task 2 (clip dragging via new `use-clip-drag.ts` hook + wiring into `timeline-track.tsx`) and Task 4 (add track button in `timeline.tsx`, remove track button per track). Depends on timeline-store finishing Task 1.

3. **playback-sync** — Handles Task 5 (rewrite `use-video-sync.ts` for multi-clip playback across multiple tracks) and Task 6 (rewrite `use-video-render.ts` so render respects the full timeline layout). Depends on timeline-store finishing Task 1.

Each agent should read the relevant existing files before making changes. After all agents finish, run `npm run build` to verify zero TypeScript errors.

Constraints:
- No new dependencies
- Don't touch chat, landing page, or chat store
- Follow existing patterns (Zustand stores, rAF loops, seekSourceRef flag)
- Dark theme styling with existing CSS variables
