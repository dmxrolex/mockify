import { flushSync } from 'react-dom';

const active = new WeakMap();

// Shared by the editor toolbar and nested inspectors; the canvas stays interactive.
export async function switchPanel(element, change) {
  if (!element?.isConnected) return false;
  const token = Symbol();
  active.set(element, token);
  element.getAnimations().forEach(animation => animation.cancel());
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced && element.animate) {
    try {
      await element.animate([
        { opacity: 1, filter: 'blur(0px)' },
        { opacity: 0, filter: 'blur(7px)' },
      ], { duration: 140, easing: 'ease-in', fill: 'forwards' }).finished;
    } catch { return false; }
  }
  if (active.get(element) !== token || !element.isConnected) return false;
  element.getAnimations().forEach(animation => animation.cancel());
  flushSync(change);
  if (!reduced && element.animate) element.animate([
    { opacity: 0, filter: 'blur(7px)' },
    { opacity: 1, filter: 'blur(0px)' },
  ], { duration: 250, easing: 'cubic-bezier(.16,1,.3,1)' });
  return true;
}

export function jellyPress(event) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const button = event.currentTarget;
  button.getAnimations().forEach(animation => animation.cancel());
  button.animate([
    { transform: 'scale(1)' }, { transform: 'scale(.84, .92)', offset: .22 },
    { transform: 'scale(1.1, .92)', offset: .52 },
    { transform: 'scale(.97, 1.04)', offset: .76 }, { transform: 'scale(1)' },
  ], { duration: 420, easing: 'ease-out' });
}

