import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PwaInstallButton from './PwaInstallButton.jsx';

const dispatchInstallPrompt = (outcome = 'accepted') => {
  const event = new Event('beforeinstallprompt');
  const prompt = vi.fn().mockResolvedValue(undefined);
  Object.defineProperties(event, {
    prompt: { value: prompt },
    userChoice: { value: Promise.resolve({ outcome }) },
  });
  window.dispatchEvent(event);
  return prompt;
};

describe('PwaInstallButton', () => {
  it('appears when installation is available and disappears after acceptance', async () => {
    render(<PwaInstallButton />);
    expect(screen.queryByRole('button', { name: 'Instalar Filmate' })).not.toBeInTheDocument();

    const prompt = dispatchInstallPrompt();
    fireEvent.click(await screen.findByRole('button', { name: 'Instalar Filmate' }));

    expect(prompt).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Instalar Filmate' })).not.toBeInTheDocument();
    });
  });

  it('disappears when the browser reports that Filmate was installed', async () => {
    render(<PwaInstallButton />);
    dispatchInstallPrompt('dismissed');
    expect(await screen.findByRole('button', { name: 'Instalar Filmate' })).toBeInTheDocument();

    window.dispatchEvent(new Event('appinstalled'));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Instalar Filmate' })).not.toBeInTheDocument();
    });
  });
});
