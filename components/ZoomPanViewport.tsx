"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ReactNode } from "react";
import { Button } from "@/components/ui/button";

// A faint dot texture that reads as "digital canvas" behind the 100 cells.
// It's rendered as a fixed backdrop on the viewport itself — not inside the
// transformed/scaled world — so the dots never grow, shrink, or pan with the
// camera. Only the cells ("the walls") live inside the zoomable/pannable
// layer; the backdrop is just static decoration behind it.
const backdropStyle: CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, var(--color-border-strong) 1px, transparent 1px)",
  backgroundSize: "28px 28px",
};

const MIN_ZOOM = 1;
// Expressed as a multiplier of the "fit whole world" scale (see fitScale
// below), so this ratio is independent of viewport size: it's set high
// enough that a single 84px cell can grow to roughly half the screen's
// shorter dimension by the time you're fully zoomed in.
const MAX_ZOOM = 8;
const ZOOM_STEP = 0.75;
const DRAG_THRESHOLD_PX = 4;
const BUTTON_ZOOM_TRANSITION_MS = 220;

// --- Gesture feel -----------------------------------------------------------
// How far past the world's edge a drag may stretch before resistance makes it
// asymptotic. Small enough to feel like tension, large enough to be visible.
const RUBBER_BAND_PX = 150;
// Per-millisecond velocity decay for flick momentum. 0.9975^16ms ≈ 0.96 per
// frame at 60fps, and — because it's applied per elapsed millisecond rather
// than per frame — a 120Hz phone and a 60Hz one glide for the same duration.
const MOMENTUM_DECAY_PER_MS = 0.9975;
// Below this speed (px/ms) the glide is over; ~0.05px per frame at 60fps.
const MOMENTUM_MIN_SPEED = 0.003;
// A flick slower than this on release just stops, rather than drifting.
const MOMENTUM_START_SPEED = 0.08;
// Weight of each new velocity sample. Low enough to smooth out jittery
// touch reporting, high enough to still track a fast direction change.
const VELOCITY_SMOOTHING = 0.35;
const SETTLE_MS = 340;

interface Point {
  x: number;
  y: number;
}

interface View {
  /** User-applied zoom on top of the auto-computed "fit" scale. 1 = fit view. */
  zoom: number;
  /** Pan offset in real screen pixels. */
  x: number;
  y: number;
}

/** Progressive resistance: unrestricted inside `limit`, asymptotic past it. */
function rubberBand(value: number, limit: number) {
  if (value > limit) {
    const over = value - limit;
    return limit + (over * RUBBER_BAND_PX) / (over + RUBBER_BAND_PX);
  }
  if (value < -limit) {
    const over = -limit - value;
    return -limit - (over * RUBBER_BAND_PX) / (over + RUBBER_BAND_PX);
  }
  return value;
}

/** Standard ease-out; used to settle an overscrolled camera back in bounds. */
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * A fixed-size, pannable, zoomable canvas viewport — the same interaction
 * model as map/pixel-wall sites (scroll or pinch to zoom, drag to pan,
 * buttons for discoverability). `contentWidth`/`contentHeight` describe the
 * children's natural, unscaled pixel size; the viewport auto-computes a
 * "fit" scale so the whole thing is visible by default, then lets the user
 * zoom in further from there.
 *
 * State is kept entirely inside this component so that panning/zooming
 * never re-renders the (possibly expensive) children subtree — as long as
 * the caller passes a stable `children` element, React bails out of
 * reconciling it on every pointer move.
 *
 * During an actual gesture React is bypassed altogether: the live camera
 * lives in `viewRef` and is written straight to the world element's
 * transform inside a rAF callback (see `applyTransform`/`scheduleFrame`).
 * `view` state is only re-synced when a gesture settles, so a drag costs one
 * compositor update per frame instead of a full render + commit. Everything
 * that renders from the camera (the buttons' disabled state) reads the
 * post-gesture state, which is exactly when it needs to be right.
 */
export function ZoomPanViewport({
  children,
  contentWidth,
  contentHeight,
  className = "",
  onGestureStart,
}: {
  children: ReactNode;
  contentWidth: number;
  contentHeight: number;
  className?: string;
  /** Fires once at the start of an actual zoom or pan gesture (not a plain tap). */
  onGestureStart?: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const viewRef = useRef(view);

  // Wheel/pinch/drag update the camera continuously and are already smooth
  // via the pointer/wheel event stream, so they render with no CSS transition
  // (adding one there would make fast scrolling feel laggy/rubber-banded).
  // Button-triggered jumps (+/-/Fit) are discrete, so those get a brief
  // eased transition for a "smooth camera move" feel instead of a snap.
  const [smoothTransition, setSmoothTransition] = useState(false);
  const smoothTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const withSmoothTransition = useCallback((run: () => void) => {
    setSmoothTransition(true);
    run();
    if (smoothTimeoutRef.current) clearTimeout(smoothTimeoutRef.current);
    smoothTimeoutRef.current = setTimeout(
      () => setSmoothTransition(false),
      BUTTON_ZOOM_TRANSITION_MS,
    );
  }, []);
  useEffect(
    () => () => {
      if (smoothTimeoutRef.current) clearTimeout(smoothTimeoutRef.current);
    },
    [],
  );

  // Measure synchronously before the browser paints (useLayoutEffect, not
  // useEffect) so the very first frame already has the real container size
  // and renders centered at the correct fit scale — otherwise containerSize
  // starts at {0,0}, fitScale would fall back to 1 (native/unscaled) for one
  // frame, and the camera could visibly start off-center before snapping
  // into place. The ResizeObserver keeps it correct on later layout changes
  // (e.g. window resize).
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // "Contain" fit (Math.min): at the default zoom, the entire world —
  // `contentWidth`/`contentHeight`, which the caller makes larger than the
  // 100 cells themselves — is visible all at once, letterboxed if needed,
  // and centered on the 100-cell wall. This is the "zoomed out, see the
  // whole small universe" view. Dragging works at any zoom (map-like), but
  // naturally has no visible effect until zooming in gives the camera room
  // to move within the world's bounds.
  const fitScale =
    containerSize.width > 0 &&
    containerSize.height > 0 &&
    contentWidth > 0 &&
    contentHeight > 0
      ? Math.min(
          containerSize.width / contentWidth,
          containerSize.height / contentHeight,
        )
      : 1;

  // The geometry `applyTransform` needs, mirrored into a ref so the rAF
  // gesture loop can read it without closing over a specific render. Kept in
  // sync by the layout effect below, which runs before any gesture can.
  const geometryRef = useRef({
    fitScale,
    contentWidth,
    contentHeight,
    width: containerSize.width,
    height: containerSize.height,
  });

  /**
   * Write a camera straight to the DOM. `view.x`/`view.y` are a pan delta
   * from the centered position, in real screen pixels; the centered position
   * itself is computed explicitly here (rather than left to a flexbox
   * "items-center justify-center" wrapper around the oversized, unscaled
   * content box) so centering can't drift or collapse if a browser handles a
   * transformed, larger-than-container flex child differently than expected.
   */
  const applyTransform = useCallback((next: View) => {
    const world = worldRef.current;
    if (!world) return;
    const geometry = geometryRef.current;
    const scale = geometry.fitScale * next.zoom;
    const x = (geometry.width - geometry.contentWidth * scale) / 2 + next.x;
    const y = (geometry.height - geometry.contentHeight * scale) / 2 + next.y;
    // Deliberately a 2D transform. A 3D one (or a permanent `will-change`)
    // pins the world to a compositor layer, and the browser then *scales the
    // cached bitmap* on zoom rather than re-rasterizing — which renders the
    // cell text blurry. `setPromoted` opts into that only for the duration of
    // a gesture, where a crisp intermediate frame matters less than a
    // dropped one.
    world.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }, []);

  /**
   * Put the world on its own compositor layer for the length of a gesture,
   * then hand it back so the browser re-rasterizes text at the final scale.
   * Leaving it promoted is what makes a zoomed-in wall look soft.
   */
  const setPromoted = useCallback((promoted: boolean) => {
    const world = worldRef.current;
    if (!world) return;
    world.style.willChange = promoted ? "transform" : "auto";
  }, []);

  // The single point where React state becomes the live camera: any render
  // that changes `view`, the fit scale, or the container size re-paints the
  // world transform. Gestures write `viewRef` + the DOM directly and only
  // come back through here when they settle, so the two can never disagree
  // for longer than a frame.
  useLayoutEffect(() => {
    geometryRef.current = {
      fitScale,
      contentWidth,
      contentHeight,
      width: containerSize.width,
      height: containerSize.height,
    };
    viewRef.current = view;
    applyTransform(view);
  }, [
    view,
    applyTransform,
    fitScale,
    contentWidth,
    contentHeight,
    containerSize.width,
    containerSize.height,
  ]);

  /** How far the camera may pan from center before it's out of the world. */
  const boundsFor = useCallback((zoom: number) => {
    const geometry = geometryRef.current;
    const scale = geometry.fitScale * zoom;
    return {
      maxX: Math.max(0, (geometry.contentWidth * scale - geometry.width) / 2),
      maxY: Math.max(0, (geometry.contentHeight * scale - geometry.height) / 2),
    };
  }, []);

  const clamp = useCallback(
    (next: View): View => {
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.zoom));
      const { maxX, maxY } = boundsFor(zoom);
      return {
        zoom,
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      };
    },
    [boundsFor],
  );

  // --- Imperative frame loop ------------------------------------------------
  const frameRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);

  /** Coalesce however many pointer events a frame brought into one paint. */
  const scheduleFrame = useCallback(() => {
    if (frameRef.current != null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      applyTransform(viewRef.current);
    });
  }, [applyTransform]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current != null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  /** Hand the live camera back to React once a gesture has come to rest. */
  const commitView = useCallback(() => {
    setPromoted(false);
    setView(viewRef.current);
  }, [setPromoted]);

  useEffect(
    () => () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      if (animationRef.current != null)
        cancelAnimationFrame(animationRef.current);
    },
    [],
  );

  /** Ease an overscrolled camera back inside the world's bounds. */
  const settleInBounds = useCallback(() => {
    stopAnimation();
    const from = viewRef.current;
    const to = clamp(from);
    if (from.x === to.x && from.y === to.y) {
      commitView();
      return;
    }
    const startedAt = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startedAt) / SETTLE_MS);
      const eased = easeOutCubic(t);
      viewRef.current = {
        zoom: to.zoom,
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased,
      };
      applyTransform(viewRef.current);
      if (t < 1) {
        animationRef.current = requestAnimationFrame(step);
        return;
      }
      animationRef.current = null;
      commitView();
    };
    animationRef.current = requestAnimationFrame(step);
  }, [applyTransform, clamp, commitView, stopAnimation]);

  /** Glide on after a flick, decaying by elapsed time so it's fps-independent. */
  const startMomentum = useCallback(
    (velocity: Point) => {
      stopAnimation();
      let { x: vx, y: vy } = velocity;
      let last = performance.now();
      const step = (now: number) => {
        // Cap dt so a backgrounded tab doesn't resume with one huge jump.
        const dt = Math.min(64, now - last);
        last = now;
        const decay = Math.pow(MOMENTUM_DECAY_PER_MS, dt);
        vx *= decay;
        vy *= decay;

        const current = viewRef.current;
        const { maxX, maxY } = boundsFor(current.zoom);
        const proposedX = current.x + vx * dt;
        const proposedY = current.y + vy * dt;
        const nextX = Math.min(maxX, Math.max(-maxX, proposedX));
        const nextY = Math.min(maxY, Math.max(-maxY, proposedY));
        // Hitting a wall kills that axis only, so a diagonal flick keeps
        // sliding along the edge instead of stopping dead in the corner.
        if (nextX !== proposedX) vx = 0;
        if (nextY !== proposedY) vy = 0;

        viewRef.current = { zoom: current.zoom, x: nextX, y: nextY };
        applyTransform(viewRef.current);

        if (Math.hypot(vx, vy) < MOMENTUM_MIN_SPEED) {
          animationRef.current = null;
          commitView();
          return;
        }
        animationRef.current = requestAnimationFrame(step);
      };
      animationRef.current = requestAnimationFrame(step);
    },
    [applyTransform, boundsFor, commitView, stopAnimation],
  );

  /** Zoom by `delta`, keeping the point under `origin` (screen coords) stationary. Centered zoom if origin omitted. */
  const zoomBy = useCallback(
    (delta: number, origin?: Point) => {
      const el = viewportRef.current;
      if (!el) return;
      stopAnimation();
      const prev = viewRef.current;
      const nextZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, prev.zoom + delta),
      );
      if (nextZoom === prev.zoom) return;
      const rect = el.getBoundingClientRect();
      const cx = origin ? origin.x - rect.left - rect.width / 2 : 0;
      const cy = origin ? origin.y - rect.top - rect.height / 2 : 0;
      const ratio = nextZoom / prev.zoom;
      const next = clamp({
        zoom: nextZoom,
        x: cx - (cx - prev.x) * ratio,
        y: cy - (cy - prev.y) * ratio,
      });
      // Advance the live camera before the render lands, so a burst of wheel
      // events that React batches into one update still compounds step by
      // step instead of collapsing to a single one.
      viewRef.current = next;
      setView(next);
    },
    [clamp, stopAnimation],
  );

  const resetView = useCallback(() => {
    stopAnimation();
    setView({ zoom: 1, x: 0, y: 0 });
  }, [stopAnimation]);

  const isCanvasControl = useCallback((target: EventTarget | null) => {
    return (
      target instanceof Element &&
      Boolean(target.closest("[data-canvas-control]"))
    );
  }, []);

  // Non-passive wheel listener so preventDefault reliably stops page scroll
  // while zooming — React's onWheel is passive by default in most builds.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      onGestureStart?.();
      zoomBy(-e.deltaY * 0.0025 * ZOOM_STEP * 10, {
        x: e.clientX,
        y: e.clientY,
      });
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [zoomBy, onGestureStart]);

  const pointers = useRef(new Map<number, Point>());
  const dragStart = useRef<{
    x: number;
    y: number;
    viewX: number;
    viewY: number;
  } | null>(null);
  const pinchStart = useRef<{
    distance: number;
    zoom: number;
    midpoint: Point;
    viewX: number;
    viewY: number;
  } | null>(null);
  const dragMoved = useRef(false);
  // Sampled from pointermove, in px/ms, for the release flick.
  const velocityRef = useRef<Point>({ x: 0, y: 0 });
  const lastSampleRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  // The viewport's box, read once per gesture. Reading it per pointermove
  // (as the pinch math used to) forces a synchronous layout every frame.
  const rectRef = useRef<DOMRect | null>(null);

  function distance(a: Point, b: Point) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function midpoint(a: Point, b: Point): Point {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button != null && e.button !== 0) return;
    // Camera controls sit inside the viewport so they need to opt out of the
    // gesture system. Wall cells deliberately do not opt out: a short tap
    // opens a spot, while a drag begun on a spot still pans the wall.
    if (isCanvasControl(e.target)) {
      dragMoved.current = false;
      return;
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Touching down catches the wall mid-glide, like grabbing a spinning
    // wheel — and takes the camera back from any in-flight animation.
    stopAnimation();
    setPromoted(true);
    if (smoothTimeoutRef.current) clearTimeout(smoothTimeoutRef.current);
    setSmoothTransition(false);
    rectRef.current = viewportRef.current?.getBoundingClientRect() ?? null;
    velocityRef.current = { x: 0, y: 0 };
    lastSampleRef.current = { x: e.clientX, y: e.clientY, time: e.timeStamp };

    if (pointers.current.size === 1) {
      dragMoved.current = false;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        viewX: viewRef.current.x,
        viewY: viewRef.current.y,
      };
      pinchStart.current = null;
    } else if (pointers.current.size === 2) {
      dragStart.current = null;
      const pts = [...pointers.current.values()];
      pinchStart.current = {
        distance: distance(pts[0], pts[1]),
        zoom: viewRef.current.zoom,
        midpoint: midpoint(pts[0], pts[1]),
        viewX: viewRef.current.x,
        viewY: viewRef.current.y,
      };
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = rectRef.current;
    if (!rect) return;

    if (pointers.current.size === 2 && pinchStart.current) {
      const start = pinchStart.current;
      const pts = [...pointers.current.values()];
      const nextDistance = distance(pts[0], pts[1]);
      const ratio = nextDistance / (start.distance || 1);
      const nextMidpoint = midpoint(pts[0], pts[1]);
      const clampedZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, start.zoom * ratio),
      );

      const startX = start.midpoint.x - rect.left - rect.width / 2;
      const startY = start.midpoint.y - rect.top - rect.height / 2;
      const nextX = nextMidpoint.x - rect.left - rect.width / 2;
      const nextY = nextMidpoint.y - rect.top - rect.height / 2;
      const scaleRatio = clampedZoom / start.zoom;
      // Keep the original point between the fingers attached to the wall,
      // while allowing the whole pinch to travel naturally. Both terms are
      // measured against the gesture's *start* pan — feeding an
      // already-updated pan back in makes the canvas drift off the target.
      viewRef.current = clamp({
        zoom: clampedZoom,
        x: nextX - (startX - start.viewX) * scaleRatio,
        y: nextY - (startY - start.viewY) * scaleRatio,
      });
      if (!dragMoved.current) onGestureStart?.();
      dragMoved.current = true;
      scheduleFrame();
      return;
    }

    const start = dragStart.current;
    // Free, map-like panning: dragging always works, at any zoom level. Past
    // the world's edge the drag doesn't stop dead — `rubberBand` adds
    // resistance and `settleInBounds` eases it back on release, so the fully
    // zoomed-out fit view stretches and springs instead of feeling stuck.
    if (start && pointers.current.size === 1) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (
        Math.abs(dx) > DRAG_THRESHOLD_PX ||
        Math.abs(dy) > DRAG_THRESHOLD_PX
      ) {
        if (!dragMoved.current) onGestureStart?.();
        dragMoved.current = true;
      }

      const previous = lastSampleRef.current;
      const elapsed = previous ? e.timeStamp - previous.time : 0;
      if (previous && elapsed > 0) {
        const sampleX = (e.clientX - previous.x) / elapsed;
        const sampleY = (e.clientY - previous.y) / elapsed;
        velocityRef.current = {
          x:
            velocityRef.current.x * (1 - VELOCITY_SMOOTHING) +
            sampleX * VELOCITY_SMOOTHING,
          y:
            velocityRef.current.y * (1 - VELOCITY_SMOOTHING) +
            sampleY * VELOCITY_SMOOTHING,
        };
      }
      lastSampleRef.current = { x: e.clientX, y: e.clientY, time: e.timeStamp };

      const { maxX, maxY } = boundsFor(viewRef.current.zoom);
      viewRef.current = {
        zoom: viewRef.current.zoom,
        x: rubberBand(start.viewX + dx, maxX),
        y: rubberBand(start.viewY + dy, maxY),
      };
      scheduleFrame();
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    const wasDragging =
      pointers.current.has(e.pointerId) && pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;

    if (pointers.current.size === 1) {
      const remaining = [...pointers.current.values()][0];
      // A lifted finger should not strand the wall mid-gesture. Continue
      // straight into a one-finger pan from the remaining touch point.
      dragStart.current = {
        x: remaining.x,
        y: remaining.y,
        viewX: viewRef.current.x,
        viewY: viewRef.current.y,
      };
      lastSampleRef.current = {
        x: remaining.x,
        y: remaining.y,
        time: e.timeStamp,
      };
      velocityRef.current = { x: 0, y: 0 };
      return;
    }

    if (pointers.current.size > 0) return;

    dragStart.current = null;
    lastSampleRef.current = null;
    rectRef.current = null;

    const velocity = velocityRef.current;
    const overscrolled = (() => {
      const { maxX, maxY } = boundsFor(viewRef.current.zoom);
      return (
        Math.abs(viewRef.current.x) > maxX + 0.5 ||
        Math.abs(viewRef.current.y) > maxY + 0.5
      );
    })();

    // Springing back always wins over a flick — otherwise a fast drag into
    // the edge would coast further out of bounds before returning.
    if (overscrolled) {
      settleInBounds();
    } else if (
      wasDragging &&
      e.type !== "pointercancel" &&
      Math.hypot(velocity.x, velocity.y) > MOMENTUM_START_SPEED
    ) {
      startMomentum(velocity);
    } else {
      commitView();
    }
    velocityRef.current = { x: 0, y: 0 };
  }

  return (
    <div className={`select-none ${className}`}>
      <div
        ref={viewportRef}
        className="relative h-full w-full overflow-hidden bg-surface"
        // `overscrollBehavior: contain` stops a pan that runs out of world
        // from turning into the browser's pull-to-refresh or back-swipe.
        style={{ touchAction: "none", overscrollBehavior: "contain" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={(e) => {
          if (dragMoved.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {/* Static backdrop — see backdropStyle comment above. Sits behind the
            world and always covers the full viewport, unaffected by zoom/pan. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={backdropStyle}
        />

        <div
          ref={worldRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: contentWidth,
            height: contentHeight,
            // The transform itself is written imperatively (applyTransform),
            // never from render — see the component doc comment.
            transformOrigin: "0 0",
            // `willChange` is toggled per gesture (setPromoted), never left
            // on — see applyTransform.
            transition: smoothTransition
              ? `transform ${BUTTON_ZOOM_TRANSITION_MS}ms ease-out`
              : "none",
            // Dragging always works (map-like), so always show the grab
            // affordance rather than gating it on zoom level.
            cursor: "grab",
          }}
        >
          {children}
        </div>

        {/* Offset below top-3 to clear the floating top bar the page renders
            on top of this fullscreen canvas (see SlotWall). */}
        <div
          data-canvas-control
          className="absolute right-3 top-[6.75rem] flex flex-col overflow-hidden rounded-xl border border-border bg-background/95 shadow-sm backdrop-blur sm:right-4 sm:top-16"
        >
          <Button
            type="button"
            aria-label="Zoom in"
            onClick={() => withSmoothTransition(() => zoomBy(ZOOM_STEP))}
            disabled={view.zoom >= MAX_ZOOM}
            variant="ghost"
            size="icon"
            className="flex h-10 w-10 items-center justify-center rounded-none text-foreground hover:bg-surface disabled:opacity-30 sm:h-8 sm:w-8 text-xl font-medium sm:text-base"
          >
            +
          </Button>
          <div className="border-t border-border" />
          <Button
            type="button"
            aria-label="Zoom out"
            onClick={() => withSmoothTransition(() => zoomBy(-ZOOM_STEP))}
            disabled={view.zoom <= MIN_ZOOM}
            variant="ghost"
            size="icon"
            className="flex h-10 w-10 items-center justify-center rounded-none text-foreground hover:bg-surface disabled:opacity-30 sm:h-8 sm:w-8 text-xl font-medium sm:text-base"
          >
            −
          </Button>
          <div className="border-t border-border" />
          <Button
            type="button"
            aria-label="Reset zoom"
            onClick={() => withSmoothTransition(resetView)}
            disabled={view.zoom === 1 && view.x === 0 && view.y === 0}
            variant="ghost"
            size="icon"
            className="flex h-10 w-10 items-center justify-center rounded-none text-foreground hover:bg-surface disabled:opacity-30 sm:h-8 sm:w-8 text-[11px] font-medium sm:text-[10px]"
          >
            Fit
          </Button>
        </div>
      </div>
    </div>
  );
}
