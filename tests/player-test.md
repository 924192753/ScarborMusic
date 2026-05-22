# ScarborMusic Player — Manual Test Guide

## Prerequisites

1. Start dev server:
   ```bash
   DATABASE_URL="mysql://scarbormusic:password@127.0.0.1:3306/scarbormusic" \
   REDIS_URL="redis://127.0.0.1:6379" \
   S3_ENDPOINT="http://127.0.0.1:9000" \
   S3_ACCESS_KEY="minioadmin" \
   S3_SECRET_KEY="minioadmin123" \
   npm run dev
   ```
2. Login at `http://localhost:3000/login` (testdev@example.com / Test1234)
3. Upload a song at `http://localhost:3000/uploads/song`

---

## Test 1: Basic Playback

### Steps

1. Navigate to `http://localhost:3000/songs`
2. Hover over a song card — a play button overlay should appear
3. Click the play button
4. **Expected:** PlayerBar appears at the bottom, song starts playing, cover art + title + artist visible

### Pause/Resume

5. Click the pause button (center of PlayerBar)
6. **Expected:** Audio pauses, button changes to play icon
7. Click play again
8. **Expected:** Audio resumes from where it paused

---

## Test 2: Song Detail Page Play

### Steps

1. Navigate to any song: `http://localhost:3000/song/{id}`
2. Click the large play button below the song metadata
3. **Expected:**
   - Song starts playing in the PlayerBar
   - If related songs exist in the same category, they are queued for next/prev

---

## Test 3: Navigation Controls

### Previous Button

1. Play at least 2 songs (click different songs)
2. Click ← (Previous) within the first 3 seconds
3. **Expected:** Jumps to previous song in queue
4. Play a song for > 3 seconds, then click ←
5. **Expected:** Restarts current song from 0:00

### Next Button

6. Click → (Next)
7. **Expected:** Advances to next song in queue

---

## Test 4: Progress Bar

### Steps

1. While a song is playing, drag the progress bar handle
2. **Expected:** Audio seeks to the dragged position immediately
3. Click a position on the progress bar track
4. **Expected:** Audio seeks to that position

### Time Display

5. Check that current time and total duration are shown (e.g., 1:23 / 3:45)
6. **Expected:** Both values update in real time

---

## Test 5: Volume Control

### Adjust Volume

1. In the PlayerBar, drag the volume slider left/right
2. **Expected:** Audio volume changes immediately

### Mute / Unmute

3. Click the speaker icon to mute
4. **Expected:** Volume goes to 0, icon changes to muted speaker
5. Click again to unmute
6. **Expected:** Volume restores to previous level

---

## Test 6: Playback Speed

### Steps

1. Click the speed button (shows "1x" by default)
2. Each click cycles: 1x → 1.25x → 1.5x → 2x → 0.5x → 0.75x → 1x
3. **Expected:** Playback speed changes immediately (voice sounds faster/slower)

---

## Test 7: Play Modes

### Normal Mode (default)

- Songs play in queue order, stop at end

### Repeat Mode

1. Click the mode toggle until it shows Repeat icon (dot below)
2. Let the current song finish
3. **Expected:** Same song restarts automatically

### Shuffle Mode

1. Click mode toggle until shuffle icon appears
2. Click Next several times
3. **Expected:** Songs play in random order (not sequential)

---

## Test 8: Play Queue

### View Queue

1. Click the queue icon (list icon, right side of PlayerBar)
2. **Expected:** Queue drawer slides in from right showing all songs
3. Currently playing song is highlighted in purple

### Jump to Song

4. Click any song in the queue
5. **Expected:** Jumps to that song immediately

### Remove from Queue

6. Hover over a non-playing song in the queue
7. Click the × button that appears
8. **Expected:** Song removed from queue without interrupting current playback

### Close Queue

9. Click the × in the queue header or click the backdrop
10. **Expected:** Queue drawer closes

---

## Test 9: State Persistence (Refresh)

### Steps

1. Play a song and adjust volume to ~50% and speed to 1.5x
2. Refresh the page (F5)
3. **Expected:**
   - Volume setting is preserved (50%)
   - Speed setting is preserved (1.5x)
   - Play mode is preserved
   - Last playing song is shown in PlayerBar
   - Song does NOT auto-play (must click play manually after refresh)

---

## Test 10: Play Count Statistics

### Steps

1. Open browser DevTools → Network tab
2. Play a song
3. Wait ~30 seconds (or let it play past 50% of duration)
4. **Expected:**
   - A `POST /api/songs/{id}/play` request appears in Network tab
   - Response: `{ "success": true, "data": { "playCount": "X", "redisCount": X } }`
5. Verify in Redis:
   ```bash
   docker exec scarbormusic-redis redis-cli GET "song:play:{id}"
   ```
   **Expected:** Returns the incremented count

### Anti-spam Protection

6. Keep playing the same song for several minutes
7. **Expected:** Only ONE play request is sent per song per page load

---

## Expected Behavior Summary

| Feature              | Expected                             |
| -------------------- | ------------------------------------ |
| PlayerBar visibility | Only visible when a song is loaded   |
| Audio singleton      | Only one audio plays at a time       |
| Progress bar         | Smooth real-time updates, draggable  |
| Volume range         | 0 (muted) to 100%                    |
| Speed range          | 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x     |
| Play modes           | Normal → Repeat → Shuffle → (cycle)  |
| Queue drawer         | Shows all songs, current highlighted |
| Page refresh         | Volume/speed/mode/song persisted     |
| Play count           | Counted once per song per session    |

---

## Known Limitations (Phase 6)

1. **No keyboard shortcuts** — Media keys not yet supported (planned for future)
2. **No lyrics sync** — Lyrics display is static (Phase 7+)
3. **No waveform** — Visual waveform not implemented
4. **Mobile gestures** — Swipe to next/prev not implemented
5. **Redis → DB sync** — Play counts are in Redis only; DB sync is a background job (future)
