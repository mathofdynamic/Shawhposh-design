/**
 * Shahpoosh Luxury Streetwear - Order Operations & Invariant Tests
 * Tests Transition Guards, Stock Reservation Release, Refund Separation, and Manual Order Validation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateSyntheticDatabase } from '../generator';
import { adminRepository } from '../repository';
import { canTransitionOrderStatus } from '../orderStateMachine';
import { Order } from '../types';

describe('Order Operations & Transition Guards Invariant Suite', () => {
  const db = generateSyntheticDatabase();

  it('blocks transition to in_production for unverified payment orders', () => {
    // Order with pending payment
    const pendingOrder: Order = {
      ...db.orders[0],
      id: 'TEST-ORD-01',
      status: 'pending_payment',
      paymentStatus: 'pending',
      hasCustomLineItem: false,
    };

    const guard = canTransitionOrderStatus('in_production', {
      order: pendingOrder,
      payment: {
        id: 'PAY-TEST-01',
        orderId: 'TEST-ORD-01',
        customerId: pendingOrder.customerId,
        amountTomans: pendingOrder.totalTomans,
        method: 'saman_gateway',
        status: 'pending',
        gatewayRefId: '123',
        traceNumber: '456',
        maskedIpAddress: '192.0.2.1',
        createdAt: new Date().toISOString(),
      },
      variants: db.variants,
    });

    assert.equal(guard.allowed, false);
    assert.match(guard.reason || '', /پرداخت/);
  });

  it('blocks transition to in_production for custom POD orders with unapproved designs', () => {
    const podOrder: Order = {
      ...db.orders[0],
      id: 'TEST-ORD-POD',
      status: 'paid_processing',
      paymentStatus: 'verified_paid',
      hasCustomLineItem: true,
    };

    const guard = canTransitionOrderStatus('in_production', {
      order: podOrder,
      payment: {
        id: 'PAY-TEST-02',
        orderId: 'TEST-ORD-POD',
        customerId: podOrder.customerId,
        amountTomans: podOrder.totalTomans,
        method: 'saman_gateway',
        status: 'verified_paid',
        gatewayRefId: '123',
        traceNumber: '456',
        maskedIpAddress: '192.0.2.1',
        createdAt: new Date().toISOString(),
      },
      designs: [
        {
          id: 'DSG-TEST-01',
          orderId: 'TEST-ORD-POD',
          customerId: podOrder.customerId,
          title: 'تست طرح',
          previewUrl: '',
          format: 'SVG',
          resolutionDpi: 300,
          colorProfile: 'CMYK',
          dimensionsMm: '280x380',
          printZone: 'front_chest',
          status: 'under_review', // Not approved yet!
          submittedAt: new Date().toISOString(),
          revisionCount: 1,
        },
      ],
      variants: db.variants,
    });

    assert.equal(guard.allowed, false);
    assert.match(guard.reason || '', /طرح/);
  });

  it('blocks transition directly to delivered without prior shipping', () => {
    const processingOrder: Order = {
      ...db.orders[0],
      id: 'TEST-ORD-SHIP',
      status: 'in_production',
      paymentStatus: 'verified_paid',
      hasCustomLineItem: false,
    };

    const guard = canTransitionOrderStatus('delivered', {
      order: processingOrder,
      variants: db.variants,
    });

    assert.equal(guard.allowed, false);
    assert.match(guard.reason || '', /ارسال/);
  });

  it('releases reserved stock back to sellable availability upon order cancellation', () => {
    // Pick a test variant
    const variant = adminRepository.getStateSnapshot().variants[0];
    const initialReserved = variant.reservedStock;
    const initialOnHand = variant.onHandStock;

    // Create a valid manual order reserving 1 unit
    const createRes = adminRepository.createManualOrder({
      customerName: 'تست رزرو انبار',
      customerPhone: '09120000000',
      shippingAddress: 'تهران خیابان تست',
      city: 'تهران',
      items: [{ variantSku: variant.sku, quantity: 1 }],
      staffId: 'STF-01',
    });

    assert.equal(createRes.success, true);
    const createdOrder = createRes.data!;

    const afterCreateVariant = adminRepository.getStateSnapshot().variants.find((v) => v.sku === variant.sku)!;
    assert.equal(afterCreateVariant.reservedStock, initialReserved + 1);
    assert.equal(afterCreateVariant.onHandStock, initialOnHand);

    // Cancel order with reason
    const cancelRes = adminRepository.cancelOrderWithReason(
      createdOrder.id,
      'تست انضباط آزادسازی رزرو در لغو سفارش',
      'STF-01'
    );

    assert.equal(cancelRes.success, true);

    const afterCancelVariant = adminRepository.getStateSnapshot().variants.find((v) => v.sku === variant.sku)!;
    // Reserved stock must be released back!
    assert.equal(afterCancelVariant.reservedStock, initialReserved);
    // Physical onHand stock remains unchanged!
    assert.equal(afterCancelVariant.onHandStock, initialOnHand);
  });

  it('strictly validates inventory and blocks manual order creation exceeding available stock', () => {
    const variant = adminRepository.getStateSnapshot().variants[1];
    const available = variant.onHandStock - variant.reservedStock;

    // Attempt to order more than available
    const excessiveQty = available + 1000;
    const invalidRes = adminRepository.createManualOrder({
      customerName: 'تست موجودی منفی',
      customerPhone: '09121111111',
      shippingAddress: 'تهران',
      city: 'تهران',
      items: [{ variantSku: variant.sku, quantity: excessiveQty }],
      staffId: 'STF-01',
    });

    assert.equal(invalidRes.success, false);
    assert.match(invalidRes.error || '', /موجودی آزاد/);
  });
});
