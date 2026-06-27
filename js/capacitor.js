/* ===== Capacitor Lifetime Calculator — UI Layer ===== */
/* Imports: window.CapacitorModel (models/capacitor-model.js)     */
/* Exposes: initCapacitor (called from app.js on tab switch)      */

(function (global) {
  "use strict";

  var CM = global.CapacitorModel;
  if (!CM) { console.error("CapacitorModel not loaded — load models/capacitor-model.js first"); return; }

  /* ── Helpers (UI-specific wrappers around model) ─── */
  function fv(v,d){return CM.fv(v,d)}
  function sot(id){var el=document.getElementById(id);return el&&el.selectedOptions&&el.selectedOptions[0]?el.selectedOptions[0].text:''}

  var sid = 0;

  /* ── Segment markup ────────────────────── */
  function mU(){return '<span style="font-size:.7rem;color:#94a3b8;margin-left:2px">Hz</span>'}

  function mSeg(id,idx,dur,ta,vop,rips){
    var rr="";
    rips.forEach(function(v){
      // FIX Bug #1: support {freq,current} objects for per-row frequency (K_freq)
      var freq = typeof v === 'object' ? (v.freq || 120) : 120;
      var cur  = typeof v === 'object' ? (v.current || 0)   : v;
      rr+="<tr><td class=ripgroup><input class=fv type=number value="+freq+"  oninput=calc()>" +mU()+ "</td>"
        +" <td><input class=fc type=number value=" +cur+" min=0 step=10  oninput=calc()><span style=\"font-size:.7rem;color:#94a3b8;margin-left:2px\">mA</span></td>"
        +" <td><button class=btn-sm onclick=removeRippleRow(this)>&times;</button></td></tr>";
    });
    return "<div class=seg data-id="+id+">"
      +"<div class=seg-head><span>"+_t("cap.seg")+(idx+1)+"</span><span style='font-size:.72rem;color:#94a3b8;font-weight:400'>"+_t("cap.segDur")+" <span class=sh>"+dur+"</span> "+_t("cap.segDur.h")+"</span>"
        +"<button class=btn-sm onclick=rmSeg(this)>&times;</button></div>"
      +"<div class=seg-body>"
        +"<label>"+_t("cap.durLabel")+"</label><input class=sd type=number value="+dur+" min=0 max=24 step=0.5 oninput=sdChange(this);calc()>"
        +"<label>"+_t("cap.taLabel")+"</label><input class=stp type=number value="+ta+" min=-40 max=150 oninput=calc()>"
        +"<label>"+_t("cap.vopLabel")+"</label><input class=sv type=number value="+vop+" min=0 step=1 oninput=calc()>"
      +"</div>"
      +"<table class=rt><thead><tr><th>"+_t("cap.rippleHdr.freq")+"</th><th>"+_t("cap.rippleHdr.cur")+"</th><th></th></tr></thead>"
        +"<tbody class=rtb>"+rr+"</tbody></table>"
      +"<button class=btn-sm onclick=addRR(this)>"+_t("cap.addRipple")+"</button>"
    +"</div>";
  }

  /* ── Segment ops (DOM-only) ─────────────── */
  function sdChange(inp){
    inp.closest(".seg").querySelector(".sh").textContent = parseFloat(inp.value)||0;
    updT();
  }

  function updT(){
    var t=0;
    document.querySelectorAll(".sd").forEach(function(i){t+=parseFloat(i.value)||0});
    document.getElementById("stt").textContent=_t("cap.totalTime",{v:fv(t,1)});
    var w=document.getElementById("stw");
    if(t>24){w.style.display="block";w.textContent=_t("cap.over24",{v:fv(t,1)})}
    else if(t<24){w.style.display="block";w.textContent=_t("cap.remaining",{v:fv(24-t,1)})}
    else w.style.display="none";
  }

  function addSeg(){
    document.getElementById("sc").insertAdjacentHTML("beforeend", mSeg(sid++,0,8,50,30,[100]));
    updT(); calc();
  }

  function rmSeg(b){b.closest(".seg").remove();reNum();updT();calc()}

  function reNum(){
    document.querySelectorAll("#sc .seg").forEach(function(s,i){
      s.querySelector(".seg>:first-child>:first-child").textContent=_t("cap.seg")+(i+1);
    });
  }

  function addRR(b){
    b.closest(".seg").querySelector(".rtb").insertAdjacentHTML("beforeend",
      "<tr><td class=ripgroup><input class=fv type=number value=120  oninput=calc()>" +mU()+ "</td>"
        +"<td><input class=fc type=number value=50 min=0 step=10  oninput=calc()><span style=\"font-size:.7rem;color:#94a3b8;margin-left:2px\">mA</span></td>"
        +"<td><button class=btn-sm onclick=removeRippleRow(this)>&times;</button></td></tr>");
    calc();
  }

  function removeRippleRow(b){
    var tb=b.closest(".rtb");
    if(tb.querySelectorAll("tr").length<=1)return;
    b.closest("tr").remove();calc();
  }

  /* ── LaTeX helpers (UI-only) ─────────────── */
  function l2r(l){
    try{return l.replace(/\\times/g,"×")
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g,"($1)/($2)")
      .replace(/\\Delta/g,"Δ").replace(/\\sum/g,"∑")
      .replace(/\\left/g,"").replace(/\\right/g,"")
      .replace(/\\text\{([^}]+)\}/g,"$1")
      .replace(/\\cdot/g,"·").replace(/\\,/g," ")
      .replace(/\^{([^}]+)}/g,"^($1)")
      .replace(/\^{([a-zA-Z0-9])}/g,"^$1")
      .replace(/_{([^}]+)}/g,"_$1")
      .replace(/{/g,"").replace(/}/g,"");
    }catch(e){return l}
  }

  function renderLatex(){
    try{document.querySelectorAll('.latex').forEach(function(e){
      try{var w=window;if(!w.katex){e.textContent=e.getAttribute('data-l');return}
        w.katex.render(e.getAttribute('data-l'),e,{throwOnError:false})}
      catch(er){}})
    }catch(er){}
  }

  /* ── Clamp helper (P1-4) ─────────────── */
  function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v))}

  /* ── Read params from DOM → call model → render results ─── */
  function calc(){
    updT();
    var segs=document.querySelectorAll("#sc .seg");
    if(!segs.length){
      document.getElementById("lh").textContent="-";document.getElementById("ly").textContent="-";
      document.getElementById("ad").textContent="-";document.getElementById("wt").textContent="-";
      document.getElementById("wk").textContent="-";return;
    }

    var warns=[];
    function w(msg){warns.push(msg)}
    function cl(v,lo,hi,name){if(v<lo||v>hi){w(name+" "+fv(v,1)+" → "+_t("param.corrected")+" "+name+" "+fv(Math.max(lo,Math.min(hi,v)),1));return Math.max(lo,Math.min(hi,v))}return v}

    // Read rated params from DOM
    var l0=+document.getElementById("l0").value||2e3,
        tmax=+document.getElementById("tmax").value||105,
        tau=+document.getElementById("tau").value||10,
        vrated=+document.getElementById("vrated").value||50,
        irated=+document.getElementById("irated").value||500,
        dt0=+document.getElementById("dt0").value||10,
        wd=+document.getElementById("workdays").value||365,
        wt=+document.getElementById("warrantyTarget").value||5,
        scenario=document.getElementById("scenario").value;

    // P1-4: Validate & clamp rated params
    l0  = cl(l0,500,100000,"L₀");
    tmax= cl(tmax,60,150,"T_max");
    tau = cl(tau,8,20,"τ");
    vrated = cl(vrated,1,1000,"V_rated");
    irated = cl(irated,10,50000,"I_rated");
    dt0  = cl(dt0,1,30,"ΔT₀");
    wd   = cl(wd,1,365,_t("param.workdays"));
    wt   = cl(wt,0.5,50,_t("param.warranty"));

    // Build segments array for model
    var segments=[];
    segs.forEach(function(seg){
      var dur=+seg.querySelector(".sd").value||0,
          ta=+seg.querySelector(".stp").value||25,
          vop=+seg.querySelector(".sv").value||0,
          rips=[];
      seg.querySelectorAll(".rtb tr").forEach(function(row){
        var f=(+row.querySelector(".fv").value||120),
            iop=+row.querySelector(".fc").value||0;
        if(iop>0) rips.push({freq:f, current:iop});
      });
      // P1-4: Validate & clamp segment params
      dur = cl(dur,0.1,24,_t("param.duration"));
      ta  = cl(ta,-40,150,_t("param.ambtemp"));
      vop = cl(vop,0,vrated*2,_t("param.voltage"));
      rips.forEach(function(r){r.current=cl(r.current,0,irated*3,_t("param.ripple"))});
      segments.push({dur:dur, ta:ta, vop:vop, rips:rips});
    });

    // P1-4: Check total duration ≤24h
    var totDur=0;segments.forEach(function(s){totDur+=s.dur});
    if(totDur>24) w(_t("cap.warn.to24",{v:fv(totDur,1)}));

    // P1-7: Error boundary — wrap model call in try/catch
    var result;
    try{
      result = CM.calcLifetime({l0:l0,tmax:tmax,tau:tau,vrated:vrated,irated:irated,dt0:dt0,wd:wd,wt:wt,scenario:scenario,segments:segments});
    }catch(e){
      var el=document.getElementById("capWarn");
      if(el){el.textContent=_t("cap.warn.calcErr")+" "+e.message;el.style.display="block"}
      console.error("CapacitorModel.calcLifetime error:",e);
      return;
    }
    if(!result) return;

    // P1-4: Show warnings if any clamping occurred
    (function(){var el=document.getElementById("capWarn");if(warns.length){el.textContent="⚠ "+warns.join("; ");el.style.display="block"}else{el.style.display="none"}})();

    // Render results to DOM (with i18n verdict)
    var wsKey = {g:"cap.verdict.excellent",p:"cap.verdict.pass",c:"cap.verdict.marginal",b:"cap.verdict.fail"}[result.wc]||"cap.verdict.pass";
    var wsTr = _t(wsKey);
    var wdKey = {g:"cap.warranty.sufficient",p:"cap.warranty.meets",c:"cap.warranty.edge",b:"cap.warranty.fail"}[result.wc]||"cap.warranty.meets";
    document.getElementById("lh").textContent=result.lh>=1e6?fv(result.lh/1e4,1)+_t("cap.calc.wan"):fv(result.lh,0);
    document.getElementById("ly").textContent=fv(result.ly,1);
    document.getElementById("ad").textContent=fv(result.dmg*100,3);
    document.getElementById("wt").textContent=fv(result.wtHs,1);
    document.getElementById("wk").textContent=fv(result.wtKt,2);
    document.getElementById("wb").innerHTML="<span class=badge "+result.wc+">"+wsTr+"("+fv(result.margin,1)+"x,"+_t("cap.warranty.req",{req:result.req})+")</span>";
    document.getElementById("wd").textContent=_t(wdKey,{wt:wt,ly:fv(result.ly,1)});

    var mb=Math.max(wt*3,result.ly);
    document.getElementById("wf").style.width=Math.min(100,(result.ly/mb)*100)+"%";
    document.getElementById("wm").style.left=Math.min(100,(wt/mb)*100)+"%";
    document.getElementById("wtl").style.left=Math.min(100,(wt/mb)*100)+"%";
    document.getElementById("wf").style.background=result.margin>=result.req?"#10b981":result.margin>=result.req*0.7?"#f59e0b":"#ef4444";
    document.getElementById("wtl").textContent=_t("cap.margin.target")+" "+wt+_t("cap.r.unit.yr");
    document.getElementById("wml").textContent=fv(mb,0)+_t("cap.r.unit.yr");

    // Per-segment results table
    var tb="";result.sr.forEach(function(r){tb+="<tr><td>"+_t("cap.seg")+r.i+"</td><td>"+fv(r.dur,1)+"</td><td>"+fv(r.ths,1)+"</td><td>"+fv(r.kt,2)+"</td><td>"+fv(r.kv,3)+"</td><td>"+(r.Li>=1e6?fv(r.Li/1e4,1)+_t("cap.calc.wan"):fv(r.Li,0))+"</td><td>"+fv(r.d*100,3)+"%</td></tr>"});
    document.getElementById("srb").innerHTML=tb;

    // Store for report/export
    window._cd=result;
  }

  /* ── LaTeX → Unicode/HTML for Word export ─── */
  function latexToWord(src){return cvtLW(src);}
  function brkLW(s,p){var d=1,o='';while(p<s.length&&d>0){if(s[p]==='{'){d++;o+=s[p];}else if(s[p]==='}'){d--;if(!d)break;o+=s[p];}else o+=s[p];p++}return{c:o,e:p};}
  function cvtLW(s){var o='';var i=0;while(i<s.length){if(s[i]==='\\'){var j=i+1;while(j<s.length&&((s[j]>='a'&&s[j]<='z')||(s[j]>='A'&&s[j]<='Z')))j++;var w=s.slice(i,j);if(w==='\\frac' && s[j]==='{'){var r=brkLW(s,++j);i=r.e+1;var rn=cvtLW(r.c);r=brkLW(s,++i);i=r.e+1;var rd=cvtLW(r.c);o+='('+rn+')/('+rd+')';continue;}if(w==='\\text' && s[j]==='{'){var r=brkLW(s,++j);i=r.e+1;o+=r.c;continue;}if(w==='\\left'||w==='\\right'){i=j;continue;}o+=(G_LW[w.slice(1)]||O_LW[w.slice(1)]||w.slice(1));i=j;continue;}if(s[i]==='^'||s[i]==='_'){i++;var tag=s[i-1]==='^'?'sup':'sub';if(s[i]==='{'){var r=brkLW(s,++i);i=r.e+1;o+='<'+tag+'>'+cvtLW(r.c)+'</'+tag+'>';}else{o+='<'+tag+'>'+cvtLW(s[i])+'</'+tag+'>';i++;}continue;}o+=s[i];i++}return o;}
  var G_LW={Delta:'Δ',alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',sigma:'σ',tau:'τ',mu:'μ',pi:'π',lambda:'λ',rho:'ρ',phi:'φ'};
  var O_LW={cdot:'·',times:'×',sum:'Σ',quad:'  ',circ:'°'};

  /* ── Formula rendering (uses model data) ─── */
  function calcFormulas(){
    var d=window._cd;if(!d||!d.sr||!d.sr.length)return '';
    var ir=d.irated;
    var fs='';
    fs+='<div class="rep-model-box">';
    fs+='<b>'+_t("cap.calc.modelDesc")+'</b><br>';
    fs+='• <b>'+_t("cap.calc.tempAccel")+'</b>: Arrhenius K_T = 2^((T_max - T_hs) / τ), τ='+d.tau+'°C<br>';
    fs+='• <b>'+_t("cap.calc.voltCorr")+'</b>: Nichicon K_V = exp[a·((V_r/V_op)^b - 1)], a=0.56, b=1.0<br>';
    fs+='• <b>'+_t("cap.calc.freqCorr")+'</b>: K_freq '+_t("cap.calc.freqDesc")+'<br>';
    fs+='• <b>'+_t("cap.calc.cumDmg")+'</b>: Miner D = Σ(t_i·N_days / L_i)<br>';
    fs+='• <b>'+_t("cap.calc.eol")+'</b>: '+_t("cap.calc.eolDesc")+'<br>';
    fs+='• '+_t("cap.calc.ref")+'Nichicon Technical Manual §"How to Calculate Life Time"<br></div>';
    d.sr.forEach(function(r){
      fs+='<p class="rep-section"><b>'+_t("cap.seg")+r.i+' — ① '+_t("cap.calc.riseCalc")+'</b></p>';
      if(r.rd&&r.rd.length){
        fs+='<p class="rep-formula">';
        fs+='<span class=latex data-l="\\Delta T_i = \\Delta T_0 \\times \\sum_j \\left(\\frac{I_{op,j}}{I_{rated} \\cdot K_{freq,j}}\\right)^2"></span></p>';
        var sub='';sub+=d.dt0+' \\times (';
        r.rd.forEach(function(x,j){if(j>0)sub+=' + ';sub+='\\left(\\frac{'+x.iop+'}{'+ir+' \\cdot '+x.k.toFixed(2)+'}\\right)^2'});
        sub+=')';
        fs+='<p class="rep-formula-sub">=';
        fs+='<span class=latex data-l="'+sub+'"></span></p>';
        fs+='<p class="rep-result">=';
        fs+='<span class=latex data-l="\\Delta T_'+r.i+' = '+r.dt.toFixed(2)+' \\text{°C}"></span></p>';
      } else {
        fs+='<p class="rep-formula-sub">'+_t("cap.calc.noRipple")+'</p>';
      }
      fs+='<p class="rep-result">';
      fs+='<span class=latex data-l="T_{hs,'+r.i+'} = T_a + \\Delta T = '+r.ta.toFixed(1)+' + '+(r.dt>0?r.dt.toFixed(2):'0')+' = '+r.ths.toFixed(1)+'\\text{°C}"></span></p>';

      fs+='<p class="rep-section"><b>'+_t("cap.seg")+r.i+' — ② '+_t("cap.calc.lifeCalc")+'</b></p>';
      fs+='<p class="rep-formula">';
      fs+='<span class=latex data-l="L_i = L_0 \\cdot 2^{\\frac{T_{max} - T_{hs,i}}{' + d.tau + '}} \\cdot K_V"></span></p>';
      fs+='<p class="rep-formula-sub">=';
      fs+='<span class=latex data-l="L_'+r.i+' = '+d.l0+' \\cdot 2^{\\frac{'+d.tmax+' - '+r.ths.toFixed(1)+'}{' + d.tau + '}} \\cdot '+r.kv.toFixed(3)+'"></span></p>';
      fs+='<p class="rep-result">=';
      fs+='<span class=latex data-l="L_'+r.i+' = '+r.Li.toFixed(0)+' \\text{h}"></span></p>';
    });

    fs+='<p class="rep-section"><b>'+_t("cap.calc.minerTitle")+'</b></p>';
    fs+='<p class="rep-formula">';
    fs+='<span class=latex data-l="D = \\sum_i \\frac{t_i \\cdot N_{days}}{L_i}"></span></p>';
    var miner='';var ft=true;
    d.sr.forEach(function(r){if(!ft)miner+=' + ';ft=false;miner+='\\frac{'+r.dur.toFixed(1)+' \\cdot '+d.wd+'}{'+r.Li.toFixed(0)+'}'});
    fs+='<p class="rep-formula-sub">=';
    fs+='<span class=latex data-l="'+miner+'"></span></p>';
    fs+='<p class="rep-result">=';
    var yUnit = _getLang()==='en'?'year':'年';
    var lifeUnit = _getLang()==='en'?'life':'寿命';
    fs+='<span class=latex data-l="D = '+(d.dmg*100).toFixed(3)+'\\% / \\text{'+yUnit+'}, \\quad \\text{'+lifeUnit+'} = 1/'+d.dmg.toFixed(6)+' = '+d.ly.toFixed(1)+' \\text{'+yUnit+'}"></span></p>';
    return fs;
  }
/* ── Report generation (DOM-only) ───────── */
  function genRep(){
    var d=window._cd;
    if(!d||!d.sr||!d.sr.length){
      document.getElementById("rc").innerHTML="<h3>"+_t("cap.report.rptTitle")+"</h3><p>"+_t("cap.report.hint")+"</p>";
      setTimeout(renderLatex,200);return;
    }

    // Show export button after report generation
    var eg=document.getElementById('exportCapGroup');if(eg)eg.style.display='';

    var n=new Date(),lang=_getLang()||'zh',locale=lang==='en'?'en-US':'zh-CN';
    var ds=n.toLocaleDateString(locale,{year:"numeric",month:"2-digit",day:"2-digit"}),ts=n.toLocaleTimeString(locale,{hour:"2-digit",minute:"2-digit"});
    var sr="";

    d.sr.forEach(function(r){
      var rd=r.rd.length?r.rd.map(function(x){return fv(x.iop,0)+" mA @ "+x.f+" Hz(K="+x.k.toFixed(2)+")"}).join(", "):_t("cap.report.noRipple");
      sr+="<tr><td>"+_t("cap.seg")+r.i+"</td><td>"+fv(r.dur,1)+"</td><td>"+fv(r.ta,1)+"</td><td>"+fv(r.vop,1)+"</td>"
        +"<td>"+fv(r.dt,2)+"</td><td>"+fv(r.ths,1)+"</td><td>"+fv(r.kt,2)+"</td><td>"+fv(r.kv,3)+"</td>"
        +"<td>"+(r.Li>=1e6?fv(r.Li/1e4,1)+_t("cap.calc.wan"):fv(r.Li,0))+"</td><td>"+rd+"</td></tr>";
    });

    var wsKey = {g:"cap.verdict.excellent",p:"cap.verdict.pass",c:"cap.verdict.marginal",b:"cap.verdict.fail"}[d.wc]||"cap.verdict.pass";
    var pn=document.getElementById("projName").value||"-", cm=document.getElementById("capModel").value||"-";
    document.getElementById("rc").innerHTML=
      "<h3>1. "+_t("cap.report.projInfo")+"</h3><table class=\"data-tbl\"><thead><tr>"
        +"<th>"+_t("cap.report.projName")+"</th><th>"+_t("cap.report.model")+"</th><th>"+_t("cap.report.scene")+"</th><th>"+_t("cap.report.days")+"</th><th>"+_t("cap.report.warr")+"</th></tr></thead><tbody><tr>"
        +"<td>"+pn+"</td><td>"+cm+"</td><td>"+_t("cap.opt."+d.scenario)+"</td>"
        +"<td>"+d.wd+"</td><td>"+d.wt+_t("cap.r.unit.yr")+"</td></tr></tbody></table>"
        +"<th>L<sub>0</sub></th><th>T<sub>max</sub></th><th>V<sub>rated</sub></th><th>I<sub>rated</sub></th><th>ΔT<sub>0</sub></th></tr></thead><tbody><tr>"
        +"<td>"+d.l0+" h</td><td>"+d.tmax+" °C</td><td>"+(d.vr||d.vrated)+" V</td>"
        +"<td>"+(d.ir||d.irated)+" mA</td><td>"+d.dt0+" °C</td></tr></tbody></table>"

      +"<h3>3. "+_t("cap.report.profile")+"</h3><table class=\"data-tbl\"><thead><tr>"
        +"<th>"+_t("cap.seg")+"</th><th>h/"+_t("cap.workdays.unit")+"</th><th>Ta °C</th><th>Vop V</th><th>DT °C</th><th>Ths °C</th><th>KT</th><th>KV</th><th>Li h</th><th>"+_t("cap.report.ripple")+"</th></tr></thead><tbody>"+sr+"</tbody></table>"
      +"<h3>4. "+_t("cap.report.calc")+"</h3>"+calcFormulas()

      +"<h3>5. "+_t("cap.report.conclusion")+"</h3><table class=\"data-tbl\"><thead><tr>"
        +"<th>"+_t("cap.report.dmgD")+"</th><th>"+_t("cap.report.estLife")+"</th><th>"+_t("cap.report.warr")+"</th><th>"+_t("cap.report.margin")+"</th><th>"+_t("cap.report.verdict")+"</th></tr></thead><tbody><tr>"
        +"<td>"+fv(d.dmg*100,3)+"%</td><td>"+fv(d.ly,1)+" "+_t("cap.r.unit.yr")+"</td><td>"+d.wt+" "+_t("cap.r.unit.yr")+"</td>"
        +"<td>"+fv(d.margin,2)+"x</td><td><strong>"+_t(wsKey)+"</strong></td></tr></tbody></table>"
      +"<div class=\"rep-footer\"><span>"+_t("cap.report.footer")+" v2.0</span><span>"+_t("cap.report.warr")+": "+ds+" "+ts+"</span></div>";

    setTimeout(renderLatex,200);
  }

  /* ── Export report (Word / PDF) ─────────── */
  function cExportReport(mode){
    if(mode==='pdf'){window.print();return}
    exportWord();
  }

  /* ── Word export (DOM-only) ─────────────── */
  function exportWord(){
    var d=window._cd;if(!d||!d.sr||!d.sr.length)return;
    var pn=document.getElementById('projName').value||'-',cm=document.getElementById('capModel').value||'-',te=[];if(pn&&pn!=='-')te.push(pn);if(cm&&cm!=='-')te.push(cm);
    var ts=te.length?' ('+te.join(' - ')+')':'',sr='';

    var css='<style>';
    css+='body{font-family:"Microsoft YaHei","Segoe UI",SimSun,sans-serif;font-size:10pt;color:#1e293b;line-height:1.6}';
    css+='table.data-tbl{border-collapse:collapse;width:100%;margin:10px 0;font-size:9pt}';
    css+='table.data-tbl th,table.data-tbl td{border:1px solid #d0d7e4;padding:6px 10px;text-align:center;vertical-align:middle}';
    css+='table.data-tbl thead th{background:#f1f5f9;font-weight:bold;color:#475569;font-size:8.5pt}';
    css+='table.data-tbl tbody tr:nth-child(even){background:#fafbfd}';
    css+='h2.title{text-align:center;font-size:16pt;margin-bottom:6px;color:#1e293b}';
    css+='h3{font-size:12pt;margin-top:18px;margin-bottom:6px;color:#475569;border-left:3px solid #2563eb;padding-left:8px}';
    css+='p.meta{text-align:center;font-size:8.5pt;color:#64748b;margin:2px 0}';
    css+='div.footer{margin-top:18px;padding-top:8px;border-top:1px solid #e2e8f0;text-align:center;font-size:8pt;color:#94a3b8}';
    css+='p.formula{font-family:"Cambria Math","Times New Roman",serif;font-size:10pt;margin:6px 0 6px 16px;color:#334155;line-height:1.7}';
    css+='div.model-box{background:#f0f9ff;border:1px solid #bae6fd;padding:8px 12px;margin-bottom:10px;font-size:8.5pt;color:#0c4a6e;line-height:1.6}';
    css+='table.compact{border-collapse:collapse;width:auto;margin:10px 0;font-size:9pt;display:inline-table}';
    css+='table.compact th,table.compact td{border:1px solid #d0d7e4;padding:5px 12px;text-align:center;vertical-align:middle}';
    css+='table.compact thead th{background:#f1f5f9;font-weight:bold;color:#475569;font-size:8.5pt}';
    css+='</style>';

    d.sr.forEach(function(r){
      var rd=r.rd.length?r.rd.map(function(x){return x.iop+'mA @ '+x.f+'Hz (K='+x.k.toFixed(2)+')'}).join(', '):_t("cap.report.noRipple");
      sr+='<tr><td>'+_t("cap.seg")+r.i+'</td><td>'+r.dur.toFixed(1)+'</td><td>'+r.ta.toFixed(1)+'</td><td>'+r.vop.toFixed(1)+'</td>'
        +'<td>'+r.dt.toFixed(2)+'</td><td>'+r.ths.toFixed(1)+'</td><td>'+r.kt.toFixed(2)+'</td><td>'+r.kv.toFixed(3)+'</td>'
        +'<td>'+(r.Li>=1e6?(r.Li/1e4).toFixed(1)+_t("cap.calc.wan"):r.Li.toFixed(0))+'</td><td>'+rd+'</td></tr>';
    });

    var fh=calcFormulas();
    fh=fh.replace(/<span[^>]*class=latex[^>]*data-l="([^"]*)"[^>]*><\/span>/g,function(m,ltx){return latexToWord(ltx)});

    var margin=d.margin?d.margin.toFixed(2):'-';
    var wsKey = {g:"cap.verdict.excellent",p:"cap.verdict.pass",c:"cap.verdict.marginal",b:"cap.verdict.fail"}[d.wc]||"cap.verdict.pass";
    var ws=_t(wsKey);
    var yU=_t("cap.r.unit.yr");

    var h='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><title>'+_t("cap.calc.reportTitle")+ts+'</title>';
    h+=css;h+='</head><body>';
    h+='<h2 class="title">'+_t("cap.calc.reportTitle")+ts+'</h2>';
    var n=new Date(),locale=_getLang()==='en'?'en-US':'zh-CN',ds=n.toLocaleDateString(locale,{year:"numeric",month:"2-digit",day:"2-digit"});
    h+='<p class="meta">'+_t("cap.calc.rptNum")+': EL-'+(new Date().toLocaleDateString(locale).replace(/[\/-]/g,''))+'-'+(Math.floor(Math.random()*9000+1000))+'</p>';
    h+='<p class="meta">'+_t("cap.calc.genDate")+': '+ds+'</p>';

    h+='<h3>1. '+_t("cap.report.projInfo")+'</h3>';
    h+='<table class="data-tbl"><thead><tr>'
      +'<th>'+_t("cap.report.projName")+'</th><th>'+_t("cap.report.model")+'</th><th>'+_t("cap.report.scene")+'</th><th>'+_t("cap.report.days")+'</th><th>'+_t("cap.report.warr")+'</th>'
      +'</tr></thead><tbody><tr>';
    h+='<td>'+pn+'</td><td>'+cm+'</td><td>'+_t("cap.opt."+d.scenario)+'</td>';
    h+='<td>'+d.wd+'</td><td>'+d.wt+yU+'</td></tr></tbody></table>';

    h+='<h3>2. '+_t("cap.calc.ratedParam")+'</h3>';
    h+='<table class="compact"><thead><tr>'
      +'<th>L<sub>0</sub></th><th>T<sub>max</sub></th><th>V<sub>rated</sub></th><th>I<sub>rated</sub></th><th>ΔT<sub>0</sub></th><th>τ (Arrhenius)</th>'
      +'</tr></thead><tbody><tr>';
    h+='<td>'+d.l0+' h</td><td>'+d.tmax+' °C</td><td>'+(d.vr||d.vrated)+' V</td>';
    h+='<td>'+(d.ir||d.irated)+' mA</td><td>'+d.dt0+' °C</td><td>'+d.tau+' °C</td></tr></tbody></table>';

    h+='<h3>3. '+_t("cap.calc.profileCalc")+'</h3>';
    h+='<table class="data-tbl"><thead><tr>'
      +'<th>'+_t("cap.seg")+'</th><th>h/'+_t("cap.workdays.unit")+'</th><th>Ta °C</th><th>Vop V</th><th>ΔT °C</th><th>Ths °C</th><th>K<sub>T</sub></th><th>K<sub>V</sub></th>'
      +'<th>Li h</th><th>'+_t("cap.report.rippleCurrent")+'</th>'
      +'</tr></thead><tbody>'+sr+'</tbody></table>';

    h+='<h3>4. '+_t("cap.calc.calcProc")+'</h3>';
    h+='<div class="model-box"><b>'+_t("cap.calc.modelDesc")+'</b><br>'
      +'• <b>'+_t("cap.calc.tempAccel")+'</b>: Arrhenius K<sub>T</sub> = 2^((T<sub>max</sub> - T<sub>hs</sub>) / τ)<br>'
      +'• <b>'+_t("cap.calc.voltCorr")+'</b>: Nichicon K<sub>V</sub> = exp[a·((V<sub>r</sub>/V<sub>op</sub>)^b - 1)]<br>'
      +'• <b>'+_t("cap.calc.freqCorr")+'</b>: K<sub>freq</sub> '+_t("cap.calc.freqDesc")+'<br>'
      +'• <b>'+_t("cap.calc.cumDmg")+'</b>: Miner D = Σ(t<sub>i</sub>·N<sub>days</sub> / L<sub>i</sub>)<br>'
      +'• <b>'+_t("cap.calc.eol")+'</b>: '+_t("cap.calc.eolDesc")+'<br>'
      +'• '+_t("cap.calc.ref")+'Nichicon Technical Manual §"How to Calculate Life Time"</div>';
    h+='<p class="formula">'+fh.replace(/<br\s*\/?>/g,'<br>').replace(/<\/?div[^>]*>/g,'').replace(/style="[^"]*"/g,'')+'</p>';

    h+='<h3>5. '+_t("cap.report.conclusion")+'</h3>';
    h+='<table class="compact"><thead><tr>'
      +'<th>'+_t("cap.calc.annDmg")+'</th><th>'+_t("cap.calc.estLife")+'</th><th>'+_t("cap.report.warr")+'</th><th>'+_t("cap.report.margin")+'</th><th>'+_t("cap.report.verdict")+'</th>'
      +'</tr></thead><tbody><tr>';
    h+='<td>'+(d.dmg*100).toFixed(3)+'%</td><td>'+d.ly.toFixed(1)+' '+yU+'</td>';
    h+='<td>'+d.wt+' '+yU+'</td><td>'+margin+'x</td><td><b>'+ws+'</b></td></tr></tbody></table>';
    h+='<div class="footer">'+_t("cap.calc.footer")+' | '+_t("cap.calc.autoGen")+' '+ds+'</div>';
    h+='</body></html>';
    var b=new Blob([h],{type:'application/msword'});var dn=_t("cap.calc.reportTitle")+(te.length?'('+te.join('-')+')':'')+'.doc';saveBlobWithDialog(b,dn);
  }

  /* ── Refresh dynamic segment labels on lang change ─── */
  function refreshSegLabels(){
    document.querySelectorAll("#sc .seg").forEach(function(s,i){
      var head=s.querySelector(".seg-head");
      if(!head)return;
      var spans=head.querySelectorAll("span");
      spans[0].textContent=_t("cap.seg")+(i+1);
      if(spans[1]){
        var dur=spans[1].querySelector(".sh");
        var d=dur?dur.textContent:"";
        spans[1].innerHTML=_t("cap.segDur")+" <span class=sh>"+d+"</span> "+_t("cap.segDur.h");
      }
      // Delete button — just × like ripple delete
      var delBtn=head.querySelector(".btn-sm");
      if(delBtn)delBtn.innerHTML="&times;";
    });
    // Ripple add buttons
    document.querySelectorAll("#sc .seg").forEach(function(s){
      var btns=s.querySelectorAll(":scope > button.btn-sm");
      btns.forEach(function(b){b.textContent=_t("cap.addRipple")});
    });
    // Segment body labels
    document.querySelectorAll("#sc .seg-body label").forEach(function(lbl,i){
      var keys=["cap.durLabel","cap.taLabel","cap.vopLabel"];
      var key=keys[i%keys.length];
      if(key)lbl.textContent=_t(key);
    });
    // Ripple table headers
    document.querySelectorAll("#sc .rt thead th").forEach(function(th,i){
      var keys=["cap.rippleHdr.freq","cap.rippleHdr.cur"];
      var key=keys[i%keys.length];
      if(key)th.textContent=_t(key);
    });
  }

  /* ── Init ──────────────────────── */
  function initCapacitor(){
    document.getElementById("sc").insertAdjacentHTML("beforeend", mSeg(sid++,0,8,60,30,[250,150]));
    document.getElementById("sc").insertAdjacentHTML("beforeend", mSeg(sid++,1,16,40,30,[100]));
    document.getElementById("addSegBtn").onclick = addSeg;
    updT(); calc();
  }

  /* ── Load segments from defaults.json (called by app.js applyDefaults) ─── */
  function loadSegmentsFromDefaults(segments){
    if(!Array.isArray(segments)||!segments.length)return false;
    var sc=document.getElementById('sc');if(sc)sc.innerHTML='';
    segments.forEach(function(sg,idx){
      var r=sg.rips||[];

      var segId=sid++;
      sc.insertAdjacentHTML('beforeend',mSeg(segId,idx,sg.dur||8,sg.ta||60,sg.vop||30,r));    });
    updT();calc();
    return true;
  }

  /* ── Expose to global scope (for inline handlers) ── */
  global.fv = fv; global.mU = mU; global.mSeg = mSeg; global.sdChange = sdChange;
  global.updT = updT; global.addSeg = addSeg; global.rmSeg = rmSeg; global.reNum = reNum;
  global.addRR = addRR; global.removeRippleRow = removeRippleRow; global.l2r = l2r;
  global.renderLatex = renderLatex; global.calc = calc; global.calcFormulas = calcFormulas;
  global.genRep = genRep; global.exportWord = exportWord; global.cExportReport = cExportReport;
  global.loadSegmentsFromDefaults = loadSegmentsFromDefaults;
  global.refreshSegLabels = refreshSegLabels;

  /* ── Wire static inputs via event delegation ─── */
  document.addEventListener('input', function(e){
    var t=e.target;
    if(t.id && ['l0','tmax','tau','vrated','irated','dt0','cap','workdays','warrantyTarget'].includes(t.id)){calc()}
  });
  document.addEventListener('change', function(e){
    var t=e.target;
    if(t.id && ['scenario'].includes(t.id)){calc()}
  });

  global.initCapacitor = initCapacitor;

})(window);
