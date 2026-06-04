(function(){
  setTimeout(function(){
    try{
      var x=new XMLHttpRequest();x.open("GET","/api/defaults",false);x.send();
      var d=JSON.parse(x.responseText);if(!d||!d.capacitor)return;
      var c=d.capacitor;
      ["l0","tmax","vrated","irated","dt0","workdays","warrantyTarget"].forEach(function(id){
        var el=document.getElementById(id);if(el&&c[id]!==undefined)el.value=c[id];
      });
      if(c.cooling)document.getElementById("cooling").value=c.cooling;
      if(c.scenario)document.getElementById("scenario").value=c.scenario;
      if(c.segments&&c.segments.length){
        document.getElementById("sc").innerHTML="";sid=0;
        c.segments.forEach(function(sg){
          var r=sg.rips||[];if(r.length&&typeof r[0]==="object")r=r.map(function(v){return v.current||0});
          document.getElementById("sc").insertAdjacentHTML("beforeend",mSeg(sid++,0,sg.dur||8,sg.ta||60,sg.vop||30,r));
        });
      }
      var s=d.safety;
      if(s){
        ["sStd","sPd","sMg","sAlt","sOvc","sSysV_AC","sSysV_DC"].forEach(function(id){
          var el=document.getElementById(id);if(el&&s[id]!==undefined)el.value=s[id];
        });
        if(s.nodes&&s.nodes.length){
          document.getElementById("sN").innerHTML="";snid=0;
          s.nodes.forEach(function(n){document.getElementById("sN").insertAdjacentHTML("beforeend",mNode(snid++,0,n.name||"",n.vrms||0,n.ins||"basic",n.pcb||0,n.coat||0,n.interp||false,n.circ||"ac"))});
        }
      }
      updT();calc();sCalc();
    }catch(e){}
  },200);
})();
