const companion = document.querySelector('.studio-companion');
let petTimer;
let drag;
let suppressPointerClick = false;

companion.addEventListener('click', (event) => {
  if (suppressPointerClick && event.detail !== 0) return;
  // Each click gets an independent heart that finishes its own animation.
  const heart = document.createElement('span');
  heart.className = 'companion-heart';
  heart.setAttribute('aria-hidden', 'true');
  companion.append(heart);
  // Fallback also cleans up if animations are disabled by browser/user styles.
  const cleanupTimer = setTimeout(() => heart.remove(), 1500);
  heart.addEventListener('animationend', () => {
    clearTimeout(cleanupTimer);
    heart.remove();
  }, { once: true });

  // Extend the wag without restarting its animation on every click.
  clearTimeout(petTimer);
  companion.classList.add('is-petted');
  petTimer = setTimeout(() => companion.classList.remove('is-petted'), 1300);
});

// Keep the home slot in flow while the button moves in viewport coordinates.
function moveCompanion(x, y) {
  const margin = 8;
  const width = companion.offsetWidth;
  const height = companion.offsetHeight;
  const maxX = Math.max(margin, document.documentElement.clientWidth - width - margin);
  const maxY = Math.max(margin, window.innerHeight - height - margin);
  companion.style.setProperty('--companion-x', `${Math.min(maxX, Math.max(margin, x))}px`);
  companion.style.setProperty('--companion-y', `${Math.min(maxY, Math.max(margin, y))}px`);
  companion.classList.add('is-moved');
}

companion.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0 || drag) return;
  suppressPointerClick = false;
  const rect = companion.getBoundingClientRect();
  drag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    moved: false,
  };
  companion.setPointerCapture(event.pointerId);
});

companion.addEventListener('pointermove', (event) => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
  drag.moved = true;
  suppressPointerClick = true;
  companion.classList.add('is-dragging');
  moveCompanion(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
});

function finishDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const pointerId = drag.pointerId;
  drag = undefined;
  companion.classList.remove('is-dragging');
  if (companion.hasPointerCapture(pointerId)) companion.releasePointerCapture(pointerId);
}

companion.addEventListener('pointerup', finishDrag);
companion.addEventListener('pointercancel', finishDrag);
companion.addEventListener('lostpointercapture', finishDrag);
// Switching tabs/windows can interrupt a gesture before pointerup arrives.
window.addEventListener('blur', () => {
  if (drag) finishDrag({ pointerId: drag.pointerId });
});

companion.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'Escape') {
    if (drag) finishDrag({ pointerId: drag.pointerId });
    companion.classList.remove('is-moved');
    companion.style.removeProperty('--companion-x');
    companion.style.removeProperty('--companion-y');
    return;
  }
  const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const direction = directions[event.key];
  if (!direction || drag) return;
  event.preventDefault();
  const rect = companion.getBoundingClientRect();
  moveCompanion(rect.left + direction[0] * 16, rect.top + direction[1] * 16);
});

window.addEventListener('resize', () => {
  if (!companion.classList.contains('is-moved')) return;
  const rect = companion.getBoundingClientRect();
  moveCompanion(rect.left, rect.top);
});
