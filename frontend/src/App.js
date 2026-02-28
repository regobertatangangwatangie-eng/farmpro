import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  // ========== State ==========
  const [currentPage, setCurrentPage] = useState('browse'); // browse, seller, user-profile, orders
  const [currentUser, setCurrentUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('buyer');
  const [userLocation, setUserLocation] = useState('');
  const [userCountry, setUserCountry] = useState('');
  const [sellerListingTitle, setSellerListingTitle] = useState('');
  const [sellerListingProduct, setSellerListingProduct] = useState('');
  const [sellerListingPrice, setSellerListingPrice] = useState('');
  const [sellerListingQuantity, setSellerListingQuantity] = useState('');
  const [sellerListingUnit, setSellerListingUnit] = useState('kg');
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [promo, setPromo] = useState(null);
  const [showPromo, setShowPromo] = useState(false);

  // ========== Effects ==========
  useEffect(() => {
    fetchCategories();
    fetchProducts();
    fetchMarketplaceStats();
    fetchPromotion();
    // Try to load user from localStorage
    const saved = localStorage.getItem('farmpro_user');
    if (saved) setCurrentUser(JSON.parse(saved));
  }, []);

  useEffect(() => {
    fetchListings();
  }, [selectedCategory, searchTerm]);

  useEffect(() => {
    if (currentUser) {
      fetchOrders();
    }
  }, [currentUser]);

  // ========== API Calls ==========
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  };

  const fetchProducts = async (type = null) => {
    try {
      const url = type ? `/api/products?type=${type}` : '/api/products';
      const res = await fetch(url);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) {
      console.error('Error fetching products:', e);
    }
  };

  const fetchListings = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);
      const url = `/api/listings?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      setListings(data.listings || []);
    } catch (e) {
      console.error('Error fetching listings:', e);
    }
  };

  const fetchOrders = async () => {
    if (!currentUser) return;
    try {
      const url = currentUser.role.includes('buyer') ? `/api/orders?buyer_id=${currentUser.id}` : `/api/orders?seller_id=${currentUser.id}`;
      const res = await fetch(url);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      console.error('Error fetching orders:', e);
    }
  };

  const fetchMarketplaceStats = async () => {
    try {
      const res = await fetch('/api/stats/marketplace');
      const data = await res.json();
      setStats(data.stats);
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const fetchPromotion = async () => {
    try {
      const res = await fetch('/api/promotions/ticket');
      const data = await res.json();
      if (data && data.show) {
        setPromo(data);
        setShowPromo(true);
      }
    } catch (e) {
      console.error('Error fetching promo:', e);
    }
  };

  const registerUser = async () => {
    if (!userName || !userEmail || !userRole) return alert('Fill all fields');
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName,
          email: userEmail,
          role: userRole,
          location: userLocation || null,
          country: userCountry || null
        })
      });
      const user = await res.json();
      if (user.user) {
        setCurrentUser(user.user);
        localStorage.setItem('farmpro_user', JSON.stringify(user.user));
        alert('Registration successful!');
        setCurrentPage('browse');
      }
    } catch (e) {
      alert('Error registering: ' + e.message);
    }
  };

  const createListing = async () => {
    if (!currentUser || !sellerListingTitle || !sellerListingProduct || !sellerListingPrice || !sellerListingQuantity) {
      return alert('Fill all fields');
    }
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: sellerListingProduct,
          seller_id: currentUser.id,
          title: sellerListingTitle,
          price: parseFloat(sellerListingPrice),
          quantity: parseFloat(sellerListingQuantity),
          quantity_unit: sellerListingUnit
        })
      });
      const data = await res.json();
      if (data.listing) {
        alert('Listing created!');
        setSellerListingTitle('');
        setSellerListingProduct('');
        setSellerListingPrice('');
        setSellerListingQuantity('');
        fetchListings();
      }
    } catch (e) {
      alert('Error creating listing: ' + e.message);
    }
  };

  const addToCart = (listing) => {
    setCart([...cart, {...listing, cartQty: 1}]);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const checkout = async () => {
    if (!currentUser || cart.length === 0) return alert('Add items to cart and login');
    try {
      for (const item of cart) {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buyer_id: currentUser.id,
            listing_id: item.id,
            quantity: item.cartQty || 1
          })
        });
        const order = await res.json();
        if (!order.order) throw new Error('Order creation failed');
      }
      alert('Orders created successfully!');
      setCart([]);
      fetchOrders();
    } catch (e) {
      alert('Error checking out: ' + e.message);
    }
  };

  // ========== Render Functions ==========

  const renderPromoModal = () => {
    if (!promo || !showPromo) return null;
    return (
      <div style={{ position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={()=>setShowPromo(false)}>
        <div style={{ background:'white', padding:24, borderRadius:8, maxWidth:400 }} onClick={e=>e.stopPropagation()}>
          <h2>{promo.title}</h2>
          <p style={{ whiteSpace:'pre-wrap' }}>{promo.message}</p>
          <button onClick={()=>{window.location.href=promo.link; setShowPromo(false);}} style={{ marginTop:16, padding:'8px 16px', backgroundColor:'#4CAF50', color:'white', border:'none', borderRadius:4 }}>Learn More</button>
        </div>
      </div>
    );
  };
  const renderBrowse = () => (
    <div>
      <h2>📦 Farm Products & Items Marketplace</h2>
      <div style={{ marginBottom: 16 }}>
        <input 
          type="text" 
          placeholder="Search products..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: 8, width: 300, marginRight: 8 }}
        />
        <select 
          value={selectedCategory || ''} 
          onChange={(e) => setSelectedCategory(e.target.value || null)}
          style={{ padding: 8 }}
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <h3>Available Listings ({listings.length})</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {listings.map(listing => (
          <div key={listing.id} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
            <h4>{listing.title}</h4>
            <p><strong>Product:</strong> {listing.product_name}</p>
            <p><strong>Seller:</strong> {listing.seller_name}</p>
            <p><strong>Price:</strong> ${listing.price}/{listing.quantity_unit}</p>
            <p><strong>Quantity Available:</strong> {listing.quantity} {listing.quantity_unit}</p>
            <button onClick={() => addToCart(listing)} style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              Add to Cart
            </button>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: '#f0f0f0', borderRadius: 8 }}>
          <h3>🛒 Cart ({cart.length} items)</h3>
          {cart.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>{item.title} - ${item.price}</span>
              <button onClick={() => removeFromCart(i)} style={{ backgroundColor: '#ff6b6b', color: 'white', border: 'none', padding: '4px 8px', cursor: 'pointer' }}>Remove</button>
            </div>
          ))}
          <button onClick={checkout} style={{ padding: '10px 20px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 12 }}>
            Checkout
          </button>
        </div>
      )}
    </div>
  );

  const renderRegister = () => (
    <div style={{ maxWidth: 500 }}>
      <h2>Register Account</h2>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>Email:</label>
        <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} style={{ padding: 8, width: '100%' }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>Name:</label>
        <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} style={{ padding: 8, width: '100%' }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>Account Type:</label>
        <select value={userRole} onChange={(e) => setUserRole(e.target.value)} style={{ padding: 8, width: '100%' }}>
          <option value="buyer">Buyer</option>
          <option value="farmer">Farmer (Can sell products)</option>
          <option value="seller">Seller (Farm items)</option>
          <option value="farmer,seller">Both Farmer & Seller</option>
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>Location:</label>
        <input type="text" value={userLocation} onChange={(e) => setUserLocation(e.target.value)} style={{ padding: 8, width: '100%' }} placeholder="e.g., Douala" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>Country:</label>
        <input type="text" value={userCountry} onChange={(e) => setUserCountry(e.target.value)} style={{ padding: 8, width: '100%' }} placeholder="e.g., Cameroon" />
      </div>
      <button onClick={registerUser} style={{ padding: '10px 24px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
        Register
      </button>
    </div>
  );

  const renderSeller = () => (
    <div>
      <h2>📝 Create Product Listing</h2>
      <div style={{ maxWidth: 500 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Listing Title:</label>
          <input type="text" value={sellerListingTitle} onChange={(e) => setSellerListingTitle(e.target.value)} style={{ padding: 8, width: '100%' }} placeholder="e.g., Fresh Arabica Coffee Beans" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Product:</label>
          <select value={sellerListingProduct} onChange={(e) => setSellerListingProduct(e.target.value)} style={{ padding: 8, width: '100%' }}>
            <option value="">Select a product</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Price per Unit ($):</label>
          <input type="number" value={sellerListingPrice} onChange={(e) => setSellerListingPrice(e.target.value)} style={{ padding: 8, width: '100%' }} step="0.01" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Quantity Available:</label>
          <input type="number" value={sellerListingQuantity} onChange={(e) => setSellerListingQuantity(e.target.value)} style={{ padding: 8, width: '100%' }} step="1" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Unit:</label>
          <select value={sellerListingUnit} onChange={(e) => setSellerListingUnit(e.target.value)} style={{ padding: 8, width: '100%' }}>
            <option value="kg">kg</option>
            <option value="lb">lb</option>
            <option value="piece">piece</option>
            <option value="bunch">bunch</option>
            <option value="liter">liter</option>
            <option value="meter">meter</option>
          </select>
        </div>
        <button onClick={createListing} style={{ padding: '10px 24px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          Create Listing
        </button>
      </div>
    </div>
  );

  const renderOrders = () => (
    <div>
      <h2>📋 My Orders</h2>
      {orders.length === 0 ? (
        <p>No orders yet</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Product</th>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Quantity</th>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Total</th>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td style={{ padding: 12, borderBottom: '1px solid #ddd' }}>{o.product_name}</td>
                <td style={{ padding: 12, borderBottom: '1px solid #ddd' }}>{o.quantity} {o.quantity_unit}</td>
                <td style={{ padding: 12, borderBottom: '1px solid #ddd' }}>${o.total_amount}</td>
                <td style={{ padding: 12, borderBottom: '1px solid #ddd' }}>{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // ========== Main Render ==========
  return (
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 24, borderBottom: '2px solid #4CAF50', paddingBottom: 16 }}>
        <h1>🌾 FarmPro Marketplace v2.0</h1>
        <p>Connecting Local Farmers with International Buyers</p>
        {stats && <p style={{ fontSize: 12, color: '#666' }}>
          {stats.total_users} Users • {stats.total_listings} Active Listings • {stats.total_orders} Orders
        </p>}
      </header>

      <nav style={{ marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setCurrentPage('browse')} style={{ padding: '8px 16px', backgroundColor: currentPage === 'browse' ? '#4CAF50' : '#ddd', color: currentPage === 'browse' ? 'white' : 'black', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          🛍️ Browse
        </button>
        {currentUser ? (
          <>
            <button onClick={() => setCurrentPage('orders')} style={{ padding: '8px 16px', backgroundColor: currentPage === 'orders' ? '#4CAF50' : '#ddd', color: currentPage === 'orders' ? 'white' : 'black', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              📋 My Orders
            </button>
            {currentUser.role.includes('farmer') && (
              <button onClick={() => setCurrentPage('seller')} style={{ padding: '8px 16px', backgroundColor: currentPage === 'seller' ? '#4CAF50' : '#ddd', color: currentPage === 'seller' ? 'white' : 'black', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                📝 Sell Products
              </button>
            )}
            <div style={{ marginLeft: 'auto' }}>
              <span style={{ marginRight: 12 }}>Welcome, <strong>{currentUser.name}</strong></span>
              <button onClick={() => { setCurrentUser(null); localStorage.removeItem('farmpro_user'); }} style={{ padding: '8px 16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                Logout
              </button>
            </div>
          </>
        ) : (
          <button onClick={() => setCurrentPage('register')} style={{ padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            📝 Register / Login
          </button>
        )}
      </nav>

      <main>
        {currentPage === 'browse' && renderBrowse()}
        {currentPage === 'register' && renderRegister()}
        {currentPage === 'seller' && currentUser && renderSeller()}
        {currentPage === 'orders' && currentUser && renderOrders()}
      </main>
      {renderPromoModal()}
    </div>
  );
}

export default App;
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
