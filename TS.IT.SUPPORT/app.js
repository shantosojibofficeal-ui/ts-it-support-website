// ---- cart state (persisted in localStorage) ----
function loadCart(){ try{ return JSON.parse(localStorage.getItem('ts_cart')||'{}'); }catch(e){ return {}; } }
function saveCart(c){ localStorage.setItem('ts_cart', JSON.stringify(c)); }
let cart = loadCart();

function money(n){ return '৳' + n.toLocaleString('en-US'); }

// Load payment methods from Firestore and merge with defaults
let paymentMethods = ['bKash','Nagad','Bank transfer','Card'];

async function loadPaymentMethods(){
  try {
    const { db } = await import('./firebase-config.js');
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const snap = await getDocs(collection(db, 'paymentMethods'));
    const active = snap.docs.map(d=>d.data()).filter(m=>m.status==='active');
    if(active.length) paymentMethods = active.map(m=>m.name);
  } catch(e){}
}
loadPaymentMethods();

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
      <div class="sf-product-img">
        ${p.imageUrl ? `<img src="${p.imageUrl}" style="width:100%;height:100%;object-fit:cover;" alt="${p.name}">` : `<svg class="icon" viewBox="0 0 24 24">${p.icon}</svg>`}
      </div>
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

let selectedPay = '';
let payMethodDetail = '';

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

  if(!selectedPay && paymentMethods.length) selectedPay = paymentMethods[0];
  
  foot.innerHTML = `
    <div class="drawer-total"><span>Est. total</span><span>${money(cartTotal())}</span></div>
    <div style="font-family:var(--font-mono);font-size:10px;color:#8592AA;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em;">Pay with</div>
    <div class="pay-methods">
      ${paymentMethods.map(m=>`<span class="pay-chip ${m===selectedPay?'on':''}" onclick="selectPay('${m}')">${m}</span>`).join('')}
    </div>
    <div id="payDetailBox" style="display:none;background:#F2FBF9;border:1px solid #CFE8E5;border-radius:8px;padding:10px 12px;font-size:11.5px;color:#2B4B47;margin-bottom:10px;white-space:pre-line;line-height:1.6;"></div>
    <button class="btn btn-primary" style="width:100%;margin-bottom:9px;" onclick="proceedToCheckout()">Proceed to checkout →</button>
    <p style="font-size:10.5px;color:#8592AA;margin-top:3px;line-height:1.5;">After payment, enter your Transaction ID and upload a screenshot for admin verification.</p>
  `;
  updatePayDetail();
}

function updatePayDetail(){
  const box = document.getElementById('payDetailBox');
  if(!box) return;
  // Try to load detail from Firestore-fetched methods
  const detail = window._cachedPayMethods?.find(m=>m.name===selectedPay)?.detail;
  if(detail){ box.style.display=''; box.textContent=detail; }
  else { box.style.display='none'; }
}

function selectPay(m){ selectedPay = m; renderDrawer(); }

function proceedToCheckout(){
  if(Object.keys(cart).length===0) return;
  const currentUser = window.__tsCurrentUser || null;
  if(!currentUser){
    closeDrawer();
    if(confirm('You need to sign in before placing an order. Go to sign-in page?')){
      location.href = 'login.html?redirect=index.html';
    }
    return;
  }
  // Show payment modal
  openPaymentModal();
}

// ---- Payment Modal ----
function openPaymentModal(){
  let modal = document.getElementById('paymentModal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'paymentModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;';
    document.body.appendChild(modal);
  }
  
  const methodDetail = window._cachedPayMethods?.find(m=>m.name===selectedPay)?.detail || '';
  
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px 26px;width:100%;max-width:440px;max-height:90vh;overflow-y:auto;">
      <div style="font-family:var(--font-mono);font-size:14px;font-weight:700;margin-bottom:4px;">Complete your order</div>
      <div style="font-size:12px;color:#8592AA;margin-bottom:20px;">Total: <b style="color:#101826;">${money(cartTotal())}</b> via <b style="color:#101826;">${selectedPay}</b></div>
      
      ${methodDetail ? `<div style="background:#F2FBF9;border:1px solid #CFE8E5;border-radius:9px;padding:13px 15px;margin-bottom:18px;font-size:12px;color:#2B4B47;white-space:pre-line;line-height:1.65;">
        <div style="font-family:var(--font-mono);font-size:9.5px;color:#6C789A;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Payment instructions</div>
        ${methodDetail}
      </div>` : ''}
      
      <div style="margin-bottom:13px;">
        <label style="display:block;font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#6C789A;margin-bottom:6px;">Transaction ID / Reference number *</label>
        <input type="text" id="txidInput" placeholder="e.g. TXN12345678" style="width:100%;background:#F7F8FA;border:1.5px solid #E2E5EA;border-radius:9px;padding:10px 13px;font-family:var(--font-mono);font-size:13px;color:#101826;outline:none;box-sizing:border-box;">
      </div>
      
      <div style="margin-bottom:18px;">
        <label style="display:block;font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#6C789A;margin-bottom:6px;">Payment screenshot (optional but recommended)</label>
        <div id="ssUploadArea" style="border:2px dashed #E2E5EA;border-radius:9px;padding:20px;text-align:center;cursor:pointer;" onclick="document.getElementById('ssFileInput').click()">
          <div style="font-size:12px;color:#8592AA;">Click to upload screenshot</div>
          <div style="font-family:var(--font-mono);font-size:11px;color:var(--teal);margin-top:4px;" id="ssFileName"></div>
        </div>
        <input type="file" id="ssFileInput" accept="image/*" style="display:none;" onchange="handleSsFile(this)">
      </div>
      
      <div style="display:flex;gap:9px;">
        <button onclick="document.getElementById('paymentModal').remove()" style="flex:1;padding:12px;border-radius:10px;border:1.5px solid #E2E5EA;background:#fff;font-family:var(--font-sans);font-size:13px;font-weight:600;cursor:pointer;">Cancel</button>
        <button id="placeOrderBtn" onclick="placeOrder()" style="flex:2;padding:12px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--teal),var(--teal-d));color:#fff;font-family:var(--font-sans);font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 8px 20px rgba(14,143,130,.28);">Place order</button>
      </div>
    </div>`;
}

let screenshotFile = null;
window.handleSsFile = function(input){
  screenshotFile = input.files[0];
  if(screenshotFile){
    document.getElementById('ssFileName').textContent = '📎 ' + screenshotFile.name;
    document.getElementById('ssUploadArea').style.borderColor = 'var(--teal)';
  }
};

async function placeOrder(){
  const txid = document.getElementById('txidInput')?.value?.trim();
  if(!txid){ alert('Please enter your Transaction ID.'); return; }
  
  const btn = document.getElementById('placeOrderBtn');
  btn.disabled=true; btn.textContent='Placing order…';
  
  const currentUser = window.__tsCurrentUser;
  if(!currentUser){ location.href='login.html'; return; }
  
  let screenshotUrl = null;
  
  // Upload screenshot if provided
  if(screenshotFile){
    try {
      const { storage } = await import('./firebase-config.js');
      const { ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js');
      const orderId_temp = 'TS-' + Math.floor(10000 + Math.random()*89999);
      const storageRef = ref(storage, `payments/${currentUser.uid}/${orderId_temp}_${screenshotFile.name}`);
      await uploadBytes(storageRef, screenshotFile);
      screenshotUrl = await getDownloadURL(storageRef);
    } catch(e){ console.error('Screenshot upload error:', e); }
  }
  
  // Save order to Firestore
  try {
    const { db } = await import('./firebase-config.js');
    const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const orderId = 'TS-' + Math.floor(10000 + Math.random()*89999);
    const orderData = {
      id: orderId,
      total: cartTotal(),
      status: 'Pending Verification',
      method: selectedPay,
      date: new Date().toLocaleDateString(),
      uid: currentUser.uid,
      customerName: currentUser.displayName || '',
      customerEmail: currentUser.email || '',
      txid,
      screenshotUrl,
      items: Object.entries(cart).map(([id,qty])=>({id,qty})),
      createdAt: new Date().toISOString(),
    };
    await addDoc(collection(db, 'orders'), orderData);
    
    // Also store in user's own orders subcollection
    await addDoc(collection(db, 'users', currentUser.uid, 'orders'), orderData);
    
    cart = {};
    saveCart(cart);
    updateCartBadge();
    screenshotFile = null;
    document.getElementById('paymentModal')?.remove();
    closeDrawer();
    showToast('Order #' + orderId + ' placed — pending verification');
    setTimeout(()=>{ if(confirm('Order #'+orderId+' placed! Go to Mailbox to track it?')){ location.href='mailbox.html'; }}, 300);
  } catch(e){
    btn.disabled=false; btn.textContent='Place order';
    alert('Error placing order: ' + e.message);
  }
}
window.placeOrder = placeOrder;

function showToast(msg){
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 2600);
}

function openDrawer(){ document.getElementById('drawer').classList.add('show'); document.getElementById('overlay').classList.add('show'); renderDrawer(); }
function closeDrawer(){ document.getElementById('drawer').classList.remove('show'); document.getElementById('overlay').classList.remove('show'); }

// Load products from Firestore (overrides static products.js)
async function loadProductsFromFirestore(){
  try {
    const { db } = await import('./firebase-config.js');
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const snap = await getDocs(collection(db, 'products'));
    if(!snap.empty){
      window.PRODUCTS = snap.docs.map(d=>({...d.data()}));
    }
    // Load payment methods
    const pmSnap = await getDocs(collection(db, 'paymentMethods'));
    const active = pmSnap.docs.map(d=>d.data()).filter(m=>m.status==='active');
    window._cachedPayMethods = pmSnap.docs.map(d=>d.data());
    if(active.length) paymentMethods = active.map(m=>m.name);
  } catch(e){}
  renderProducts('all');
  updateCartBadge();
}

document.addEventListener('DOMContentLoaded', ()=>{
  renderProducts('all');
  updateCartBadge();
  loadProductsFromFirestore();
  
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
