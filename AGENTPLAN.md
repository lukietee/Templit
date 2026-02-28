# AGENTPLAN.md — Video Editor Build

> Prompt for a Claude agent team. Scope: the video editor (right 75% panel) of Templit.

---

## Goal

Build a functional timeline-based video editor with these capabilities and **nothing more**:

1. **Multiple tracks** — video and audio tracks, dynamically added/removed
2. **Move clips** — drag clips horizontally to reposition them on a track
3. **Trim clips** — drag left/right edges to crop (already partially works)
4. **Delete clips** — select a clip and remove it
5. **Render** — export the final edited video that respects the timeline layout (which clips play when, which audio is active when)

That's it. No text overlays, no effects, no undo/redo, no waveforms, no snapping, no speed control. Just a working editor with these basics.

---

## Current Codebase State

### What already works
- 3-panel layout (chat | preview+timeline) via `react-resizable-panels` v4
- Single video file plays in preview with play/pause/volume
- Two hardcoded tracks (1 video, 1 audio) each with 1 clip
- Playhead syncs bidirectionally between video element and store via `use-video-sync.ts`
- Clip trimming works (drag handles on selected clip edges)
- Clip selection works (click to select, Escape to deselect)
- Zoom in/out on timeline
- WebM export via MediaRecorder (but only captures first video clip, ignores timeline layout)
- Keyboard shortcuts: Space=play/pause, Arrows=frame step, Escape=clear selection

### What's broken / hardcoded
- **`use-video-sync.ts`** hardcodes `clips[0]` — calls `getClip("video")` and `getClip("audio")` which grab the first clip from the first track of each type. Multi-clip playback won't work until this is fixed.
- **`use-video-render.ts`** same problem — grabs `clips[0]` from each track type. Render won't respect multi-clip timeline until rewritten.
- **`use-video-sync.ts` line 105-106** hardcodes `setClipDuration("video-1", "clip-v1", ...)` — clip initialization is by hardcoded ID.
- **No `moveClip` action** in timeline store — clips can't be repositioned.
- **No `deleteClip` action** in timeline store.
- **No `addTrack` / `addClip` actions** — track/clip creation is static.
- **Clips can't be dragged** to reposition — only trim handles exist, no horizontal drag.

---

## Architecture

### Data Model (extend `use-timeline-store.ts`)

The existing model is fine. Keep `Clip` and `Track` interfaces as-is. Add these store actions:

```
moveClip(clipId: string, newStart: number)     — reposition clip on timeline
deleteClip(clipId: string)                      — remove clip from its track
addClip(trackId: string, clip: Clip)            — add a clip to a track
addTrack(type: "video" | "audio")               — append a new empty track
removeTrack(trackId: string)                    — remove a track
```

### Multi-clip playback model

This is the hard part. Currently one `<video>` element plays one file. To support multiple clips on a timeline, you need to figure out playback.

**Approach: Single source, timeline as metadata.** Since all clips come from the same video file (the AI generates one video), the timeline clips are just windows into that single source. The video element plays the underlying file, and the timeline store tracks where each clip sits on the timeline. During playback, the sync hook needs to:

- Walk through video clips in timeline order
- For each clip, seek the source video to `clip.originalStart` and play for `clip.duration`
- Skip gaps between clips (seek forward)
- Mute/unmute based on whether an audio clip covers the current timeline position

**For render:** Same logic but driving the MediaRecorder — play each clip segment in sequence, recording the output.

If clips are all from the same source file, this is achievable with a single `<video>` element and careful seek logic. The key data to track during playback is a **timeline cursor** (position in timeline time) that maps to different positions in the source video depending on which clip is active.

### Clip dragging

New hook: `use-clip-drag.ts`. On mousedown on a clip body (not trim handles), track horizontal mouse movement, convert pixel delta to time delta via zoom, and call `moveClip(clipId, newStart)`. Clamp to `>= 0`.

### Delete

Add `deleteClip` to store. Wire the `Delete`/`Backspace` key in `use-keyboard-shortcuts.ts` to remove the selected clip.

---

## Task Breakdown

### Task 1: Timeline Store Extensions
**Files:** `src/stores/use-timeline-store.ts`

Add these actions to the store:
- `moveClip(clipId, newStart)` — find clip across all tracks, update its `start`
- `deleteClip(clipId)` — find and remove clip from its track
- `addClip(trackId, clip)` — push clip into track's clips array
- `addTrack(type)` — generate ID, push new track with empty clips
- `removeTrack(trackId)` — filter out the track

Keep the existing `trimClipStart`, `trimClipEnd`, `selectClip`, `clearSelection`, `setClipDuration` — they all still work.

### Task 2: Clip Dragging
**Files:** new `src/hooks/use-clip-drag.ts`, modify `src/components/editor/timeline-track.tsx`

Create a drag hook similar to `use-clip-trim.ts`:
- On mousedown on clip body, record initial X
- On mousemove, compute `deltaX / zoom` → `deltaTime`, call `moveClip(clipId, clip.start + deltaTime)`
- On mouseup, clean up listeners
- Set cursor to `grab` / `grabbing`
- Clamp `start >= 0`

In `TimelineClip`, use this hook. Make sure trim handles still take priority (they already `stopPropagation`).

### Task 3: Delete Clip
**Files:** `src/hooks/use-keyboard-shortcuts.ts`, `src/stores/use-timeline-store.ts`

- Add `Delete` and `Backspace` keybindings that call `deleteClip(selectedClipId)` then `clearSelection()`
- Skip if no clip is selected

### Task 4: Multi-Track UI
**Files:** `src/components/editor/timeline.tsx`, `src/stores/use-timeline-store.ts`

- Add an "Add Track" button to the timeline toolbar (or a small `+` below existing tracks)
- Let user choose video or audio track type
- Optionally add a remove/delete button per track (in the track label area)
- Tracks render dynamically from the store's `tracks` array (this already works since `tracks.map()` is used)

### Task 5: Multi-Clip Playback Sync
**Files:** `src/hooks/use-video-sync.ts`

This is the most complex task. Rewrite the hardcoded `getClip` helpers:

- Instead of grabbing `clips[0]`, collect all clips from all video tracks, sorted by `start`
- During the rAF loop, determine which clip the current **timeline time** falls within
- Map timeline time → source video time using `clip.originalStart + (timelineTime - clip.start)`
- If timeline time is in a gap (no clip), skip to next clip's start
- For audio: check all audio clips across all audio tracks, mute when timeline time isn't covered by any audio clip
- On play: find the first clip at or after `currentTime`, seek source to the right position
- On clip end: seek to next clip's source position, or pause if no more clips

Also fix the `loadedmetadata` handler — don't hardcode clip IDs. Either remove the auto-initialization (let the chat/agent system add clips later) or initialize in a more generic way.

### Task 6: Render Rewrite
**Files:** `src/hooks/use-video-render.ts`

Rewrite render to play through the full timeline:

- Collect all video clips sorted by timeline start
- For each clip: seek source to `clip.originalStart`, play/record for `clip.duration`, stop
- Concatenate by processing clips sequentially
- Handle audio clips same as playback sync (mute/unmute based on coverage)
- This means render drives the video element through each clip segment in order while MediaRecorder captures

### Task 7: Wire It All Together
**Files:** various

- Make sure `EditorLayout` still works with all the new pieces
- Verify trim still works after adding drag
- Verify keyboard shortcuts all fire correctly
- Run `npm run build` — zero TypeScript errors
- Manual test: add tracks, move clips, trim clips, delete clips, play through, export

---

## Key Technical Constraints

1. **`react-resizable-panels` v4 API**: uses `Group` not `PanelGroup`, `Separator` not `PanelResizeHandle`, `orientation` not `direction`, string sizes like `"25%"`
2. **Video sync uses `seekSourceRef`** (`'user'` | `'video'`) to prevent infinite loops. Understand this flag before touching the sync hook. When user initiates a seek, set to `'user'`; when video element drives time, set to `'video'`.
3. **rAF loop for playhead** — no `setInterval`, no `timeupdate` events. Must be requestAnimationFrame for smooth 60fps updates.
4. **Zustand stores stay isolated** — playback store, timeline store, chat store. Cross-store reads go through hooks, not store-to-store imports.
5. **Styling**: dark theme, bg `#0f0f0f`, accent indigo, playhead red, video clips indigo, audio clips green. Use `cn()` from `src/lib/utils.ts`. Use `lucide-react` for icons.
6. **No new dependencies.** Build everything with what's in the project.
7. **Don't touch** `src/components/chat/`, `src/components/landing/`, `src/stores/use-chat-store.ts`, or `src/app/page.tsx`.

---

## File Reference

```
src/stores/use-timeline-store.ts   — Track/clip data, all mutations (EXTEND)
src/stores/use-playback-store.ts   — Play/pause/time/volume (LEAVE ALONE)
src/hooks/use-video-sync.ts        — Video ↔ store sync (REWRITE for multi-clip)
src/hooks/use-video-render.ts      — WebM export (REWRITE for multi-clip)
src/hooks/use-clip-trim.ts         — Edge trimming (LEAVE ALONE)
src/hooks/use-timeline-drag.ts     — Playhead drag (LEAVE ALONE)
src/hooks/use-keyboard-shortcuts.ts — Shortcuts (ADD delete keybinding)
src/components/editor/timeline.tsx         — Timeline container (ADD track button)
src/components/editor/timeline-track.tsx   — Track + clip rendering (ADD drag)
src/components/editor/timeline-playhead.tsx — Playhead (LEAVE ALONE)
src/components/editor/timeline-ruler.tsx    — Ruler (LEAVE ALONE)
src/components/editor/editor-layout.tsx     — Layout + preview (LEAVE ALONE)
```

---

## Done When

- [ ] Multiple video and audio tracks can be added/removed
- [ ] Clips can be dragged left/right to reposition on the timeline
- [ ] Clips can be trimmed by dragging edges (already works, must not break)
- [ ] Selected clips can be deleted with Delete/Backspace
- [ ] Playback plays through all clips on the timeline in order, with correct audio
- [ ] Render exports a video that matches what the timeline shows
- [ ] `npm run build` passes with zero errors
