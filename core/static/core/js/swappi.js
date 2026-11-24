(function () {
  'use strict';

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  var ICONS = {
    Clothing: '<svg viewBox="0 0 24 24"><path d="M8 3l-5 3 2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z"/></svg>',
    Uniforms: '<svg viewBox="0 0 24 24"><path d="M8 3l-5 3 2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z"/></svg>',
    Books: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM20 17v4H6.5A2.5 2.5 0 0 1 4 18.5"/></svg>',
    Gadgets: '<svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>',
    Other: '<svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/></svg>'
  };
  function icon(cat) { return ICONS[cat] || ICONS.Other; }
  var HEART = '<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>';

  function $(id) { return document.getElementById(id); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }

  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ---- sidebar badges ---- */
  function refreshBadges() {
    var counts = {
      saved: store.get('swappi_favs', []).length,
      listings: store.get('swappi_listings', []).length,
      offers: store.get('swappi_offers', []).filter(function (o) { return o.dir === 'received' && o.status === 'pending'; }).length
    };
    document.querySelectorAll('[data-badge]').forEach(function (b) {
      var n = counts[b.dataset.badge] || 0;
      b.textContent = n; b.hidden = !n;
    });
  }
  refreshBadges();

  /* Highlight the sidebar link that matches the current page and filter. */
  (function markActive() {
    var links = document.querySelectorAll('.side-nav .nav-link'), here = location.pathname + location.search;
    var filtered = /[?&](saved|cat)=/.test(location.search);
    links.forEach(function (a) {
      var href = a.getAttribute('href');
      var on = href.indexOf('?') > -1 ? href === here : href === location.pathname && !filtered;
      a.classList.toggle('active', on);
    });
  })();

  /* ---- shared behaviour ---- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-toast]');
    if (el) e.preventDefault();
  });
  var menuBtn = $('menuBtn'), sidebar = document.querySelector('.sidebar'), scrim = $('scrim');
  function setMenu(open) { if (!sidebar) return; sidebar.classList.toggle('open', open); scrim.classList.toggle('open', open); }
  if (menuBtn) { menuBtn.addEventListener('click', function () { setMenu(!sidebar.classList.contains('open')); }); scrim.addEventListener('click', function () { setMenu(false); }); }
  var profileBtn = $('profileBtn'), profileMenu = $('profileMenu');
  function closeProfileMenu() {
    if (!profileBtn || !profileMenu) return;
    profileMenu.hidden = true; profileBtn.setAttribute('aria-expanded', 'false');
  }
  if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', function () {
      profileMenu.hidden = !profileMenu.hidden;
      profileBtn.setAttribute('aria-expanded', String(!profileMenu.hidden));
    });
    document.addEventListener('click', function (e) {
      if (!profileMenu.hidden && !profileMenu.contains(e.target) && !profileBtn.contains(e.target)) closeProfileMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !profileMenu.hidden) { closeProfileMenu(); profileBtn.focus(); }
    });
  }
  var logout = $('logout');
  if (logout) logout.addEventListener('click', function () { store.del('swappi_user'); });

  /* ---- favourites / listings ---- */
  function favs() { return store.get('swappi_favs', []); }
  function isFav(id) { return favs().indexOf(String(id)) > -1; }
  function toggleFav(id) {
    var f = favs(), i = f.indexOf(String(id));
    if (i > -1) f.splice(i, 1); else f.push(String(id));
    store.set('swappi_favs', f); return i === -1;
  }
  function priceLabel(it) { return it.price ? '₱' + Number(it.price).toLocaleString() : 'Swap only'; }
  function subLabel(it) {
    if (it.type === 'trade') return it.looking ? 'Looking for ' + it.looking.toLowerCase().replace(/^an? /, 'a ') : 'Open to swaps';
    if (it.type === 'both') return 'Cash or swap';
    return 'Cash at meetup';
  }

  function thumbHTML(it) {
    var inner = it.photo ? '<img src="' + it.photo + '" alt="">' : icon(it.category);
    return inner;
  }

  /* ---- discover page ---- */
  function initDiscover(createUrl) {
    var seed = JSON.parse($('seed-listings').textContent);
    var mine = store.get('swappi_listings', []);
    var all = mine.concat(seed);
    var params = new URLSearchParams(location.search);
    var state = { filter: 'all', q: '', saved: params.get('saved') === '1', cat: params.get('cat') || '' };
    var grid = $('grid');

    function match(it) {
      if (state.saved && !isFav(it.id)) return false;
      if (state.cat && it.category !== state.cat) return false;
      var f = state.filter;
      if (f === 'preloved' && it.condition !== 'Pre-loved') return false;
      if (f === 'new' && it.condition !== 'New') return false;
      if (f === 'trade' && it.type === 'sale') return false;
      if (state.q) {
        var hay = (it.title + ' ' + it.category + ' ' + (it.desc || '') + ' ' + (it.looking || '')).toLowerCase();
        if (hay.indexOf(state.q) === -1) return false;
      }
      return true;
    }

    function render() {
      var list = all.filter(match);
      grid.innerHTML = list.map(function (it) {
        return '<div class="card-item" data-id="' + esc(it.id) + '" role="button" tabindex="0" aria-label="' + esc(it.title) + '">' +
          '<div class="thumb" style="background:' + esc(it.tone || '#d9c3b0') + '">' + thumbHTML(it) +
          '<button class="heart' + (isFav(it.id) ? ' on' : '') + '" data-heart="' + esc(it.id) + '" aria-label="Save">' + HEART + '</button></div>' +
          '<p class="cond">' + esc(it.condition) + ' · ' + esc(it.grade) + '</p>' +
          '<h3>' + esc(it.title) + '</h3>' +
          '<p class="price">' + priceLabel(it) + '</p><p class="price-sub">' + esc(subLabel(it)) + '</p></div>';
      }).join('');
      $('empty').hidden = list.length > 0;
      $('emptyMsg').textContent = state.saved ? 'Heart an item to see it here.' : state.cat ? 'Nothing listed in ' + state.cat + ' yet.' : 'Try another search or filter.';
      var title = state.cat ? state.cat : state.saved ? 'Saved items' : state.q ? 'Results for “' + state.q + '”' : state.filter === 'trade' ? 'Open to trades' : 'Picked for you';
      $('gridTitle').textContent = title;
      $('gridSub').textContent = state.cat ? list.length + ' item' + (list.length === 1 ? '' : 's') + ' in this category' : state.saved ? 'Listings you hearted' : state.q ? list.length + ' item' + (list.length === 1 ? '' : 's') + ' found' : state.filter === 'trade' ? 'Items you could swap for' : 'Based on your interest in fashion';
    }

    function setFilter(f) {
      state.filter = f; state.saved = false; state.cat = '';
      render();
    }

    $('seeAll').addEventListener('click', function () { $('search').value = ''; state.q = ''; setFilter('all'); });
    var t; $('search').addEventListener('input', function (e) { clearTimeout(t); var v = e.target.value; t = setTimeout(function () { state.q = v.trim().toLowerCase(); render(); }, 120); });

    grid.addEventListener('click', function (e) {
      var h = e.target.closest('[data-heart]');
      if (h) { e.stopPropagation(); var on = toggleFav(h.dataset.heart); h.classList.toggle('on', on); refreshBadges(); if (state.saved) render(); return; }
      var c = e.target.closest('.card-item'); if (c) openModal(c.dataset.id);
    });
    grid.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card-item')) { e.preventDefault(); openModal(e.target.dataset.id); }
    });

    /* modal */
    var modal = $('modal'), cur = null, lastFocus = null, offerType = 'cash', offerPhoto = null;
    var offerPhotoInput = $('offerPhotoInput'), offerPhotoField = $('offerPhotoField');
    var offerPhotoPreview = $('offerPhotoPreview'), offerPhotoCard = offerPhotoField.querySelector('.offer-photo-card');
    var offerPhotoHint = $('offerPhotoHint'), offerPhotoErr = $('offerPhotoErr');
    function clearOfferPhoto() {
      offerPhoto = null; offerPhotoInput.value = ''; offerPhotoPreview.removeAttribute('src');
      offerPhotoPreview.hidden = true; offerPhotoCard.classList.remove('has-photo');
      offerPhotoHint.textContent = 'Upload a real photo of the item you want to swap.';
      offerPhotoErr.textContent = '';
    }
    function openModal(id) {
      cur = all.filter(function (x) { return String(x.id) === String(id); })[0]; if (!cur) return;
      lastFocus = document.activeElement;
      var ph = $('mPhoto'); ph.style.background = cur.tone || '#d9c3b0';
      ph.innerHTML = '<span class="tag">' + esc(cur.condition) + ' · ' + esc(cur.grade) + '</span>' + thumbHTML(cur);
      $('mTitle').textContent = cur.title;
      $('mPrice').textContent = priceLabel(cur);
      $('mTrade').hidden = cur.type === 'sale';
      $('mMeta').textContent = [cur.size && cur.size !== '—' ? 'Size ' + cur.size : '', cur.color, cur.category].filter(Boolean).join(' · ');
      $('mSeller').textContent = cur.seller; $('mRating').textContent = '★ ' + Number(cur.rating).toFixed(1);
      $('mDesc').textContent = cur.desc || 'No description provided.';
      var lk = $('mLooking'); lk.hidden = !cur.looking; lk.innerHTML = 'Open to swapping for: <b>' + esc(cur.looking) + '</b>';
      $('mHeart').classList.toggle('on', isFav(cur.id));
      $('offerBox').hidden = true; $('mActions').hidden = false;
      $('reportBox').hidden = true; $('mReport').hidden = false;
      $('offerCash').value = ''; $('offerSwap').value = '';
      clearOfferPhoto();
      var canSwap = cur.type !== 'sale', canCash = cur.type !== 'trade';
      var btns = document.querySelectorAll('#offerType button');
      btns[0].hidden = !canCash; btns[1].hidden = !canSwap;
      setOfferType(canCash ? 'cash' : 'swap');
      modal.hidden = false; document.body.style.overflow = 'hidden'; $('mClose').focus();
    }
    function closeModal() { modal.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }
    function setOfferType(v) {
      offerType = v;
      document.querySelectorAll('#offerType button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === v); });
      $('offerCash').hidden = v !== 'cash'; $('offerSwap').hidden = v !== 'swap';
      offerPhotoField.hidden = v !== 'swap';
      offerPhotoInput.required = v === 'swap';
      offerPhotoInput.setAttribute('aria-required', v === 'swap' ? 'true' : 'false');
      offerPhotoErr.textContent = '';
    }
    offerPhotoInput.addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      if (!/^image\//i.test(file.type)) {
        this.value = ''; offerPhotoErr.textContent = 'Choose an image file for your swap photo.'; return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        if (typeof reader.result !== 'string') {
          offerPhotoErr.textContent = 'Could not load that photo. Please choose another image.'; return;
        }
        offerPhoto = reader.result;
        offerPhotoPreview.src = offerPhoto; offerPhotoPreview.hidden = false;
        offerPhotoCard.classList.add('has-photo');
        offerPhotoHint.textContent = file.name + ' · Tap to change photo.';
        offerPhotoErr.textContent = '';
      };
      reader.onerror = function () { offerPhotoErr.textContent = 'Could not read that photo. Please choose another image.'; };
      reader.readAsDataURL(file);
    });
    $('mClose').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
    $('mHeart').addEventListener('click', function () {
      var on = toggleFav(cur.id); this.classList.toggle('on', on); refreshBadges(); render();
    });
    $('mMsg').addEventListener('click', function () { closeModal(); });
    $('mOffer').addEventListener('click', function () { $('offerBox').hidden = false; $('mActions').hidden = true; });
    $('offerType').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setOfferType(b.dataset.v); });
    $('offerSend').addEventListener('click', function () {
      var val = offerType === 'cash' ? $('offerCash').value.trim() : $('offerSwap').value.trim();
      if (!val) return;
      if (offerType === 'swap' && !offerPhoto) {
        offerPhotoErr.textContent = 'A photo of your swap item is required.';
        offerPhotoInput.focus(); return;
      }
      var list = store.get('swappi_offers', []);
      list.unshift({
        id: 'o' + Date.now(), dir: 'sent', status: 'pending', ts: Date.now(),
        itemId: cur.id, title: cur.title, tone: cur.tone, category: cur.category,
        photo: cur.photo && cur.photo.indexOf('data:') !== 0 ? cur.photo : null,
        who: cur.seller, kind: offerType, value: val, spot: $('offerSpot').value, rating: 0
      });
      store.set('swappi_offers', list);
      refreshBadges();
      closeModal();
      toast('Offer sent. Track it under Offers & meetups.');
    });

    /* report listing (stored in this browser only) */
    $('mReport').addEventListener('click', function () { $('reportBox').hidden = false; this.hidden = true; });
    $('reportCancel').addEventListener('click', function () { $('reportBox').hidden = true; $('mReport').hidden = false; });
    $('reportSend').addEventListener('click', function () {
      var reports = store.get('swappi_reports', []);
      reports.push({ itemId: cur.id, title: cur.title, reason: $('reportReason').value, ts: Date.now() });
      store.set('swappi_reports', reports);
      $('reportBox').hidden = true; $('mReport').hidden = false;
      closeModal();
      toast('Report submitted. Thanks for keeping Swappi safe.');
    });

    var wanted = params.get('item');
    if (wanted) {
      openModal(wanted);
      // Drop ?item= so reloading or coming back later doesn't reopen the modal.
      history.replaceState(null, '', location.pathname + (state.cat ? '?cat=' + encodeURIComponent(state.cat) : state.saved ? '?saved=1' : ''));
    }

    render();
    // Coming back via the browser's back button can restore a stale page; redraw the grid.
    window.addEventListener('pageshow', function (e) { if (e.persisted) { all = store.get('swappi_listings', []).concat(seed); render(); } });
  }

  /* ---- create listing page ---- */
  function initCreate(discoverUrl) {
    var photos = [];  // data URLs (resized)
    var type = 'sale';
    var MAX = 6;
    var f = { title: $('title'), category: $('category'), condition: $('condition'), price: $('price'), desc: $('desc'), swap: $('swapFor') };

    function syncType() {
      document.querySelectorAll('#listType button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === type); });
      $('priceField').hidden = type === 'trade';
      $('swapField').hidden = type === 'sale';
    }
    $('listType').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { type = b.dataset.v; syncType(); } });

    function renderPhotos() {
      var grid = $('photoGrid'), add = $('addPhoto');
      grid.querySelectorAll('.ph').forEach(function (n) { n.remove(); });
      photos.forEach(function (src, i) {
        var d = document.createElement('div'); d.className = 'ph';
        d.innerHTML = '<img src="' + src + '" alt="Photo ' + (i + 1) + '">' + (i === 0 ? '<span class="cover">Cover</span>' : '') + '<button type="button" class="rm" data-i="' + i + '" aria-label="Remove photo">×</button>';
        grid.insertBefore(d, add);
      });
      add.hidden = photos.length >= MAX;
      $('photoCount').textContent = photos.length + ' of ' + MAX;
    }
    function resize(file, cb) {
      var r = new FileReader();
      r.onload = function () {
        var img = new Image();
        img.onload = function () {
          var s = Math.min(1, 480 / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          cb(c.toDataURL('image/jpeg', 0.75));
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    }
    $('photoInput').addEventListener('change', function (e) {
      var files = Array.prototype.slice.call(e.target.files).filter(function (x) { return /^image\//.test(x.type); });
      var room = MAX - photos.length;
      files.slice(0, room).forEach(function (file) { resize(file, function (d) { photos.push(d); renderPhotos(); $('photoErr').textContent = ''; }); });
      e.target.value = '';
    });
    $('photoGrid').addEventListener('click', function (e) {
      var b = e.target.closest('.rm'); if (b) { photos.splice(+b.dataset.i, 1); renderPhotos(); }
    });

    function draftData() { return { title: f.title.value, category: f.category.value, condition: f.condition.value, price: f.price.value, desc: f.desc.value, swap: f.swap.value, type: type, photos: photos }; }
    $('saveDraft').addEventListener('click', function () {
      store.set('swappi_draft', draftData());
    });
    var d = store.get('swappi_draft', null);
    if (d) {
      f.title.value = d.title || ''; f.category.value = d.category || ''; f.condition.value = d.condition || '';
      f.price.value = d.price || ''; f.desc.value = d.desc || ''; f.swap.value = d.swap || ''; type = d.type || 'sale'; photos = d.photos || [];
    }
    syncType(); renderPhotos();

    function setErr(el, msg) {
      el.classList.toggle('invalid', !!msg);
      var s = el.closest('.field').querySelector('.error'); if (s) s.textContent = msg || '';
      return !msg;
    }
    $('listingForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      ok = setErr(f.title, f.title.value.trim().length < 3 ? 'Give your item a title.' : '') && ok;
      ok = setErr(f.category, f.category.value ? '' : 'Choose a category.') && ok;
      ok = setErr(f.condition, f.condition.value ? '' : 'Choose a condition.') && ok;
      if (type !== 'trade') ok = setErr(f.price, +f.price.value > 0 ? '' : 'Enter a price.') && ok;
      ok = setErr(f.desc, f.desc.value.trim().length < 5 ? 'Add a short description.' : '') && ok;
      if (type !== 'sale') ok = setErr(f.swap, f.swap.value.trim() ? '' : 'Tell people what you want in return.') && ok;
      $('photoErr').textContent = photos.length ? '' : 'Add at least one photo.';
      if (!photos.length) ok = false;
      if (!ok) return;

      var cond = f.condition.value;
      var item = {
        id: 'u' + Date.now(), title: f.title.value.trim(), price: type === 'trade' ? null : +f.price.value,
        condition: cond === 'New' ? 'New' : 'Pre-loved', grade: cond === 'New' ? 'Unworn' : cond,
        type: type, category: f.category.value, size: '—', color: '', seller: 'You', rating: 5,
        tone: '#e7dfe0', desc: f.desc.value.trim(), looking: type === 'sale' ? '' : f.swap.value.trim(), photo: photos[0]
      };
      var mine = store.get('swappi_listings', []); mine.unshift(item);
      if (!store.set('swappi_listings', mine)) { item.photo = null; mine[0] = item; store.set('swappi_listings', mine); }
      store.del('swappi_draft');
      setTimeout(function () { location.href = discoverUrl; }, 800);
    });
  }

  /* ---- offers & meetups page ---- */
  var STATUS = { pending: 'Pending', accepted: 'Meetup set', declined: 'Declined', cancelled: 'Cancelled', completed: 'Completed' };

  function initOffers(discoverUrl) {
    var seed = JSON.parse($('seed-listings').textContent);
    var tab = 'sent';

    // One-time demo offers so the page isn't empty on first visit.
    if (!store.get('swappi_offers_seeded', false)) {
      var bag = seed.filter(function (x) { return x.id === 6; })[0];
      var demo = [
        { id: 'd1', dir: 'sent', status: 'accepted', ts: Date.now() - 864e5, itemId: bag.id, title: bag.title, tone: bag.tone,
          category: bag.category, photo: bag.photo, who: bag.seller, kind: 'swap', value: 'Canvas tote bag', spot: 'Student Center', rating: 0 },
        { id: 'd2', dir: 'received', status: 'pending', ts: Date.now() - 36e5, itemId: null, title: 'Your pink crochet top', tone: '#e7dfe0',
          category: 'Clothing', photo: null, who: 'Janelle R.', kind: 'cash', value: '90', spot: 'Main Library steps', rating: 0 },
        { id: 'd3', dir: 'received', status: 'pending', ts: Date.now() - 72e5, itemId: null, title: 'Your denim jacket', tone: '#e7dfe0',
          category: 'Clothing', photo: null, who: 'Rey T.', kind: 'swap', value: 'Plain white tee', spot: 'College canteen', rating: 0 }
      ];
      store.set('swappi_offers', store.get('swappi_offers', []).concat(demo));
      store.set('swappi_offers_seeded', true);
    }

    function all() { return store.get('swappi_offers', []); }
    function update(id, patch) {
      var list = all();
      list.forEach(function (o) { if (o.id === id) for (var k in patch) o[k] = patch[k]; });
      store.set('swappi_offers', list);
    }
    function stars(o) {
      var h = '<div class="stars" role="group" aria-label="Rate ' + esc(o.who) + '">';
      for (var i = 1; i <= 5; i++) h += '<button type="button" class="star' + (i <= o.rating ? ' on' : '') + '" data-rate="' + i + '" data-id="' + esc(o.id) + '" aria-label="' + i + ' star' + (i > 1 ? 's' : '') + '">★</button>';
      return h + '</div>';
    }
    function actions(o) {
      var id = esc(o.id);
      if (o.status === 'pending') {
        return o.dir === 'sent'
          ? '<button class="btn btn-ghost" data-act="cancelled" data-id="' + id + '">Cancel offer</button>'
          : '<button class="btn btn-ghost" data-act="declined" data-id="' + id + '">Decline</button><button class="btn btn-primary" data-act="accepted" data-id="' + id + '">Accept</button>';
      }
      if (o.status === 'accepted') return '<button class="btn btn-primary" data-act="completed" data-id="' + id + '">Confirm we met up</button>';
      if (o.status === 'completed') return '<div class="rate"><span class="small muted">' + (o.rating ? 'You rated ' + esc(o.who) : 'Rate ' + esc(o.who)) + '</span>' + stars(o) + '</div>';
      return '';
    }

    function render() {
      var list = all(), mine = list.filter(function (o) { return o.dir === tab; });
      $('countSent').textContent = list.filter(function (o) { return o.dir === 'sent'; }).length || '';
      $('countReceived').textContent = list.filter(function (o) { return o.dir === 'received'; }).length || '';
      $('offerEmpty').hidden = mine.length > 0;
      $('offerList').innerHTML = mine.map(function (o) {
        var what = o.kind === 'cash' ? '₱' + Number(o.value).toLocaleString() + ' cash' : 'Swap: ' + esc(o.value);
        var who = o.dir === 'sent' ? 'To ' : 'From ';
        var link = o.itemId != null ? '<a class="link" href="' + discoverUrl + '?item=' + encodeURIComponent(o.itemId) + '">View item</a>' : '';
        return '<article class="offer-card">' +
          '<div class="thumb mini" style="background:' + esc(o.tone || '#d9c3b0') + '">' + (o.photo ? '<img src="' + esc(o.photo) + '" alt="">' : icon(o.category)) + '</div>' +
          '<div class="offer-main"><div class="offer-top"><h3>' + esc(o.title) + '</h3><span class="status ' + esc(o.status) + '">' + STATUS[o.status] + '</span></div>' +
          '<p class="small">' + who + '<strong>' + esc(o.who) + '</strong> · ' + what + '</p>' +
          '<p class="small muted">Meetup: ' + esc(o.spot) + ' · ' + new Date(o.ts).toLocaleDateString() + ' ' + link + '</p>' +
          '<div class="offer-actions">' + actions(o) + '</div></div></article>';
      }).join('');
    }

    $('offerTabs').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      tab = b.dataset.v;
      document.querySelectorAll('#offerTabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
      render();
    });
    $('offerList').addEventListener('click', function (e) {
      var s = e.target.closest('[data-rate]');
      if (s) { update(s.dataset.id, { rating: +s.dataset.rate }); render(); toast('Thanks for rating!'); return; }
      var a = e.target.closest('[data-act]');
      if (!a) return;
      update(a.dataset.id, { status: a.dataset.act }); refreshBadges();
      var msg = { accepted: 'Offer accepted. Meet up at the agreed spot.', declined: 'Offer declined.', cancelled: 'Offer cancelled.', completed: 'Trade completed. Rate your meetup below.' };
      toast(msg[a.dataset.act]); render();
    });
    render();
  }

  /* ---- trade matches page ---- */
  var STOP = ['and', 'the', 'for', 'size', 'any', 'with', 'new', 'old'];
  function tokens(s) {
    return (s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
      .map(function (w) { return w.replace(/s$/, ''); })
      .filter(function (w) { return w.length > 2 && STOP.indexOf(w) === -1; });
  }
  function overlap(a, b) { return a.filter(function (w) { return b.indexOf(w) > -1; }); }

  function initMatches(discoverUrl, createUrl, offersUrl) {
    var seed = JSON.parse($('seed-listings').textContent).filter(function (x) { return x.type !== 'sale' && x.looking; });
    var mine = store.get('swappi_listings', []).filter(function (x) { return x.type !== 'sale' && x.looking; });
    var samples = [
      { id: 'sample-a', title: 'Canvas tote bag', category: 'Other', looking: 'A dress', desc: '' },
      { id: 'sample-b', title: 'Pink crochet top', category: 'Clothing', looking: 'A bag', desc: '' }
    ];
    var own = mine.length ? mine : samples;
    var sel = $('matchItem');
    var openId = null;   // match currently expanded into a trade card
    var results = [];
    sel.innerHTML = own.map(function (o) { return '<option value="' + esc(o.id) + '">' + esc(o.title) +'</option>'; }).join('');

    function current() { return own.filter(function (o) { return String(o.id) === sel.value; })[0] || own[0]; }
    function sentOffer(me, it) {
      return store.get('swappi_offers', []).filter(function (o) {
        return o.dir === 'sent' && String(o.itemId) === String(it.id) && o.value === me.title && o.status !== 'cancelled';
      })[0];
    }
    function mini(x, fallbackTone) {
      return '<div class="thumb mini" style="background:' + esc(x.tone || fallbackTone) + '">' + thumbHTML(x) + '</div>';
    }

    function tradeCard(me, r) {
      var it = r.it, both = r.a && r.b;
      var why = both ? 'They want what you have and you want what they have.'
        : r.a ? 'They are looking for “' + esc(it.looking) + '”.' : 'You are looking for “' + esc(me.looking) + '”.';
      return '<article class="trade-card" data-id="' + esc(it.id) + '">' +
        '<header class="trade-head"><strong>Swap proposal</strong>' +
        '<button type="button" class="icon-btn" data-close aria-label="Close proposal"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button></header>' +
        '<div class="trade-row">' +
          '<div class="trade-side"><span class="trade-label">You give</span>' + mini(me, '#e7dfe0') +
            '<strong>' + esc(me.title) + '</strong><small>' + esc(me.category) + '</small></div>' +
          '<div class="trade-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3"/></svg></div>' +
          '<div class="trade-side"><span class="trade-label">You get</span>' + mini(it, '#d9c3b0') +
            '<strong>' + esc(it.title) + '</strong><small>' + esc(it.seller) + ' · ★ ' + Number(it.rating).toFixed(1) + '</small></div>' +
        '</div>' +
        '<p class="trade-why small"><span class="status ' + (both ? 'completed' : 'pending') + '">' + (both ? 'Two-way match' : 'One-way match') + '</span> ' + why + '</p>' +
        '<label class="small" for="tradeSpot"><strong>Meetup spot</strong></label>' +
        '<select id="tradeSpot"><option>Main Library steps</option><option>Student Center</option><option>Main Gate waiting shed</option><option>College canteen</option></select>' +
        '<div class="actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button>' +
        '<button type="button" class="btn btn-primary" data-send>Send swap offer</button></div>' +
        '</article>';
    }

    function matchCard(me, r) {
      var it = r.it, both = r.a && r.b, sent = sentOffer(me, it);
      var why = both ? 'Perfect swap: they want what you have, and you want what they have.'
        : r.a ? 'They are looking for “' + esc(it.looking) + '”, which fits your item.'
        : 'This matches what you want: ' + esc(me.looking) + '.';
      var action = sent
        ? '<span class="status accepted">Offer sent</span><a class="link" href="' + offersUrl + '">View in Offers &amp; meetups</a>'
        : '<button type="button" class="btn btn-primary" data-open="' + esc(it.id) + '">Offer a swap</button>';
      return '<article class="offer-card match-card">' + mini(it, '#d9c3b0') +
        '<div class="offer-main"><div class="offer-top"><h3>' + esc(it.title) + '</h3>' +
        '<span class="status ' + (both ? 'completed' : 'pending') + '">' + (both ? 'Two-way match' : 'One-way match') + '</span></div>' +
        '<p class="small muted">' + esc(it.seller) + ' · ' + esc(it.condition) + ' · ' + esc(it.grade) + '</p>' +
        '<p class="small">' + why + '</p>' +
        '<div class="offer-actions">' + action + '</div></div></article>';
    }

    function render() {
      var me = current();
      var myHave = tokens(me.title + ' ' + me.category), myWant = tokens(me.looking);
      results = seed.map(function (it) {
        return { it: it, a: overlap(tokens(it.looking), myHave).length > 0, b: overlap(myWant, tokens(it.title + ' ' + it.category)).length > 0 };
      }).filter(function (r) { return r.a || r.b; })
        .sort(function (x, y) { return (y.a + y.b) - (x.a + x.b); });

      $('matchEmpty').hidden = results.length > 0;
      $('matchList').innerHTML = results.map(function (r) {
        return String(r.it.id) === String(openId) ? tradeCard(me, r) : matchCard(me, r);
      }).join('');
    }

    sel.addEventListener('change', function () { openId = null; render(); });
    $('matchList').addEventListener('click', function (e) {
      var o = e.target.closest('[data-open]');
      if (o) { openId = o.dataset.open; render(); var c = document.querySelector('.trade-card'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
      if (e.target.closest('[data-close]')) { openId = null; render(); return; }
      if (e.target.closest('[data-send]')) {
        var me = current(), r = results.filter(function (x) { return String(x.it.id) === String(openId); })[0];
        if (!r) return;
        var list = store.get('swappi_offers', []);
        list.unshift({
          id: 'o' + Date.now(), dir: 'sent', status: 'pending', ts: Date.now(),
          itemId: r.it.id, title: r.it.title, tone: r.it.tone, category: r.it.category, photo: r.it.photo,
          who: r.it.seller, kind: 'swap', value: me.title, spot: $('tradeSpot').value, rating: 0
        });
        store.set('swappi_offers', list);
        refreshBadges(); openId = null; render();
        toast('Swap offer sent to ' + r.it.seller + '.');
      }
    });
    render();
  }

  /* ---- saved items page ---- */
  function initSaved(discoverUrl) {
    var seed = JSON.parse($('seed-listings').textContent);
    var all = store.get('swappi_listings', []).concat(seed);
    var box = $('savedList');

    function render() {
      var list = all.filter(function (it) { return isFav(it.id); });
      $('savedEmpty').hidden = list.length > 0;
      $('savedCount').textContent = list.length ? list.length + (list.length === 1 ? ' item' : ' items') : '';
      box.innerHTML = list.map(function (it) {
        var link = discoverUrl + '?item=' + encodeURIComponent(it.id);
        return '<article class="saved-card">' +
          '<a class="thumb" href="' + link + '" style="background:' + esc(it.tone || '#d9c3b0') + '" aria-label="' + esc(it.title) + '">' + thumbHTML(it) + '</a>' +
          '<div class="saved-body">' +
            '<p class="cond">' + esc(it.condition) + ' · ' + esc(it.grade) + '</p>' +
            '<h3><a href="' + link + '">' + esc(it.title) + '</a></h3>' +
            '<p class="price">' + priceLabel(it) + ' <span class="price-sub">' + esc(subLabel(it)) + '</span></p>' +
            '<p class="small muted">' + esc(it.seller) + ' · ★ ' + Number(it.rating).toFixed(1) + '</p>' +
            '<div class="saved-actions"><a class="btn btn-primary" href="' + link + '">View item</a>' +
            '<button type="button" class="btn btn-ghost" data-unsave="' + esc(it.id) + '">Remove</button></div>' +
          '</div></article>';
      }).join('');
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-unsave]'); if (!b) return;
      toggleFav(b.dataset.unsave); refreshBadges(); render();
    });
    render();
  }

  /* ---- my listings page ---- */
  function initMyListings() {
    var box = $('myList');
    function render() {
      var list = store.get('swappi_listings', []);
      $('myEmpty').hidden = list.length > 0;
      box.innerHTML = list.map(function (it) {
        var kind = it.type === 'trade' ? 'Swap only' : it.type === 'both' ? 'Cash or swap' : 'For sale';
        return '<article class="offer-card">' +
          '<div class="thumb mini" style="background:' + esc(it.tone || '#e7dfe0') + '">' + thumbHTML(it) + '</div>' +
          '<div class="offer-main"><div class="offer-top"><h3>' + esc(it.title) + '</h3><span class="status accepted">' + kind + '</span></div>' +
          '<p class="small"><strong>' + priceLabel(it) + '</strong> · ' + esc(it.condition) + ' · ' + esc(it.category) + '</p>' +
          (it.looking ? '<p class="small muted">Looking for: ' + esc(it.looking) + '</p>' : '') +
          '<div class="offer-actions"><button class="btn btn-ghost" data-del="' + esc(it.id) + '">Delete listing</button></div></div></article>';
      }).join('');
      refreshBadges();
    }
    box.addEventListener('click', function (e) {
      var d = e.target.closest('[data-del]'); if (!d) return;
      store.set('swappi_listings', store.get('swappi_listings', []).filter(function (x) { return String(x.id) !== d.dataset.del; }));
      toast('Listing deleted.'); render();
    });
    render();
  }

  window.Swappi = { initSaved: initSaved, initMyListings: initMyListings, initDiscover: initDiscover, initCreate: initCreate, initOffers: initOffers, initMatches: initMatches };
})();
