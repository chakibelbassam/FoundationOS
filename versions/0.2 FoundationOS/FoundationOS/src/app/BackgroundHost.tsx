import { Suspense, lazy, useMemo } from 'react';
import type { BackgroundChoice } from '../api/types';

const Topography = lazy(() => import('../vendor/reactbits/Topography'));
const MagicRings = lazy(() => import('../vendor/reactbits/MagicRings'));
const Lightfall = lazy(() => import('../vendor/reactbits/Lightfall'));
const GhostFibers = lazy(() => import('../vendor/reactbits/GhostFibers'));

export interface BackgroundSupport {
  reducedMotion: boolean;
  webgl: boolean;
}

// Pure fallback decision, unit-tested: the static backdrop wins for Standard,
// for reduced motion (Motion Off or Follow-system resolving to reduce), and
// when WebGL/canvas is unavailable. Otherwise the member's choice renders.
export function resolveBackgroundEffect(background: BackgroundChoice, support: BackgroundSupport): BackgroundChoice {
  if (background === 'standard') return 'standard';
  if (support.reducedMotion || !support.webgl) return 'standard';
  return background;
}

let webglAvailable: boolean | null = null;

// Feature-detect once per session; a canvas that cannot start WebGL means the
// effect would fail, so the static fallback renders instead.
export function checkWebGL(): boolean {
  if (webglAvailable !== null) return webglAvailable;
  try {
    if (typeof document === 'undefined') {
      webglAvailable = false;
      return false;
    }
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl2') ?? (canvas.getContext('webgl') as RenderingContext | null);
    webglAvailable = context !== null && context !== undefined;
  } catch {
    webglAvailable = false;
  }
  return webglAvailable;
}

const MAX_DPR = 2;

function cappedDpr(): number {
  const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return Math.min(ratio, MAX_DPR);
}

export function StaticBackdrop() {
  return <div className="fo-backdrop-static" aria-hidden="true" />;
}

interface BackgroundHostProps {
  background: BackgroundChoice;
  reducedMotion: boolean;
  dark: boolean;
}

// Mounts only the selected effect and releases it on switch/unmount (the
// vendored components dispose GL, rAF, observers and listeners; React.lazy
// unmounts the previous one). Effects never intercept pointer input: the
// container disables it and every effect renders with mouse interaction off.
export function BackgroundHost({ background, reducedMotion, dark }: BackgroundHostProps) {
  const webgl = useMemo(() => checkWebGL(), []);
  const effect = resolveBackgroundEffect(background, { reducedMotion, webgl });
  const dpr = cappedDpr();

  if (effect === 'standard') return <StaticBackdrop />;

  return (
    <Suspense fallback={<StaticBackdrop />}>
      <div className="fo-backdrop-effect" aria-hidden="true">
        {effect === 'topography' ? (
          <Topography
            dpr={dpr}
            opacity={0.55}
            glow={0.4}
            speed={0.25}
            mouseInteraction={false}
            intro={false}
            lightMode={!dark}
            style={{}}
          />
        ) : effect === 'magic-rings' ? (
          <MagicRings
            maxDevicePixelRatio={MAX_DPR}
            theme={dark ? 'dark' : 'light'}
            opacity={0.5}
            followMouse={false}
            clickBurst={false}
            intro={false}
            style={{}}
          />
        ) : effect === 'lightfall' ? (
          <Lightfall
            dpr={dpr}
            opacity={0.5}
            mouseInteraction={false}
            holdToWarp={false}
            intro={false}
            lightMode={!dark}
            mixBlendMode={undefined}
            style={{}}
          />
        ) : (
          <GhostFibers
            dpr={dpr}
            brightness={0.85}
            lineColor={undefined}
            secondaryColor={undefined}
            mouseInteraction={false}
            pulseOnClick={false}
            intro={false}
            lightMode={!dark}
          />
        )}
      </div>
    </Suspense>
  );
}
