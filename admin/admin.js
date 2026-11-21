/* INSTA vap Tlemcen — Espace gérant : commandes, catalogue, clients, horaires, galerie. */
(function () {
  'use strict';
  var URL_ = 'https://rvreusugrtiubqtafgbk.supabase.co';
  var KEY = 'sb_publishable_rTrEZB4mivU7kr9IwabvBQ_Q31CFt_1';
  var BUCKET = 'instavap';
  var sb = window.supabase.createClient(URL_, KEY);
  var $ = function (s) { return document.querySelector(s); };
  var DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  var CATS = ['Puffs jetables', 'Pods', 'Kits & Box', 'E-liquides', 'Résistances & Accessoires'];
  var STATUSES = ['nouvelle', 'confirmée', 'en préparation', 'prête', 'livrée', 'annulée'];
  var D = null, TAB = 'commandes', DIRTY = false, PROD_CAT = 'Toutes', ORD_ST = 'toutes';

  function h(tag, a) {
    var e = document.createElement(tag); a = a || {};
    Object.keys(a).forEach(function (k) {
      var v = a[k]; if (v == null || v === false) return;
      if (k === 'text') e.textContent = v;
      else if (k === 'value') e.value = v;
      else if (k === 'checked') e.checked = !!v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      [].concat(arguments[i]).forEach(function (c) {
        if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return e;
  }

  function toast(t, err) {
    var x = h('div', { class: 'toast' + (err ? ' e' : ''), text: t });
    $('#toasts').appendChild(x);
    setTimeout(function () { x.remove(); }, 3500);
  }
  function src(p) { return !p ? '' : /^https?:/.test(p) ? p : '../' + p; }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function da(n) { var v = parseInt(n, 10) || 0; return v > 0 ? v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' DA' : 'Sur demande'; }
  function dt(iso) { return iso ? new Date(iso).toLocaleString('fr-FR', { timeZone: 'Africa/Algiers', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''; }
  function dirty() { DIRTY = true; var d = $('#dirty'); if (d) d.textContent = 'Modifications non enregistrées'; }
  window.addEventListener('beforeunload', function (e) { if (DIRTY) { e.preventDefault(); e.returnValue = ''; } });

  function showLogin(msg) {
    $('#who').innerHTML = '';
    var em = h('input', { type: 'email', autocomplete: 'username', placeholder: 'admin.instavap@example.com' });
    var pw = h('input', { type: 'password', autocomplete: 'current-password' });
    var err = h('p', { class: 'err', text: msg || '' });
    var btn = h('button', { class: 'btn y', type: 'submit' }, 'Se connecter');
    var f = h('form', { class: 'login' },
      h('h1', { text: 'Admin INSTA \'Vap' }),
      h('p', { class: 'muted', text: 'Ouvrez votre lien de connexion directe ou entrez vos identifiants :' }),
      h('label', { text: 'Email' }), em,
      h('label', { text: 'Mot de passe' }), pw,
      err, btn
    );
    f.onsubmit = function (e) {
      e.preventDefault(); btn.disabled = true;
      sb.auth.signInWithPassword({ email: em.value.trim(), password: pw.value }).then(function (r) {
        btn.disabled = false;
        if (r.error) err.textContent = 'Identifiants incorrects.';
        else start();
      });
    };
    var app = $('#app'); app.innerHTML = ''; app.appendChild(f);
  }

  function start() {
    sb.rpc('instavap_is_admin').then(function (r) {
      if (r.error || !r.data) { showLogin('Ce compte n’a pas accès à l’admin INSTA vap.'); return; }
      $('#who').innerHTML = '';
      $('#who').appendChild(h('button', { class: 'btn sm', onclick: function () { sb.auth.signOut().then(function () { location.reload(); }); } }, 'Déconnexion'));
      return sb.from('instavap_content').select('data').eq('id', 1).single().then(function (c) {
        if (c.error) { $('#app').innerHTML = ''; $('#app').appendChild(h('p', { class: 'err pad', text: 'Impossible de charger le contenu.' })); return; }
        D = c.data.data;
        D.products = D.products || [];
        D.gallery = D.gallery || [];
        D.hours = D.hours || [];
        D.categories = D.categories || CATS.slice();
        draw();
      });
    });
  }

  function draw() {
    var app = $('#app'); app.innerHTML = '';
    app.appendChild(h('h1', { text: 'Espace gérant · INSTA \'Vap' }));
    app.appendChild(h('p', { class: 'muted', text: 'Gérez vos commandes, remplacez les produits d’exemple par vos vrais modèles, ou modifiez vos horaires.' }));
    var tabs = h('div', { class: 'tabs' });
    [
      ['commandes', '📦 Commandes'],
      ['produits', '🛒 Catalogue (' + D.products.length + ')'],
      ['crm', '📊 Clients & Stats'],
      ['boutique', '⚙️ Boutique & Galerie']
    ].forEach(function (t) {
      tabs.appendChild(h('button', { class: TAB === t[0] ? 'on' : '', onclick: function () { TAB = t[0]; draw(); } }, t[1]));
    });
    app.appendChild(tabs);
    var body = h('div'); app.appendChild(body);
    ({ commandes: drawOrders, produits: drawProducts, crm: drawCRM, boutique: drawBoutique })[TAB](body);

    var showSave = (TAB === 'produits' || TAB === 'boutique');
    if (showSave) {
      var save = h('button', { class: 'btn y', id: 'saveBtn', onclick: saveAll }, '💾 Enregistrer sur le site');
      app.appendChild(h('div', { class: 'savebar' },
        h('span', { class: 'dirty', id: 'dirty', text: DIRTY ? 'Modifications non enregistrées' : '' }),
        save,
        h('a', { class: 'btn', href: '../', target: '_blank' }, 'Voir le site ↗')
      ));
    }
  }

  /* ── Commandes ── */
  function drawOrders(body) {
    var filterBar = h('div', { class: 'tabs', style: 'margin-top:0' });
    ['toutes'].concat(STATUSES).forEach(function (st) {
      filterBar.appendChild(h('button', { class: ORD_ST === st ? 'on' : '', onclick: function () { ORD_ST = st; draw(); } }, st.charAt(0).toUpperCase() + st.slice(1)));
    });
    body.appendChild(filterBar);
    var list = h('div', {}, h('p', { class: 'muted', text: 'Chargement des commandes…' }));
    body.appendChild(list);

    sb.from('instavap_orders').select('id,items,total,status,fulfillment,address,notes,created_at,customer:instavap_customers(id,name,phone)').order('created_at', { ascending: false }).limit(150).then(function (r) {
      list.innerHTML = '';
      if (r.error) { list.appendChild(h('p', { class: 'err', text: 'Erreur chargement commandes : ' + r.error.message })); return; }
      var rows = (r.data || []).filter(function (o) { return ORD_ST === 'toutes' || o.status === ORD_ST; });
      if (!rows.length) {
        list.appendChild(h('div', { class: 'item', text: 'Aucune commande ' + (ORD_ST === 'toutes' ? 'pour le moment.' : 'avec le statut « ' + ORD_ST + ' ».') }));
        return;
      }
      rows.forEach(function (o) {
        var cust = o.customer || { name: 'Client', phone: '' };
        var tel = cust.phone ? 'tel:' + cust.phone.replace(/[^0-9+]/g, '') : '#';
        var sel = h('select', {
          style: 'width:auto;min-width:155px',
          onchange: function (e) {
            var ns = e.target.value;
            sb.from('instavap_orders').update({ status: ns, updated_at: new Date().toISOString() }).eq('id', o.id).then(function (u) {
              if (u.error) return toast('Erreur mise à jour statut', true);
              o.status = ns; toast('Commande #' + o.id + ' → ' + ns);
            });
          }
        }, STATUSES.map(function (s) { return h('option', { value: s, selected: o.status === s }, s); }));

        var itemsHtml = (o.items || []).map(function (it) {
          return it.qty + '× ' + it.name + (it.variant ? ' (' + it.variant + ')' : '') + (it.price > 0 ? ' — ' + da(it.price * it.qty) : '');
        }).join(' · ');

        list.appendChild(h('div', { class: 'item' },
          h('div', { class: 'order-head' },
            h('div', {},
              h('strong', { text: 'Commande #' + o.id + ' · ' + cust.name + ' ' }),
              h('span', { class: 'st-badge', text: o.fulfillment === 'livraison' ? '🛵 Livraison' : '🏪 Retrait' }),
              h('span', { class: 'muted', text: ' · ' + dt(o.created_at) })
            ),
            h('div', { class: 'row' },
              cust.phone ? h('a', { class: 'btn sm y', href: tel }, '📞 ' + cust.phone) : null,
              sel
            )
          ),
          h('div', { class: 'order-items', text: itemsHtml + ' — Total : ' + da(o.total) }),
          o.address ? h('p', { class: 'muted', style: 'margin:0;font-size:.86rem', text: '📍 Adresse : ' + o.address }) : null,
          o.notes ? h('p', { class: 'muted', style: 'margin:0;font-size:.86rem', text: '📝 Note : ' + o.notes }) : null
        ));
      });
    });
  }

  /* ── Catalogue (Produits) ── */
  function resize(file, max) {
    return new Promise(function (res, rej) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob(function (b) { b ? res(b) : rej(new Error('conversion')); }, 'image/webp', 0.84);
      };
      img.onerror = function () { rej(new Error('image illisible')); }; img.src = u;
    });
  }
  function upload(file, folder) {
    var base = folder + '/' + Date.now() + '-' + uid();
    return Promise.all([resize(file, 1400), resize(file, 700)]).then(function (b) {
      return Promise.all([
        sb.storage.from(BUCKET).upload(base + '.webp', b[0], { contentType: 'image/webp', upsert: false }),
        sb.storage.from(BUCKET).upload(base + '-700.webp', b[1], { contentType: 'image/webp', upsert: false })
      ]);
    }).then(function (r) {
      if (r[0].error || r[1].error) throw (r[0].error || r[1].error);
      return {
        photo: sb.storage.from(BUCKET).getPublicUrl(base + '.webp').data.publicUrl,
        thumb: sb.storage.from(BUCKET).getPublicUrl(base + '-700.webp').data.publicUrl
      };
    });
  }
  function photoBtn(label, onFile) {
    var inp = h('input', { type: 'file', accept: 'image/*' });
    var b = h('span', { class: 'btn sm up' }, label, inp);
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return; b.firstChild.textContent = 'Envoi…';
      onFile(f).then(function () { toast('Photo envoyée. Cliquez sur Enregistrer.'); }).catch(function (e) { toast('Erreur photo : ' + (e.message || e), true); b.firstChild.textContent = label; });
    };
    return b;
  }
  function move(arr, i, d) { var j = i + d; if (j < 0 || j >= arr.length) return; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; dirty(); draw(); }

  function drawProducts(body) {
    body.appendChild(h('div', { class: 'banner', text: '💡 Les articles marqués « Exemple » sont des modèles de démonstration. Remplacez-les par vos vrais modèles (photo, nom, catégorie, prix DA, caractéristiques) ou ajoutez-en de nouveaux, puis cliquez sur Enregistrer.' }));

    var cats = ['Toutes'].concat(D.categories || CATS);
    var catBar = h('div', { class: 'tabs', style: 'margin-top:0' });
    cats.forEach(function (c) {
      catBar.appendChild(h('button', { class: PROD_CAT === c ? 'on' : '', onclick: function () { PROD_CAT = c; draw(); } }, c));
    });
    body.appendChild(catBar);

    body.appendChild(h('div', { class: 'row', style: 'margin-bottom:1rem' },
      h('button', { class: 'btn y', onclick: function () {
        var c = PROD_CAT !== 'Toutes' ? PROD_CAT : 'Pods';
        D.products.unshift({
          id: 'p-' + uid(),
          name: 'Nouveau modèle',
          category: c,
          price: 0,
          specs: ['Batterie mAh', 'Puissance W', 'Contenance ml'],
          variants: '',
          description: '',
          photo: 'img/exemples/pod-exemple.webp',
          thumb: 'img/exemples/pod-exemple.webp',
          in_stock: true,
          is_example: false,
          visible: true
        });
        dirty(); draw();
      } }, '+ Ajouter un produit'),
      photoBtn('+ Ajouter avec photo', function (file) {
        return upload(file, 'produits').then(function (u) {
          var c = PROD_CAT !== 'Toutes' ? PROD_CAT : 'Pods';
          D.products.unshift({
            id: 'p-' + uid(), name: 'Nouveau produit', category: c, price: 0,
            specs: [], variants: '', description: '',
            photo: u.photo, thumb: u.thumb, in_stock: true, is_example: false, visible: true
          });
          dirty(); draw();
        });
      })
    ));

    D.products.forEach(function (p, i) {
      if (PROD_CAT !== 'Toutes' && p.category !== PROD_CAT) return;
      var catSel = h('select', { onchange: function (e) { p.category = e.target.value; dirty(); } },
        (D.categories || CATS).map(function (c) { return h('option', { value: c, selected: p.category === c }, c); })
      );
      var specsStr = Array.isArray(p.specs) ? p.specs.join(', ') : (p.specs || '');

      var fields = h('div', { class: 'fields' },
        h('div', { class: 'row', style: 'justify-content:space-between' },
          p.is_example !== false ? h('span', { class: 'ex-pill', text: 'Produit d’exemple' }) : h('span', { class: 'muted', text: 'Produit réel' }),
          h('span', { class: 'muted', text: 'ID : ' + p.id })
        ),
        h('div', { class: 'grid2' },
          h('div', {}, h('label', { class: 'f-lbl', text: 'Nom du produit' }), h('input', { type: 'text', value: p.name || '', oninput: function (e) { p.name = e.target.value; dirty(); } })),
          h('div', {}, h('label', { class: 'f-lbl', text: 'Catégorie' }), catSel),
          h('div', {}, h('label', { class: 'f-lbl', text: 'Prix en DA (0 = Sur demande)' }), h('input', { type: 'number', min: 0, step: 50, value: p.price || 0, oninput: function (e) { p.price = parseInt(e.target.value, 10) || 0; dirty(); } }))
        ),
        h('div', { class: 'grid2' },
          h('div', {}, h('label', { class: 'f-lbl', text: 'Caractéristiques (séparées par virgule)' }), h('input', { type: 'text', value: specsStr, placeholder: 'ex. 9000 puffs, USB-C, 18 ml', oninput: function (e) { p.specs = e.target.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean); dirty(); } })),
          h('div', {}, h('label', { class: 'f-lbl', text: 'Saveurs / Options (séparées par virgule)' }), h('input', { type: 'text', value: p.variants || '', placeholder: 'ex. 3 mg, 6 mg ou Mangue, Menthe', oninput: function (e) { p.variants = e.target.value; dirty(); } }))
        ),
        h('div', {}, h('label', { class: 'f-lbl', text: 'Description courte' }), h('textarea', { rows: 2, oninput: function (e) { p.description = e.target.value; dirty(); } }, p.description || '')),
        h('div', { class: 'row' },
          h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: p.in_stock !== false, onchange: function (e) { p.in_stock = e.target.checked; dirty(); } }), 'En stock'),
          h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: p.visible !== false, onchange: function (e) { p.visible = e.target.checked; dirty(); draw(); } }), 'Visible'),
          h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: p.is_example !== false, onchange: function (e) { p.is_example = e.target.checked; dirty(); draw(); } }), 'Marquer comme exemple'),
          photoBtn('Changer photo', function (file) { return upload(file, 'produits').then(function (u) { p.photo = u.photo; p.thumb = u.thumb; p.is_example = false; dirty(); draw(); }); }),
          h('button', { class: 'btn sm', onclick: function () { move(D.products, i, -1); } }, '↑'),
          h('button', { class: 'btn sm', onclick: function () { move(D.products, i, 1); } }, '↓'),
          h('button', { class: 'btn sm red', onclick: function () { if (confirm('Supprimer « ' + p.name + ' » ?')) { D.products.splice(i, 1); dirty(); draw(); } } }, 'Supprimer')
        )
      );
      body.appendChild(h('div', { class: 'item prod-item' + (p.visible === false ? ' hiddenp' : '') },
        h('img', { class: 'thumb', src: src(p.thumb || p.photo), alt: '' }),
        fields
      ));
    });
  }

  /* ── Clients & Stats ── */
  function drawCRM(body) {
    var kpiBox = h('div', {}, h('p', { class: 'muted', text: 'Chargement des statistiques…' }));
    body.appendChild(kpiBox);

    var since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    sb.from('instavap_orders_daily').select('*').gte('day', since).order('day', { ascending: false }).then(function (r) {
      kpiBox.innerHTML = '';
      var rows = r.data || [];
      var today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(new Date());
      var d7 = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
      function sum(fn, k) { return rows.filter(fn).reduce(function (s, x) { return s + Number(x[k] || 0); }, 0); }
      function kp(lbl, n, rev) { return h('div', { class: 'kpi' }, h('span', { class: 'muted', text: lbl }), h('b', { text: n + ' cmd' }), h('span', { text: da(rev) })); }
      kpiBox.appendChild(h('div', { class: 'kpis' },
        kp('Aujourd’hui', sum(function (x) { return x.day === today; }, 'orders_valid'), sum(function (x) { return x.day === today; }, 'revenue_da')),
        kp('7 derniers jours', sum(function (x) { return x.day >= d7; }, 'orders_valid'), sum(function (x) { return x.day >= d7; }, 'revenue_da')),
        kp('30 derniers jours', sum(function () { return true; }, 'orders_valid'), sum(function () { return true; }, 'revenue_da'))
      ));
    });

    body.appendChild(h('h2', { text: 'Clients enregistrés' }));
    var search = h('input', { type: 'search', placeholder: 'Rechercher un nom ou numéro…', style: 'margin-bottom:.9rem' });
    var clist = h('div', {}, h('p', { class: 'muted', text: 'Chargement des clients…' }));
    body.appendChild(search); body.appendChild(clist);

    var all = [];
    function renderClients() {
      var q = search.value.trim().toLowerCase();
      clist.innerHTML = '';
      var rows = all.filter(function (c) { return !q || (c.name + ' ' + c.phone).toLowerCase().indexOf(q) >= 0; });
      if (!rows.length) { clist.appendChild(h('p', { class: 'muted', text: 'Aucun client pour le moment.' })); return; }
      rows.forEach(function (c) {
        var ords = c.orders || [], valid = ords.filter(function (o) { return o.status !== 'annulée'; });
        var spent = valid.reduce(function (s, o) { return s + (o.total || 0); }, 0);
        var ta = h('textarea', { rows: 2, placeholder: 'Note gérant (saveurs préférées, remarques…) ' });
        ta.value = c.notes || '';
        clist.appendChild(h('div', { class: 'item' },
          h('div', { class: 'order-head' },
            h('strong', { text: c.name + ' · ' + ords.length + ' cmd · ' + da(spent) }),
            h('a', { class: 'btn sm', href: 'tel:' + c.phone.replace(/[^0-9+]/g, '') }, '📞 ' + c.phone)
          ),
          ta,
          h('button', { class: 'btn sm y', style: 'justify-self:start', onclick: function () {
            sb.from('instavap_customers').update({ notes: ta.value.trim() || null }).eq('id', c.id).then(function (u) {
              if (u.error) return toast('Erreur sauvegarde note', true);
              toast('Note client enregistrée');
            });
          } }, 'Enregistrer la note')
        ));
      });
    }
    search.oninput = renderClients;

    sb.from('instavap_customers').select('id,name,phone,notes,created_at,orders:instavap_orders(total,status,created_at)').order('created_at', { ascending: false }).limit(500).then(function (r) {
      if (r.error) { clist.innerHTML = ''; clist.appendChild(h('p', { class: 'err', text: r.error.message })); return; }
      all = r.data || []; renderClients();
    });
  }

  /* ── Boutique & Galerie ── */
  function field(label, key, type) {
    var inp = type === 'area'
      ? h('textarea', { rows: 2, oninput: function (e) { D[key] = e.target.value; dirty(); } }, D[key] || '')
      : h('input', { type: type || 'text', value: D[key] || '', oninput: function (e) { D[key] = e.target.value; dirty(); } });
    return h('div', { style: 'margin-bottom:10px' }, h('label', { style: 'display:block;font-size:.8rem;color:#cbbba8;margin-bottom:3px;font-weight:600', text: label }), inp);
  }
  function drawBoutique(body) {
    body.appendChild(h('h2', { text: 'Coordonnées & Réseaux' }));
    body.appendChild(field('Téléphone affiché', 'phone', 'tel'));
    body.appendChild(field('WhatsApp (format international sans +)', 'whatsapp', 'tel'));
    body.appendChild(field('Adresse', 'address'));
    body.appendChild(field('Lien Facebook', 'facebook'));
    body.appendChild(field('Lien Instagram (facultatif)', 'instagram'));
    body.appendChild(field('Lien TikTok (facultatif)', 'tiktok'));

    body.appendChild(h('h2', { text: 'Textes du site' }));
    body.appendChild(field('Ligne au-dessus du titre', 'kicker'));
    body.appendChild(field('Slogan / accroche', 'lead', 'area'));
    body.appendChild(field('Bannière aperçu catalogue', 'catalog_notice', 'area'));
    body.appendChild(field('Texte « La boutique »', 'about_intro', 'area'));

    body.appendChild(h('h2', { text: 'Horaires d’ouverture' }));
    [6, 0, 1, 2, 3, 4, 5].forEach(function (d) {
      var x = D.hours.filter(function (k) { return k.dow === d; })[0];
      if (!x) { x = { dow: d, closed: true, open: '11:00', close: '22:30' }; D.hours.push(x); }
      var o = h('input', { type: 'time', value: x.open, disabled: x.closed, onchange: function (e) { x.open = e.target.value; dirty(); } });
      var c = h('input', { type: 'time', value: x.close, disabled: x.closed, onchange: function (e) { x.close = e.target.value; dirty(); } });
      body.appendChild(h('div', { class: 'hours-row' },
        h('strong', { text: DAYS[d] }),
        h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: x.closed, onchange: function (e) { x.closed = e.target.checked; o.disabled = c.disabled = x.closed; dirty(); } }), 'Fermé'),
        o, c
      ));
    });

    body.appendChild(h('h2', { text: 'Photos de la boutique (Galerie)' }));
    D.gallery.forEach(function (g, i) {
      body.appendChild(h('div', { class: 'item prod-item' },
        h('img', { class: 'thumb', src: src(g.thumb || g.photo), alt: '' }),
        h('div', { class: 'fields' },
          h('div', {}, h('label', { class: 'f-lbl', text: 'Légende' }), h('input', { type: 'text', value: g.caption || '', oninput: function (e) { g.caption = e.target.value; dirty(); } })),
          h('div', { class: 'row' },
            h('button', { class: 'btn sm', onclick: function () { move(D.gallery, i, -1); } }, '↑'),
            h('button', { class: 'btn sm', onclick: function () { move(D.gallery, i, 1); } }, '↓'),
            h('button', { class: 'btn sm red', onclick: function () { if (confirm('Retirer cette photo ?')) { D.gallery.splice(i, 1); dirty(); draw(); } } }, 'Retirer')
          )
        )
      ));
    });
    body.appendChild(photoBtn('+ Ajouter une photo boutique', function (file) {
      return upload(file, 'galerie').then(function (u) {
        D.gallery.push({ id: 'g-' + uid(), caption: '', photo: u.photo, thumb: u.thumb });
        dirty(); draw();
      });
    }));
  }

  function saveAll() {
    var b = $('#saveBtn');
    if (D.products.some(function (p) { return !String(p.name || '').trim(); })) return toast('Chaque produit doit avoir un nom.', true);
    for (var i = 0; i < D.hours.length; i++) {
      var x = D.hours[i];
      if (!x.closed && (!x.open || !x.close || x.close <= x.open)) return toast(DAYS[x.dow] + ' : fermeture après ouverture.', true);
    }
    b.disabled = true; b.textContent = 'Enregistrement…';
    sb.from('instavap_content').update({ data: D, updated_at: new Date().toISOString() }).eq('id', 1).select('id').then(function (r) {
      b.disabled = false; b.textContent = '💾 Enregistrer sur le site';
      if (r.error || !r.data || !r.data.length) return toast('Échec de l’enregistrement.', true);
      DIRTY = false; var d = $('#dirty'); if (d) d.textContent = '';
      toast('Enregistré ✔ Le site est à jour.');
    });
  }

  function consumeLoginLink() {
    var m = /^#connexion=([A-Za-z0-9_-]{20,200})$/.exec(location.hash);
    if (!m) return Promise.resolve(false);
    history.replaceState(null, '', location.pathname + location.search);
    $('#app').innerHTML = ''; $('#app').appendChild(h('p', { class: 'muted pad', text: 'Connexion par lien sécurisé…' }));
    return sb.auth.verifyOtp({ type: 'magiclink', token_hash: m[1] }).then(function (r) {
      if (r.error) { showLogin('Ce lien de connexion a expiré ou a déjà été utilisé.'); return true; }
      start(); return true;
    });
  }

  consumeLoginLink().then(function (used) {
    if (!used) sb.auth.getSession().then(function (s) { s.data.session ? start() : showLogin(); });
  });
})();
