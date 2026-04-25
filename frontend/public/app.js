/* ═══════════════════════════════════════════════════
   Style Shop – app.js  v2.0  (MongoDB Edition)
   Role-based SPA: manager / cashier / stock_clerk
═══════════════════════════════════════════════════ */

const PER_PAGE = 10;

// ── State ──────────────────────────────────────────
const state = {
  token:              localStorage.getItem('ss_token') || '',
  user:               JSON.parse(localStorage.getItem('ss_user') || 'null'),
  currentPage:        'dashboard',
  cart:               [],
  charts:             {},
  pagination:         { inv: 1, orders: 1, sales: 1 },
  ordersStatusFilter: '',
  products:           [],
  suppliers:          [],
  notifPollTimer:     null,
};

// ── API helper ─────────────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + state.token,
      ...(opts.headers || {}),
    },
    ...opts,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ── Formatters ─────────────────────────────────────
function fmt(n)    { return '$' + (parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(d){ return d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'; }
function fmtTime(d){ return d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''; }
function statusBadge(s){ return `<span class="status-badge ${s}">${s}</span>`; }
function hasRole(...roles){ return roles.includes(state.user?.role); }

// ── Toast ──────────────────────────────────────────
function showToast(msg, ok = true) {
  const t = document.getElementById('toast');
  t.textContent = (ok ? '✅ ' : '❌ ') + msg;
  t.style.borderColor = ok ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ══════════════════════════════════════════════════
const App = {

  // ── Boot ──────────────────────────────────────
  init() {
    document.getElementById('dateChip').textContent =
      new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    if (state.token && state.user) {
      this.showShell();
      this.applyRoleUI();
      this.navigate('dashboard');
      this.startNotifPolling();
    }
  },

  showShell() {
    document.getElementById('page-login').classList.remove('active');
    document.getElementById('app-shell').classList.add('active');
    const u = state.user;
    document.getElementById('sbAvatar').textContent   = (u?.name || 'U')[0].toUpperCase();
    document.getElementById('sbUserName').textContent  = u?.name  || 'User';
    document.getElementById('sbUserRole').textContent  = u?.role  || '';
  },

  // ── Role-based sidebar / UI visibility ─────────
  applyRoleUI() {
    const role = state.user?.role;

    // Sidebar links visibility
    const rules = {
      dashboard: ['manager','cashier','stock_clerk'],
      sales:     ['manager','cashier'],
      inventory: ['manager','stock_clerk'],
      orders:    ['manager','cashier','stock_clerk'],
      suppliers: ['manager'],
      reports:   ['manager'],
      employees: ['manager'],
    };

    document.querySelectorAll('.sb-link[data-page]').forEach(link => {
      const page  = link.dataset.page;
      const allowed = rules[page] || [];
      link.style.display = allowed.includes(role) ? '' : 'none';
    });

    // Inventory add-product button – only manager + stock_clerk
    const addProdBtn = document.getElementById('addProductBtn');
    if (addProdBtn) addProdBtn.style.display = hasRole('manager','stock_clerk') ? '' : 'none';

    // Suppliers add button – manager only
    const addSupBtn = document.getElementById('addSupplierBtn');
    if (addSupBtn) addSupBtn.style.display = hasRole('manager') ? '' : 'none';

    // New Sale button – cashier + manager
    const newSaleBtn = document.getElementById('newSaleBtn');
    if (newSaleBtn) newSaleBtn.style.display = hasRole('manager','cashier') ? '' : 'none';
  },

  // ── Auth ──────────────────────────────────────
  async handleLogin() {
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn      = document.getElementById('loginBtn');
    if (!email || !password) { showToast('Please fill all fields', false); return; }
    btn.textContent = 'Signing in…'; btn.disabled = true;
    try {
      const data = await api('/auth/login', { method: 'POST', body: { email, password } });
      state.token = data.token;
      state.user  = data.user;
      localStorage.setItem('ss_token', data.token);
      localStorage.setItem('ss_user', JSON.stringify(data.user));
      showToast('Welcome back, ' + data.user.name + '!');
      setTimeout(() => {
        this.showShell();
        this.applyRoleUI();
        this.navigate('dashboard');
        this.startNotifPolling();
      }, 600);
    } catch (e) {
      showToast(e.message || 'Login failed', false);
      btn.textContent = 'دخول'; btn.disabled = false;
    }
  },

  quickLogin(email, pass) {
    document.getElementById('loginEmail').value    = email;
    document.getElementById('loginPassword').value = pass;
    this.handleLogin();
  },

  logout() {
    clearInterval(state.notifPollTimer);
    state.token = ''; state.user = null;
    localStorage.removeItem('ss_token'); localStorage.removeItem('ss_user');
    document.getElementById('app-shell').classList.remove('active');
    document.getElementById('page-login').classList.add('active');
    showToast('Logged out successfully');
  },

  togglePwd() {
    const inp  = document.getElementById('loginPassword');
    const icon = document.getElementById('eyeIcon');
    if (inp.type === 'password') {
      inp.type = 'text';
      icon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>`;
    } else {
      inp.type = 'password';
      icon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
    }
  },

  // ── Navigation ────────────────────────────────
  navigate(page) {
    state.currentPage = page;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
    const view = document.getElementById('view-' + page);
    if (view) view.classList.add('active');
    const link = document.querySelector(`.sb-link[data-page="${page}"]`);
    if (link) link.classList.add('active');
    const titles = {
      dashboard: ['Dashboard','Welcome back 👋'],
      sales:     ['Sales Management','Track and manage transactions'],
      inventory: ['Inventory','Manage your stock'],
      orders:    ['Orders Management','Track all orders'],
      suppliers: ['Suppliers','Manage supplier relationships'],
      reports:   ['Reports & Analytics','Business performance overview'],
      employees: ['Employees','Manage your team'],
    };
    const [t, s] = titles[page] || [page, ''];
    document.getElementById('topbarTitle').textContent = t;
    document.getElementById('topbarSub').textContent   = s;
    this.closeSidebar();
    this['load_' + page]?.();
  },

  openSidebar()  { document.getElementById('sidebar').classList.add('open');   document.getElementById('overlay').classList.add('show'); },
  closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('show'); },

  // ── Notifications ─────────────────────────────
  startNotifPolling() {
    this.pollNotifications();
    state.notifPollTimer = setInterval(() => this.pollNotifications(), 30000);
  },

  async pollNotifications() {
    try {
      const { unread, data } = await api('/notifications');
      const dot  = document.getElementById('notifDot');
      const cnt  = document.getElementById('notifCount');
      if (dot)  dot.style.display  = unread > 0 ? '' : 'none';
      if (cnt)  cnt.textContent    = unread > 0 ? unread : '';
      state.notifications = data || [];
    } catch {}
  },

  toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (!panel) return;
    const isOpen = panel.classList.contains('show');
    if (isOpen) { panel.classList.remove('show'); return; }
    this.renderNotifPanel();
    panel.classList.add('show');
  },

  renderNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (!panel) return;
    const notifs = state.notifications || [];
    panel.innerHTML = `
      <div class="notif-header">
        <span>Notifications</span>
        <button onclick="App.markAllRead()" style="background:none;border:none;color:var(--accent);font-size:0.75rem;cursor:pointer;">Mark all read</button>
      </div>
      <div class="notif-list">
        ${notifs.length ? notifs.slice(0,15).map(n => `
          <div class="notif-item ${n.is_read ? 'read' : 'unread'}" onclick="App.readNotif('${n._id}',this)">
            <div class="notif-title">${n.title}</div>
            <div class="notif-msg">${n.message}</div>
            <div class="notif-time">${fmtDate(n.createdAt)} ${fmtTime(n.createdAt)}</div>
          </div>`).join('') : '<div class="notif-empty">No notifications</div>'}
      </div>`;
  },

  async readNotif(id, el) {
    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      el?.classList.replace('unread','read');
      await this.pollNotifications();
    } catch {}
  },

  async markAllRead() {
    try {
      await api('/notifications/read-all', { method: 'PATCH' });
      await this.pollNotifications();
      this.renderNotifPanel();
    } catch {}
  },

  // ══════════════════════════════════════════════
  //  DASHBOARD
  // ══════════════════════════════════════════════
  async load_dashboard() {
    try {
      const { data } = await api('/reports/dashboard');
      document.getElementById('stat-revenue').textContent       = fmt(data.today?.total_revenue || 0);
      document.getElementById('stat-orders-today').textContent  = (data.today?.total_orders || 0) + ' orders today';
      document.getElementById('stat-products').textContent      = data.products || 0;
      document.getElementById('stat-lowstock').textContent      = (data.lowStock || 0) + ' low stock alerts';
      document.getElementById('stat-total-orders').textContent  = (data.recentOrders?.length || 0);
      document.getElementById('stat-total-revenue').textContent = fmt(data.allTime?.total || 0);

      const tbody = document.getElementById('recentOrdersTable');
      tbody.innerHTML = (data.recentOrders || []).map(o => `
        <tr>
          <td>#${String(o.order_id).slice(-6)}</td>
          <td>${o.first_name ? o.first_name + ' ' + o.last_name : 'Walk-in'}</td>
          <td>${fmt(o.final_amount)}</td>
          <td>${o.payment_method}</td>
          <td>${statusBadge(o.status)}</td>
          <td>${fmtDate(o.order_date)}</td>
        </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">No orders yet</td></tr>';

      // low stock badge
      const badge = document.getElementById('lowStockBadge');
      if (data.lowStock > 0) { badge.textContent = data.lowStock; badge.style.display = ''; }
      else badge.style.display = 'none';

      const lsSub = document.getElementById('lowStockSub');
      lsSub.textContent = (data.lowStock || 0) + ' items need reordering';

      // charts
      this._drawLineChart('lineChart', data.monthlySales || []);
      this._drawDonutChart('donutChart', data.categoryPerf || []);

      // low stock list
      const lsList = document.getElementById('lowStockList');
      try {
        const ls = await api('/products?low_stock=true');
        lsList.innerHTML = (ls.data || []).slice(0, 5).map(p => `
          <div class="low-stock-item">
            <div class="ls-icon">👕</div>
            <div><div class="ls-name">${p.name}</div><div class="ls-cat">${p.category || '—'}</div></div>
            <div class="ls-qty ${p.stock_quantity === 0 ? 'out' : 'low'}">${p.stock_quantity} left</div>
          </div>`).join('') || '<div style="padding:16px 22px;color:var(--muted);font-size:0.8rem;">No low stock items</div>';
      } catch { lsList.innerHTML = ''; }

      // best sellers
      const tpList = document.getElementById('topProductsList');
      try {
        const bs = await api('/reports/best-sellers');
        const maxSold = (bs.data || [])[0]?.total_sold || 1;
        tpList.innerHTML = (bs.data || []).slice(0, 5).map((p, i) => `
          <div class="top-prod">
            <div class="tp-rank">${i + 1}</div>
            <div><div class="tp-name">${p.name}</div><div class="tp-cat">${p.total_sold} sold</div></div>
            <div class="tp-bar-wrap">
              <div class="tp-bar"><div class="tp-fill" style="width:${Math.round(p.total_sold / maxSold * 100)}%"></div></div>
              <div class="tp-val">${Math.round(p.total_sold / maxSold * 100)}%</div>
            </div>
          </div>`).join('') || '<div style="padding:16px 22px;color:var(--muted);font-size:0.8rem;">No sales data yet</div>';
      } catch { tpList.innerHTML = ''; }

    } catch (e) { showToast(e.message, false); }
  },

  _drawLineChart(id, monthlySales) {
    const ctx = document.getElementById(id)?.getContext('2d');
    if (!ctx) return;
    if (state.charts[id]) { state.charts[id].destroy(); delete state.charts[id]; }
    const grad = ctx.createLinearGradient(0, 0, 0, 220);
    grad.addColorStop(0, 'rgba(168,85,247,0.3)');
    grad.addColorStop(1, 'rgba(168,85,247,0)');
    state.charts[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: monthlySales.map(m => m.month),
        datasets: [{ label: 'Revenue', data: monthlySales.map(m => parseFloat(m.revenue)), borderColor: '#A855F7', backgroundColor: grad, borderWidth: 2.5, tension: 0.4, fill: true, pointBackgroundColor: '#A855F7', pointBorderColor: '#1a1a24', pointBorderWidth: 2, pointRadius: 5 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#808098', font: { family: 'Sora', size: 11 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#808098', font: { family: 'Sora', size: 11 }, callback: v => '$' + (v/1000).toFixed(0) + 'k' } } } }
    });
  },

  _drawDonutChart(id, categoryPerf) {
    const ctx = document.getElementById(id)?.getContext('2d');
    if (!ctx) return;
    if (state.charts[id]) { state.charts[id].destroy(); delete state.charts[id]; }
    if (!categoryPerf.length) return;
    state.charts[id] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categoryPerf.map(c => c.category),
        datasets: [{ data: categoryPerf.map(c => parseFloat(c.revenue)), backgroundColor: ['#A855F7','#EC4899','#60a5fa','#fb923c','#4ade80'], borderWidth: 0, hoverOffset: 6 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#808098', font: { family: 'Sora', size: 11 }, padding: 16, usePointStyle: true } } } }
    });
  },

  // ══════════════════════════════════════════════
  //  INVENTORY
  // ══════════════════════════════════════════════
  async load_inventory() {
    await this.loadProducts();
    try {
      const inv = await api('/reports/inventory');
      document.getElementById('invTotalItems').textContent    = inv.summary?.total_items    || 0;
      document.getElementById('invTotalProducts').textContent = inv.summary?.total_products || 0;
      document.getElementById('invTotalValue').textContent    = fmt(inv.summary?.total_value || 0);
      const low = (inv.data || []).filter(p => p.stock_quantity < p.low_stock_threshold).length;
      document.getElementById('invLowStock').textContent = low;
    } catch {}
    await this._fillCategoryDropdown();
    await this._fillSupplierDropdown();
  },

  async _fillCategoryDropdown() {
    try {
      const { data } = await api('/products');
      const cats = [...new Set(data.map(p => p.category).filter(Boolean))];
      const sel  = document.getElementById('invCategory');
      if (sel) sel.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
    } catch {}
  },

  async _fillSupplierDropdown() {
    try {
      const { data } = await api('/suppliers');
      state.suppliers = data;
      const sel = document.getElementById('f-supplier');
      if (sel) sel.innerHTML = '<option value="">— Select Supplier —</option>' + data.map(s => `<option value="${s._id}">${s.name}</option>`).join('');
    } catch {}
  },

  async loadProducts() {
    const search   = document.getElementById('invSearch')?.value   || '';
    const category = document.getElementById('invCategory')?.value || '';
    const lowStock = document.getElementById('invStockFilter')?.value || '';
    try {
      const params = new URLSearchParams();
      if (search)   params.set('search', search);
      if (category) params.set('category', category);
      if (lowStock) params.set('low_stock', lowStock);
      const { data } = await api('/products?' + params.toString());
      state.products = data;
      const page  = state.pagination.inv;
      const paged = data.slice((page - 1) * PER_PAGE, page * PER_PAGE);
      const canEdit = hasRole('manager','stock_clerk');
      document.getElementById('invTable').innerHTML = paged.map(p => {
        const stock = p.stock_quantity <= 0 ? 'out' : p.stock_quantity < (p.low_stock_threshold || 5) ? 'low' : 'ok';
        const label = stock === 'out' ? 'Out of Stock' : stock === 'low' ? 'Low Stock' : 'In Stock';
        return `<tr>
          <td>${p.sku}</td>
          <td>${p.name}</td>
          <td>${p.category || '—'}</td>
          <td>${p.size  || '—'}</td>
          <td>${p.color || '—'}</td>
          <td>${p.stock_quantity}</td>
          <td>${fmt(p.price)}</td>
          <td>${p.supplier?.name || p.supplier_name || '—'}</td>
          <td><span class="stock-badge ${stock}">${label}</span></td>
          <td class="action-group">
            ${canEdit ? `<button class="icon-btn" onclick="App.editProduct('${p._id}')">Edit</button>` : ''}
            ${hasRole('manager') ? `<button class="icon-btn del" onclick="App.deleteProduct('${p._id}')">Del</button>` : ''}
          </td>
        </tr>`;
      }).join('') || '<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:24px">No products found</td></tr>';
      this._renderPagination('inv', data.length, page);
    } catch (e) { showToast(e.message, false); }
  },

  _renderPagination(key, total, currentPage) {
    const pages  = Math.ceil(total / PER_PAGE) || 1;
    const infoEl = document.getElementById(key + 'PagInfo');
    const btnsEl = document.getElementById(key + 'PagBtns');
    if (!infoEl || !btnsEl) return;
    const from = total ? (currentPage - 1) * PER_PAGE + 1 : 0;
    const to   = Math.min(currentPage * PER_PAGE, total);
    infoEl.textContent = total ? `Showing ${from}–${to} of ${total}` : 'No results';
    const start = Math.max(1, currentPage - 2);
    const end   = Math.min(pages, start + 4);
    btnsEl.innerHTML = Array.from({ length: end - start + 1 }, (_, i) => {
      const p = start + i;
      return `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="App._goPage('${key}',${p})">${p}</button>`;
    }).join('');
  },

  _goPage(key, page) {
    state.pagination[key] = page;
    if (key === 'inv')    this.loadProducts();
    if (key === 'orders') this.loadOrdersPage();
    if (key === 'sales')  this.loadOrders();
  },

  openProductModal(reset = true) {
    if (reset) {
      document.getElementById('productModalTitle').textContent = 'Add New Product';
      document.getElementById('productId').value = '';
      ['f-name','f-sku','f-category','f-size','f-color','f-qty','f-price','f-cost','f-threshold'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      if (document.getElementById('f-supplier')) document.getElementById('f-supplier').value = '';
    }
    this._fillSupplierDropdown();
    document.getElementById('productModal').classList.add('show');
  },

  closeProductModal() { document.getElementById('productModal').classList.remove('show'); },

  async editProduct(id) {
    try {
      await this._fillSupplierDropdown();
      const { data } = await api('/products/' + id);
      document.getElementById('productModalTitle').textContent = 'Edit Product';
      document.getElementById('productId').value    = data._id;
      document.getElementById('f-name').value       = data.name             || '';
      document.getElementById('f-sku').value        = data.sku              || '';
      document.getElementById('f-category').value   = data.category         || '';
      document.getElementById('f-size').value       = data.size             || '';
      document.getElementById('f-color').value      = data.color            || '';
      document.getElementById('f-qty').value        = data.stock_quantity   ?? 0;
      document.getElementById('f-price').value      = data.price            || '';
      document.getElementById('f-cost').value       = data.cost_price       || '';
      document.getElementById('f-threshold').value  = data.low_stock_threshold ?? 5;
      const supSel = document.getElementById('f-supplier');
      if (supSel) supSel.value = data.supplier_id?._id || data.supplier_id || '';
      this.openProductModal(false);
    } catch (e) { showToast(e.message, false); }
  },

  async saveProduct() {
    const id   = document.getElementById('productId').value;
    const body = {
      name:                document.getElementById('f-name').value,
      sku:                 document.getElementById('f-sku').value,
      category:            document.getElementById('f-category').value,
      size:                document.getElementById('f-size').value,
      color:               document.getElementById('f-color').value,
      stock_quantity:      parseInt(document.getElementById('f-qty').value)       || 0,
      price:               parseFloat(document.getElementById('f-price').value)   || 0,
      cost_price:          parseFloat(document.getElementById('f-cost').value)    || 0,
      low_stock_threshold: parseInt(document.getElementById('f-threshold').value) || 5,
      supplier_id:         document.getElementById('f-supplier').value            || null,
    };
    if (!body.name || !body.sku || !body.price) { showToast('Name, SKU and Price are required', false); return; }
    try {
      if (id) { await api('/products/' + id, { method: 'PUT', body }); showToast('Product updated!'); }
      else    { await api('/products',       { method: 'POST', body }); showToast('Product created!'); }
      this.closeProductModal();
      this.load_inventory();
    } catch (e) { showToast(e.message, false); }
  },

  async deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    try {
      await api('/products/' + id, { method: 'DELETE' });
      showToast('Product deleted');
      this.load_inventory();
    } catch (e) { showToast(e.message, false); }
  },

  // ══════════════════════════════════════════════
  //  SALES
  // ══════════════════════════════════════════════
  async load_sales() {
    try {
      const { data } = await api('/reports/dashboard');
      document.getElementById('salesToday').textContent       = fmt(data.today?.total_revenue  || 0);
      document.getElementById('salesTodayOrders').textContent = (data.today?.total_orders || 0) + ' orders today';
      document.getElementById('salesAllTime').textContent     = fmt(data.allTime?.total || 0);
    } catch {}
    await this.loadOrders();
    try {
      const { data } = await api('/products');
      state.products = data;
    } catch {}
  },

  async loadOrders() {
    const search = document.getElementById('salesSearch')?.value || '';
    const status = document.getElementById('salesStatus')?.value || '';
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const { data } = await api('/orders?' + params.toString());
      document.getElementById('salesOrderCount').textContent = data.length;
      const page  = state.pagination.sales;
      const paged = data.slice((page - 1) * PER_PAGE, page * PER_PAGE);
      document.getElementById('salesTable').innerHTML = paged.map(o => `
        <tr>
          <td>#${String(o.order_id || o._id).slice(-6)}</td>
          <td>${fmtDate(o.order_date)}</td>
          <td>${o.first_name ? o.first_name + ' ' + o.last_name : 'Walk-in'}</td>
          <td>${fmt(o.final_amount)}</td>
          <td>${o.payment_method}</td>
          <td>${statusBadge(o.status)}</td>
          <td class="action-group">
            <button class="icon-btn" onclick="App.viewOrder('${o.order_id || o._id}')">View</button>
            ${o.status === 'pending' && hasRole('manager','cashier') ? `<button class="icon-btn" onclick="App.completeOrder('${o.order_id || o._id}')">Complete</button>` : ''}
            ${o.status === 'pending' && hasRole('manager','cashier') ? `<button class="icon-btn del" onclick="App.cancelOrder('${o.order_id || o._id}')">Cancel</button>` : ''}
          </td>
        </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">No orders found</td></tr>';
      this._renderPagination('sales', data.length, page);
    } catch (e) { showToast(e.message, false); }
  },

  // ══════════════════════════════════════════════
  //  ORDERS
  // ══════════════════════════════════════════════
  async load_orders() {
    await this.loadOrdersPage();
    try {
      const { data: all } = await api('/orders');
      document.getElementById('ordTotal').textContent     = all.length;
      document.getElementById('ordPending').textContent   = all.filter(o => o.status === 'pending').length;
      document.getElementById('ordCompleted').textContent = all.filter(o => o.status === 'completed').length;
      document.getElementById('ordCancelled').textContent = all.filter(o => o.status === 'cancelled').length;
      const rev = all.filter(o => o.status === 'completed').reduce((s, o) => s + parseFloat(o.final_amount || 0), 0);
      document.getElementById('ordRevenue').textContent = fmt(rev);
    } catch {}
  },

  async loadOrdersPage() {
    const search = document.getElementById('ordersSearch')?.value || '';
    const status = state.ordersStatusFilter;
    const from   = document.getElementById('ordFrom')?.value || '';
    const to     = document.getElementById('ordTo')?.value   || '';
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (from)   params.set('from', from);
      if (to)     params.set('to', to);
      const { data } = await api('/orders?' + params.toString());
      const page  = state.pagination.orders;
      const paged = data.slice((page - 1) * PER_PAGE, page * PER_PAGE);
      document.getElementById('ordersTable').innerHTML = paged.map(o => `
        <tr>
          <td>#${String(o.order_id || o._id).slice(-6)}</td>
          <td>${fmtDate(o.order_date)}</td>
          <td>${o.first_name ? o.first_name + ' ' + o.last_name : 'Walk-in'}</td>
          <td>${fmt(o.final_amount)}</td>
          <td>${o.payment_method}</td>
          <td>${statusBadge(o.status)}</td>
          <td class="action-group">
            <button class="icon-btn" onclick="App.viewOrder('${o.order_id || o._id}')">View</button>
            ${o.status === 'pending' && hasRole('manager','cashier') ? `<button class="icon-btn" onclick="App.completeOrder('${o.order_id || o._id}')">Complete</button>` : ''}
            ${o.status === 'pending' && hasRole('manager','cashier') ? `<button class="icon-btn del" onclick="App.cancelOrder('${o.order_id || o._id}')">Cancel</button>` : ''}
          </td>
        </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">No orders found</td></tr>';
      this._renderPagination('orders', data.length, page);
    } catch (e) { showToast(e.message, false); }
  },

  filterOrdersTab(btn, status) {
    state.ordersStatusFilter = status;
    document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.pagination.orders = 1;
    this.loadOrdersPage();
  },

  async viewOrder(id) {
    try {
      const { data } = await api('/orders/' + id);
      const items = (data.items || []).map(i =>
        `  • ${i.product?.name || 'Item'} x${i.quantity} @ ${fmt(i.unit_price)} = ${fmt(i.total_price)}`
      ).join('\n');
      alert(
        `Order #${String(data._id).slice(-6)}\n` +
        `Status: ${data.status}\n` +
        `Customer: ${data.customer_id?.first_name ? data.customer_id.first_name + ' ' + data.customer_id.last_name : 'Walk-in'}\n` +
        `Payment: ${data.payment_method}\n` +
        `Discount: ${fmt(data.discount)}\n` +
        `Total: ${fmt(data.final_amount)}\n\nItems:\n${items || 'No items'}`
      );
    } catch (e) { showToast(e.message, false); }
  },

  async completeOrder(id) {
    if (!confirm('Mark as completed?')) return;
    try {
      await api('/orders/' + id + '/status', { method: 'PATCH', body: { status: 'completed' } });
      showToast('Order completed!');
      if (state.currentPage === 'sales')  this.loadOrders();
      if (state.currentPage === 'orders') this.loadOrdersPage();
    } catch (e) { showToast(e.message, false); }
  },

  async cancelOrder(id) {
    if (!confirm('Cancel this order? Stock will be restored.')) return;
    try {
      await api('/orders/' + id + '/status', { method: 'PATCH', body: { status: 'cancelled' } });
      showToast('Order cancelled');
      if (state.currentPage === 'sales')  this.loadOrders();
      if (state.currentPage === 'orders') this.loadOrdersPage();
    } catch (e) { showToast(e.message, false); }
  },

  // ── New Sale Modal ──────────────────────────
  openSaleModal() {
    state.cart = [];
    this._renderCart();
    const discEl = document.getElementById('discountField');
    if (discEl) discEl.value = '';
    const custEl = document.getElementById('saleCustomer');
    if (custEl) { custEl.value = ''; custEl.setAttribute('list', 'customersList'); }
    const sel = document.getElementById('saleProduct');
    if (sel) {
      sel.innerHTML = (state.products || [])
        .filter(p => p.stock_quantity > 0)
        .map(p => `<option value="${p._id}" data-price="${p.price}">${p.name} – ${fmt(p.price)}</option>`)
        .join('');
    }
    // Load customers for autocomplete
    this._loadCustomersAutocomplete();
    document.getElementById('saleModal').classList.add('show');
  },

  async _loadCustomersAutocomplete() {
    try {
      const { data } = await api('/customers');
      let dl = document.getElementById('customersList');
      if (!dl) {
        dl = document.createElement('datalist');
        dl.id = 'customersList';
        document.body.appendChild(dl);
      }
      dl.innerHTML = data.map(c =>
        `<option value="${c.first_name} ${c.last_name}">${c.first_name} ${c.last_name} ${c.phone ? '– ' + c.phone : ''}</option>`
      ).join('');
    } catch {}
  },

  closeSaleModal() { document.getElementById('saleModal').classList.remove('show'); },

  addToCart() {
    const sel = document.getElementById('saleProduct');
    const opt = sel?.options[sel.selectedIndex];
    if (!opt) return;
    const productId = opt.value;
    const price     = parseFloat(opt.dataset.price);
    const qty       = parseInt(document.getElementById('saleQty').value) || 1;
    const name      = opt.text.split(' – ')[0];
    const existing  = state.cart.find(i => i.product_id === productId);
    if (existing) existing.quantity += qty;
    else state.cart.push({ product_id: productId, quantity: qty, unit_price: price, name });
    this._renderCart();
  },

  _renderCart() {
    const area = document.getElementById('cartArea');
    if (!area) return;
    if (!state.cart.length) {
      area.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;text-align:center;padding:16px 0;">Cart is empty</div>';
      document.getElementById('cartTotal').textContent = '$0.00';
      return;
    }
    area.innerHTML = state.cart.map((item, i) => `
      <div class="cart-item">
        <div>
          <div style="font-size:0.82rem;font-weight:600;">${item.name}</div>
          <div style="font-size:0.7rem;color:var(--muted);">x${item.quantity} × ${fmt(item.unit_price)}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-weight:700;">${fmt(item.quantity * item.unit_price)}</span>
          <button onclick="App._removeCartItem(${i})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:0.9rem;">✕</button>
        </div>
      </div>`).join('');
    this.updateCartTotal();
  },

  _removeCartItem(i) { state.cart.splice(i, 1); this._renderCart(); },

  updateCartTotal() {
    const sub  = state.cart.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const disc = parseFloat(document.getElementById('discountField')?.value) || 0;
    document.getElementById('cartTotal').textContent = fmt(sub - disc);
  },

  async completeSale() {
    if (!state.cart.length) { showToast('Cart is empty!', false); return; }
    const discount     = parseFloat(document.getElementById('discountField').value) || 0;
    const payment      = document.getElementById('salePayment').value;
    const customerName = document.getElementById('saleCustomer').value.trim();

    // Resolve customer_id from name if provided
    let customer_id = null;
    if (customerName) {
      try {
        const parts      = customerName.split(' ');
        const first_name = parts[0];
        const last_name  = parts.slice(1).join(' ') || '.';
        // Search existing customers first
        const { data: found } = await api('/customers?search=' + encodeURIComponent(customerName));
        if (found && found.length > 0) {
          customer_id = found[0]._id;
        } else {
          // Auto-create new customer
          const res = await api('/customers', { method: 'POST', body: { first_name, last_name } });
          customer_id = res.id;
        }
      } catch {
        customer_id = null; // proceed as walk-in if lookup fails
      }
    }

    const body = {
      items: state.cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      payment_method: payment,
      discount,
      customer_id,
    };

    try {
      const result = await api('/orders', { method: 'POST', body });
      const custLabel = customerName || 'Walk-in';
      showToast(`Sale completed for ${custLabel}! Total: ${fmt(result.final_amount)}`);
      this.closeSaleModal();
      state.cart = [];
      if (state.currentPage === 'sales')     this.load_sales();
      if (state.currentPage === 'orders')    this.load_orders();
      if (state.currentPage === 'inventory') this.load_inventory();
      try { const { data } = await api('/products'); state.products = data; } catch {}
    } catch (e) { showToast(e.message, false); }
  },

  // ══════════════════════════════════════════════
  //  SUPPLIERS
  // ══════════════════════════════════════════════
  async load_suppliers() {
    try {
      const { data } = await api('/suppliers');
      const colors = ['rgba(168,85,247,0.15)','rgba(96,165,250,0.15)','rgba(251,146,60,0.15)','rgba(74,222,128,0.15)','rgba(248,113,113,0.15)'];
      const emojis = ['👗','👔','🧥','👜','🎽'];
      const canEdit = hasRole('manager');
      document.getElementById('suppliersGrid').innerHTML = data.map((s, i) => `
        <div class="supplier-card">
          <div class="sc-top">
            <div class="sc-avatar" style="background:${colors[i % colors.length]}">${emojis[i % emojis.length]}</div>
            <div><div class="sc-name">${s.name}</div><div class="sc-id">SUP-${String(s._id).slice(-4).toUpperCase()}</div></div>
            <span class="sc-badge active">Active</span>
          </div>
          <div class="sc-info">
            <div class="sc-row">📞 Phone<span>${s.phone || '—'}</span></div>
            <div class="sc-row">📧 Email<span>${s.email || '—'}</span></div>
            <div class="sc-row">📦 Products<span>${s.supplied_products || '—'}</span></div>
          </div>
          ${canEdit ? `<div class="sc-footer">
            <button class="sc-btn primary" onclick="App.editSupplier('${s._id}')">Edit</button>
            <button class="sc-btn del"     onclick="App.deleteSupplier('${s._id}')">Delete</button>
          </div>` : ''}
        </div>`).join('') || '<div style="color:var(--muted);text-align:center;padding:40px;grid-column:1/-1">No suppliers yet</div>';
    } catch (e) { showToast(e.message, false); }
  },

  openSupplierModal(reset = true) {
    if (reset) {
      document.getElementById('supplierModalTitle').textContent = 'Add New Supplier';
      document.getElementById('supplierId').value = '';
      ['s-name','s-phone','s-email','s-address','s-products'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
    }
    document.getElementById('supplierModal').classList.add('show');
  },

  closeSupplierModal() { document.getElementById('supplierModal').classList.remove('show'); },

  async editSupplier(id) {
    try {
      const { data } = await api('/suppliers/' + id);
      document.getElementById('supplierModalTitle').textContent = 'Edit Supplier';
      document.getElementById('supplierId').value  = data._id;
      document.getElementById('s-name').value      = data.name              || '';
      document.getElementById('s-phone').value     = data.phone             || '';
      document.getElementById('s-email').value     = data.email             || '';
      document.getElementById('s-address').value   = data.address           || '';
      document.getElementById('s-products').value  = data.supplied_products || '';
      this.openSupplierModal(false);
    } catch (e) { showToast(e.message, false); }
  },

  async saveSupplier() {
    const id   = document.getElementById('supplierId').value;
    const body = {
      name:              document.getElementById('s-name').value,
      phone:             document.getElementById('s-phone').value,
      email:             document.getElementById('s-email').value,
      address:           document.getElementById('s-address').value,
      supplied_products: document.getElementById('s-products').value,
    };
    if (!body.name) { showToast('Supplier name is required', false); return; }
    try {
      if (id) { await api('/suppliers/' + id, { method: 'PUT',  body }); showToast('Supplier updated!'); }
      else    { await api('/suppliers',       { method: 'POST', body }); showToast('Supplier created!'); }
      this.closeSupplierModal();
      this.load_suppliers();
    } catch (e) { showToast(e.message, false); }
  },

  async deleteSupplier(id) {
    if (!confirm('Delete this supplier?')) return;
    try {
      await api('/suppliers/' + id, { method: 'DELETE' });
      showToast('Supplier deleted');
      this.load_suppliers();
    } catch (e) { showToast(e.message, false); }
  },

  // ══════════════════════════════════════════════
  //  REPORTS
  // ══════════════════════════════════════════════
  async load_reports() {
    try {
      const { data } = await api('/reports/dashboard');
      document.getElementById('rptRevenue').textContent  = fmt(data.allTime?.total || 0);
      document.getElementById('rptProducts').textContent = data.products  || 0;
      document.getElementById('rptLowStock').textContent = data.lowStock  || 0;

      const { data: orders } = await api('/orders');
      document.getElementById('rptOrders').textContent = orders.length;

      this._drawLineChart('rptLineChart', data.monthlySales || []);

      const cats   = data.categoryPerf || [];
      const maxRev = cats[0]?.revenue || 1;
      document.getElementById('rptCategoryList').innerHTML = cats.map(c => `
        <div class="cat-row">
          <span class="cat-name">${c.category || 'Other'}</span>
          <div class="cat-bar"><div class="cat-fill" style="width:${Math.round(c.revenue / maxRev * 100)}%"></div></div>
          <span class="cat-val">${fmt(c.revenue)}</span>
        </div>`).join('') || '<div style="color:var(--muted);padding:16px">No data</div>';

      const { data: bs } = await api('/reports/best-sellers');
      document.getElementById('rptBestSellers').innerHTML = (bs || []).slice(0, 5).map((p, i) => `
        <div class="top-prod">
          <div class="tp-rank">${i + 1}</div>
          <div><div class="tp-name">${p.name}</div><div class="tp-cat">${p.total_sold} sold · ${fmt(p.total_revenue)}</div></div>
        </div>`).join('') || '<div style="color:var(--muted);padding:16px">No sales data</div>';

      const payMap = {};
      orders.forEach(o => { payMap[o.payment_method] = (payMap[o.payment_method] || 0) + 1; });
      this._drawPayDonut('rptPayDonut', payMap);
    } catch (e) { showToast(e.message, false); }
  },

  _drawPayDonut(id, payMap) {
    const ctx = document.getElementById(id)?.getContext('2d');
    if (!ctx) return;
    if (state.charts[id]) { state.charts[id].destroy(); delete state.charts[id]; }
    const labels = Object.keys(payMap);
    const values = Object.values(payMap);
    if (!labels.length) return;
    state.charts[id] = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: ['#A855F7','#60a5fa','#4ade80','#fb923c','#f472b6'], borderWidth: 0, hoverOffset: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { color: '#808098', font: { family: 'Sora', size: 11 }, padding: 12, usePointStyle: true } } } }
    });
  },

  // ══════════════════════════════════════════════
  //  EMPLOYEES  (manager only)
  // ══════════════════════════════════════════════
  async load_employees() {
    if (!hasRole('manager')) { this.navigate('dashboard'); return; }
    try {
      const { data } = await api('/employees');
      const tbody = document.getElementById('empTable');
      if (!tbody) return;
      tbody.innerHTML = data.map(e => `
        <tr>
          <td>${e.name}</td>
          <td>${e.email}</td>
          <td>${e.phone || '—'}</td>
          <td><span class="role-badge ${e.role}">${e.role}</span></td>
          <td>${fmt(e.salary)}</td>
          <td><span class="status-badge ${e.is_active ? 'completed' : 'cancelled'}">${e.is_active ? 'Active' : 'Inactive'}</span></td>
          <td class="action-group">
            <button class="icon-btn" onclick="App.editEmployee('${e._id}')">Edit</button>
            <button class="icon-btn" onclick="App.resetEmpPassword('${e._id}')">Reset Pwd</button>
            ${e.is_active ? `<button class="icon-btn del" onclick="App.deactivateEmployee('${e._id}')">Deactivate</button>` : ''}
          </td>
        </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">No employees</td></tr>';
    } catch (e) { showToast(e.message, false); }
  },

  openEmployeeModal(reset = true) {
    if (reset) {
      document.getElementById('employeeModalTitle').textContent = 'Add Employee';
      document.getElementById('empId').value = '';
      ['emp-name','emp-email','emp-phone','emp-password','emp-role','emp-salary'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
    }
    document.getElementById('employeeModal').classList.add('show');
  },

  closeEmployeeModal() { document.getElementById('employeeModal').classList.remove('show'); },

  async editEmployee(id) {
    try {
      const { data } = await api('/employees/' + id);
      document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
      document.getElementById('empId').value       = data._id;
      document.getElementById('emp-name').value    = data.name   || '';
      document.getElementById('emp-email').value   = data.email  || '';
      document.getElementById('emp-phone').value   = data.phone  || '';
      document.getElementById('emp-role').value    = data.role   || 'cashier';
      document.getElementById('emp-salary').value  = data.salary || '';
      document.getElementById('emp-password').value = '';
      this.openEmployeeModal(false);
    } catch (e) { showToast(e.message, false); }
  },

  async saveEmployee() {
    const id   = document.getElementById('empId').value;
    const body = {
      name:     document.getElementById('emp-name').value,
      email:    document.getElementById('emp-email').value,
      phone:    document.getElementById('emp-phone').value,
      role:     document.getElementById('emp-role').value,
      salary:   parseFloat(document.getElementById('emp-salary').value) || 0,
    };
    const pwd = document.getElementById('emp-password').value;
    if (!id && !pwd) { showToast('Password is required for new employee', false); return; }
    if (pwd) body.password = pwd;
    if (!body.name || !body.email || !body.role) { showToast('Name, email and role are required', false); return; }
    try {
      if (id) { await api('/employees/' + id, { method: 'PUT',  body }); showToast('Employee updated!'); }
      else    { await api('/employees',       { method: 'POST', body }); showToast('Employee created!'); }
      this.closeEmployeeModal();
      this.load_employees();
    } catch (e) { showToast(e.message, false); }
  },

  async resetEmpPassword(id) {
    const pwd = prompt('Enter new password (min 6 characters):');
    if (!pwd) return;
    if (pwd.length < 6) { showToast('Password must be at least 6 characters', false); return; }
    try {
      await api('/employees/' + id + '/password', { method: 'PATCH', body: { password: pwd } });
      showToast('Password reset!');
    } catch (e) { showToast(e.message, false); }
  },

  async deactivateEmployee(id) {
    if (!confirm('Deactivate this employee?')) return;
    try {
      await api('/employees/' + id, { method: 'DELETE' });
      showToast('Employee deactivated');
      this.load_employees();
    } catch (e) { showToast(e.message, false); }
  },

};

// ── Boot ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
