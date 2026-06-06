const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto");
const PORT=parseInt(process.env.PORT||"8080",10),ADMIN_PW=process.env.ADMIN_PASSWORD||"admin123";
const ROOT=path.resolve(__dirname,".."),DEF_FILE=path.join(__dirname,"defaults.json");
const tokens=new Set(),MIME={".html":"text/html;charset=utf-8",".js":"text/javascript;charset=utf-8",".css":"text/css;charset=utf-8",".json":"application/json;charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".pdf":"application/pdf"};
const MAX_BODY=1e6; // 1MB request body limit

// Rate limiting: track failed login attempts per IP
const loginAttempts=new Map();
function checkRateLimit(ip){
  const now=Date.now(),key=ip,entry=loginAttempts.get(key);
  if(entry&&now-entry.time<300000){// 5 min window
    if(entry.count>=10)return true;// blocked after 10 attempts in 5 min
    entry.count++;loginAttempts.set(key,entry);
  }else{loginAttempts.set(key,{time:now,count:1})}
  return false;
}

function ld(){try{return JSON.parse(fs.readFileSync(DEF_FILE,"utf-8"))}catch(e){return cd()}}
function sd(d){fs.writeFileSync(DEF_FILE,JSON.stringify(d,null,2),"utf-8")}
function cd(){return{capacitor:{l0:"2000",tmax:"105",vrated:"50",irated:"500",dt0:"10",cooling:"1.0",workdays:"365",warrantyTarget:"5",scenario:"industrial",segments:[{dur:8,ta:60,vop:30,rips:[250,150]},{dur:16,ta:40,vop:30,rips:[100]}]},safety:{sStd:"iec",sPd:"2",sMg:"ii",sAlt:"2000",sOvc:"ii",sSysV_AC:"300",sSysV_DC:"600",nodes:[{name:"L-N",vrms:230,ins:"basic",pcb:0,coat:0,circ:"ac",interp:false},{name:"L-PE",vrms:230,ins:"basic",pcb:0,coat:0,circ:"ac",interp:false},{name:"DC+-PE",vrms:800,ins:"reinf",pcb:0,coat:0,circ:"dc",interp:false}]}}}

// Validate defaults structure - only allow known keys
function validateDefaults(d){
  if(typeof d!=="object"||d===null)return false;
  const allowedTop=["capacitor","safety"];
  for(const k of Object.keys(d)){if(!allowedTop.includes(k))return false}
  if(d.capacitor&&typeof d.capacitor==="object"){
    const capAllowed=["l0","tmax","vrated","irated","dt0","cooling","workdays","warrantyTarget","scenario","segments"];
    for(const k of Object.keys(d.capacitor)){if(!capAllowed.includes(k))return false}
    if(Array.isArray(d.capacitor.segments)){
      for(const seg of d.capacitor.segments){
        if(typeof seg!=="object")return false;
        const segAllowed=["dur","ta","vop","rips"];
        for(const k of Object.keys(seg)){if(!segAllowed.includes(k))return false}
      }
    }
  }
  if(d.safety&&typeof d.safety==="object"){
    const safeAllowed=["sStd","sPd","sMg","sAlt","sOvc","sSysV_AC","sSysV_DC","nodes"];
    for(const k of Object.keys(d.safety)){if(!safeAllowed.includes(k))return false}
    if(Array.isArray(d.safety.nodes)){
      for(const n of d.safety.nodes){
        if(typeof n!=="object")return false;
        const nodeAllowed=["name","vrms","ins","pcb","coat","circ","interp"];
        for(const k of Object.keys(n)){if(!nodeAllowed.includes(k))return false}
      }
    }
  }
  return true;
}

function rp(res,c,d,t){res.writeHead(c,{"Content-Type":t||"application/json;charset=utf-8","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type,x-auth-token","Access-Control-Allow-Methods":"GET,PUT,POST,DELETE,OPTIONS"});res.end(typeof d==="string"?d:JSON.stringify(d))}

// Safe file serving - prevent path traversal
function sf(res,fp){
  // Resolve and verify the file is within allowed directory
  const resolved=path.resolve(fp);
  if(!resolved.startsWith(ROOT)){rp(res,403,"Forbidden","text/plain");return}
  try{var d=fs.readFileSync(fp);var e=path.extname(fp).toLowerCase();res.writeHead(200,{"Content-Type":MIME[e]||"application/octet-stream","Cache-Control":"no-cache,no-store,must-revalidate","Access-Control-Allow-Origin":"*"});res.end(d)}catch(e){rp(res,404,"Not Found","text/plain")}
}

function pb(req,maxSize){return new Promise(function(r){var b="",sz=0;req.on("data",function(c){sz+=c.length;if(sz>maxSize){req.destroy();r({});return}b+=c});req.on("end",function(){try{r(JSON.parse(b))}catch(e){r({})}})})}

function pbForm(req,maxSize){return new Promise(function(r){var b="",sz=0;req.on("data",function(c){sz+=c.length;if(sz>maxSize){req.destroy();r({});return}b+=c});req.on("end",function(){var d={};b.split("&").forEach(function(p){var kv=p.split("=");if(kv.length===2)d[decodeURIComponent(kv[0])]=decodeURIComponent(kv[1])});r(d)})})}

function getTok(req){return req.headers["x-auth-token"]||(req.headers.cookie?req.headers.cookie.match(/token=([^;]+)/)?.[1]:undefined)}

// Sanitize URL path - remove .. and ensure it starts with /
function safePath(p){
  // Remove double dots and normalize
  const cleaned=p.replace(/\.\./g,"").replace(/\/+/g,"/");
  if(!cleaned.startsWith("/"))return"/";
  return cleaned;
}

// Warn about default password on startup
if(ADMIN_PW==="admin123"){console.warn("[SECURITY] Using default admin password! Set ADMIN_PASSWORD env var.")}

http.createServer(async function(req,res){
  const clientIP=req.socket.remoteAddress||"unknown";
  
  if(req.method==="OPTIONS"){res.writeHead(200,{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type,x-auth-token","Access-Control-Allow-Methods":"GET,PUT,POST,DELETE,OPTIONS"});res.end();return}
  
  var u=new URL(req.url,"http://localhost"),p=safePath(u.pathname),tok=getTok(req);
  
  if(p==="/api/login"&&req.method==="POST"){
    // Rate limiting
    if(checkRateLimit(clientIP)){rp(res,429,{error:"Too many attempts. Try again in 5 minutes."});return}
    
    var ct=req.headers["content-type"]||"",bp=ct.includes("json")?pb(req,MAX_BODY):pbForm(req,MAX_BODY),b=await bp;
    if(b.password===ADMIN_PW){
      var t=crypto.randomBytes(16).toString("hex");tokens.add(t);
      if(ct.includes("json")){rp(res,200,{success:true,token:t})}
      else{res.writeHead(302,{"Location":"/admin","Set-Cookie":"token="+t+";Path=/;Max-Age=86400"});res.end()}
    }else{
      if(ct.includes("json"))rp(res,403,{error:"密码错误"})
      else{res.writeHead(302,{"Location":"/admin/login?e=1"});res.end()}
    }
    return;
  }
  if(p==="/api/logout"&&req.method==="POST"){tokens.delete(tok);rp(res,200,{success:true});return}
  if(p==="/api/session"){rp(res,200,{authenticated:tokens.has(tok)});return}
  if(p==="/api/defaults"&&req.method==="GET"){rp(res,200,ld());return}
  
  // Admin defaults API - validate input on PUT
  if(p==="/api/admin/defaults"){
    if(!tokens.has(tok)){rp(res,401,{error:"Unauthorized"});return}
    if(req.method==="GET"){rp(res,200,ld());return}
    if(req.method==="PUT"){
      var b2=await pb(req,MAX_BODY);
      if(!validateDefaults(b2)){rp(res,400,{error:"Invalid defaults structure"});return}
      sd(b2);rp(res,200,{success:true});return;
    }
  }
  
  // Admin static files - prevent path traversal
  if(p==="/admin"||p==="/admin/"){sf(res,path.join(__dirname,"admin","dashboard.html"));return}
  if(p==="/admin/login"){sf(res,path.join(__dirname,"admin","login.html"));return}
  if(p.startsWith("/admin/")){
    const adminFile=p.replace("/admin/","");
    // Only serve known safe files
    const allowedAdmin=["dashboard.html","login.html"];
    if(!allowedAdmin.includes(adminFile)){rp(res,403,"Forbidden","text/plain");return}
    sf(res,path.join(__dirname,"admin",adminFile));return;
  }
  
  // Main page - inject defaults
  if(p==="/"||p==="/index.html"){
    var fp=path.join(ROOT,"index.html");
    try{
      var html=fs.readFileSync(fp,"utf-8");
      var defs=JSON.stringify(ld());
      html=html.replace("/*_DEFAULTS_JSON_*/",defs);
      res.writeHead(200,{"Content-Type":"text/html;charset=utf-8","Cache-Control":"no-cache,no-store,must-revalidate"});
      res.end(html);
    }catch(e){sf(res,fp)}
    return;
  }
  
  // Static files - prevent path traversal
  var sp=p==="/"?"index.html":p;
  sf(res,path.join(ROOT,sp));
}).listen(PORT,function(){console.log("Server: http://localhost:"+PORT+"/\nAdmin: http://localhost:"+PORT+"/admin\nPassword: "+ADMIN_PW)});
