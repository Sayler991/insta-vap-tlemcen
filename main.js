(() => {
  'use strict';
  const SB = 'https://rvreusugrtiubqtafgbk.supabase.co';
  const KEY = 'sb_publishable_rTrEZB4mivU7kr9IwabvBQ_Q31CFt_1';
  const DAYN = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const THIN = '\u202F';
  const fmtNum = n => (parseInt(n, 10) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, THIN);
  const fmtDA = (n, html) => {
    const v = parseInt(n, 10) || 0;
    if (v <= 0) return html ? '<span class="price price-ask">Sur demande</span>' : 'Sur demande';
    const num = fmtNum(v);
    return html
      ? '<span class="price"><span class="price-num">' + num + '</span><span class="price-unit">DA</span></span>'
      : num + ' DA';
  };
  const priceHint = p => (p && p.is_example !== false && (parseInt(p.price, 10) || 0) > 0)
    ? '<span class="price-hint">Prix indicatif</span>' : '';
  const telHref = p => {
    const d = String(p || '').replace(/\D/g, '');
    if (!d) return 'tel:+213555804451';
    return 'tel:' + (d.startsWith('0') ? '+213' + d.slice(1) : (d.startsWith('213') ? '+' + d : d));
  };

  let DATA = null;
  let ACTIVE_CAT = 'Tous';
  let SEARCH_Q = '';
  let STOCK_ONLY = false;
  let CART = [];
  let MODAL_PROD = null;
  let MODAL_VAR = '';

  try {
    const saved = JSON.parse(localStorage.getItem('instavap_cart_v1') || '[]');
    if (Array.isArray(saved)) CART = saved;
  } catch (e) {}

  document.getElementById('y').textContent = new Date().getFullYear();

  function toast(msg) {
    const box = $('#toasts');
    if (!box) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  /* Scroll reveal */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let io = null;
  if (!reduce && 'IntersectionObserver' in window) {
    io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    }), { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
  }
  const observe = () => $$('.reveal:not(.in)').forEach(el => io ? io.observe(el) : el.classList.add('in'));

  /* Catalogue groups shown in the menu and filter tabs.
     Product records keep their detailed admin categories (E-liquides, Pods, etc.). */
  const SHOP_GROUPS = [
    { name: 'Liquides', slug: 'liquides', cats: ['E-liquides'] },
    { name: 'Vapes', slug: 'vapes', cats: ['Kits & Box', 'Pods'] },
    { name: 'Cigarettes électroniques', slug: 'cigarettes-electroniques', cats: ['Puffs jetables'] },
    { name: 'Accessoires', slug: 'accessoires', cats: ['Résistances & Accessoires'] }
  ];
  const CAT_TO_GROUP = {};
  SHOP_GROUPS.forEach(g => g.cats.forEach(c => { CAT_TO_GROUP[c] = g.name; }));
  const groupOf = p => CAT_TO_GROUP[p.category] || p.category;
  const groupByName = n => SHOP_GROUPS.find(g => g.name === n);
  const groupBySlug = sl => SHOP_GROUPS.find(g => g.slug === sl);

  /* Mobile menu & nav */
  const nav = $('#nav'), burger = $('#burger'), overlay = $('#menuOverlay'), panel = $('#menuPanel');
  let menuFocus = null;
  addEventListener('scroll', () => nav && nav.classList.toggle('scrolled', scrollY > 24), { passive: true });
  function setMenu(open) {
    if (!burger || !panel) return;
    const was = document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    panel.setAttribute('aria-hidden', String(!open));
if (open) {
      menuFocus = document.activeElement;
      const closeBtn = $('#menuClose');
      if (closeBtn) setTimeout(() => closeBtn.focus(), 30);
    } else if (was && menuFocus && typeof menuFocus.focus === 'function') {
      try { menuFocus.focus(); } catch (e) {}
    }
  }
  if (burger) burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $('#menuClose')?.addEventListener('click', () => setMenu(false));
  overlay?.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { e.preventDefault(); setMenu(false); }
  });
  panel?.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a) return;
    const group = a.getAttribute('data-group');
    if (group) {
      e.preventDefault();
      applyGroup(group, { scroll: true, hash: true });
    }
    setMenu(false);
  });

  function applyGroup(name, opts) {
    opts = opts || {};
    ACTIVE_CAT = name || 'Tous';
    renderCategories();
    renderProducts();
    const g = groupByName(ACTIVE_CAT);
    if (opts.hash) {
      const hash = g ? g.slug : 'catalogue';
      if (location.hash.slice(1) !== hash) history.replaceState(null, '', '#' + hash);
    }
    if (opts.scroll !== false) {
      const el = $('#catalogue');
      if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }
  let hashApplied = false;
  function handleHash(fromUser) {
    const raw = (location.hash || '').replace(/^#/, '').toLowerCase();
    if (!raw) return;
    const g = groupBySlug(raw);
    if (g) { applyGroup(g.name, { scroll: fromUser || !hashApplied, hash: false }); hashApplied = true; }
  }

  /* Hours & live open badge */
  function mins(s) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s || '');
    return m ? (+m[1] * 60 + +m[2]) : null;
  }
  function renderHours(H) {
    const ul = $('#hours');
    if (!ul) return;
    ul.innerHTML = (H || []).map(h =>
      `<li data-d="${h.dow}" class="${h.closed ? 'off' : ''}"><span>${DAYN[h.dow]}</span><span>${h.closed ? 'Fermé' : esc(h.open) + ' – ' + esc(h.close)}</span></li>`
    ).join('');
    try {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Algiers', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts.find(p => p.type === 'weekday').value];
      const t = (+parts.find(p => p.type === 'hour').value % 24) * 60 + +parts.find(p => p.type === 'minute').value;
      $$('#hours li').forEach(li => li.classList.toggle('today', +li.dataset.d === wd));
      const by = {}; (H || []).forEach(h => by[h.dow] = h);
      const today = by[wd], live = $('#live'), txt = $('#liveTxt');
      if (!live || !txt) return;
      live.classList.remove('open', 'closed');
      if (today && !today.closed && t >= mins(today.open) && t < mins(today.close)) {
        live.classList.add('open');
        txt.textContent = "Ouvert maintenant · jusqu'à " + today.close;
        return;
      }
      live.classList.add('closed');
      if (today && !today.closed && t < mins(today.open)) {
        txt.textContent = "Fermé · ouvre aujourd'hui à " + today.open;
        return;
      }
      for (let k = 1; k <= 7; k++) {
        const d = (wd + k) % 7, h = by[d];
        if (h && !h.closed) {
          txt.textContent = 'Fermé · ouvre ' + (k === 1 ? 'demain' : DAYN[d].toLowerCase()) + ' à ' + h.open;
          return;
        }
      }
      txt.textContent = 'Fermé';
    } catch (e) {}
  }

  /* Render all data */
  function render(D) {
    DATA = D;
    const set = (id, v) => { const e = document.getElementById(id); if (e && v != null && v !== '') e.textContent = v; };
    set('kicker', D.kicker);
    set('lead', D.lead);
    set('catalogTitle', D.catalog_title);
    set('catalogIntro', D.catalog_intro);
    set('catalogNotice', D.catalog_notice);
    set('aboutIntro', D.about_intro);
    set('addrText', D.address);
    set('plusCode', D.plus_code);
    if (D.rating) {
      set('ratingScore', D.rating.score);
      set('ratingCount', D.rating.count);
    }

    const th = telHref(D.phone);
    $$('[data-tel]').forEach(a => a.href = th);
    $$('[data-tel-text]').forEach(s => s.textContent = D.phone || '0555 80 44 51');
    const wa = String(D.whatsapp || '').replace(/\D/g, '');
    $$('[data-wa]').forEach(a => {
      if (wa) { a.href = 'https://wa.me/' + wa; a.hidden = false; } else a.hidden = true;
    });
    if (D.maps_url) $$('[data-maps]').forEach(a => a.href = D.maps_url);

    // Social links
    const soc = $('#socials');
    if (soc) {
      const links = [];
      if (D.facebook) links.push(`<a href="${esc(D.facebook)}" target="_blank" rel="noopener">Facebook · Insta ' Vap ↗</a>`);
      if (D.instagram) links.push(`<a href="${esc(D.instagram)}" target="_blank" rel="noopener">Instagram ↗</a>`);
      if (D.tiktok) links.push(`<a href="${esc(D.tiktok)}" target="_blank" rel="noopener">TikTok ↗</a>`);
      soc.innerHTML = links.join('');
    }

    renderCategories();
    renderProducts();
    renderQuickSelect();
    renderGallery();
    renderReviews();
    renderHours(D.hours);
    renderCart();
    observe();
    handleHash(false);
  }

  function visibleProducts() {
    return (DATA && DATA.products ? DATA.products : []).filter(p => p.visible !== false);
  }

  function renderCategories() {
    const prods = visibleProducts();
    const tabs = [{ name: 'Tous' }].concat(SHOP_GROUPS);
    const box = $('#catTabs');
    if (!box) return;
    box.innerHTML = tabs.map(t => {
      const name = t.name;
      const g = groupByName(name);
      const count = name === 'Tous' ? prods.length : prods.filter(p => g && g.cats.indexOf(p.category) !== -1).length;
      return `<button type="button" class="cat-tab${ACTIVE_CAT === name ? ' on' : ''}" data-cat="${esc(name)}" role="tab" aria-selected="${ACTIVE_CAT === name}">${esc(name)} <small>(${count})</small></button>`;
    }).join('');
  }

  function filteredProducts() {
    const q = SEARCH_Q.trim().toLowerCase();
    const g = groupByName(ACTIVE_CAT);
    return visibleProducts().filter(p => {
      if (ACTIVE_CAT !== 'Tous') {
        if (g) { if (g.cats.indexOf(p.category) === -1) return false; }
        else if (p.category !== ACTIVE_CAT) return false;
      }
      if (STOCK_ONLY && p.in_stock === false) return false;
      if (q) {
        const hay = [p.name, p.category, groupOf(p), p.description, p.variants, ...(p.specs || [])].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function renderProducts() {
    const grid = $('#products');
    const cnt = $('#catalogCount');
    if (!grid) return;
    const list = filteredProducts();
    if (cnt) cnt.textContent = list.length + ' produit' + (list.length > 1 ? 's' : '') + ' affiché' + (list.length > 1 ? 's' : '');
    if (!list.length) {
      grid.innerHTML = '<p class="cart-empty" style="grid-column:1/-1">Aucun produit ne correspond à votre recherche.</p>';
      return;
    }
    grid.innerHTML = list.map((p, i) => {
      const inStock = p.in_stock !== false;
      const specs = (Array.isArray(p.specs) ? p.specs : String(p.specs || '').split(/[·,]/).map(s => s.trim()).filter(Boolean)).slice(0, 4);
      const img = p.thumb || p.photo || 'img/exemples/pod-exemple.webp';
      return `<article class="pcard reveal" data-pid="${esc(p.id)}">
        <div class="pcard-media" data-quick="${esc(p.id)}" role="button" tabindex="0" aria-label="Voir les détails de ${esc(p.name)}">
          <img src="${esc(img)}" alt="${esc(p.name)}" loading="${i < 4 ? 'eager' : 'lazy'}" decoding="async">
          ${p.is_example !== false ? '<span class="badge-ex">Exemple</span>' : ''}
          <span class="badge-st${inStock ? '' : ' out'}">${inStock ? 'En stock' : 'Rupture'}</span>
        </div>
        <div class="pcard-body">
          <span class="pcard-cat">${esc(p.category || 'Catalogue')}</span>
          <h3 class="pcard-title">${esc(p.name)}</h3>
          ${specs.length ? `<div class="spec-pills">${specs.map(s => `<span class="spec-pill">${esc(s)}</span>`).join('')}</div>` : ''}
          ${p.description ? `<p class="pcard-desc">${esc(p.description)}</p>` : ''}
          <div class="pcard-foot">
            <div class="pcard-price-wrap">${fmtDA(p.price, true)}${priceHint(p)}</div>
            <div class="pcard-btns">
              <button type="button" class="btn btn-sm btn-ghost" data-quick="${esc(p.id)}">Détails</button>
              <button type="button" class="btn btn-sm btn-amber" data-add="${esc(p.id)}" ${inStock ? '' : 'disabled'}>+ Panier</button>
            </div>
          </div>
        </div>
      </article>`;
    }).join('');
    observe();
  }

  function renderQuickSelect() {
    const sel = $('#quickSelect');
    if (!sel) return;
    const avail = visibleProducts().filter(p => p.in_stock !== false);
    sel.innerHTML = avail.map(p => `<option value="${esc(p.id)}">${esc(p.name)} — ${fmtDA(p.price)}</option>`).join('');
  }

  function renderGallery() {
    const box = $('#gallery');
    if (!box) return;
    const gal = (DATA.gallery || []).filter(g => g.photo);
    box.innerHTML = gal.map((g, i) => `
      <figure class="gal-card reveal">
        <button type="button" data-lb="${i}" aria-label="Agrandir la photo : ${esc(g.caption || 'Boutique INSTA vap')}">
          <img src="${esc(g.thumb || g.photo)}" alt="${esc(g.caption || 'Boutique INSTA vap')}" loading="lazy" decoding="async">
        </button>
        ${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}
      </figure>
    `).join('');
  }

  function renderReviews() {
    const box = $('#reviews');
    if (!box) return;
    const revs = DATA.reviews || [];
    box.innerHTML = revs.map(r => {
      const st = '★'.repeat(Math.max(1, Math.min(5, +r.stars || 5))) + '☆'.repeat(5 - Math.max(1, Math.min(5, +r.stars || 5)));
      return `<article class="rev-card reveal">
        <div class="rev-top"><span class="rev-stars" aria-label="${r.stars} sur 5">${st}</span><span class="rev-date">${esc(r.date || '')}</span></div>
        <p class="rev-text">« ${esc(r.text)} »</p>
        <span class="rev-author">${esc(r.author)}</span>
      </article>`;
    }).join('');
  }

  /* Cart logic */
  function saveCart() {
    try { localStorage.setItem('instavap_cart_v1', JSON.stringify(CART)); } catch (e) {}
  }

  function addToCart(pid, qty = 1, variant = '') {
    const prod = visibleProducts().find(p => p.id === pid);
    if (!prod) return;
    if (prod.in_stock === false) { toast('Ce produit est en rupture de stock.'); return; }
    const v = variant || (prod.variants ? String(prod.variants).split(',')[0].trim() : '');
    const existing = CART.find(it => it.id === pid && (it.variant || '') === v);
    if (existing) existing.qty = Math.min(20, existing.qty + qty);
    else CART.push({ id: pid, name: prod.name, price: parseInt(prod.price, 10) || 0, qty: Math.min(20, qty), variant: v });
    saveCart();
    renderCart();
    toast('Ajouté au panier : ' + prod.name);
  }

  let lastStickyCount = 0;

  function renderCart() {
    const box = $('#cartItems'), totEl = $('#cartTotal'), cntNav = $('#navCartCount'), clr = $('#clearCart');
    const stCart = $('#stickyCart'), stTxt = $('#stickyCartTxt'), stCount = $('#stickyCartCount');
    const count = CART.reduce((s, x) => s + (x.qty || 0), 0);
    if (cntNav) cntNav.textContent = count;
    if (stCart && stTxt) {
      stCart.hidden = false;
      stCart.removeAttribute('hidden');
      stCart.setAttribute('href', count > 0 ? '#commander' : '#catalogue');
      stCart.setAttribute('aria-label', count > 0
        ? 'Commander, ' + count + ' article' + (count > 1 ? 's' : '') + ' dans le panier'
        : 'Commander, voir le catalogue');
      stTxt.textContent = 'Commander';
      if (stCount) {
        stCount.textContent = String(count);
        stCount.hidden = count === 0;
      }
      if (typeof lastStickyCount === 'number' && count > lastStickyCount) {
        stCart.classList.remove('is-bumped');
        void stCart.offsetWidth;
        stCart.classList.add('is-bumped');
        setTimeout(() => stCart.classList.remove('is-bumped'), 800);
      }
      lastStickyCount = count;
    }
    if (clr) clr.hidden = CART.length === 0;
    if (!box) return;
    if (!CART.length) {
      box.innerHTML = '<p class="cart-empty">Votre panier est vide. Ajoutez des articles depuis le catalogue ci-dessus ou avec le sélecteur ci-dessous.</p>';
      if (totEl) totEl.innerHTML = '<span class="price"><span class="price-num">0</span><span class="price-unit">DA</span></span>';
      return;
    }
    let total = 0;
    box.innerHTML = CART.map((it, idx) => {
      const prod = visibleProducts().find(p => p.id === it.id);
      const unit = prod ? (parseInt(prod.price, 10) || 0) : (parseInt(it.price, 10) || 0);
      total += unit * it.qty;
      return `<div class="cart-row" data-cidx="${idx}">
        <div class="cart-row-info">
          <b>${esc(prod ? prod.name : it.name)}</b>
          <small>${it.variant ? esc(it.variant) + ' · ' : ''}${fmtDA(unit, true)} × ${it.qty}</small>
        </div>
        <div class="cart-row-ctrl">
          <div class="qty-sm">
            <button type="button" data-cd="-1" aria-label="Retirer">−</button>
            <span>${it.qty}</span>
            <button type="button" data-cd="1" aria-label="Ajouter">+</button>
          </div>
          <button type="button" class="rm-btn" data-crm aria-label="Supprimer">✕</button>
        </div>
      </div>`;
    }).join('');
    if (totEl) totEl.innerHTML = total > 0 ? fmtDA(total, true) : '<span class="price price-ask">Prix sur demande</span>';
  }

  /* Quick-View Modal */
  function openModal(pid) {
    const p = visibleProducts().find(x => x.id === pid);
    if (!p) return;
    MODAL_PROD = p;
    const modal = $('#prodModal');
    $('#pmImg').src = p.photo || p.thumb || 'img/exemples/pod-exemple.webp';
    $('#pmImg').alt = p.name;
    $('#pmExBadge').hidden = p.is_example === false;
    $('#pmCat').textContent = p.category || '';
    const st = $('#pmStock');
    const inStock = p.in_stock !== false;
    st.textContent = inStock ? 'En stock' : 'Rupture';
    st.className = 'pm-stock' + (inStock ? '' : ' out');
    $('#pmTitle').textContent = p.name;
    $('#pmPrice').innerHTML = fmtDA(p.price, true) + priceHint(p);
    $('#pmDesc').textContent = p.description || '';
    const specs = Array.isArray(p.specs) ? p.specs : String(p.specs || '').split(/[·,]/).map(s => s.trim()).filter(Boolean);
    $('#pmSpecs').innerHTML = specs.map(s => `<span class="spec-pill">${esc(s)}</span>`).join('');
    const vars = String(p.variants || '').split(',').map(s => s.trim()).filter(Boolean);
    const vWrap = $('#pmVarWrap'), vChips = $('#pmVarChips');
    if (vars.length) {
      MODAL_VAR = vars[0];
      vWrap.hidden = false;
      vChips.innerHTML = vars.map((v, idx) => `<button type="button" class="pm-vchip${idx === 0 ? ' on' : ''}" data-var="${esc(v)}">${esc(v)}</button>`).join('');
    } else {
      MODAL_VAR = '';
      vWrap.hidden = true;
      vChips.innerHTML = '';
    }
    $('#pmQty').value = 1;
    $('#pmAdd').disabled = !inStock;
    const wa = String((DATA && DATA.whatsapp) || '213555804451').replace(/\D/g, '');
    $('#pmWa').href = `https://wa.me/${wa}?text=${encodeURIComponent('Bonjour INSTA vap, je souhaite des infos sur : ' + p.name)}`;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    $('#prodModal').hidden = true;
    document.body.style.overflow = '';
  }

  /* Event listeners */
  document.addEventListener('click', e => {
    const tab = e.target.closest('.cat-tab');
    if (tab) { applyGroup(tab.dataset.cat, { scroll: false, hash: true }); return; }

    const addBtn = e.target.closest('[data-add]');
    if (addBtn) { addToCart(addBtn.dataset.add, 1); return; }

    const qBtn = e.target.closest('[data-quick]');
    if (qBtn) { openModal(qBtn.dataset.quick); return; }

    const vChip = e.target.closest('.pm-vchip');
    if (vChip) {
      MODAL_VAR = vChip.dataset.var;
      $$('#pmVarChips .pm-vchip').forEach(c => c.classList.toggle('on', c === vChip));
      return;
    }

    if (e.target.closest('[data-close-modal]')) { closeModal(); return; }

    const cd = e.target.closest('[data-cd]');
    if (cd) {
      const idx = +cd.closest('.cart-row').dataset.cidx;
      if (CART[idx]) {
        CART[idx].qty += +cd.dataset.cd;
        if (CART[idx].qty <= 0) CART.splice(idx, 1);
        else if (CART[idx].qty > 20) CART[idx].qty = 20;
        saveCart(); renderCart();
      }
      return;
    }
    if (e.target.closest('[data-crm]')) {
      const idx = +e.target.closest('.cart-row').dataset.cidx;
      CART.splice(idx, 1); saveCart(); renderCart(); return;
    }

    const comm = e.target.closest('[data-commune]');
    if (comm) {
      const inp = $('#cmdForm input[name="address"]');
      if (inp) { inp.value = comm.dataset.commune; inp.focus(); }
      return;
    }

    const lbBtn = e.target.closest('[data-lb]');
    if (lbBtn && DATA && DATA.gallery) {
      const g = DATA.gallery[+lbBtn.dataset.lb];
      if (g) {
        $('#lbImg').src = g.photo;
        $('#lbImg').alt = g.caption || 'Boutique INSTA vap';
        $('#lbCap').textContent = g.caption || '';
        $('#lb').hidden = false;
      }
    }
  });

  $('#catSearch')?.addEventListener('input', e => { SEARCH_Q = e.target.value; renderProducts(); });
  $('#stockOnly')?.addEventListener('change', e => { STOCK_ONLY = e.target.checked; renderProducts(); });
  $('#clearCart')?.addEventListener('click', () => { CART = []; saveCart(); renderCart(); });
  $('#quickAddBtn')?.addEventListener('click', () => {
    const id = $('#quickSelect')?.value;
    if (id) addToCart(id, 1);
  });

  $('#pmMinus')?.addEventListener('click', () => { const q = $('#pmQty'); q.value = Math.max(1, (+q.value || 1) - 1); });
  $('#pmPlus')?.addEventListener('click', () => { const q = $('#pmQty'); q.value = Math.min(20, (+q.value || 1) + 1); });
  $('#pmAdd')?.addEventListener('click', () => {
    if (!MODAL_PROD) return;
    addToCart(MODAL_PROD.id, Math.max(1, Math.min(20, parseInt($('#pmQty').value, 10) || 1)), MODAL_VAR);
    closeModal();
  });

  $('#lbClose')?.addEventListener('click', () => { $('#lb').hidden = true; });
  $('#lb')?.addEventListener('click', e => { if (e.target.id === 'lb') $('#lb').hidden = true; });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); if ($('#lb')) $('#lb').hidden = true; }
  });

  /* Order form (Whoopy Burger flow + WhatsApp + mandatory call step) */
  const form = $('#cmdForm'), addrWrap = $('#addrWrap'), cmdMsg = $('#cmdMsg'), cmdDone = $('#cmdDone');
  function setMsg(t, kind) {
    if (!cmdMsg) return;
    cmdMsg.textContent = t;
    cmdMsg.className = 'cmd-msg' + (kind ? ' ' + kind : '');
    cmdMsg.hidden = !t;
  }
  form?.addEventListener('change', e => {
    if (e.target.name === 'mode') {
      const liv = form.mode.value === 'livraison';
      addrWrap.hidden = !liv;
      form.address.required = liv;
    }
  });

  form?.addEventListener('submit', e => {
    e.preventDefault();
    setMsg('', '');
    if (!CART.length) return setMsg('Votre panier est vide : ajoutez au moins un article avant de commander.', 'er');
    const cname = form.cname.value.trim();
    const phone = form.phone.value.trim();
    const mode = form.mode.value;
    const address = form.address.value.trim();
    const notes = form.notes.value.trim();
    if (cname.length < 2) return setMsg('Indiquez votre nom complet (2 caractères min.).', 'er');
    if (!/^\+?[0-9][0-9 .-]{7,18}[0-9]$/.test(phone)) return setMsg('Numéro de téléphone invalide (ex. 0555 80 44 51).', 'er');
    if (mode === 'livraison' && address.length < 4) return setMsg('Indiquez votre adresse ou commune de livraison.', 'er');
    if (!form.age18.checked) return setMsg('Vous devez certifier avoir 18 ans ou plus pour commander.', 'er');
    if (form.website && form.website.value) return setMsg('Merci !', 'ok');

    const btn = $('#cmdSubmit');
    btn.disabled = true;
    btn.textContent = 'Envoi en cours…';

    const payloadItems = CART.map(it => ({ id: it.id, name: it.name, qty: it.qty, variant: it.variant || '' }));
    fetch(SB + '/rest/v1/rpc/instavap_place_order', {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_name: cname,
        p_phone: phone,
        p_items: payloadItems,
        p_fulfillment: mode,
        p_address: mode === 'livraison' ? address : null,
        p_notes: notes || null,
        p_age_confirmed: true
      })
    }).then(r => r.json().then(j => ({ ok: r.ok, status: r.status, body: j }))).then(res => {
      if (!res.ok || !res.body || !res.body.ok) {
        const msg = (res.body && res.body.message) || 'Impossible d’enregistrer la commande pour le moment.';
        throw new Error(msg);
      }
      const ordId = res.body.order_id;
      const tot = res.body.total;
      const lines = (res.body.items || payloadItems).map(x => `• ${x.qty}× ${x.name}${x.variant ? ' (' + x.variant + ')' : ''}`).join('\n');
      const waMsg = `Bonjour INSTA vap, voici ma commande #${ordId} :\n${lines}\nTotal estimé : ${tot > 0 ? fmtDA(tot) : 'Sur demande'}\nNom : ${cname}\nTél : ${phone}\nMode : ${mode === 'livraison' ? 'Livraison (' + address + ')' : 'Retrait en boutique'}${notes ? '\nNote : ' + notes : ''}`;
      const waNum = String((DATA && DATA.whatsapp) || '213555804451').replace(/\D/g, '');
      const tel = telHref(DATA && DATA.phone);
      const telDisplay = (DATA && DATA.phone) || '0555 80 44 51';

      CART = [];
      saveCart();
      renderCart();
      form.reset();
      addrWrap.hidden = true;

      cmdDone.innerHTML = `
        <div class="cmd-done-ic" aria-hidden="true">📞</div>
        <h3>Commande #${esc(ordId)} enregistrée !</h3>
        <p>Merci <strong>${esc(cname)}</strong> ! <strong>Appelez-nous maintenant pour la confirmer</strong> : elle sera préparée dès votre appel.</p>
        <a class="btn btn-amber cmd-call-big" href="${esc(tel)}">📞 Appeler pour confirmer · ${esc(telDisplay)}</a>
        <a class="btn btn-wa" href="https://wa.me/${esc(waNum)}?text=${encodeURIComponent(waMsg)}" target="_blank" rel="noopener">💬 Envoyer aussi sur WhatsApp</a>
        <button type="button" class="btn btn-ghost btn-sm" id="cmdAgain">Nouvelle commande</button>
      `;
      form.hidden = true;
      cmdDone.hidden = false;
      $('#cmdAgain').addEventListener('click', () => { cmdDone.hidden = true; form.hidden = false; });
      cmdDone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try { cmdDone.focus({ preventScroll: true }); } catch (err) {}
    }).catch(err => {
      setMsg(err.message || 'Erreur réseau. Vous pouvez appeler directement le ' + ((DATA && DATA.phone) || '0555 80 44 51') + '.', 'er');
    }).finally(() => {
      btn.disabled = false;
      btn.textContent = 'Envoyer la commande';
    });
  });

  /* Boot: load content-default.json then refresh from Supabase live */
  addEventListener('hashchange', function () { handleHash(true); });

  fetch('content-default.json', { cache: 'no-cache' })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(d => {
      render(d);
      return fetch(SB + '/rest/v1/instavap_content?id=eq.1&select=data', { headers: { apikey: KEY } })
        .then(r => r.ok ? r.json() : null)
        .then(rows => {
          if (rows && rows[0] && rows[0].data) render(Object.assign({}, d, rows[0].data));
        })
        .catch(() => {});
    })
    .catch(() => {});
})();
