// ---- cart state (persisted in localStorage so it survives page navigation) ----
function loadCart(){ try{ return JSON.parse(localStorage.getItem('ts_cart')||'{}'); }catch(e){ return {}; } }
function saveCart(c){ localStorage.setItem('ts_cart', JSON.stringify(c)); }
let cart = loadCart();

function money(n){ return '৳' + n.toLocaleString('en-US'); }

function renderProducts(filter){
  const grid = document.getElementById('prodGrid');
  const heading = document.getElementById('prodHeading');
  const clear = document.getElementById('clearFilter');
  if(!grid) return;
  const list = (!filter || filter==='all') ? PRODUCTS : PRODUCTS.filter(p=>p.cat===filter);
  heading.textContent = (!filter || filter==='all') ? 'Featured products' : filter;
  clear.style.display = (!filter || filter==='all') ? 'none' : 'inline';
  document.querySelectorAll('.sf-cat').forEach(c=>c.classList.toggle('active', c.dataset.cat===filter));
  grid.innerHTML = list.map(p=>`
    <div class="sf-product">
      <div class="sf-product-img"><svg class="icon" viewBox="0 0 24 24">${p.icon}</svg></div>
      <div class="sf-product-body">
        <h5>${p.name}</h5>
        <div class="spec">${p.spec}</div>
        <div class="sf-product-foot">
          <span class="price">${money(p.price)}</span>
          <span class="pill ${p.stock==='in'?'pill-in':'pill-low'}">${p.stock==='in'?'IN STOCK':'LOW STOCK: '+p.stockNum}</span>
        </div>
        <button class="add-btn" onclick="addToCart('${p.id}')">
          <svg class="icon" viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2 3h2l2.6 12.6a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 7H6"/></svg>
          Add to cart
        </button>
      </div>
    </div>`).join('');
}
function filterCat(cat){ renderProducts(cat); document.getElementById('products').scrollIntoView({behavior:'smooth'}); }

function addToCart(id){
  cart[id] = (cart[id]||0) + 1;
  saveCart(cart);
  updateCartBadge();
  showToast('Added to cart — ' + PRODUCTS.find(p=>p.id===id).name);
}
function changeQty(id, delta){
  cart[id] = (cart[id]||0) + delta;
  if(cart[id] <= 0) delete cart[id];
  saveCart(cart);
  updateCartBadge();
  renderDrawer();
}
function removeItem(id){
  delete cart[id];
  saveCart(cart);
  updateCartBadge();
  renderDrawer();
}
function cartCount(){ return Object.values(cart).reduce((a,b)=>a+b,0); }
function cartTotal(){ return Object.entries(cart).reduce((sum,[id,qty])=>{ const p=PRODUCTS.find(p=>p.id===id); return sum + (p?p.price*qty:0); },0); }

function updateCartBadge(){
  const badge = document.getElementById('cartBadge');
  if(!badge) return;
  const n = cartCount();
  badge.textContent = n;
  badge.style.display = n>0 ? 'flex' : 'none';
}

let selectedPay = 'bKash';
function renderDrawer(){
  const body = document.getElementById('drawerBody');
  const foot = document.getElementById('drawerFoot');
  if(!body) return;
  const entries = Object.entries(cart);
  if(entries.length===0){
    body.innerHTML = '<div class="drawer-empty">Your cart is empty.<br>Add some hardware to get a quote.</div>';
    foot.innerHTML = '';
    return;
  }
  body.innerHTML = entries.map(([id,qty])=>{
    const p = PRODUCTS.find(p=>p.id===id);
    if(!p) return '';
    return `<div class="cart-row">
      <div class="cart-row-ic"><svg class="icon" viewBox="0 0 24 24">${p.icon}</svg></div>
      <div class="cart-row-info">
        <h6>${p.name}</h6>
        <span>${money(p.price)} each</span>
        <div class="cart-qty">
          <button onclick="changeQty('${id}',-1)">−</button>${qty}<button onclick="changeQty('${id}',1)">+</button>
        </div>
      </div>
      <div style="text-align:right;">
        <div class="price">${money(p.price*qty)}</div>
        <button class="cart-remove" onclick="removeItem('${id}')">Remove</button>
      </div>
    </div>`;
  }).join('');

  foot.innerHTML = `
    <div class="drawer-total"><span>Est. total</span><span>${money(cartTotal())}</span></div>
    <div style="font-family:var(--font-mono);font-size:10px;color:#8592AA;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em;">Pay with</div>
    <div class="pay-methods">
      ${['bKash','Nagad','Bank transfer','Card'].map(m=>`<span class="pay-chip ${m===selectedPay?'on':''}" onclick="selectPay('${m}')">${m}</span>`).join('')}
    </div>
    <button class="btn btn-primary" style="width:100%;" onclick="checkout()">Place order — Pending Verification</button>
    <p style="font-size:10.5px;color:#8592AA;margin-top:9px;line-height:1.5;">Order status stays <b>Pending Verification</b> until admin confirms your ${selectedPay} / bank reference. You'll get the confirmation in your account's <b>Mailbox</b>.</p>
  `;
}
function selectPay(m){ selectedPay = m; renderDrawer(); }

function checkout(){
  if(Object.keys(cart).length===0) return;

  // Check if user is logged in via Firebase
  const currentUser = window.__tsCurrentUser || null;
  if(!currentUser){
    closeDrawer();
    if(confirm('You need to sign in before placing an order. Go to sign-in page?')){
      location.href = 'login.html?redirect=index.html';
    }
    return;
  }

  const orderId = 'TS-' + Math.floor(10000 + Math.random()*89999);
  const orderKey = 'ts_orders_' + currentUser.uid;
  const orders = JSON.parse(localStorage.getItem(orderKey)||'[]');
  orders.unshift({
    id: orderId,
    total: cartTotal(),
    status: 'Pending Verification',
    method: selectedPay,
    date: new Date().toLocaleDateString(),
    uid: currentUser.uid
  });
  localStorage.setItem(orderKey, JSON.stringify(orders));
  cart = {};
  saveCart(cart);
  updateCartBadge();
  renderDrawer();
  closeDrawer();
  showToast('Order #' + orderId + ' placed — pending verification');
  setTimeout(()=>{ if(confirm('Order #'+orderId+' placed. Go to My Account → Mailbox to track it?')){ location.href='mailbox.html'; } }, 300);
}

function showToast(msg){
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 2600);
}

function openDrawer(){ document.getElementById('drawer').classList.add('show'); document.getElementById('overlay').classList.add('show'); renderDrawer(); }
function closeDrawer(){ document.getElementById('drawer').classList.remove('show'); document.getElementById('overlay').classList.remove('show'); }

document.addEventListener('DOMContentLoaded', ()=>{
  renderProducts('all');
  updateCartBadge();
  const cartBtn = document.getElementById('cartBtn');
  if(cartBtn) cartBtn.addEventListener('click', openDrawer);
  const closeBtn = document.getElementById('drawerClose');
  if(closeBtn) closeBtn.addEventListener('click', closeDrawer);
  const overlay = document.getElementById('overlay');
  if(overlay) overlay.addEventListener('click', closeDrawer);
  document.querySelectorAll('.sf-cat').forEach(c=>{
    c.addEventListener('click', ()=>filterCat(c.dataset.cat));
  });
});
