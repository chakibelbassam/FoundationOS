import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import CodeSlots from './CodeSlots';

function stubMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function inputOf(container: HTMLElement) {
  const input = container.querySelector('input');
  if (!input) throw new Error('CodeSlots input missing');
  return input;
}

describe('CodeSlots', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('renders six slots and reports a typed code', () => {
    const onChange = vi.fn();
    const { container } = render(<CodeSlots length={6} onChange={onChange} />);
    expect(container.querySelectorAll('[data-filled], span').length).toBeGreaterThan(6);
    fireEvent.change(inputOf(container), { target: { value: '123456' } });
    expect(onChange).toHaveBeenLastCalledWith('123456');
  });

  it('accepts a pasted code from the first slot', () => {
    const onChange = vi.fn();
    const { container } = render(<CodeSlots length={6} onChange={onChange} />);
    fireEvent.paste(inputOf(container), { clipboardData: { getData: () => '654321' } });
    expect(onChange).toHaveBeenLastCalledWith('654321');
  });

  it('clears the last digit with Backspace', () => {
    const onChange = vi.fn();
    const { container } = render(<CodeSlots length={6} defaultValue="123" onChange={onChange} />);
    fireEvent.keyDown(inputOf(container), { key: 'Backspace' });
    expect(onChange).toHaveBeenLastCalledWith('12');
  });

  it('drains and clears on the error status', async () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <CodeSlots length={6} defaultValue="123456" onChange={onChange} />,
    );
    rerender(<CodeSlots length={6} defaultValue="123456" status="error" onChange={onChange} />);
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(''), { timeout: 2500 });
    expect(inputOf(container)).toBeTruthy();
  });

  it('locks the input after success', () => {
    const { container } = render(<CodeSlots length={6} defaultValue="123456" status="success" />);
    const input = inputOf(container);
    expect(input.hasAttribute('readonly')).toBe(true);
    expect(input.getAttribute('aria-invalid')).toBe('false');
  });
});
