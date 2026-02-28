const express = require('express');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const db = require('./db');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// promotional ticket endpoint (popup message for all platforms)
app.get('/api/promotions/ticket', (req, res) => {
  res.json({
    title: '🌍 Connect with the World via FarmPro',
    message: `Buy directly from local farmers and sell to international buyers.\n` +
             `FarmPro links local farmers to global markets — #SupportLocal #FarmToWorld`,
    link: '/',
    show: true
  });
});

// ===================== Marketplace Helpers =====================

function createUser(user) {
  db.prepare(`INSERT INTO users (id, name, email, phone, role, location, country, bio, avatar_url, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    user.id, user.name, user.email, user.phone || null, user.role, user.location || null, user.country || null, user.bio || null, user.avatar_url || null, user.created_at, user.updated_at
  );
}

function getUser(id) {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
}

function getUserByEmail(email) {
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
}

function listUsers() {
  return db.prepare(`SELECT id, name, email, role, location, country, verified, created_at FROM users ORDER BY created_at DESC`).all();
}

function listSellers() {
  return db.prepare(`SELECT id, name, email, role, location, country, bio, avatar_url, verified, created_at FROM users WHERE role LIKE '%seller%' OR role LIKE '%farmer%' ORDER BY created_at DESC`).all();
}

function createProduct(product) {
  db.prepare(`INSERT INTO products (id, name, description, category_id, type, unit, image_url, created_at) VALUES (?,?,?,?,?,?,?,?)`).run(
    product.id, product.name, product.description || null, product.category_id, product.type, product.unit || null, product.image_url || null, product.created_at
  );
}

function getProduct(id) {
  return db.prepare(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`).get(id);
}

function listProducts(category_id = null, type = null) {
  let query = `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1`;
  const params = [];
  if (category_id) {
    query += ` AND p.category_id = ?`;
    params.push(category_id);
  }
  if (type) {
    query += ` AND p.type = ?`;
    params.push(type);
  }
  query += ` ORDER BY p.created_at DESC`;
  return db.prepare(query).all(...params);
}

function createCategory(category) {
  db.prepare(`INSERT INTO categories (id, name, description, type, icon_url, created_at) VALUES (?,?,?,?,?,?)`).run(
    category.id, category.name, category.description || null, category.type, category.icon_url || null, category.created_at
  );
}

function getCategory(id) {
  return db.prepare(`SELECT * FROM categories WHERE id = ?`).get(id);
}

function listCategories(type = null) {
  let query = `SELECT * FROM categories WHERE 1`;
  const params = [];
  if (type) {
    query += ` AND type = ?`;
    params.push(type);
  }
  query += ` ORDER BY name ASC`;
  return db.prepare(query).all(...params);
}

function createListing(listing) {
  db.prepare(`INSERT INTO listings (id, product_id, seller_id, title, description, price, quantity, quantity_unit, status, image_url, certification, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    listing.id, listing.product_id, listing.seller_id, listing.title, listing.description || null, listing.price, listing.quantity, listing.quantity_unit, listing.status || 'active', listing.image_url || null, listing.certification || null, listing.created_at, listing.updated_at
  );
}

function getListing(id) {
  const listing = db.prepare(`SELECT l.*, p.name as product_name, c.name as category_name, u.name as seller_name FROM listings l LEFT JOIN products p ON l.product_id = p.id LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN users u ON l.seller_id = u.id WHERE l.id = ?`).get(id);
  return listing;
}

function listListings(filters = {}) {
  let query = `SELECT l.*, p.name as product_name, c.name as category_name, u.name as seller_name FROM listings l LEFT JOIN products p ON l.product_id = p.id LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN users u ON l.seller_id = u.id WHERE l.status = 'active'`;
  const params = [];
  
  if (filters.category_id) {
    query += ` AND c.id = ?`;
    params.push(filters.category_id);
  }
  if (filters.seller_id) {
    query += ` AND l.seller_id = ?`;
    params.push(filters.seller_id);
  }
  if (filters.type) {
    query += ` AND p.type = ?`;
    params.push(filters.type);
  }
  if (filters.search) {
    query += ` AND (p.name LIKE ? OR l.title LIKE ? OR l.description LIKE ?)`;
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }
  
  query += ` ORDER BY l.created_at DESC LIMIT 100`;
  return db.prepare(query).all(...params);
}

function updateListing(id, updates) {
  const setClauses = [];
  const params = [];
  for (const [key, value] of Object.entries(updates)) {
    if (key !== 'id') {
      setClauses.push(`${key} = ?`);
      params.push(value);
    }
  }
  params.push(id);
  const query = `UPDATE listings SET ${setClauses.join(', ')}, updated_at = ? WHERE id = ?`;
  db.prepare(query).run(...params, new Date().toISOString());
}

function createOrder(order) {
  db.prepare(`INSERT INTO orders (id, buyer_id, listing_id, quantity, unit_price, total_amount, status, payment_status, delivery_address, delivery_date, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    order.id, order.buyer_id, order.listing_id, order.quantity, order.unit_price, order.total_amount, order.status || 'pending', order.payment_status || 'pending', order.delivery_address || null, order.delivery_date || null, order.notes || null, order.created_at, order.updated_at
  );
}

function getOrder(id) {
  const order = db.prepare(`SELECT o.*, p.name as product_name, u.name as seller_name, b.name as buyer_name FROM orders o LEFT JOIN listings l ON o.listing_id = l.id LEFT JOIN products p ON l.product_id = p.id LEFT JOIN users u ON l.seller_id = u.id LEFT JOIN users b ON o.buyer_id = b.id WHERE o.id = ?`).get(id);
  return order;
}

function listOrders(buyer_id = null, seller_id = null) {
  let query = `SELECT o.*, p.name as product_name, u.name as seller_name, b.name as buyer_name FROM orders o LEFT JOIN listings l ON o.listing_id = l.id LEFT JOIN products p ON l.product_id = p.id LEFT JOIN users u ON l.seller_id = u.id LEFT JOIN users b ON o.buyer_id = b.id WHERE 1`;
  const params = [];
  
  if (buyer_id) {
    query += ` AND o.buyer_id = ?`;
    params.push(buyer_id);
  }
  if (seller_id) {
    query += ` AND u.id = ?`;
    params.push(seller_id);
  }
  
  query += ` ORDER BY o.created_at DESC`;
  return db.prepare(query).all(...params);
}

function updateOrder(id, updates) {
  const setClauses = [];
  const params = [];
  for (const [key, value] of Object.entries(updates)) {
    if (key !== 'id') {
      setClauses.push(`${key} = ?`);
      params.push(value);
    }
  }
  params.push(id);
  const query = `UPDATE orders SET ${setClauses.join(', ')}, updated_at = ? WHERE id = ?`;
  db.prepare(query).run(...params, new Date().toISOString());
}


// ===================== Default Seed Data =====================
function initializeDefaultCategories() {
  const existingCats = listCategories();
  if (existingCats.length > 0) return;

  const farmProductsCategories = [
    { id: uuidv4(), name: 'Coffee', type: 'farm_product', description: 'Coffee beans and processed coffee' },
    { id: uuidv4(), name: 'Cocoa', type: 'farm_product', description: 'Cocoa beans and related products' },
    { id: uuidv4(), name: 'Yams', type: 'farm_product', description: 'Fresh yam roots' },
    { id: uuidv4(), name: 'Plantain', type: 'farm_product', description: 'Fresh and processed plantains' },
    { id: uuidv4(), name: 'Corn', type: 'farm_product', description: 'Corn/maize and corn products' },
    { id: uuidv4(), name: 'Rice', type: 'farm_product', description: 'Rice grains and processed rice' },
    { id: uuidv4(), name: 'Vegetables', type: 'farm_product', description: 'Fresh vegetables' },
    { id: uuidv4(), name: 'Fruits', type: 'farm_product', description: 'Fresh fruits' }
  ];

  const farmItemsCategories = [
    { id: uuidv4(), name: 'Fertilizer', type: 'farm_item', description: 'Various types of fertilizers' },
    { id: uuidv4(), name: 'Tools', type: 'farm_item', description: 'Farm tools and equipment' },
    { id: uuidv4(), name: 'Seeds', type: 'farm_item', description: 'Farm seeds for planting' },
    { id: uuidv4(), name: 'Pesticides', type: 'farm_item', description: 'Pest control products' },
    { id: uuidv4(), name: 'Irrigation', type: 'farm_item', description: 'Irrigation equipment and supplies' }
  ];

  const allCategories = { ...farmProductsCategories, ...farmItemsCategories };
  for (const cat of Object.values(allCategories)) {
    try {
      createCategory({ ...cat, created_at: new Date().toISOString() });
    } catch (e) {
      // Category might already exist
    }
  }
}

function initializeDefaultProducts() {
  const existingProducts = listProducts();
  if (existingProducts.length > 0) return;

  const categories = listCategories();
  const catMap = {};
  for (const cat of categories) {
    catMap[cat.name] = cat.id;
  }

  const products = [
    // Farm products
    { name: 'Arabica Coffee Beans', category: 'Coffee', type: 'farm_product', unit: 'kg', description: 'Premium arabica coffee beans' },
    { name: 'Robusta Coffee', category: 'Coffee', type: 'farm_product', unit: 'kg', description: 'Robusta coffee beans' },
    { name: 'Cocoa Beans (Fermented)', category: 'Cocoa', type: 'farm_product', unit: 'kg', description: 'High-quality fermented cocoa beans' },
    { name: 'Cocoa Powder', category: 'Cocoa', type: 'farm_product', unit: 'kg', description: 'Processed cocoa powder' },
    { name: 'Fresh Yams', category: 'Yams', type: 'farm_product', unit: 'kg', description: 'Fresh harvested yams' },
    { name: 'Plantain Bunches', category: 'Plantain', type: 'farm_product', unit: 'bunch', description: 'Fresh plantain bunches' },
    { name: 'Corn/Maize', category: 'Corn', type: 'farm_product', unit: 'kg', description: 'Fresh corn/maize' },
    { name: 'Corn Flour', category: 'Corn', type: 'farm_product', unit: 'kg', description: 'Ground corn flour' },
    { name: 'Rice (Paddy)', category: 'Rice', type: 'farm_product', unit: 'kg', description: 'Paddy rice' },
    { name: 'Rice (Milled)', category: 'Rice', type: 'farm_product', unit: 'kg', description: 'Milled white rice' },
    { name: 'Tomatoes', category: 'Vegetables', type: 'farm_product', unit: 'kg', description: 'Fresh tomatoes' },
    { name: 'Onions', category: 'Vegetables', type: 'farm_product', unit: 'kg', description: 'Fresh onions' },
    { name: 'Bananas', category: 'Fruits', type: 'farm_product', unit: 'bunch', description: 'Fresh bananas' },
    { name: 'Avocados', category: 'Fruits', type: 'farm_product', unit: 'kg', description: 'Fresh avocados' },
    
    // Farm items
    { name: 'NPK Fertilizer', category: 'Fertilizer', type: 'farm_item', unit: 'kg', description: 'NPK compound fertilizer' },
    { name: 'Organic Manure', category: 'Fertilizer', type: 'farm_item', unit: 'kg', description: 'Organic manure/compost' },
    { name: 'Hoe', category: 'Tools', type: 'farm_item', unit: 'piece', description: 'Farm hoe tool' },
    { name: 'Spade', category: 'Tools', type: 'farm_item', unit: 'piece', description: 'Garden spade' },
    { name: 'Machete', category: 'Tools', type: 'farm_item', unit: 'piece', description: 'Farming machete' },
    { name: 'Watering Can', category: 'Tools', type: 'farm_item', unit: 'piece', description: 'Metal watering can' },
    { name: 'Corn Seeds', category: 'Seeds', type: 'farm_item', unit: 'kg', description: 'Hybrid corn seeds' },
    { name: 'Rice Seeds', category: 'Seeds', type: 'farm_item', unit: 'kg', description: 'Quality rice seeds' },
    { name: 'Insecticide Spray', category: 'Pesticides', type: 'farm_item', unit: 'liter', description: 'Organic insecticide' },
    { name: 'Drip Tube', category: 'Irrigation', type: 'farm_item', unit: 'meter', description: 'Irrigation drip tube' },
    { name: 'Water Pump', category: 'Irrigation', type: 'farm_item', unit: 'piece', description: 'Electric water pump' }
  ];

  for (const prod of products) {
    const catId = catMap[prod.category];
    if (catId) {
      try {
        createProduct({
          id: uuidv4(),
          name: prod.name,
          description: prod.description,
          category_id: catId,
          type: prod.type,
          unit: prod.unit,
          created_at: new Date().toISOString()
        });
      } catch (e) {
        // Product might already exist
      }
    }
  }
}

// Initialize on startup
try {
  initializeDefaultCategories();
  initializeDefaultProducts();
} catch (e) {
  console.log('Seed data initialization skipped or already done');
}

// ===================== Health & Info Endpoints =====================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), service: 'farmpro-marketplace' });
});

app.get('/api/info', (req, res) => {
  res.json({
    service: 'farmpro-marketplace-backend',
    hostname: os.hostname(),
    region: process.env.AWS_REGION || 'local',
    version: '2.0 - Marketplace'
  });
});

// ===================== User Endpoints =====================

app.post('/api/users/register', (req, res) => {
  const { name, email, phone, role, location, country, bio } = req.body || {};
  if (!name || !email || !role) return res.status(400).json({ error: 'missing_fields' });

  const existing = getUserByEmail(email);
  if (existing) return res.status(400).json({ error: 'email_already_registered' });

  const id = uuidv4();
  const user = {
    id, name, email, phone: phone || null, role, location: location || null, country: country || null, bio: bio || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    createUser(user);
    return res.json({ user: { ...user, avatar_url: null, verified: false } });
  } catch (e) {
    return res.status(500).json({ error: 'registration_failed', details: e.message });
  }
});

app.get('/api/users/:id', (req, res) => {
  const user = getUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'not_found' });
  res.json({ user });
});

app.get('/api/users', (req, res) => {
  const users = listUsers();
  res.json({ users, count: users.length });
});

app.get('/api/users/role/seller', (req, res) => {
  const sellers = listSellers();
  res.json({ sellers, count: sellers.length });
});

app.put('/api/users/:id', (req, res) => {
  const { name, phone, location, country, bio, avatar_url } = req.body || {};
  const user = getUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'not_found' });

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (location !== undefined) updates.location = location;
  if (country !== undefined) updates.country = country;
  if (bio !== undefined) updates.bio = bio;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;
  updates.updated_at = new Date().toISOString();

  try {
    db.prepare(`UPDATE users SET ${Object.keys(updates).map(k => `${k} = ?`).join(', ')} WHERE id = ?`).run(...Object.values(updates), req.params.id);
    const updated = getUser(req.params.id);
    res.json({ user: updated });
  } catch (e) {
    res.status(500).json({ error: 'update_failed', details: e.message });
  }
});

// ===================== Category Endpoints =====================

app.get('/api/categories', (req, res) => {
  const type = req.query.type || null;
  const categories = listCategories(type);
  res.json({ categories, count: categories.length });
});

app.get('/api/categories/:id', (req, res) => {
  const category = getCategory(req.params.id);
  if (!category) return res.status(404).json({ error: 'not_found' });
  res.json({ category });
});

app.post('/api/categories', (req, res) => {
  const { name, type, description, icon_url } = req.body || {};
  if (!name || !type) return res.status(400).json({ error: 'missing_fields' });

  const id = uuidv4();
  const category = { id, name, type, description: description || null, icon_url: icon_url || null, created_at: new Date().toISOString() };

  try {
    createCategory(category);
    res.json({ category });
  } catch (e) {
    res.status(500).json({ error: 'creation_failed', details: e.message });
  }
});

// ===================== Product Endpoints =====================

app.get('/api/products', (req, res) => {
  const { category_id, type } = req.query;
  const products = listProducts(category_id || null, type || null);
  res.json({ products, count: products.length });
});

app.get('/api/products/:id', (req, res) => {
  const product = getProduct(req.params.id);
  if (!product) return res.status(404).json({ error: 'not_found' });
  res.json({ product });
});

app.post('/api/products', (req, res) => {
  const { name, category_id, type, unit, description, image_url } = req.body || {};
  if (!name || !category_id || !type) return res.status(400).json({ error: 'missing_fields' });

  const id = uuidv4();
  const product = { id, name, category_id, type, unit: unit || null, description: description || null, image_url: image_url || null, created_at: new Date().toISOString() };

  try {
    createProduct(product);
    const fullProduct = getProduct(id);
    res.json({ product: fullProduct });
  } catch (e) {
    res.status(500).json({ error: 'creation_failed', details: e.message });
  }
});

// ===================== Listing Endpoints =====================

app.post('/api/listings', (req, res) => {
  const { product_id, seller_id, title, price, quantity, quantity_unit, description, image_url, certification } = req.body || {};
  if (!product_id || !seller_id || !title || !price || !quantity) return res.status(400).json({ error: 'missing_fields' });

  const id = uuidv4();
  const listing = {
    id, product_id, seller_id, title, price: parseFloat(price), quantity: parseFloat(quantity),
    quantity_unit: quantity_unit || 'unit', description: description || null, image_url: image_url || null, certification: certification || null,
    status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  };

  try {
    createListing(listing);
    const fullListing = getListing(id);
    res.json({ listing: fullListing });
  } catch (e) {
    res.status(500).json({ error: 'creation_failed', details: e.message });
  }
});

app.get('/api/listings', (req, res) => {
  const { category_id, seller_id, type, search } = req.query;
  const filters = {
    category_id: category_id || null,
    seller_id: seller_id || null,
    type: type || null,
    search: search || null
  };
  const listings = listListings(filters);
  res.json({ listings, count: listings.length });
});

app.get('/api/listings/:id', (req, res) => {
  const listing = getListing(req.params.id);
  if (!listing) return res.status(404).json({ error: 'not_found' });
  res.json({ listing });
});

app.put('/api/listings/:id', (req, res) => {
  const listing = getListing(req.params.id);
  if (!listing) return res.status(404).json({ error: 'not_found' });

  const { title, description, price, quantity, status, image_url } = req.body || {};
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (price !== undefined) updates.price = parseFloat(price);
  if (quantity !== undefined) updates.quantity = parseFloat(quantity);
  if (status !== undefined) updates.status = status;
  if (image_url !== undefined) updates.image_url = image_url;

  try {
    updateListing(req.params.id, updates);
    const updated = getListing(req.params.id);
    res.json({ listing: updated });
  } catch (e) {
    res.status(500).json({ error: 'update_failed', details: e.message });
  }
});

// ===================== Order Endpoints =====================

app.post('/api/orders', (req, res) => {
  const { buyer_id, listing_id, quantity, delivery_address, delivery_date, notes } = req.body || {};
  if (!buyer_id || !listing_id || !quantity) return res.status(400).json({ error: 'missing_fields' });

  const listing = getListing(listing_id);
  if (!listing) return res.status(404).json({ error: 'listing_not_found' });

  if (quantity > listing.quantity) return res.status(400).json({ error: 'insufficient_quantity_available' });

  const id = uuidv4();
  const unit_price = listing.price;
  const total_amount = unit_price * quantity;

  const order = {
    id, buyer_id, listing_id, quantity: parseFloat(quantity), unit_price,
    total_amount, delivery_address: delivery_address || null, delivery_date: delivery_date || null, notes: notes || null,
    status: 'pending', payment_status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  };

  try {
    createOrder(order);
    // Reduce listing quantity
    updateListing(listing_id, { quantity: listing.quantity - quantity });
    const fullOrder = getOrder(id);
    res.json({ order: fullOrder });
  } catch (e) {
    res.status(500).json({ error: 'creation_failed', details: e.message });
  }
});

app.get('/api/orders', (req, res) => {
  const { buyer_id, seller_id } = req.query;
  const orders = listOrders(buyer_id || null, seller_id || null);
  res.json({ orders, count: orders.length });
});

app.get('/api/orders/:id', (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  res.json({ order });
});

app.put('/api/orders/:id', (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });

  const { status, payment_status, delivery_date } = req.body || {};
  const updates = {};
  if (status !== undefined) updates.status = status;
  if (payment_status !== undefined) updates.payment_status = payment_status;
  if (delivery_date !== undefined) updates.delivery_date = delivery_date;

  try {
    updateOrder(req.params.id, updates);
    const updated = getOrder(req.params.id);
    res.json({ order: updated });
  } catch (e) {
    res.status(500).json({ error: 'update_failed', details: e.message });
  }
});

// ===================== Review Endpoints =====================

app.post('/api/reviews', (req, res) => {
  const { order_id, reviewer_id, reviewee_id, rating, comment } = req.body || {};
  if (!order_id || !reviewer_id || !reviewee_id || rating === undefined) return res.status(400).json({ error: 'missing_fields' });

  const id = uuidv4();
  try {
    db.prepare(`INSERT INTO reviews (id, order_id, reviewer_id, reviewee_id, rating, comment, created_at) VALUES (?,?,?,?,?,?,?)`).run(
      id, order_id, reviewer_id, reviewee_id, rating, comment || null, new Date().toISOString()
    );
    const review = db.prepare(`SELECT * FROM reviews WHERE id = ?`).get(id);
    res.json({ review });
  } catch (e) {
    res.status(500).json({ error: 'creation_failed', details: e.message });
  }
});

app.get('/api/reviews/user/:user_id', (req, res) => {
  const reviews = db.prepare(`SELECT * FROM reviews WHERE reviewee_id = ? ORDER BY created_at DESC`).all(req.params.user_id);
  res.json({ reviews, count: reviews.length });
});

app.get('/api/reviews/order/:order_id', (req, res) => {
  const reviews = db.prepare(`SELECT * FROM reviews WHERE order_id = ?`).all(req.params.order_id);
  res.json({ reviews, count: reviews.length });
});

// ===================== Favorites/Wishlist Endpoints =====================

app.post('/api/favorites', (req, res) => {
  const { user_id, listing_id } = req.body || {};
  if (!user_id || !listing_id) return res.status(400).json({ error: 'missing_fields' });

  const id = uuidv4();
  try {
    db.prepare(`INSERT INTO favorites (id, user_id, listing_id, created_at) VALUES (?,?,?,?)`).run(id, user_id, listing_id, new Date().toISOString());
    res.json({ message: 'added_to_favorites', favorite: { id, user_id, listing_id } });
  } catch (e) {
    res.status(500).json({ error: 'creation_failed', details: e.message });
  }
});

app.get('/api/favorites/:user_id', (req, res) => {
  const favorites = db.prepare(`SELECT f.*, l.*, p.name as product_name FROM favorites f LEFT JOIN listings l ON f.listing_id = l.id LEFT JOIN products p ON l.product_id = p.id WHERE f.user_id = ?`).all(req.params.user_id);
  res.json({ favorites, count: favorites.length });
});

app.delete('/api/favorites/:id', (req, res) => {
  try {
    db.prepare(`DELETE FROM favorites WHERE id = ?`).run(req.params.id);
    res.json({ message: 'removed_from_favorites' });
  } catch (e) {
    res.status(500).json({ error: 'deletion_failed', details: e.message });
  }
});

// ===================== Messages Endpoints =====================

app.post('/api/messages', (req, res) => {
  const { sender_id, receiver_id, subject, content } = req.body || {};
  if (!sender_id || !receiver_id || !content) return res.status(400).json({ error: 'missing_fields' });

  const id = uuidv4();
  try {
    db.prepare(`INSERT INTO messages (id, sender_id, receiver_id, subject, content, created_at) VALUES (?,?,?,?,?,?)`).run(
      id, sender_id, receiver_id, subject || null, content, new Date().toISOString()
    );
    res.json({ message: { id, sender_id, receiver_id, subject, content, read: false } });
  } catch (e) {
    res.status(500).json({ error: 'send_failed', details: e.message });
  }
});

app.get('/api/messages/:user_id', (req, res) => {
  const messages = db.prepare(`SELECT * FROM messages WHERE receiver_id = ? OR sender_id = ? ORDER BY created_at DESC`).all(req.params.user_id, req.params.user_id);
  res.json({ messages, count: messages.length });
});

app.put('/api/messages/:id/read', (req, res) => {
  try {
    db.prepare(`UPDATE messages SET read = 1 WHERE id = ?`).run(req.params.id);
    res.json({ message: 'marked_as_read' });
  } catch (e) {
    res.status(500).json({ error: 'update_failed', details: e.message });
  }
});

// ===================== Stats/Dashboard Endpoints =====================

app.get('/api/stats/marketplace', (req, res) => {
  const totalUsers = db.prepare(`SELECT COUNT(*) as count FROM users`).get().count;
  const totalListings = db.prepare(`SELECT COUNT(*) as count FROM listings WHERE status = 'active'`).get().count;
  const totalOrders = db.prepare(`SELECT COUNT(*) as count FROM orders`).get().count;
  const totalRevenue = db.prepare(`SELECT SUM(total_amount) as total FROM orders WHERE payment_status = 'paid'`).get().total || 0;

  res.json({
    stats: {
      total_users: totalUsers,
      total_listings: totalListings,
      total_orders: totalOrders,
      total_revenue: totalRevenue
    }
  });
});

// ===================== Server Start =====================

if (process.argv.includes('--test')) {
  console.log('ok');
  process.exit(0);
}

app.listen(port, () => {
  console.log(`FarmPro Marketplace Backend listening on port ${port}`);
});


