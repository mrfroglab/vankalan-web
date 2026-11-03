import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaymentModal } from '../PaymentModal';

// @ts-expect-error global declaration for React test environment
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('PaymentModal — Empirical Verification Suite', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders order number, customer name, and total amount cleanly', () => {
    const handleSelectOutcome = vi.fn();
    const handleClose = vi.fn();

    act(() => {
      root.render(
        <PaymentModal
          isOpen={true}
          onClose={handleClose}
          orderNumber="VNK-20261103-0042"
          customerName="Ahmad Fauzan"
          totalAmount={28500}
          onSelectOutcome={handleSelectOutcome}
        />
      );
    });

    const modalText = container.textContent || '';
    expect(modalText).toContain('Simulasi Pembayaran Midtrans Snap');
    expect(modalText).toContain('Kotak Pasir Demo (Sandbox)');
    expect(modalText).toContain('VNK-20261103-0042');
    expect(modalText).toContain('Ahmad Fauzan');
    expect(modalText).toContain('28.500'); // Rupiah format check
  });

  it('triggers onSelectOutcome with PAID when clicking Simulasikan Berhasil', () => {
    const handleSelectOutcome = vi.fn();
    const handleClose = vi.fn();

    act(() => {
      root.render(
        <PaymentModal
          isOpen={true}
          onClose={handleClose}
          orderNumber="VNK-001"
          customerName="Santri Test"
          totalAmount={14000}
          onSelectOutcome={handleSelectOutcome}
        />
      );
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const paidButton = buttons.find((b) => b.textContent?.includes('Simulasikan Berhasil'));

    expect(paidButton).toBeDefined();

    act(() => {
      paidButton!.click();
    });

    expect(handleSelectOutcome).toHaveBeenCalledTimes(1);
    expect(handleSelectOutcome).toHaveBeenCalledWith('PAID');
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('triggers onSelectOutcome with FAILED when clicking Simulasikan Pembayaran Gagal', () => {
    const handleSelectOutcome = vi.fn();
    const handleClose = vi.fn();

    act(() => {
      root.render(
        <PaymentModal
          isOpen={true}
          onClose={handleClose}
          orderNumber="VNK-001"
          customerName="Santri Test"
          totalAmount={14000}
          onSelectOutcome={handleSelectOutcome}
        />
      );
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const failedButton = buttons.find((b) => b.textContent?.includes('Simulasikan Pembayaran Gagal'));

    expect(failedButton).toBeDefined();

    act(() => {
      failedButton!.click();
    });

    expect(handleSelectOutcome).toHaveBeenCalledTimes(1);
    expect(handleSelectOutcome).toHaveBeenCalledWith('FAILED');
  });

  it('triggers onSelectOutcome with EXPIRED when clicking Simulasikan Kedaluwarsa', () => {
    const handleSelectOutcome = vi.fn();
    const handleClose = vi.fn();

    act(() => {
      root.render(
        <PaymentModal
          isOpen={true}
          onClose={handleClose}
          orderNumber="VNK-001"
          customerName="Santri Test"
          totalAmount={14000}
          onSelectOutcome={handleSelectOutcome}
        />
      );
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const expiredButton = buttons.find((b) => b.textContent?.includes('Simulasikan Kedaluwarsa'));

    expect(expiredButton).toBeDefined();

    act(() => {
      expiredButton!.click();
    });

    expect(handleSelectOutcome).toHaveBeenCalledTimes(1);
    expect(handleSelectOutcome).toHaveBeenCalledWith('EXPIRED');
  });

  it('triggers onClose when clicking Batalkan Pembayaran', () => {
    const handleSelectOutcome = vi.fn();
    const handleClose = vi.fn();

    act(() => {
      root.render(
        <PaymentModal
          isOpen={true}
          onClose={handleClose}
          orderNumber="VNK-001"
          customerName="Santri Test"
          totalAmount={14000}
          onSelectOutcome={handleSelectOutcome}
        />
      );
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const cancelButton = buttons.find((b) => b.textContent?.includes('Batalkan Pembayaran'));

    expect(cancelButton).toBeDefined();

    act(() => {
      cancelButton!.click();
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleSelectOutcome).not.toHaveBeenCalled();
  });
});
