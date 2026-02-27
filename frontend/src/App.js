import React, { useEffect, useState } from 'react';

function App() {
  const [farms, setFarms] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [mobileProvider, setMobileProvider] = useState('mtn');
  const [responseData, setResponseData] = useState(null);
  const [adminToken, setAdminToken] = useState('');
  const [adminSubs, setAdminSubs] = useState(null);
  const [adminAds, setAdminAds] = useState(null);
  const [adName, setAdName] = useState('');
  const [adPlatforms, setAdPlatforms] = useState(['meta']);
  const [adBudget, setAdBudget] = useState(10);
  const [selectedAdId, setSelectedAdId] = useState(null);
  const [adPerformance, setAdPerformance] = useState(null);

  useEffect(() => {
    fetch('/api/farms')
      .then(r => r.json())
      .then(setFarms)
      .catch(() => setFarms([]));

    fetch('/api/subscriptions/plans')
      .then(r => r.json())
      .then(data => setPlans(data))
      .catch(() => setPlans([]))
      .finally(() => setLoadingPlans(false));
  }, []);

  const createSubscription = async () => {
    if (!selectedPlan) return alert('Select a plan');
    if (!customerName) return alert('Enter your name');

    const payload = {
      plan: selectedPlan,
      customer: { name: customerName },
      payment: { method: paymentMethod, provider: paymentMethod === 'mobile_money' ? mobileProvider : 'card' }
    };

    const res = await fetch('/api/subscriptions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    setResponseData(data);

    // If card flow with checkout_url, open it in new tab
    if (data && data.subscription && data.subscription.payment && data.subscription.payment.instructions && data.subscription.payment.instructions.checkout_url) {
      window.open(data.subscription.payment.instructions.checkout_url, '_blank');
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1>FarmPro Subscriptions</h1>

      <section style={{ marginBottom: 24 }}>
        <h2>Available Plans</h2>
        {loadingPlans ? <div>Loading plans...</div> : (
          <div>
            {plans.map(p => (
              <label key={p.id} style={{ display: 'block', marginBottom: 8 }}>
                <input type="radio" name="plan" value={p.id} onChange={() => setSelectedPlan(p.id)} /> {p.name} — ${p.price_usd}/{p.interval} — {p.description}
              </label>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Customer</h2>
        <input placeholder="Full name" value={customerName} onChange={e => setCustomerName(e.target.value)} style={{ padding: 8, width: 300 }} />
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Payment</h2>
        <div style={{ marginBottom: 8 }}>
          <label style={{ marginRight: 12 }}>
            <input type="radio" name="payment" checked={paymentMethod === 'mobile_money'} onChange={() => setPaymentMethod('mobile_money')} /> Mobile Money
          </label>
          <label>
            <input type="radio" name="payment" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} /> Card / International
          </label>
        </div>

        {paymentMethod === 'mobile_money' && (
          <div>
            <label style={{ display: 'block' }}>
              Provider:
              <select value={mobileProvider} onChange={e => setMobileProvider(e.target.value)} style={{ marginLeft: 8 }}>
                <option value="mtn">MTN Mobile Money</option>
                <option value="orange">Orange Money</option>
              </select>
            </label>
            <div style={{ marginTop: 8, color: '#555' }}>After creating the subscription you'll be shown account number and reference to complete payment via mobile money.</div>
          </div>
        )}
      </section>

      <button onClick={createSubscription} style={{ padding: '8px 16px', fontSize: 16 }}>Create Subscription</button>

      {responseData && (
        <section style={{ marginTop: 24 }}>
          <h3>Response</h3>
          <pre style={{ background: '#f6f6f6', padding: 12 }}>{JSON.stringify(responseData, null, 2)}</pre>

          {/* If mobile money instructions present, render them nicely */}
          {responseData.subscription && responseData.subscription.payment && responseData.subscription.payment.instructions && responseData.subscription.payment.instructions.type === 'mobile_money' && (
            <div style={{ marginTop: 12, padding: 12, border: '1px solid #ddd' }}>
              <strong>Mobile Money Payment Instructions</strong>
              <div>Provider: {responseData.subscription.payment.instructions.provider}</div>
              <div>Account: {responseData.subscription.payment.instructions.account}</div>
              <div>Amount (USD): {responseData.subscription.payment.instructions.amount_usd}</div>
              <div>Reference: {responseData.subscription.payment.instructions.reference}</div>
            </div>
          )}
        </section>
      )}

      <hr style={{ marginTop: 32, marginBottom: 16 }} />
      <section>
        <h2>Demo Farms</h2>
        <ul>
          {farms.map(f => (
            <li key={f.id}>{f.name} — {f.location}</li>
          ))}
        </ul>
      </section>

      <hr style={{ marginTop: 32, marginBottom: 16 }} />
      <section>
        <h2>Admin — List Subscriptions</h2>
        <div style={{ marginBottom: 8 }}>
          <input placeholder="Admin token" value={adminToken} onChange={e => setAdminToken(e.target.value)} style={{ padding: 8, width: 300 }} />
          <button style={{ marginLeft: 8 }} onClick={async () => {
            if (!adminToken) return alert('Enter admin token');
            const r = await fetch('/api/admin/subscriptions', { headers: { 'x-admin-token': adminToken } });
            if (r.status === 401) return alert('Unauthorized');
            const d = await r.json();
            setAdminSubs(d);
          }}>Fetch</button>
        </div>

        {adminSubs && (
          <div>
            <h4>Subscriptions</h4>
            <pre style={{ background: '#f6f6f6', padding: 12, maxHeight: 300, overflow: 'auto' }}>{JSON.stringify(adminSubs, null, 2)}</pre>
          </div>
        )}
      </section>

      <hr style={{ marginTop: 32, marginBottom: 16 }} />
      <section>
        <h2>Ads Management</h2>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <label>Ad Name: <input value={adName} onChange={e => setAdName(e.target.value)} style={{ marginLeft: 8 }} /></label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Daily Budget (USD): <input type="number" value={adBudget} onChange={e => setAdBudget(parseFloat(e.target.value))} style={{ marginLeft: 8 }} /></label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Platforms (select all to publish):</label>
            <div style={{ marginTop: 4 }}>
              {['meta', 'google_ads', 'linkedin', 'twitter'].map(p => (
                <label key={p} style={{ display: 'block', marginBottom: 4 }}>
                  <input type="checkbox" checked={adPlatforms.includes(p)} onChange={e => {
                    if (e.target.checked) setAdPlatforms([...adPlatforms, p]);
                    else setAdPlatforms(adPlatforms.filter(x => x !== p));
                  }} /> {p}
                </label>
              ))}
            </div>
          </div>
          <button onClick={async () => {
            if (!adName) return alert('Enter ad name');
            const res = await fetch('/api/ads/multi-platform', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: adName, platforms: adPlatforms, budget: adBudget, objective: 'BRAND_AWARENESS' })
            });
            const data = await res.json();
            alert('Ad created: ' + JSON.stringify(data));
            setAdName('');
          }} style={{ padding: '8px 16px' }}>Create Multi-Platform Ad</button>
        </div>

        {adminAds && (
          <div style={{ marginTop: 16 }}>
            <h4>Ads List</h4>
            <div style={{ maxHeight: 200, overflow: 'auto', borderRadius: 4, border: '1px solid #ddd', padding: 8 }}>
              {adminAds.map(ad => (
                <div key={ad.id} style={{ padding: 8, borderBottom: '1px solid #eee', cursor: 'pointer' }} onClick={() => setSelectedAdId(ad.id)}>
                  <strong>{ad.name}</strong> ({ad.platform}) - {ad.status}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedAdId && (
          <div style={{ marginTop: 16 }}>
            <button onClick={async () => {
              const res = await fetch(`/api/ads/${selectedAdId}/performance`);
              const data = await res.json();
              setAdPerformance(data);
            }} style={{ marginRight: 8 }}>Load Performance</button>
            <button onClick={() => setSelectedAdId(null)}>Clear</button>
            {adPerformance && (
              <pre style={{ background: '#f6f6f6', padding: 12, maxHeight: 300, overflow: 'auto', marginTop: 8 }}>{JSON.stringify(adPerformance, null, 2)}</pre>
            )}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <button onClick={async () => {
            const res = await fetch('/api/admin/ads', { headers: { 'x-admin-token': adminToken } });
            if (res.status === 401) return alert('Unauthorized');
            const data = await res.json();
            setAdminAds(data);
          }} style={{ padding: '8px 16px' }}>Fetch Ads (Admin)</button>
        </div>
      </section>
    </div>
  );
}

export default App;
