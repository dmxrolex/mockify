import { flushSync } from 'react-dom';

const active = new WeakMap();

// Shared by the editor toolbar and nested inspectors; the canvas stays interactive.
// The old controls shrink away quickly, then the new ones pop in: round buttons one after
// another with a small spring overshoot, other content rising into place.
const popTargets='.toolstrip > button, .tool-tabs > button, .round-choice, .polished-option, .background-option, .tune-chip, .group-chips > button, .choice-disc';
const spring='cubic-bezier(.34,1.45,.64,1)';
export async function switchPanel(element, change) {
  if (!element?.isConnected) return false;
  const token = Symbol();
  active.set(element, token);
  element.getAnimations({subtree:true}).forEach(animation => animation.cancel());
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced && element.animate) {
    try {
      await element.animate([
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(.96)' },
      ], { duration: 110, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).finished;
    } catch { return false; }
  }
  if (active.get(element) !== token || !element.isConnected) return false;
  element.getAnimations().forEach(animation => animation.cancel());
  flushSync(change);
  if (reduced || !element.animate) return true;
  const items = [...element.querySelectorAll(popTargets)].filter(item => item.offsetParent).slice(0, 14);
  if (items.length >= 3) {
    element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: 'ease-out' });
    items.forEach((item, index) => item.animate([
      { opacity: 0, transform: 'scale(.55)' },
      { opacity: 1, transform: 'scale(1)' },
    ], { duration: 340, delay: index * 22, easing: spring, fill: 'backwards' }));
  } else {
    element.animate([
      { opacity: 0, transform: 'translateY(10px) scale(.98)' },
      { opacity: 1, transform: 'none' },
    ], { duration: 320, easing: spring });
  }
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

