import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AppCard } from './AppCard';

const descriptor = { name: 'Weather', brief: 'Forecasts for the week.' };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderCard(overrides: Partial<React.ComponentProps<typeof AppCard>> = {}) {
  return render(
    <AppCard
      path="Weather"
      name="Weather"
      descriptor={descriptor}
      reducedMotion={false}
      onOpen={() => {}}
      onBrowse={() => {}}
      {...overrides}
    />,
  );
}

describe('app card reveal', () => {
  it('reveals on a deliberate keyboard activation and focuses Run when the turn settles', () => {
    renderCard();
    const front = screen.getByRole('button', { name: /Weather, app/i });
    fireEvent.keyDown(front, { key: 'Enter' });
    expect(document.querySelector('[data-revealed="true"]')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(document.activeElement?.textContent).toBe('Run');
  });

  it('reveals after one second of continuous hover and cancels when the pointer leaves', () => {
    renderCard();
    const front = screen.getByRole('button', { name: /Weather, app/i });
    fireEvent.pointerEnter(front, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(document.querySelector('[data-revealed="true"]')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(document.querySelector('[data-revealed="true"]')).not.toBeNull();

    fireEvent.keyDown(screen.getByText('Close'), { key: 'Escape', bubbles: true });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(document.querySelector('[data-revealed="true"]')).toBeNull();

    fireEvent.pointerEnter(front, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerLeave(front);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(document.querySelector('[data-revealed="true"]')).toBeNull();
  });

  it('ignores held-key repeats once focus lands on an action', () => {
    renderCard();
    const front = screen.getByRole('button', { name: /Weather, app/i });
    fireEvent.keyDown(front, { key: 'Enter' });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    const run = document.querySelector('.fo-actions button') as HTMLButtonElement;
    expect(document.activeElement).toBe(run);
    expect(fireEvent.keyDown(run, { key: 'Enter', repeat: true })).toBe(false);
  });

  it('cancels a pending hover dwell when the page or a nested surface scrolls', () => {
    renderCard();
    const front = screen.getByRole('button', { name: /Weather, app/i });
    fireEvent.pointerEnter(front, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.scroll(window);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(document.querySelector('[data-revealed="true"]')).toBeNull();

    // A nested scrolling surface cancels the next dwell the same way.
    fireEvent.pointerEnter(front, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.scroll(document.body);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(document.querySelector('[data-revealed="true"]')).toBeNull();

    // A fresh hover after the scroll reveals normally.
    fireEvent.pointerEnter(front, { pointerType: 'mouse' });
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(document.querySelector('[data-revealed="true"]')).not.toBeNull();
  });

  it('requires a second activation before Run explains the runtime limitation', () => {
    renderCard();
    const front = screen.getByRole('button', { name: /Weather, app/i });
    fireEvent.click(front, { detail: 1 });
    expect(document.querySelector('[data-revealed="true"]')).not.toBeNull();
    const run = document.querySelector('.fo-actions button') as HTMLButtonElement;
    fireEvent.click(run);
    expect(screen.queryByText(/Running apps isn't available yet/)).toBeNull();
    act(() => {
      vi.advanceTimersByTime(800);
    });
    fireEvent.click(run);
    expect(screen.getByText(/Running apps isn't available yet/)).toBeTruthy();
  });
});
