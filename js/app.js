/* ===== App Shell — Shared Utilities, Tab Switching, Defaults ──── */
(function () {
  "use strict";

  /* ── Blob save helper ──────────────────── */
  async function saveBlobWithDialog(b,dn){
    try{var h=await window.showSaveFilePicker({suggestedName:dn,types:[{description:'Word Document',accept:{'application/msword':['.doc']}}]});var w=await h.createWritable();await w.write(b);await w.close()}
    catch(e){if(e.name!=='AbortError'){var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download=dn;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u)}}
  }
  window.saveBlobWithDialog = saveBlobWithDialog;

  /* ── Export dropdown toggle ────────────── */
  function toggleExportDropdown(e,tab){e.stopPropagation();var d=document.getElementById('export'+tab.charAt(0).toUpperCase()+tab.slice(1)+'Dropdown');d.classList.toggle('show')}
  document.addEventListener('click',function(){document.querySelectorAll('.export-dropdown,.info-popup').forEach(function(d){d.classList.remove('show')})});

  /* ── Info popup toggle (generic) ───────── */
  function toggleInfo(e){e.stopPropagation();var icon=e.currentTarget;var container=icon.closest('.fgi')||icon.parentElement;var popup=container.querySelector(':scope > .info-popup');if(popup){document.querySelectorAll('.info-popup.show').forEach(function(d){if(d!==popup)d.classList.remove('show')});if(!popup.classList.contains('show')){var r=icon.getBoundingClientRect();var pw=parseInt(popup.style.width)||320;var left=r.left;if(left+pw>window.innerWidth)left=window.innerWidth-pw-8;if(left<0)left=8;popup.style.top=(r.bottom+4)+'px';popup.style.left=left+'px';popup.classList.add('show')}else{popup.classList.remove('show')}}}
  window.toggleInfo = toggleInfo;
  window.toggleExportDropdown = toggleExportDropdown;

  /* ── Tab switching ─────────────────────── */
  document.querySelectorAll(".tab-btn[data-tab]").forEach(function(btn){
    btn.addEventListener("click", function(){
      // Update nav
      document.querySelectorAll(".tab-btn").forEach(function(b){b.classList.remove("active")});
      this.classList.add("active");

      // Toggle content with forced reflow (Chrome layout fix)
      document.querySelectorAll(".tab-content").forEach(function(tc){tc.style.display="none"});
      var targetId="tab-"+this.dataset.tab;
      var target=document.getElementById(targetId);
      if(!target)return;
      target.style.display="block";
      void(target.offsetHeight); // force reflow

      // Lazy-init tab content on first visit
      if(this.dataset.tab==="safety"&&!document.querySelector("#sN [data-id]")){
        var defaultNodes = _defaults && _defaults.safety && Array.isArray(_defaults.safety.nodes) ? _defaults.safety.nodes : null;
        if(typeof initSafety==='function')initSafety(defaultNodes);
      }
    });
  });

  /* ── Defaults loading (from server API → localStorage fallback) ─── */
  var _defaults = null; // Cache defaults for initSafety/initCapacitor

  async function loadDefaults(){
    try{
      var resp=await fetch('/api/defaults');
      if(!resp.ok)return;
      var d=await resp.json();
      _defaults = d;
      window._defaultsApplied = true; // FIX Bug #3: track defaults arrival for race condition prevention
      applyDefaults(d);
    }catch(e){/* no server — try localStorage fallback */}

    /* Restore from localStorage if server didn't provide defaults */
    if(!_defaults || !_defaults.capacitor || !_defaults.safety){
      try{
        var saved = JSON.parse(localStorage.getItem('hw-design-state'));
        if(saved && typeof saved === 'object'){
          _defaults = saved;
          applyDefaults(saved);
        }
      }catch(e){/* corrupt localStorage — ignore */}
    }
  }

  /* ── Auto-save to localStorage on input change ─── */
  var _saveTimer = null;
  function scheduleSave(){
    if(_saveTimer)clearTimeout(_saveTimer);
    _saveTimer = setTimeout(function(){
      // Collect current form state from both tabs
      var state = {capacitor:{}, safety:{}};

      /* Capacitor fields */
      ['l0','tmax','tau','vrated','irated','dt0','workdays','warrantyTarget'].forEach(function(id){
        var el=document.getElementById(id); if(el) state.capacitor[id]=el.value;
      });
      var scenarioEl=document.getElementById('scenario'); if(scenarioEl) state.capacitor.scenario=scenarioEl.value;

      /* Safety fields */
      ['sStd','sPd','sMg','sAlt','sIsolation','sOvc_AC','sOvc_DC'].forEach(function(id){
        var el=document.getElementById(id); if(el) state.safety[id]=el.value;
      });
      ['sSysV_AC','sSysV_DC'].forEach(function(id){
        var el=document.getElementById(id); if(el) state.safety[id]=el.value;
      });

      try{localStorage.setItem('hw-design-state', JSON.stringify(state))}catch(e){/* quota exceeded — ignore */}
    }, 500); // debounce 500ms
  }

  document.addEventListener('input', scheduleSave, true);
  document.addEventListener('change', scheduleSave, true);

  function applyDefaults(d){
    if(!d||typeof d!=='object')return;

    /* Capacitor defaults */
    var c=d.capacitor;if(c&&typeof c==='object'){
      setVal('l0',c.l0);setVal('tmax',c.tmax);setVal('tau',c.tau||'10');setVal('vrated',c.vrated);setVal('irated',c.irated);
      setVal('dt0',c.dt0);setVal('workdays',c.workdays);setVal('warrantyTarget',c.warrantyTarget);
      if(c.scenario)document.getElementById('scenario').value=c.scenario;

      /* Load segments from defaults — replaces initCapacitor placeholders */
      if(Array.isArray(c.segments)&&c.segments.length){
        if(typeof loadSegmentsFromDefaults==='function'){
          loadSegmentsFromDefaults(c.segments);
        }
      }
    }

    /* Safety defaults */
    var s=d.safety;if(s&&typeof s==='object'){
      setValSelect('sStd',s.sStd);setValSelect('sPd',s.sPd+'');setValSelect('sMg',s.sMg);
      setValSelect('sAlt',s.sAlt+'');setValSelect('sIsolation',s.sIsolation||'isolated');
      setValSelect('sOvc_AC',s.sOvc_AC||'ii');
      if(s.sOvc_DC){if(typeof setDcManualOverride==='function')setDcManualOverride(true);setValSelect('sOvc_DC',s.sOvc_DC);
        /* Re-apply after initSafety may have overridden it */
        setTimeout(function(){if(typeof setDcManualOverride==='function')setDcManualOverride(true);setValSelect('sOvc_DC',s.sOvc_DC);},500);
      }
      setVal('sSysV_AC',s.sSysV_AC+'');setVal('sSysV_DC',s.sSysV_DC+'');

      /* Load safety nodes from defaults — replaces initSafety fallback */
      if(Array.isArray(s.nodes)&&s.nodes.length){
        if(typeof loadNodesFromDefaults==='function'){
          loadNodesFromDefaults(s.nodes);
        }
      }
    }
  }

  function setVal(id,val){
    var el=document.getElementById(id);
    if(!el||val===undefined)return false;
    var changed=String(el.value)!==String(val);
    el.value=val;
    if(changed){
      try{el.dispatchEvent(new Event('input',{bubbles:true}))}catch(e){/* IE compat */}
      try{el.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){/* IE compat */}
    }
    return true;
  }
  function setValSelect(id,val){
    var el=document.getElementById(id);
    if(!el||val===undefined)return false;
    var changed=String(el.value)!==String(val);
    el.value=val;
    if(changed)
      try{el.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){/* IE compat */}

    return true;
  }

  /* ── Theme switcher (dropdown) ─────────── */
  var _systemThemeListener = null;

  function applyThemeResolved(theme){
    if(theme === 'system') return; // already resolved below
    document.documentElement.setAttribute('data-theme', theme);
  }

  function setTheme(theme){
    try{localStorage.setItem('hw-design-theme', theme)}catch(e){}
    document.documentElement.setAttribute('data-theme-choice', theme);
    if(theme === 'system'){
      _followSystemTheme();
    } else {
      // Remove system listener when user picks explicit theme
      if(_systemThemeListener){
        window.matchMedia('(prefers-color-scheme:dark)').removeEventListener('change', _systemThemeListener);
        _systemThemeListener = null;
      }
      document.documentElement.setAttribute('data-theme', theme);
    }
  }
  window.setTheme = setTheme;

  function _followSystemTheme(){
    var isDark = window.matchMedia('(prefers-color-scheme:dark)').matches;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  (function(){
    var theme = localStorage.getItem('hw-design-theme');
    if(!theme){
      theme = 'system';
    }
    document.documentElement.setAttribute('data-theme-choice', theme);
    if(theme === 'system'){
      _followSystemTheme();
      _systemThemeListener = function(){ _followSystemTheme(); };
      window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', _systemThemeListener);
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  })();

  /* ── Language switcher (dropdown) ──────── */
  function setLang(lang){
    if(typeof _applyLang === 'function') _applyLang(lang);
    try{localStorage.setItem('hw-design-lang', lang)}catch(e){}
  }
  window.setLang = setLang;

  /* ── Dropdown click-to-toggle ─────────── */
  document.querySelectorAll('.nav-dropdown').forEach(function wrap(wrap){
    var btn=wrap.querySelector('.nav-icon-btn');
    var menu=wrap.querySelector('.nav-dropdown-menu');
    if(!btn||!menu)return;
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      var wasOpen=menu.classList.contains('open');
      // Close all other dropdowns first
      document.querySelectorAll('.nav-dropdown-menu.open').forEach(function(m){m.classList.remove('open')});
      if(!wasOpen)menu.classList.add('open');
    });
  });

  /* ── Dropdown action delegation ─────────── */
  document.addEventListener('click',function(e){
    // Close any open dropdown menus
    document.querySelectorAll('.nav-dropdown-menu.open').forEach(function(m){m.classList.remove('open')});
    var target=e.target.closest('[data-action]');
    if(!target)return;
    var action=target.getAttribute('data-action');
    if(action==='setTheme'){setTheme(target.getAttribute('data-value'))}
    else if(action==='setLang'){setLang(target.getAttribute('data-value'))}
  });

  /* ── Unregister stale Service Workers ───── */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations){
      registrations.forEach(function(reg){
        reg.unregister();
        console.log('[app.js] Unregistered stale SW: ' + reg.scope);
      });
    });
  }

  /* ── Init on DOM ready ─────────────────── */
  window.addEventListener("DOMContentLoaded", function(){
    // Initialize language
    var savedLang = 'zh';
    try { savedLang = localStorage.getItem('hw-design-lang') || 'zh'; } catch(e) {}
    if(typeof _applyLang === 'function') _applyLang(savedLang);

    // Initialize capacitor tab (default active)
    if(typeof initCapacitor==='function')initCapacitor();
    // Load defaults from server
    loadDefaults().then(function(){if(typeof calc==='function')calc()});
  });

})();
