import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier } = await request.json();

    if (tier !== 'pro' && tier !== 'enterprise') {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    // Set prices
    const price = tier === 'pro' ? 99000 : 499000;
    const planName = tier === 'pro' ? 'Pro Plan' : 'Enterprise Plan';

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';

    if (!serverKey) {
      console.error('MIDTRANS_SERVER_KEY is not defined in environment variables');
      return NextResponse.json({ error: 'Payment gateway misconfiguration' }, { status: 500 });
    }

    // Generate unique order ID: tier_userId_timestamp
    const orderId = `${tier}_${user.id}_${Date.now()}`;

    // Prepare Midtrans request body
    const midtransPayload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: price,
      },
      item_details: [
        {
          id: tier,
          price: price,
          quantity: 1,
          name: `ChatToko - ${planName} Upgrade`,
        },
      ],
      customer_details: {
        first_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer',
        email: user.email,
      },
      credit_card: {
        secure: true,
      },
    };

    const midtransUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const authHeader = `Basic ${Buffer.from(serverKey + ':').toString('base64')}`;

    const midtransResponse = await fetch(midtransUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(midtransPayload),
    });

    if (!midtransResponse.ok) {
      const errorText = await midtransResponse.text();
      console.error('Midtrans API error:', errorText);
      return NextResponse.json({ error: 'Failed to initiate payment with Midtrans' }, { status: 502 });
    }

    const midtransData = await midtransResponse.json();

    return NextResponse.json({
      token: midtransData.token,
      redirectUrl: midtransData.redirect_url,
      orderId: orderId,
    });
  } catch (error) {
    console.error('Payment token generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
