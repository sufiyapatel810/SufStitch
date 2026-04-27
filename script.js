import { onAuthStateChanged, auth } 
  from './firebase.js'

import {
  db,
  collection,
  addDoc,
  serverTimestamp
} from './firebase.js'

import { openRazorpay } from './razorpay.js'
/* ── PRODUCT DATA ── */
const PRODUCTS = [
  { id:'1',  name:'Crochet Keychains',        slug:'keychains', price:149,  image:'images/keychain.jpg',   category:'accessories', isNew:true,
    desc:'Adorable handmade crochet keychains — perfect as gifts or everyday accessories. Each one is unique.' },
  { id:'2',  name:'Crochet Tote Bag',          slug:'tote',      price:799,  image:'images/gstotebag.jpg',  category:'bags',
    desc:'Spacious and stylish handwoven tote bag. Eco-friendly and sturdy — great for market runs or beach days.' },
  { id:'3',  name:'Crochet Beanie',            slug:'beanie',    price:499,  image:'images/beanie.jpg',     category:'sweaters',
    desc:'Cozy handmade crochet beanie. Warm, soft, and available in beautiful handpicked yarn colours.' },
  { id:'4',  name:'Crochet Bucket Hat',        slug:'bucket',    price:599,  image:'images/buckethat.jpg',  category:'accessories', isNew:true,
    desc:'Trendy crochet bucket hat — a summer staple. Lightweight, breathable, and totally handmade.' },
  { id:'5',  name:'Pastel Crochet Crop Top',   slug:'crop',      price:1099, image:'images/pasteltop.jpg',  category:'tops',
    desc:'Dreamy pastel crop top in delicate crochet. Perfect for festivals, beach days, and summer evenings.' },
  { id:'6',  name:'Oversized Crochet Sweater', slug:'sweater',   price:2499, image:'images/sweater.jpg',    category:'sweaters',
    desc:'Luxuriously soft oversized sweater. A wardrobe staple crafted to cosy perfection.' },
  { id:'7',  name:'Crochet Mesh Top',          slug:'mesh',      price:999,  image:'images/meshtop.jpg',    category:'tops',
    desc:'Elegant open-mesh crochet top. Layer it over a bralette or wear it solo for effortless style.' },
  { id:'8',  name:'Crochet Phone Cover',       slug:'phone',     price:399,  image:'images/phonecover.jpg', category:'accessories',
    desc:'Protect your phone in style with a handmade crochet cover. Fits most standard phone sizes.' },
  { id:'9',  name:'Scrunchies Set',            slug:'scrunchies',price:249,  image:'images/scrunchy.jpg',   category:'accessories', isNew:true,
    desc:'Set of 3 handmade crochet scrunchies in complementary shades — gentle on hair and gorgeous.' },
  { id:'10', name:'Granny Cardigan',           slug:'cardigan',  price:1899, image:'images/cardigan.jpg',   category:'sweaters',
    desc:'Classic granny-square cardigan with a modern cut. Cosy, colourful, and completely handmade.' },
];

// ── this goes AFTER the PRODUCTS array ──
// ── do not delete the array above      ──

let FIREBASE_PRODUCTS = []

async function loadProducts() {
  try {
    const snapshot = await getDocs(collection(db, 'products'))
    FIREBASE_PRODUCTS = []

    snapshot.forEach(doc => {
      FIREBASE_PRODUCTS.push({ 
        id: doc.id, 
        ...doc.data() 
      })
    })

    console.log('✅ Firebase products loaded')
    // use Firebase products
    return FIREBASE_PRODUCTS

  } catch (error) {
    console.log('❌ Firebase failed, using local backup')
    // use your hardcoded PRODUCTS array as backup
    return PRODUCTS
  }
}

/* ── STATE ── */
const State = {
  cart:     [],
  wishlist: [],
  load() {
    try { this.cart     = JSON.parse(localStorage.getItem('ss-cart')     || '[]'); } catch { this.cart = []; }
    try { this.wishlist = JSON.parse(localStorage.getItem('ss-wishlist') || '[]'); } catch { this.wishlist = []; }
  },
  save() {
    localStorage.setItem('ss-cart',     JSON.stringify(this.cart));
    localStorage.setItem('ss-wishlist', JSON.stringify(this.wishlist));
  },
  cartCount()    { return this.cart.reduce((s, i) => s + i.qty, 0); },
  cartSubtotal() { return this.cart.reduce((s, i) => s + i.price * i.qty, 0); },
  inWishlist(id) { return this.wishlist.includes(id); },
};

/* ── TOAST SYSTEM ── */
const Toast = {
  container: null,
  init() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  },
  show(title, msg = '', type = 'success') {
    if (!this.container) this.init();
    const icons = { success:'fa-check-circle', error:'fa-times-circle', info:'fa-info-circle', wishlist:'fa-heart' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `
      <i class="fas ${icons[type] || icons.info} toast-icon"></i>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
      </div>`;
    this.container.appendChild(t);
    setTimeout(() => {
      t.classList.add('leaving');
      t.addEventListener('animationend', () => t.remove(), { once: true });
    }, 3200);
  },
};

/* ── CART OPERATIONS ── */
const Cart = {
  add(id) {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return;
    const ex = State.cart.find(x => x.id === id);
    if (ex) { ex.qty++; }
    else { State.cart.push({ id, name: p.name, price: p.price, image: p.image, qty: 1 }); }
    State.save();
    UI.updateCartCount(true);
    UI.refreshCardControls();
    Toast.show(`Added to cart`, p.name, 'success');
  },
  remove(id) {
    const item = State.cart.find(x => x.id === id);
    State.cart = State.cart.filter(x => x.id !== id);
    State.save();
    UI.updateCartCount();
    UI.refreshCardControls();
    if (item) Toast.show('Removed from cart', item.name, 'error');
    // Re-render if on cart page
    if (document.getElementById('cart-items-list')) CartPage.render();
  },
  changeQty(id, delta) {
    const item = State.cart.find(x => x.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) { this.remove(id); return; }
    State.save();
    UI.updateCartCount();
    if (document.getElementById('cart-items-list')) CartPage.render();
  },
};

/* ── WISHLIST OPERATIONS ── */
const Wishlist = {
  toggle(id) {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return;
    if (State.inWishlist(id)) {
      State.wishlist = State.wishlist.filter(x => x !== id);
      Toast.show('Removed from wishlist', p.name, 'error');
    } else {
      State.wishlist.push(id);
      Toast.show('Added to wishlist', p.name, 'wishlist');
    }
    State.save();
    // Refresh wishlist heart buttons
    document.querySelectorAll(`.wish-btn[data-id="${id}"]`).forEach(btn => {
      btn.classList.toggle('wishlisted', State.inWishlist(id));
      btn.title = State.inWishlist(id) ? 'Remove from wishlist' : 'Add to wishlist';
    });
  },
};

/* ── QUICK VIEW MODAL ── */
const QuickView = {
  overlay: null,
  init() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.id = 'quickview-modal';
    this.overlay.innerHTML = `
      <div class="modal-box">
        <button class="modal-close" id="qv-close" aria-label="Close"><i class="fas fa-times"></i></button>
        <div class="quickview-layout">
          <img id="qv-img" class="quickview-img" src="" alt="">
          <div class="quickview-info">
            <span id="qv-cat" class="quickview-category"></span>
            <h2 id="qv-title" class="quickview-title"></h2>
            <div id="qv-price" class="quickview-price"></div>
            <p id="qv-desc" class="quickview-desc"></p>
            <div class="quickview-actions">
              <button class="add-to-cart-btn" id="qv-add-btn"><i class="fas fa-shopping-bag"></i> Add to Cart</button>
              <button class="cta-button outline" id="qv-wish-btn"><i class="fas fa-heart"></i> Wishlist</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(this.overlay);

    this.overlay.addEventListener('click', e => {
      if (e.target === this.overlay) this.close();
    });
    document.getElementById('qv-close').addEventListener('click', () => this.close());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
  },
  open(id) {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p || !this.overlay) return;
    document.getElementById('qv-img').src = p.image;
    document.getElementById('qv-img').alt = p.name;
    document.getElementById('qv-cat').textContent = p.category;
    document.getElementById('qv-title').textContent = p.name;
    document.getElementById('qv-price').textContent = `₹${p.price}`;
    document.getElementById('qv-desc').textContent = p.desc || '';

    const addBtn  = document.getElementById('qv-add-btn');
    const wishBtn = document.getElementById('qv-wish-btn');
    // Clone to remove old listeners
    const newAdd  = addBtn.cloneNode(true);
    const newWish = wishBtn.cloneNode(true);
    addBtn.replaceWith(newAdd);
    wishBtn.replaceWith(newWish);

    newAdd.addEventListener('click', () => { Cart.add(id); this.close(); });
    newWish.addEventListener('click', () => Wishlist.toggle(id));
    newWish.innerHTML = State.inWishlist(id)
      ? '<i class="fas fa-heart"></i> Remove from Wishlist'
      : '<i class="far fa-heart"></i> Add to Wishlist';

    this.overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  },
  close() {
    this.overlay?.classList.remove('open');
    document.body.style.overflow = '';
  },
};

/* ── UI HELPERS ── */
const UI = {
  updateCartCount(bump = false) {
    const n = State.cartCount();
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = n;
      if (bump) {
        el.classList.remove('bump');
        requestAnimationFrame(() => el.classList.add('bump'));
      }
    });
  },
  /** Rebuilds add-to-cart / qty row in every .cart-controls on the page */
  refreshCardControls() {
    document.querySelectorAll('.cart-controls[data-id]').forEach(el => {
      const id   = el.dataset.id;
      const item = State.cart.find(x => x.id === id);
      if (item) {
        el.innerHTML = `
          <div class="qty-row">
            <button class="qty-btn qty-minus" data-id="${id}" aria-label="Decrease">−</button>
            <span class="qty-count">${item.qty}</span>
            <button class="qty-btn qty-plus" data-id="${id}" aria-label="Increase">+</button>
          </div>`;
      } else {
        el.innerHTML = `<button class="add-to-cart-btn" data-id="${id}"><i class="fas fa-shopping-bag"></i> Add to Cart</button>`;
      }
    });
  },
  /** Generate product card HTML */
  cardHTML(p) {
    const wished = State.inWishlist(p.id);
    return `
      <div class="product-card" data-id="${p.id}">
        <div class="product-img-wrap">
          <div class="badges">
            ${p.isNew ? '<span class="badge badge-new">New</span>' : ''}
          </div>
          <div class="card-actions">
            <button class="action-btn wish-btn ${wished ? 'wishlisted' : ''}"
              data-id="${p.id}" title="${wished ? 'Remove from wishlist' : 'Add to wishlist'}" aria-label="Wishlist">
              <i class="fa${wished ? 's' : 'r'} fa-heart"></i>
            </button>
          </div>
          <img src="${p.image}" class="product-image" alt="${p.name}" loading="lazy">
          <button class="quick-view-btn" data-qv="${p.id}">Quick View</button>
        </div>
        <div class="product-info">
          <span class="product-category-tag">${p.category}</span>
          <h3 class="product-name">${p.name}</h3>
          <p class="product-price">₹${p.price.toLocaleString('en-IN')}</p>
          <div class="cart-controls" data-id="${p.id}"></div>
        </div>
      </div>`;
  },
  /** Show skeleton loading placeholders */
  showSkeletons(containerId, count = 4) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = Array(count).fill('<div class="skeleton skeleton-card"></div>').join('');
  },
};

/* ── GLOBAL EVENT DELEGATION ── */
function bindGlobalEvents() {
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-id], [data-qv], [data-item-id], .remove-item, .modal-close');
    if (!t) return;

    // Add to cart (product grid)
    if (t.matches('.add-to-cart-btn') && t.dataset.id) {
      Cart.add(t.dataset.id);
      return;
    }
    // Qty + (product grid)
    if (t.matches('.qty-plus') && t.dataset.id) {
      Cart.changeQty(t.dataset.id, 1);
      UI.refreshCardControls();
      return;
    }
    // Qty − (product grid)
    if (t.matches('.qty-minus') && t.dataset.id) {
      Cart.changeQty(t.dataset.id, -1);
      UI.refreshCardControls();
      return;
    }
    // Wishlist toggle
    if (t.matches('.wish-btn') && t.dataset.id) {
      Wishlist.toggle(t.dataset.id);
      return;
    }
    // Quick view
    if (t.matches('.quick-view-btn') && t.dataset.qv) {
      QuickView.open(t.dataset.qv);
      return;
    }
    // Cart page: qty buttons
    if (t.matches('.cart-qty-btn[data-item-id]')) {
      const delta = t.dataset.dir === '+' ? 1 : -1;
      Cart.changeQty(t.dataset.itemId, delta);
      return;
    }
    // Cart page: remove
    if (t.matches('.remove-item') && t.dataset.itemId) {
      Cart.remove(t.dataset.itemId);
      return;
    }
  });
}

/* ── DARK MODE ── */
function initDarkMode() {
  if (localStorage.getItem('ss-dark') === '1') document.body.classList.add('dark');
  document.querySelectorAll('.dark-mode-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      localStorage.setItem('ss-dark', document.body.classList.contains('dark') ? '1' : '0');
      btn.querySelector('i').className = document.body.classList.contains('dark')
        ? 'fas fa-sun' : 'fas fa-moon';
    });
    // Set initial icon
    btn.querySelector('i').className = document.body.classList.contains('dark')
      ? 'fas fa-sun' : 'fas fa-moon';
  });
}

/* ── MOBILE MENU ── */
function initMobileMenu() {
  const toggle = document.getElementById('mobile-menu');
  const menu   = document.querySelector('.nav-menu');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    menu.classList.toggle('open');
  });
  // Close on nav link click
  menu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('open');
      menu.classList.remove('open');
    });
  });
}

/* ── NAVBAR SCROLL ── */
function initNavScroll() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ── NAV SEARCH ── */
function initNavSearch() {
  const input = document.querySelector('.nav-search input');
  const btn   = document.querySelector('.nav-search button');
  if (!input) return;
  const doSearch = () => {
    const q = input.value.trim();
    if (q) window.location.href = `products.html?q=${encodeURIComponent(q)}`;
  };
  btn?.addEventListener('click', doSearch);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
}

/* ============================================================
   HOME PAGE
   ============================================================ */
const HomePage = {
  init() {
    UI.showSkeletons('featured-products', 4);
    // Simulate async load (replace with fetch('/api/products') for backend)
    setTimeout(() => {
      const featured = PRODUCTS.slice(0, 4);
      const el = document.getElementById('featured-products');
      if (!el) return;
      el.innerHTML = featured.map(p => UI.cardHTML(p)).join('');
      UI.refreshCardControls();
    }, 400);
  },
};

/* ============================================================
   PRODUCTS PAGE
   ============================================================ */
const ProductsPage = {
  filtered: [...PRODUCTS],
  init() {
    UI.showSkeletons('products-grid', 8);
    // Pre-fill search from URL
    const params = new URLSearchParams(location.search);
    const q   = params.get('q')   || '';
    const cat = params.get('category') || '';

    const catSel  = document.getElementById('categoryFilter');
    const sortSel = document.getElementById('sortFilter');
    if (catSel && cat) catSel.value = cat;

    if (q) {
      const searchInput = document.querySelector('.nav-search input');
      if (searchInput) searchInput.value = q;
    }

    setTimeout(() => {
      this.apply(q, cat, sortSel?.value || '');
    }, 350);

    catSel?.addEventListener('change',  () => this.apply());
    sortSel?.addEventListener('change', () => this.apply());

    // Live search filter
    document.querySelector('.nav-search input')?.addEventListener('input', () => this.apply());
  },
  apply(q, cat, sort) {
    const catSel  = document.getElementById('categoryFilter');
    const sortSel = document.getElementById('sortFilter');
    q    = q    ?? document.querySelector('.nav-search input')?.value.trim().toLowerCase() ?? '';
    cat  = cat  ?? catSel?.value  ?? '';
    sort = sort ?? sortSel?.value ?? '';

    let list = [...PRODUCTS];
    if (q)   list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.includes(q));
    if (cat) list = list.filter(p => p.category === cat);
    if (sort === 'price-low')  list.sort((a, b) => a.price - b.price);
    if (sort === 'price-high') list.sort((a, b) => b.price - a.price);
    if (sort === 'name')       list.sort((a, b) => a.name.localeCompare(b.name));

    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const count = document.getElementById('results-count');
    if (count) count.textContent = `${list.length} product${list.length !== 1 ? 's' : ''}`;

    if (list.length === 0) {
      grid.innerHTML = `<div class="no-results"><i class="fas fa-search"></i><h3>No products found</h3><p>Try a different search or filter.</p></div>`;
      return;
    }

    grid.innerHTML = list.map((p, i) => {
      const card = UI.cardHTML(p);
      // Stagger animation
      return card.replace('product-card"', `product-card" style="animation-delay:${i * 60}ms"`);
    }).join('');
    UI.refreshCardControls();
  },
};

/* ============================================================
   CART PAGE
   ============================================================ */
const CartPage = {
  init() { this.render(); },
  render() {
    const list = document.getElementById('cart-items-list');
    if (!list) return;

    const checkoutBtn = document.getElementById('checkout-btn');

    if (State.cart.length === 0) {
      list.innerHTML = `
        <div class="empty-cart-state">
          <i class="fas fa-shopping-bag empty-icon"></i>
          <h3>Your cart is empty</h3>
          <p>Looks like you haven't added anything yet.</p>
          <a href="products.html" class="cta-button"><i class="fas fa-arrow-left"></i> Continue Shopping</a>
        </div>`;
      if (checkoutBtn) checkoutBtn.style.display = 'none';
    } else {
      list.innerHTML = State.cart.map(item => `
        <div class="cart-item" data-item="${item.id}">
          <img src="${item.image}" class="cart-item-img" alt="${item.name}">
          <div class="cart-item-info">
            <h4>${item.name}</h4>
            <p class="item-price">₹${item.price.toLocaleString('en-IN')}</p>
            <p class="item-subtotal">Subtotal: ₹${(item.price * item.qty).toLocaleString('en-IN')}</p>
          </div>
          <div class="cart-item-qty">
            <button class="cart-qty-btn remove-item" data-item-id="${item.id}" aria-label="Remove">
              <i class="fas fa-trash-alt" style="font-size:.75rem"></i>
            </button>
            <button class="cart-qty-btn" data-item-id="${item.id}" data-dir="-" aria-label="Decrease">−</button>
            <span class="cart-qty-num">${item.qty}</span>
            <button class="cart-qty-btn" data-item-id="${item.id}" data-dir="+" aria-label="Increase">+</button>
          </div>
          <button class="remove-item" data-item-id="${item.id}" aria-label="Remove item" title="Remove">
            <i class="fas fa-times"></i>
          </button>
        </div>`).join('');
      if (checkoutBtn) checkoutBtn.style.display = 'block';
    }

    // Update totals
    const sub   = State.cartSubtotal();
    const total = sub + 50;
    const subEl   = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    if (subEl)   subEl.textContent   = `₹${sub.toLocaleString('en-IN')}`;
    if (totalEl) totalEl.textContent = `₹${total.toLocaleString('en-IN')}`;

    // Free shipping bar
    const fsBar = document.getElementById('free-shipping-bar');
    if (fsBar) {
      const remaining = 999 - sub;
      fsBar.textContent = sub >= 999
        ? '🎉 You qualify for free shipping!'
        : `Add ₹${remaining} more for free shipping`;
      fsBar.style.color = sub >= 999 ? '#22c55e' : '';
    }
  },
};

/* ============================================================
   CHECKOUT PAGE
   ============================================================ */
const CheckoutPage = {
  init() {
    // Populate items
    const itemsEl = document.getElementById('checkout-items');
    if (itemsEl) {
      if (State.cart.length === 0) {
        itemsEl.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem">Your cart is empty. <a href="products.html">Shop now</a></p>';
      } else {
        itemsEl.innerHTML = State.cart.map(i => `
          <div class="checkout-item">
            <img src="${i.image}" alt="${i.name}">
            <div class="checkout-item-info">
              <span>${i.name}</span>
              <small>Qty: ${i.qty}</small>
            </div>
            <strong>₹${(i.price * i.qty).toLocaleString('en-IN')}</strong>
          </div>`).join('');
      }
    }

    // Totals
    const sub   = State.cartSubtotal();
    const total = sub + 50;
    ['checkout-subtotal'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = `₹${sub.toLocaleString('en-IN')}`; });
    ['checkout-total'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = `₹${total.toLocaleString('en-IN')}`; });
    const finalEl = document.getElementById('final-total');
    if (finalEl) finalEl.textContent = total.toLocaleString('en-IN');

    // Form submit
    document.getElementById('checkout-form')?.addEventListener('submit', e => {
      e.preventDefault();
      if (!this.validate()) return;
      this.placeOrder();
    });
  },

  validate() {
    const fields = ['customer-name','customer-phone','customer-address','customer-city','customer-pincode'];
    let valid = true;
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('error');
      if (!el.value.trim()) { el.classList.add('error'); valid = false; }
    });
    if (!valid) Toast.show('Please fill all required fields', '', 'error');
    return valid;
  },

  async placeOrder() {
    const btn = document.querySelector('.place-order-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing Order...';
    }

    try {
      const order = {
        customer: {
          name:    document.getElementById('customer-name').value,
          phone:   document.getElementById('customer-phone').value,
          address: document.getElementById('customer-address').value,
          city:    document.getElementById('customer-city').value,
          pincode: document.getElementById('customer-pincode').value
        },
        items:     State.cart,
        total:     State.cartSubtotal() + 50,
        status:    'pending',
        createdAt: serverTimestamp()
      };

      const saved = await addDoc(
        collection(db, 'orders'),
        order
      );

      const orderEl = document.getElementById('order-id');
      if (orderEl) orderEl.textContent = saved.id;

      const overlay = document.getElementById('success-modal');
      if (overlay) overlay.classList.add('open');
      document.body.style.overflow = 'hidden';

      State.cart = [];
      State.save();
      UI.updateCartCount();

    } catch (error) {
      console.error('Order failed:', error);
      Toast.show('Order failed!', 'Please try again.', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-lock"></i> Place Order';
      }
    }
  },        // ← comma because it's inside CheckoutPage object

};          // ← this closes the CheckoutPage object

/* ── CLOSE SUCCESS MODAL ── */
function closeSuccessModal() {
  document.getElementById('success-modal')
    ?.classList.remove('open');
  document.body.style.overflow = '';
  window.location.href = 'index.html';
}

/* ============================================================
   ROUTER
   ============================================================ */
function initPage() {
  const page = location.pathname.split('/').pop() || 'index.html';
  if (page === '' || page === 'index.html') HomePage.init();
  if (page === 'products.html')             ProductsPage.init();
  if (page === 'cart.html')                 CartPage.init();
  if (page === 'checkout.html')             CheckoutPage.init();
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  State.load();
  Toast.init();
  QuickView.init();
  initDarkMode();
  initMobileMenu();
  initNavScroll();
  initNavSearch();
  bindGlobalEvents();
  UI.updateCartCount();
  initPage();
});
