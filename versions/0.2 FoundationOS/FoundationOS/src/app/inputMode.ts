let last: 'pointer' | 'keyboard' | 'touch' = 'pointer';
let installed = false;

export function installInputTracking() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow') || event.key === 'Enter' || event.key === ' ') {
      last = 'keyboard';
    }
  }, true);
  window.addEventListener('pointerdown', (event) => {
    last = event.pointerType === 'touch' ? 'touch' : 'pointer';
  }, true);
}

export function getLastInput() {
  return last;
}
