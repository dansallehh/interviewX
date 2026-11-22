import { describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '../../services/pwaService';

describe('pwaService', () => {
  it('registers ./sw.js when navigator.serviceWorker is available and handles failures safely', async () => {
    const registerMock = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register: registerMock },
    });

    expect(await registerServiceWorker()).toBe(true);
    expect(registerMock).toHaveBeenCalledWith('./sw.js', { scope: './' });

    registerMock.mockRejectedValueOnce(new Error('SW blocked'));
    expect(await registerServiceWorker()).toBe(false);
  });
});
