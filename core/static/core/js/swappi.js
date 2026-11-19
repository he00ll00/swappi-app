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
    var state = { filter: 'all', q: '', saved: false };
    var grid = $('grid');

    function match(it) {
      if (state.saved && !isFav(it.id)) return false;
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
      var anySaved = favs().length > 0;
      $('savedDot').hidden = !anySaved;
      $('savedBtn').classList.toggle('on', state.saved);
      var title = state.saved ? 'Saved items' : state.q ? 'Results for “' + state.q + '”' : state.filter === 'trade' ? 'Open to trades' : 'Picked for you';
      $('gridTitle').textContent = title;
      $('gridSub').textContent = state.saved ? 'Listings you hearted' : state.q ? list.length + ' item' + (list.length === 1 ? '' : 's') + ' found' : state.filter === 'trade' ? 'Items you could swap for' : 'Based on your interest in fashion';
    }

    function setFilter(f) {
      state.filter = f; state.saved = false;
      render();
    }

    $('seeAll').addEventListener('click', function () { $('search').value = ''; state.q = ''; setFilter('all'); });
    var t; $('search').addEventListener('input', function (e) { clearTimeout(t); var v = e.target.value; t = setTimeout(function () { state.q = v.trim().toLowerCase(); render(); }, 120); });
    var nt = $('navTrade'); if (nt) nt.addEventListener('click', function (e) { e.preventDefault(); setFilter('trade'); grid.scrollIntoView({ behavior: 'smooth', block: 'start' }); setMenu(false); });
    $('savedBtn').addEventListener('click', function () {
      if (!favs().length && !state.saved) return;
      state.saved = !state.saved; render();
    });

    grid.addEventListener('click', function (e) {
      var h = e.target.closest('[data-heart]');
      if (h) { e.stopPropagation(); var on = toggleFav(h.dataset.heart); h.classList.toggle('on', on); $('savedDot').hidden = !favs().length; if (state.saved) render(); return; }
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
      var on = toggleFav(cur.id); this.classList.toggle('on', on); render();
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
      closeModal();
    });

    render();
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

  window.Swappi = { initDiscover: initDiscover, initCreate: initCreate };
})();
