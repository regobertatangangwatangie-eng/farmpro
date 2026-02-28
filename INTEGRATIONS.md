# FarmPro Integrations Guide

## Payment & Advertising Platform Integrations

FarmPro now includes complete backend support for payments and cross-platform advertising.

---

## Payment Methods

### 1. Mobile Money (Local)
- **Providers**: MTN Mobile Money, Orange Money
- **Flow**: User provides account number and reference for manual transfer
- **Setup**: Set `MTN_ACCOUNT` and `ORANGE_ACCOUNT` in `.env`
- **Use Case**: Cost-effective for local Cameroonian farmers

### 2. Flutterwave (International Cards)
- **Flow**: Create hosted payment link → User completes on Flutterwave → Webhook callback marks subscription active
- **Setup**: 
  ```bash
  FLW_SECRET_KEY=your_secret_key
  FLW_WEBHOOK_SECRET=your_webhook_secret
  ```
- **Webhook**: Configure Flutterwave to POST to `https://yourserver.com/api/subscriptions/webhook` with header `verif-hash: <FLW_WEBHOOK_SECRET>`

### 3. Paystack (Nigerian Cards + Mobile)
- **Flow**: Similar to Flutterwave via Paystack API
- **Setup**:
  ```bash
  PAYSTACK_SECRET_KEY=your_secret_key
  ```
- **Webhook**: Configure at `https://dashboard.paystack.com` → Settings → Webhooks

### Subscription Creation Examples

**Mobile Money:**
```bash
curl -X POST http://localhost:3000/api/subscriptions/create \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "basic",
    "customer": { "name": "Farmer John" },
    "payment": { "method": "mobile_money", "provider": "mtn" }
  }'
```

**Flutterwave:**
```bash
curl -X POST http://localhost:3000/api/subscriptions/create \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "international",
    "customer": { "name": "John", "email": "john@example.com" },
    "payment": { "method": "flutterwave" }
  }'
```

**Paystack:**
```bash
curl -X POST http://localhost:3000/api/subscriptions/create \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "international",
    "customer": { "name": "Alice", "email": "alice@example.com" },
    "payment": { "method": "paystack" }
  }'
```

---

## Advertising Platforms

### 1. Meta / Facebook / Instagram (Full Implementation)

**Complete Flow**: Campaign → AdSet → Creative → Ad

**Setup**:
```bash
META_ACCESS_TOKEN=your_long_lived_token
META_AD_ACCOUNT_ID=1234567890
META_PAGE_ID=your_page_id
FARMPRO_URL=https://yourapp.com
```

**Get Tokens**:
1. Go to [Meta Business Settings](https://business.facebook.com)
2. Create an App (Business type) with "Ads Manager" permissions
3. Generate a long-lived access token (60 days) with `ads_management` scope
4. Get your Ad Account ID (numeric ID, without `act_` prefix)

**Create Full Ad Campaign**:
```bash
curl -X POST http://localhost:3000/api/ads/create-full \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Farm Fresh Campaign",
    "platform": "meta",
    "objective": "BRAND_AWARENESS",
    "daily_budget": 10,
    "creative_title": "Grow Your Farm",
    "creative_body": "Join FarmPro and double your harvest!",
    "image_url": "your_hash_or_pixel",
    "targeting": {
      "geo_locations": [
        { "country": "CM" },
        { "country": "SN" }
      ],
      "age_min": 18,
      "age_max": 65
    }
  }'
```

**Response** includes `campaign_id`, `adset_id`, `creative_id`, `ad_id`.

**Metrics**: Facebook ads appear in campaign status as `PAUSED` by default (activate in Meta Business Manager).

---

### 2. Google Ads (SDK Ready)

**Setup**:
```bash
GOOGLE_ADS_CUSTOMER_ID=1234567890
GOOGLE_ADS_DEVELOPER_TOKEN=your_token
GOOGLE_ADS_REFRESH_TOKEN=your_refresh
```

**Status**: Stubs implemented. Use `google-ads-api` npm package for production integration.

**Example** (future):
```bash
curl -X POST http://localhost:3000/api/ads/multi-platform \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Multi-Channel Campaign",
    "platforms": ["meta", "google_ads"],
    "budget": 100,
    "objective": "CONVERSION"
  }'
```

---

### 3. LinkedIn Ads (API Ready)

**Setup**:
```bash
LINKEDIN_ACCESS_TOKEN=your_token
LINKEDIN_ACCOUNT_ID=your_account_id
```

**Status**: Integration stub. Full API integration ready with LinkedIn Marketing SDK.

---

### 4. Twitter/X Ads (API Ready)

**Setup**:
```bash
TWITTER_BEARER_TOKEN=your_token
TWITTER_ACCOUNT_ID=your_account_id
```

**Status**: Integration stub. Twitter Ads API v2 compatible.

---

## Ad Management Endpoints

### List All Ads (Admin)
```bash
curl -X GET http://localhost:3000/api/admin/ads \
  -H "x-admin-token: your_admin_token"
```

### Get Ad Events (Audit Trail)
```bash
curl -X GET http://localhost:3000/api/ads/{ad_id}/events
```

Returns array of events: `campaign_created`, `adset_created`, `creative_created`, `ad_created`, `meta_event`, `payment_success`, etc.

### Get Ad Performance Metrics
```bash
curl -X GET http://localhost:3000/api/ads/{ad_id}/performance
```

**Response**:
```json
{
  "ad_id": "...",
  "ad": { ... },
  "performance": {
    "impressions": 5000,
    "clicks": 250,
    "spend": 50.00,
    "ctr": "5.00",
    "cpc": "0.20"
  }
}
```

### Create on Multiple Platforms
```bash
curl -X POST http://localhost:3000/api/ads/multi-platform \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Multi-Regional Campaign",
    "platforms": ["meta", "google_ads", "linkedin"],
    "budget": 100
  }'
```

---

## Webhook Configuration

### Meta Webhooks
1. Go to [Meta App Dashboard](https://developers.facebook.com/apps)
2. Select your app → Settings → Basic → Copy App ID and Secret
3. Add Webhooks:
   - **Callback URL**: `https://yourserver.com/api/ads/events/webhook`
   - **Verify Token**: any random string
   - **Events**: `ad.campaign.*`, `ad.adset.*`, `ad.creative.*`, `ad.ad.*`
4. Backend validates via `x-event-source: meta` header

### Paystack Payment Webhook
1. Dashboard → Settings → Webhooks
2. **URL**: `https://yourserver.com/api/ads/paystack-webhook`
3. Events: `charge.success`, `charge.failure`
4. Backend verifies signature in `x-paystack-signature` header

### Flutterwave Webhook
1. Dashboard → Settings → Webhooks
2. **URL**: `https://yourserver.com/api/subscriptions/webhook`
3. **Header**: `verif-hash: <FLW_WEBHOOK_SECRET>`
4. Events: `charge.completed`, `charge.updated`

---

## Error Handling & Retry Logic

- All provider API calls retry up to 3 times with exponential backoff (1s → 2s → 4s max delay)
- Failed attempts logged in `payment_events` and `ad_events` tables
- Webhook failures trigger alert (implement monitoring in production)
- All errors return descriptive JSON with provider response details

---

## Database Schema

**Tables**:
- `subscriptions` — user subscriptions with payment status
- `payment_events` — audit trail (created, paid, failed)
- `ads` — ad campaigns with platform and status
- `ad_events` — ad event log (impressions, clicks, webhooks, payments)

**Persistence**: SQLite at `backend/data/farmpro.db` (volumes in Docker Compose)

---

## Frontend UI

Access **Ads Management** at http://localhost:3001:
- Create ads on single or multiple platforms
- View ad list with status
- Click ad → Load Performance → View metrics dashboard
- Admin tools for subscription and ad management (requires `x-admin-token`)

---

## Production Deployment Checklist

- [ ] Use AWS Secrets Manager / HashiCorp Vault for all API keys
- [ ] Enable All webhook signature verification (HMAC)
- [ ] Add rate limiting (e.g., 100 requests/min per IP)
- [ ] Set up monitoring for failed ad creates and payment webhooks
- [ ] Enable HTTPS on all endpoints
- [ ] Configure CORS for frontend domain
- [ ] Rotate API tokens monthly
- [ ] Add database backups (daily snapshots)
- [ ] Implement audit logging for all admin actions
- [ ] Test webhook retries and error paths
- [ ] Load test payment endpoints (simulate peak usage)

---

## Example .env File

```bash
# Server
PORT=3000

# Subscriptions & Pricing
PRICE_BASIC=5
PRICE_INTERNATIONAL=10
MTN_ACCOUNT=675142175          # Regobert Atanga Ngwa Tangie
ORANGE_ACCOUNT=regobert2004        # sample Orange/MobileMoney value

# Flutterwave
FLW_SECRET_KEY=FLWSECK_TEST-xxxxx
FLW_WEBHOOK_SECRET=webhook-secret-xxxx

# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxxxxxx

# Meta / Facebook
META_ACCESS_TOKEN=EAAxxxxxx
META_AD_ACCOUNT_ID=1234567890
META_PAGE_ID=9876543210
FARMPRO_URL=https://farmpro.local

# Google Ads
GOOGLE_ADS_CUSTOMER_ID=xxx-xxx-xxxx
GOOGLE_ADS_DEVELOPER_TOKEN=xxxxx
GOOGLE_ADS_REFRESH_TOKEN=xxxxxx

# LinkedIn
LINKEDIN_ACCESS_TOKEN=xxxx
LINKEDIN_ACCOUNT_ID=xxxx

# Twitter
TWITTER_BEARER_TOKEN=AAAAx xxxxx
TWITTER_ACCOUNT_ID=xxxxx

# Admin
ADMIN_TOKEN=super_secret_admin_token
```

---

## Troubleshooting

**"meta_not_configured"**
- Missing `META_ACCESS_TOKEN` or `META_AD_ACCOUNT_ID` in `.env`
- Solution: Add tokens and restart backend

**Payment webhook not firing**
- Verify callback URL is publicly accessible
- Check provider webhook logs for request failures
- Ensure headers match (`verif-hash`, `x-event-source`)

**Ad events not appearing**
- Confirm webhook URL matches in provider settings
- Check backend logs for webhook receipt
- Test with `POST /api/ads/events/webhook` manually

---

## Support & Next Steps

- Extend Google Ads, LinkedIn, Twitter integrations using official SDKs
- Add A/B testing helpers (create duplicate ads with variants)
- Implement audience sync (export farm subscriber list to platforms)
- Add budget forecasting and ROI tracking
- Integrate with CRM (Salesforce, HubSpot) for lead tracking

