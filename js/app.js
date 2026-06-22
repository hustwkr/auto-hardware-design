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
  function toggleInfo(e){e.stopPropagation();var icon=e.currentTarget;var fgi=icon.closest('.fgi');if(!fgi)return;var popup=fgi.querySelector(':scope > .info-popup');if(popup){document.querySelectorAll('.info-popup.show').forEach(function(d){if(d!==popup)d.classList.remove('show')});popup.classList.toggle('show')}}
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
      var coolingEl=document.getElementById('cooling'); if(coolingEl) state.capacitor.cooling=coolingEl.value;
      var scenarioEl=document.getElementById('scenario'); if(scenarioEl) state.capacitor.scenario=scenarioEl.value;

      /* Safety fields */
      ['sStd','sPd','sMg','sAlt','sIsolation','sOvc_AC'].forEach(function(id){
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
      if(c.cooling)document.getElementById('cooling').value=c.cooling;
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
      setValSelect('sOvc_AC',s.sOvc_AC||'ii');/* sOvc_DC auto-derived in safety.js */
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

  /* ── Dark mode toggle ──────────────────── */
  (function(){
    var theme = localStorage.getItem('hw-design-theme');
    if(!theme){
      theme = window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);

    function updateIcon(isDark){
      var btn = document.getElementById('darkToggle');
      if(btn) btn.textContent = isDark ? '☀️' : '🌙';
    }
    updateIcon(theme === 'dark');

    document.addEventListener('click', function(e){
      var btn = document.getElementById('darkToggle');
      if(!btn || !btn.contains(e.target)) return;
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('hw-design-theme', next);
      updateIcon(next === 'dark');
    });
  })();

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
    // Initialize capacitor tab (default active)
    if(typeof initCapacitor==='function')initCapacitor();
    // Load defaults from server
    loadDefaults().then(function(){if(typeof calc==='function')calc()});
  });

})();
