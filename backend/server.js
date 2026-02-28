const express = require('express');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const db = require('./db');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Pricing (USD)
const PRICE_BASIC = parseFloat(process.env.PRICE_BASIC || '5');
const PRICE_INTERNATIONAL = parseFloat(process.env.PRICE_INTERNATIONAL || '10');

// Mobile money account numbers (configure via env)
const MTN_ACCOUNT = process.env.MTN_ACCOUNT || '';
const ORANGE_ACCOUNT = process.env.ORANGE_ACCOUNT || '';

const SUBSCRIPTION_PLANS = {
  basic: { id: 'basic', name: 'Basic', price_usd: PRICE_BASIC, interval: 'month', description: '$5/month (local)' },
  international: { id: 'international', name: 'International', price_usd: PRICE_INTERNATIONAL, interval: 'month', description: '$10/month (international)' }
};

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || '';
const FLW_WEBHOOK_SECRET = process.env.FLW_WEBHOOK_SECRET || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-token-sample';

function createSubscriptionRow(sub) {
  const stmt = db.prepare(`INSERT INTO subscriptions (id, plan_id, plan_name, amount_usd, customer_name, status, payment_method, payment_provider, payment_instructions, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  stmt.run(sub.id, sub.plan.id, sub.plan.name, sub.amount_usd, sub.customer.name, sub.status, sub.payment.method, sub.payment.provider || null, JSON.stringify(sub.payment.instructions || {}), sub.created_at);
}

function updateSubscriptionStatus(id, status) {
  const activated_at = status === 'active' ? new Date().toISOString() : null;
  const stmt = db.prepare(`UPDATE subscriptions SET status = ?, activated_at = ? WHERE id = ?`);
  stmt.run(status, activated_at, id);
}

function getSubscription(id) {
  const row = db.prepare(`SELECT * FROM subscriptions WHERE id = ?`).get(id);
  if (!row) return null;
  row.payment_instructions = row.payment_instructions ? JSON.parse(row.payment_instructions) : null;
  return row;
}

function listSubscriptions() {
  return db.prepare(`SELECT * FROM subscriptions ORDER BY created_at DESC`).all().map(r => {
    r.payment_instructions = r.payment_instructions ? JSON.parse(r.payment_instructions) : null;
    return r;
  });
}

function addPaymentEvent(subscription_id, event_type, payload) {
  db.prepare(`INSERT INTO payment_events (subscription_id, event_type, payload, created_at) VALUES (?,?,?,?)`).run(subscription_id, event_type, JSON.stringify(payload || {}), new Date().toISOString());
}

// Ads persistence helpers
function createAdRow(ad) {
  db.prepare(`INSERT INTO ads (id, name, platform, objective, budget, status, provider_id, payload, created_at) VALUES (?,?,?,?,?,?,?,?,?)`).run(
    ad.id, ad.name, ad.platform, ad.objective, ad.budget, ad.status || 'draft', ad.provider_id || null, JSON.stringify(ad.payload || {}), ad.created_at
  );
}

function listAds() {
  return db.prepare(`SELECT * FROM ads ORDER BY created_at DESC`).all().map(r => {
    r.payload = r.payload ? JSON.parse(r.payload) : null;
    return r;
  });
}

// Retry helper with exponential backoff
async function retryAsync(fn, maxRetries = 3, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }
}

// Ad event tracking
function logAdEvent(ad_id, event_type, data) {
  db.prepare(`INSERT INTO ad_events (ad_id, event_type, data, created_at) VALUES (?,?,?,?)`)
    .run(ad_id, event_type, JSON.stringify(data || {}), new Date().toISOString());
}

// Meta helpers (campaign → adset → creative → live)
const META_TOKEN = process.env.META_ACCESS_TOKEN || '';
const META_ACCOUNT = process.env.META_AD_ACCOUNT_ID || '';
const META_API = 'https://graph.facebook.com/v17.0';

async function createMetaCampaign(name, objective) {
  const resp = await axios.post(`${META_API}/act_${META_ACCOUNT}/campaigns`, null, {
    params: { name, objective, status: 'PAUSED', access_token: META_TOKEN }
  });
  return resp.data?.id;
}

async function createMetaAdset(campaign_id, name, daily_budget, targeting) {
  const resp = await axios.post(`${META_API}/${campaign_id}/adsets`, null, {
    params: {
      name,
      campaign_id,
      daily_budget,
      targeting: JSON.stringify(targeting || { geo_locations: [{ country: 'CM' }] }),
      status: 'PAUSED',
      access_token: META_TOKEN
    }
  });
  return resp.data?.id;
}

async function createMetaCreative(account_id, title, body, image_url) {
  const resp = await axios.post(`${META_API}/act_${account_id}/adcreatives`, null, {
    params: {
      name: title,
      object_story_spec: JSON.stringify({
        page_id: process.env.META_PAGE_ID || '',
        link_data: { message: body, link: process.env.FARMPRO_URL || 'https://farmpro.local', image_hash: image_url }
      }),
      access_token: META_TOKEN
    }
  });
  return resp.data?.id;
}

async function createMetaAd(adset_id, creative_id) {
  const resp = await axios.post(`${META_API}/act_${META_ACCOUNT}/ads`, null, {
    params: { adset_id, creative: { creative_id }, status: 'PAUSED', access_token: META_TOKEN }
  });
  return resp.data?.id;
}

// Google Ads helpers (simplified)
async function createGoogleAdsCampaign(customerId, name, budget) {
  // Google Ads requires complex setup; stub here
  return `gads_${uuidv4()}`;
}

// Paystack payment helper
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
async function initializePaystackPayment(amount, email, reference) {
  const resp = await axios.post('https://api.paystack.co/transaction/initialize', {
    amount: amount * 100,
    email,
    reference
  }, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
  });
  return resp.data?.data;
}

// LinkedIn Ads stub
async function createLinkedInCampaign(name, budget) {
  return `linkedin_${uuidv4()}`;
}

// Twitter/X Ads stub
async function createTwitterAd(name, budget) {
  return `twitter_${uuidv4()}`;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/info', (req, res) => {
  res.json({
    service: 'farmpro-backend',
    hostname: os.hostname(),
    region: process.env.AWS_REGION || 'local'
  });
});

app.get('/api/farms', (req, res) => {
  // Demo static response
  res.json([
    { id: 1, name: 'Sunrise Farm', location: 'Douala' },
    { id: 2, name: 'Green Valley', location: 'Yaounde' }
  ]);
});

// Subscription plans
app.get('/api/subscriptions/plans', (req, res) => {
  res.json(Object.values(SUBSCRIPTION_PLANS));
});

// Create subscription - integrates with Flutterwave for card/hosted payments
app.post('/api/subscriptions/create', async (req, res) => {
  const { plan, customer, payment } = req.body || {};
  if (!plan || !SUBSCRIPTION_PLANS[plan]) return res.status(400).json({ error: 'invalid_plan' });
  if (!customer || !customer.name) return res.status(400).json({ error: 'missing_customer' });
  if (!payment || !payment.method) return res.status(400).json({ error: 'missing_payment_method' });

  const id = uuidv4();
  const selectedPlan = SUBSCRIPTION_PLANS[plan];
  const amount = selectedPlan.price_usd;

  const subscription = {
    id,
    plan: selectedPlan,
    customer,
    status: 'pending',
    amount_usd: amount,
    created_at: new Date().toISOString(),
    payment: { method: payment.method, provider: payment.provider || null }
  };

  // Mobile money flow (manual): return account number + reference
  if (payment.method === 'mobile_money') {
    const provider = (payment.provider || '').toLowerCase();
    let account = null;
    if (provider === 'mtn') account = MTN_ACCOUNT;
    else if (provider === 'orange') account = ORANGE_ACCOUNT;
    else return res.status(400).json({ error: 'unsupported_mobile_money_provider' });

    subscription.payment.instructions = {
      type: 'mobile_money',
      provider,
      account,
      currency: 'USD',
      amount_usd: amount,
      reference: `farmpro_${id}`
    };

    createSubscriptionRow(subscription);
    addPaymentEvent(id, 'created', { via: 'mobile_money', instructions: subscription.payment.instructions });
    return res.json({ subscription });
  }

  // Card / hosted payment - create a Flutterwave payment link (requires FLW_SECRET_KEY)
  if (payment.method === 'card' || payment.method === 'flutterwave') {
    if (!FLW_SECRET_KEY) return res.status(500).json({ error: 'flutterwave_not_configured' });

    // tx_ref used to match webhook: use farmpro_<id>
    const tx_ref = `farmpro_${id}`;

    const payload = {
      tx_ref,
      amount: amount,
      currency: 'USD',
      redirect_url: `${req.protocol}://${req.get('host')}/api/subscriptions/checkout-flw/${id}`,
      customer: {
        name: customer.name
      },
      payment_options: 'card'
    };

    try {
      const resp = await axios.post('https://api.flutterwave.com/v3/payments', payload, {
        headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` }
      });

      const link = resp.data && resp.data.data && resp.data.data.link ? resp.data.data.link : null;
      subscription.payment.instructions = { type: 'flutterwave', provider: 'flutterwave', checkout_link: link, tx_ref };

      createSubscriptionRow(subscription);
      addPaymentEvent(id, 'created', { via: 'flutterwave', tx_ref, link });

      return res.json({ subscription });
    } catch (err) {
      console.error('flutterwave create error', err?.response?.data || err.message);
      return res.status(500).json({ error: 'flutterwave_create_failed', details: err?.response?.data || err.message });
    }
  }

  // Paystack payment
  if (payment.method === 'paystack') {
    if (!PAYSTACK_SECRET) return res.status(500).json({ error: 'paystack_not_configured' });

    const reference = `farmpro_${id}`;
    try {
      const psResp = await initializePaystackPayment(amount, customer.email || 'noemail@farmpro.local', reference);
      const checkout_url = psResp?.authorization_url;
      subscription.payment.instructions = { type: 'paystack', provider: 'paystack', checkout_url, reference };

      createSubscriptionRow(subscription);
      addPaymentEvent(id, 'created', { via: 'paystack', reference, checkout_url });
      return res.json({ subscription });
    } catch (err) {
      console.error('paystack create error', err?.response?.data || err.message);
      return res.status(500).json({ error: 'paystack_create_failed', details: err?.response?.data || err.message });
    }
  }

  return res.status(400).json({ error: 'unsupported_payment_method' });
});

// Optional redirect endpoint for Flutterwave redirects (simple JSON response here)
app.get('/api/subscriptions/checkout-flw/:id', (req, res) => {
  const id = req.params.id;
  const s = getSubscription(id);
  if (!s) return res.status(404).json({ error: 'not_found' });
  // In a real app you'd redirect to a UI success page; return JSON for demo
  return res.json({ message: 'Flutterwave redirect received. Check subscription status via verify endpoint.', subscription: s });
});

// Webhook to receive provider notifications (secure via secret header)
app.post('/api/subscriptions/webhook', (req, res) => {
  const signature = req.headers['verif-hash'] || req.headers['x-flw-signature'];
  // Flutterwave sends 'verif-hash' header with the webhook secret
  if (!FLW_WEBHOOK_SECRET) return res.status(400).json({ error: 'webhook_not_configured' });
  if (!signature || signature !== FLW_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'invalid_signature' });
  }

  const payload = req.body || {};
  addPaymentEvent(null, 'webhook_received', payload);

  // Attempt to extract tx_ref and map to subscription id
  const tx_ref = payload?.data?.tx_ref || payload?.data?.flw_ref || null;
  if (tx_ref && tx_ref.startsWith('farmpro_')) {
    const id = tx_ref.replace('farmpro_', '');
    // mark active if successful
    const status = payload?.data?.status || payload?.data?.transaction_status || '';
    if (status === 'successful' || status === 'successful' || status === 'paid') {
      updateSubscriptionStatus(id, 'active');
      addPaymentEvent(id, 'paid', payload);
      return res.json({ ok: true });
    } else {
      updateSubscriptionStatus(id, 'failed');
      addPaymentEvent(id, 'failed', payload);
      return res.json({ ok: true });
    }
  }

  return res.json({ ok: true });
});

// Admin: list subscriptions (requires simple token header)
app.get('/api/admin/subscriptions', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || token !== ADMIN_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  const rows = listSubscriptions();
  res.json(rows);
});

// Verify subscription
app.get('/api/subscriptions/verify/:id', (req, res) => {
  const id = req.params.id;
  const s = getSubscription(id);
  if (!s) return res.status(404).json({ error: 'not_found' });
  return res.json({ subscription: s });
});

// Create an ad campaign record and attempt to create on Meta (if configured)
app.post('/api/ads/create', async (req, res) => {
  const { name, platform, objective, budget, payload } = req.body || {};
  if (!name || !platform) return res.status(400).json({ error: 'missing_fields' });

  const id = uuidv4();
  const ad = { id, name, platform, objective: objective || 'BRAND_AWARENESS', budget: parseFloat(budget || 0), status: 'draft', payload, created_at: new Date().toISOString() };

  // If platform is 'meta' attempt to create a campaign using Meta Marketing API
  if (platform === 'meta' || platform === 'facebook' || platform === 'instagram') {
    const META_TOKEN = process.env.META_ACCESS_TOKEN || process.env.FLW_SECRET_KEY || '';
    const META_ACCOUNT = process.env.META_AD_ACCOUNT_ID || '';
    if (!META_TOKEN || !META_ACCOUNT) {
      // store as draft and return
      createAdRow(ad);
      return res.json({ ad, warning: 'meta_not_configured' });
    }

    try {
      // create campaign
      const campaignResp = await axios.post(
        `https://graph.facebook.com/v17.0/act_${META_ACCOUNT}/campaigns`,
        null,
        {
          params: {
            name: ad.name,
            objective: ad.objective,
            status: 'PAUSED',
            access_token: META_TOKEN
          }
        }
      );

      const provider_id = campaignResp.data && campaignResp.data.id ? campaignResp.data.id : null;
      ad.provider_id = provider_id;
      ad.status = provider_id ? 'created' : 'error';
      createAdRow(ad);
      addPaymentEvent(ad.id, 'ad_created', { platform: 'meta', provider_id });
      return res.json({ ad, provider_resp: campaignResp.data });
    } catch (err) {
      console.error('meta create error', err?.response?.data || err.message);
      createAdRow(ad);
      addPaymentEvent(ad.id, 'ad_create_failed', { error: err?.response?.data || err.message });
      return res.status(500).json({ error: 'meta_create_failed', details: err?.response?.data || err.message, ad });
    }
  }

  // Other platforms: for now persist as draft and return
  createAdRow(ad);
  return res.json({ ad, note: 'stored_as_draft' });
});

// Admin: list ads
app.get('/api/admin/ads', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || token !== ADMIN_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  const rows = listAds();
  res.json(rows);
});

// Create full ad campaign (Meta: campaign → adset → creative)
app.post('/api/ads/create-full', async (req, res) => {
  const { name, platform, objective, daily_budget, creative_title, creative_body, image_url, targeting } = req.body || {};
  if (!name || !platform) return res.status(400).json({ error: 'missing_fields' });

  const id = uuidv4();
  const ad = { id, name, platform, objective: objective || 'BRAND_AWARENESS', budget: parseFloat(daily_budget || 10), status: 'draft', payload: {}, created_at: new Date().toISOString() };

  if (platform === 'meta' || platform === 'facebook' || platform === 'instagram') {
    if (!META_TOKEN || !META_ACCOUNT) {
      createAdRow(ad);
      return res.json({ ad, warning: 'meta_not_configured' });
    }

    try {
      // Create campaign
      const campaign_id = await retryAsync(() => createMetaCampaign(ad.name, ad.objective));
      logAdEvent(id, 'campaign_created', { campaign_id });

      // Create adset
      const adset_id = await retryAsync(() => createMetaAdset(campaign_id, `${ad.name}-adset`, daily_budget * 100, targeting));
      logAdEvent(id, 'adset_created', { adset_id });

      // Create creative
      const creative_id = await retryAsync(() => createMetaCreative(META_ACCOUNT, creative_title || ad.name, creative_body || ad.name, image_url || ''));
      logAdEvent(id, 'creative_created', { creative_id });

      // Create ad
      const ad_id = await retryAsync(() => createMetaAd(adset_id, creative_id));
      logAdEvent(id, 'ad_created', { ad_id, campaign_id, adset_id, creative_id });

      ad.provider_id = ad_id;
      ad.status = 'created';
      ad.payload = { campaign_id, adset_id, creative_id, ad_id };
      createAdRow(ad);
      return res.json({ ad, components: { campaign_id, adset_id, creative_id, ad_id } });
    } catch (err) {
      console.error('Meta full flow error', err.message);
      createAdRow(ad);
      logAdEvent(id, 'error', { error: err.message });
      return res.status(500).json({ error: 'meta_full_flow_failed', details: err.message, ad });
    }
  }

  createAdRow(ad);
  return res.json({ ad, note: 'stored_as_draft' });
});

// Ad event webhook (receives events from Meta, Paystack, LinkedIn, Twitter)
app.post('/api/ads/events/webhook', (req, res) => {
  const body = req.body || {};
  const source = req.headers['x-event-source'] || 'unknown';

  // Log webhook receipt
  console.log(`Ad event webhook from ${source}:`, body);

  // Extract ad_id or campaign_id from various payload formats
  let ad_id = body.ad_id || body.campaign_id || body.data?.ad_id || null;

  // Handle Meta webhook
  if (source === 'meta' || body.object === 'ad_campaign') {
    const event_type = body.action || body.event || 'meta_event';
    ad_id = body.campaign_id || ad_id;
    if (ad_id) logAdEvent(ad_id, event_type, body);
    return res.json({ ok: true });
  }

  // Handle Paystack webhook for ad payments
  if (source === 'paystack' && body.event === 'charge.success') {
    const ref = body.data?.reference;
    if (ref && ref.startsWith('ad_')) {
      ad_id = ref.replace('ad_', '');
      logAdEvent(ad_id, 'payment_success', body.data);
      return res.json({ ok: true });
    }
  }

  // Handle LinkedIn webhook
  if (source === 'linkedin') {
    const event_type = body.eventMuxData?.eventUrnResolutionTechnology?.[0] || 'linkedin_event';
    if (ad_id) logAdEvent(ad_id, event_type, body);
    return res.json({ ok: true });
  }

  // Handle Twitter webhook
  if (source === 'twitter') {
    const event_type = body.data?.type || 'twitter_event';
    if (ad_id) logAdEvent(ad_id, event_type, body);
    return res.json({ ok: true });
  }

  res.json({ ok: true });
});

// Get ad events
app.get('/api/ads/:id/events', (req, res) => {
  const ad_id = req.params.id;
  const events = db.prepare(`SELECT * FROM ad_events WHERE ad_id = ? ORDER BY created_at DESC`).all(ad_id).map(e => {
    e.data = e.data ? JSON.parse(e.data) : null;
    return e;
  });
  res.json({ ad_id, events });
});

// Get ad performance/metrics
app.get('/api/ads/:id/performance', (req, res) => {
  const ad_id = req.params.id;
  const ad = db.prepare(`SELECT * FROM ads WHERE id = ?`).get(ad_id);
  if (!ad) return res.status(404).json({ error: 'not_found' });

  ad.payload = ad.payload ? JSON.parse(ad.payload) : null;

  // Get recent events for metrics summary
  const events = db.prepare(`SELECT * FROM ad_events WHERE ad_id = ? ORDER BY created_at DESC LIMIT 100`).all(ad_id).map(e => {
    e.data = e.data ? JSON.parse(e.data) : null;
    return e;
  });

  // Simple aggregation: count by event type
  const summary = events.reduce((acc, e) => {
    if (e.event_type && e.data?.impressions) acc.impressions = (acc.impressions || 0) + e.data.impressions;
    if (e.event_type && e.data?.clicks) acc.clicks = (acc.clicks || 0) + e.data.clicks;
    if (e.event_type && e.data?.spend) acc.spend = (acc.spend || 0) + e.data.spend;
    return acc;
  }, {});

  summary.ctr = summary.impressions && summary.clicks ? ((summary.clicks / summary.impressions) * 100).toFixed(2) : 0;
  summary.cpc = summary.clicks && summary.spend ? (summary.spend / summary.clicks).toFixed(2) : 0;

  res.json({ ad_id, ad, events: events.slice(0, 10), performance: summary });
});

// Paystack webhook for ad payment notifications
app.post('/api/ads/paystack-webhook', (req, res) => {
  const hash = req.headers['x-paystack-signature'];
  // In production, verify hash against PAYSTACK_SECRET
  const body = req.body || {};

  if (body.event === 'charge.success') {
    const reference = body.data?.reference;
    if (reference && reference.startsWith('ad_')) {
      const ad_id = reference.replace('ad_', '');
      logAdEvent(ad_id, 'paystack_payment', body.data);
    }
  }

  res.json({ ok: true });
});

// Create ad on multiple platforms simultaneously
app.post('/api/ads/multi-platform', async (req, res) => {
  const { name, platforms, budget, objective } = req.body || {};
  if (!name || !platforms || platforms.length === 0) return res.status(400).json({ error: 'missing_fields' });

  const results = {};
  const errors = {};

  for (const platform of platforms) {
    const id = uuidv4();
    try {
      if (platform === 'meta') {
        if (META_TOKEN && META_ACCOUNT) {
          const cid = await retryAsync(() => createMetaCampaign(name, objective || 'BRAND_AWARENESS'));
          results[platform] = { id, provider_id: cid, status: 'created' };
        } else {
          results[platform] = { id, status: 'draft', error: 'not_configured' };
        }
      } else if (platform === 'google_ads') {
        const gid = await createGoogleAdsCampaign('customer_id', name, budget);
        results[platform] = { id, provider_id: gid, status: 'draft' };
      } else if (platform === 'linkedin') {
        const lid = await createLinkedInCampaign(name, budget);
        results[platform] = { id, provider_id: lid, status: 'draft' };
      } else if (platform === 'twitter') {
        const tid = await createTwitterAd(name, budget);
        results[platform] = { id, provider_id: tid, status: 'draft' };
      } else {
        results[platform] = { id, status: 'unknown' };
      }
    } catch (err) {
      errors[platform] = err.message;
      results[platform] = { id, status: 'error', error: err.message };
    }
  }

  res.json({ results, errors: Object.keys(errors).length > 0 ? errors : null });
});

if (process.argv.includes('--test')) {
  console.log('ok');
  process.exit(0);
}

app.listen(port, () => {
  console.log(`FarmPro backend listening on port ${port}`);
});
