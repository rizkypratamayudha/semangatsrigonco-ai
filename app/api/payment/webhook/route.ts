import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received Midtrans webhook:', body);

    const {
      order_id,
      transaction_status,
      fraud_status,
      status_code,
      gross_amount,
      signature_key,
    } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      console.error('MIDTRANS_SERVER_KEY is not defined in environment variables');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // 1. Verify Midtrans signature key
    // Formula: SHA512(order_id + status_code + gross_amount + ServerKey)
    const rawString = `${order_id}${status_code}${gross_amount}${serverKey}`;
    const localSignature = createHash('sha512').update(rawString).digest('hex');

    if (localSignature !== signature_key) {
      console.error('Invalid signature key from Midtrans webhook');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 2. Determine if payment is successful
    // settlement = success
    // capture = success (if credit card and fraud_status is accept)
    const isSuccess =
      transaction_status === 'settlement' ||
      (transaction_status === 'capture' && fraud_status === 'accept');

    if (isSuccess) {
      // orderId format: tier_shortUserId_randomSuffix
      const parts = order_id.split('_');
      if (parts.length < 2) {
        console.error('Invalid order_id format:', order_id);
        return NextResponse.json({ error: 'Invalid order_id format' }, { status: 400 });
      }

      const tier = parts[0];
      let userId = parts[1];

      // Reconstruct UUID if it has no hyphens (32 chars)
      if (userId.length === 32) {
        userId = `${userId.slice(0, 8)}-${userId.slice(8, 12)}-${userId.slice(12, 16)}-${userId.slice(16, 20)}-${userId.slice(20)}`;
      }

      if (tier !== 'pro' && tier !== 'enterprise') {
        console.error('Invalid plan tier in order_id:', tier);
        return NextResponse.json({ error: 'Invalid plan tier' }, { status: 400 });
      }

      console.log(`Upgrading user ${userId} to plan ${tier.toUpperCase()}`);

      // Update user's tier directly using Prisma (bypassing RLS)
      await prisma.user.update({
        where: { id: userId },
        data: { tier: tier },
      });

      console.log(`Successfully upgraded user ${userId} to ${tier}`);
    } else {
      console.log(`Transaction ${order_id} status is ${transaction_status}, no action taken.`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
