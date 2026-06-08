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

  /* ── Info popup toggle ─────────────────── */
  function toggleInfo(e){e.stopPropagation();var box=document.getElementById('acVoltageInfo');if(box)box.classList.toggle('show')}
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

  /* ── Defaults loading (from server API) ─── */
  var _defaults = null; // Cache defaults for initSafety/initCapacitor

  async function loadDefaults(){
    try{
      var resp=await fetch('/api/defaults');
      if(!resp.ok)return;
      var d=await resp.json();
      _defaults = d;
      applyDefaults(d);
    }catch(e){/* no server — use inline defaults */}
  }

  function applyDefaults(d){
    if(!d||typeof d!=='object')return;

    /* Capacitor defaults */
    var c=d.capacitor;if(c&&typeof c==='object'){
      setVal('l0',c.l0);setVal('tmax',c.tmax);setVal('vrated',c.vrated);setVal('irated',c.irated);
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

  function setVal(id,val){var el=document.getElementById(id);if(el&&val!==undefined)el.value=val}
  function setValSelect(id,val){var el=document.getElementById(id);if(el&&val!==undefined)el.value=val}

  /* ── Init on DOM ready ─────────────────── */
  window.addEventListener("DOMContentLoaded", function(){
    // Initialize capacitor tab (default active)
    if(typeof initCapacitor==='function')initCapacitor();
    // Load defaults from server
    loadDefaults().then(function(){if(typeof calc==='function')calc()});
  });

})();
