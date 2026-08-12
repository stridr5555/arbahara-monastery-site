const MIN_CROSS_AMOUNT_CENTS = 10000;
const SHIPPING_CENTS = 2000;
const CROSS_PRODUCT_ID = process.env.STRIPE_CROSS_PRODUCT_ID || 'prod_UcZsrY7hlxwZwI';
const SHIPPING_PRODUCT_ID = process.env.STRIPE_SHIPPING_PRODUCT_ID || 'prod_UcZsrkuMWO3PuN';

const sendJson = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const getOrigin = (req) => {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return sendJson(res, 500, { error: 'Stripe is not configured.' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
    const amountDollars = Number(body.amount);
    const crossAmountCents = Math.round(amountDollars * 100);

    if (!Number.isFinite(crossAmountCents) || crossAmountCents < MIN_CROSS_AMOUNT_CENTS) {
      return sendJson(res, 400, { error: 'The minimum cross gift is $100.' });
    }

    const origin = getOrigin(req);
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', `${origin}/store-success.html?session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${origin}/store.html`);
    params.append('customer_creation', 'always');
    params.append('billing_address_collection', 'required');
    params.append('shipping_address_collection[allowed_countries][0]', 'US');
    params.append('phone_number_collection[enabled]', 'true');
    params.append('submit_type', 'pay');
    params.append('metadata[store]', 'monastery');
    params.append('metadata[item]', 'Medhanialem Home Blessing Cross');
    params.append('payment_intent_data[metadata][store]', 'monastery');
    params.append('payment_intent_data[metadata][fund]', 'monastery_campus_development');
    params.append('custom_text[submit][message]', 'Thank you for supporting the development of our permanent monastery campus. Your home and family will be remembered in blessing through Medhanialem.');

    params.append('line_items[0][quantity]', '1');
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][unit_amount]', String(crossAmountCents));
    params.append('line_items[0][price_data][product]', CROSS_PRODUCT_ID);

    params.append('line_items[1][quantity]', '1');
    params.append('line_items[1][price_data][currency]', 'usd');
    params.append('line_items[1][price_data][unit_amount]', String(SHIPPING_CENTS));
    params.append('line_items[1][price_data][product]', SHIPPING_PRODUCT_ID);

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const stripeSession = await stripeResponse.json();
    if (!stripeResponse.ok) {
      return sendJson(res, stripeResponse.status, {
        error: stripeSession.error?.message || 'Stripe checkout could not be created.'
      });
    }

    return sendJson(res, 200, { url: stripeSession.url });
  } catch (error) {
    return sendJson(res, 500, { error: 'Checkout could not be started.' });
  }
};
