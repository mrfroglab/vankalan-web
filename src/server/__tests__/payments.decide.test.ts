// @vitest-environment node
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { canTransition, deriveOrderPayment, normalizeStatus } from '../payments/decide';
import { computeSignature, parseGrossAmount, verifySignature } from '../payments/midtrans';

describe('normalizeStatus', () => {
  const n = (transaction_status?: string, fraud_status?: string) =>
    normalizeStatus({ transaction_status, fraud_status });
  it('sukses hanya settlement atau capture+accept (fraud_status boleh kosong)', () => {
    expect(n('settlement')).toBe('PAID');
    expect(n('settlement', 'accept')).toBe('PAID');
    expect(n('capture', 'accept')).toBe('PAID');
    expect(n('capture')).toBe('PAID');
  });
  it('capture challenge menunggu; capture deny gagal', () => {
    expect(n('capture', 'challenge')).toBe('PENDING');
    expect(n('capture', 'deny')).toBe('FAILED');
  });
  it('pending/authorize menunggu; deny/cancel/failure gagal; expire kedaluwarsa', () => {
    expect(n('pending')).toBe('PENDING');
    expect(n('authorize')).toBe('PENDING');
    for (const s of ['deny', 'cancel', 'failure']) expect(n(s)).toBe('FAILED');
    expect(n('expire')).toBe('EXPIRED');
  });
  it('refund/chargeback/tak dikenal diabaikan (refund manual sesuai PRD)', () => {
    for (const s of ['refund', 'partial_refund', 'chargeback', 'aneh', undefined]) {
      expect(n(s as string | undefined)).toBeNull();
    }
  });
});

describe('canTransition', () => {
  it('PAID final; PENDING tak menimpa; gagal hanya dari PENDING; settlement terlambat sah', () => {
    expect(canTransition('PAID', 'PENDING')).toBe(false);
    expect(canTransition('PAID', 'EXPIRED')).toBe(false);
    expect(canTransition('PAID', 'PAID')).toBe(false);
    expect(canTransition('FAILED', 'PENDING')).toBe(false);
    expect(canTransition('EXPIRED', 'FAILED')).toBe(false);
    expect(canTransition('FAILED', 'EXPIRED')).toBe(false);
    expect(canTransition('PENDING', 'FAILED')).toBe(true);
    expect(canTransition('PENDING', 'EXPIRED')).toBe(true);
    expect(canTransition('PENDING', 'PAID')).toBe(true);
    expect(canTransition('EXPIRED', 'PAID')).toBe(true);
    expect(canTransition('FAILED', 'PAID')).toBe(true);
  });
});

describe('deriveOrderPayment', () => {
  it('PAID > PENDING > percobaan terbaru', () => {
    expect(deriveOrderPayment([{ attempt: 1, status: 'PAID' }, { attempt: 2, status: 'EXPIRED' }])).toBe('PAID');
    expect(deriveOrderPayment([{ attempt: 1, status: 'FAILED' }, { attempt: 2, status: 'PENDING' }])).toBe('PENDING');
    expect(deriveOrderPayment([{ attempt: 1, status: 'EXPIRED' }, { attempt: 2, status: 'FAILED' }])).toBe('FAILED');
    expect(deriveOrderPayment([])).toBe('PENDING');
  });
});

describe('midtrans helpers', () => {
  const p = { order_id: 'PV-20261107-1001-1', status_code: '200', gross_amount: '24000.00' };
  const key = 'SB-Mid-server-test';

  it('signature = SHA512(order_id+status_code+gross_amount+serverKey)', () => {
    const expected = createHash('sha512').update('PV-20261107-1001-1' + '200' + '24000.00' + key).digest('hex');
    expect(computeSignature(p, key)).toBe(expected);
    expect(verifySignature({ ...p, signature_key: expected }, key)).toBe(true);
  });
  it('signature salah / dimanipulasi / kosong ditolak', () => {
    const sig = computeSignature(p, key);
    expect(verifySignature({ ...p, signature_key: sig.replace(/.$/, '0') }, key)).toBe(false);
    expect(verifySignature({ ...p, gross_amount: '1.00', signature_key: sig }, key)).toBe(false);
    expect(verifySignature({ ...p, signature_key: sig }, 'kunci-lain')).toBe(false);
    expect(verifySignature({ ...p }, key)).toBe(false);
    expect(verifySignature({ ...p, signature_key: 'pendek' }, key)).toBe(false);
  });
  it('parseGrossAmount hanya menerima rupiah bulat', () => {
    expect(parseGrossAmount('24000.00')).toBe(24000);
    expect(parseGrossAmount('24000')).toBe(24000);
    expect(parseGrossAmount(24000)).toBe(24000);
    for (const bad of ['24000.50', '-5', 'abc', '', '1e3', '24,000.00', null, undefined, '99999999999999999999']) {
      expect(parseGrossAmount(bad)).toBeNull();
    }
  });
});
