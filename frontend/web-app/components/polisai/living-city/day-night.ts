"use client";

// ============================================================================
// PolisAI — shared day/night engine
// ----------------------------------------------------------------------------
// A single external store that owns the time-of-day clock and advances it on
// one rAF loop. Components subscribe via useDayNight(); only subscribers
// re-render (when the version changes), so the heavy city tree is never
// re-rendered by the clock. Paused → version frozen → no re-renders.
// ============================================================================

import { useSyncExternalStore } from "react";

const DAY_SECONDS = 90; // one full day at 1× speed

let _time = 0.4; // 0..1 (0 = midnight, 0.5 = noon)
let _speed = 1; // 0 paused, 1/2/3
let _day = 1;
let _version = 0;

const subs = new Set<() => void>();
let raf = 0;
let last = 0;

function bump() {
  _version++;
  subs.forEach((f) => f());
}

function loop(t: number) {
  if (_speed > 0) {
    if (!last) last = t;
    const dt = (t - last) / 1000;
    last = t;
    _time += (_speed * dt) / DAY_SECONDS;
    if (_time >= 1) {
      _time -= 1;
      _day += 1;
    }
    bump();
  } else {
    last = 0;
  }
  raf = requestAnimationFrame(loop);
}

function subscribe(cb: () => void) {
  subs.add(cb);
  if (!raf) {
    last = 0;
    raf = requestAnimationFrame(loop);
  }
  return () => {
    subs.delete(cb);
    if (subs.size === 0 && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}

const getVersion = () => _version;
const getServerVersion = () => 0;

export function setSpeed(s: number) {
  _speed = s;
  bump();
}

/** Live, non-reactive accessors (read inside render of a subscriber). */
export const dayNight = {
  get time() {
    return _time;
  },
  get speed() {
    return _speed;
  },
  get day() {
    return _day;
  },
};

/** Sun elevation −1..1 and derived light/night factors for a given time. */
export function lightAt(time: number) {
  const sunElev = Math.sin((time - 0.25) * 2 * Math.PI);
  const dayLight = Math.max(0, Math.min(1, (sunElev + 0.18) / 0.5));
  return { sunElev, dayLight, night: 1 - dayLight, twilight: Math.max(0, Math.min(1, 1 - Math.abs(sunElev) / 0.3)) };
}

/** Subscribe a component to the clock; returns the live accessor object. */
export function useDayNight() {
  useSyncExternalStore(subscribe, getVersion, getServerVersion);
  return dayNight;
}
