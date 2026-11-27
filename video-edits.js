export const minVideoSpan = .1;

export function videoTrimRange(settings, duration) {
  const full = Math.max(0, Number(duration) || 0);
  const minimum = Math.min(full, minVideoSpan);
  const start = Math.max(0, Math.min(full - minimum, Number(settings.trimStart) || 0));
  const end = Math.max(start + minimum, Math.min(full, settings.trimEnd ?? full));
  return [start, end];
}

export function keptVideoSegments(settings, duration) {
  const [start, end] = videoTrimRange(settings, duration);
  const cuts = Array.isArray(settings.videoCuts) ? settings.videoCuts : [];
  const ordered = cuts.filter(cut => Array.isArray(cut) && Number.isFinite(cut[0]) && Number.isFinite(cut[1]) && cut[1]>cut[0])
    .toSorted((a, b) => a[0] - b[0]);
  const segments = [];
  let cursor = start;
  for (const [from, to] of ordered) {
    if (from >= end) break;
    if (to <= cursor) continue;
    if (from > cursor) segments.push({start: cursor, end: from});
    cursor = Math.min(end, to);
  }
  if (cursor < end) segments.push({start: cursor, end});
  return segments;
}

export function editableVideoSegments(settings, kept) {
  const points = Array.isArray(settings.videoCutPoints) ? settings.videoCutPoints : [];
  const sorted = [...new Set(points.filter(Number.isFinite))].sort((a, b) => a - b);
  return kept.flatMap(({start,end}) => {
    const boundaries = [start, ...sorted.filter(point => point > start + .001 && point < end - .001), end];
    return boundaries.slice(1).map((right, index) => ({start: boundaries[index], end: right}));
  });
}

export const playableVideoSeconds = segments => segments.reduce((total, {start,end}) => total + end - start, 0);

export function sourceTimeForElapsed(segments, elapsed) {
  let remaining = Math.max(0, elapsed);
  for (const {start, end} of segments) {
    if (remaining < end - start) return start + remaining;
    remaining -= end - start;
  }
  return segments.at(-1)?.end ?? 0;
}

export function elapsedTimeForSource(segments, time) {
  let elapsed = 0;
  for (const {start, end} of segments) {
    if (time <= start) break;
    elapsed += Math.min(time, end) - start;
    if (time < end) break;
  }
  return elapsed;
}

export const containsVideoTime = (segments, time) => segments.some(({start,end}) => time >= start && time < end);

export function nearestPlayableVideoTime(segments, time) {
  let previous = null;
  for (const segment of segments) {
    if (time < segment.start) {
      if (!previous || segment.start-time <= time-previous.end) return segment.start;
      break;
    }
    if (time < segment.end) return time;
    previous = segment;
  }
  return previous ? Math.max(previous.start, previous.end - .001) : 0;
}
