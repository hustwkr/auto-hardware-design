const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto");
const PORT=parseInt(process.env.PORT||"8080",10),ADMIN_PW=process.env.ADMIN_PASSWORD||"admin123";
const ROOT=path.resolve(__dirname,".."),DEF_FILE=path.join(__dirname,"defaults.json");
const tokens=new Set(),MIME={".html":"text/html;charset=utf-8",".js":"text/javascript;charset=utf-8",".css":"text/css;charset=utf-8",".json":"application/json;charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".pdf":"application/pdf"};
function ld(){try{return JSON.parse(fs.readFileSync(DEF_FILE,"utf-8"))}catch(e){return cd()}}
function sd(d){fs.writeFileSync(DEF_FILE,JSON.stringify(d,null,2),"utf-8")}
function cd(){return{capacitor:{l0:"2000",tmax:"105",vrated:"50",irated:"500",dt0:"10",cooling:"1.0",workdays:"365",warrantyTarget:"5",scenario:"industrial",segments:[{dur:8,ta:60,vop:30,rips:[250,150]},{dur:16,ta:40,vop:30,rips:[100]}]},safety:{sStd:"iec",sPd:"2",sMg:"ii",sAlt:"2000",sOvc:"ii",sSysV_AC:"300",sSysV_DC:"600",nodes:[{name:"L-N",vrms:230,ins:"basic",pcb:0,coat:0,circ:"ac",interp:false},{name:"L-PE",vrms:230,ins:"basic",pcb:0,coat:0,circ:"ac",interp:false},{name:"DC+-PE",vrms:800,ins:"reinf",pcb:0,coat:0,circ:"dc",interp:false}]}}}
function rp(res,c,d,t){res.writeHead(c,{"Content-Type":t||"application/json;charset=utf-8","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type,x-auth-token","Access-Control-Allow-Methods":"GET,PUT,POST,DELETE,OPTIONS"});res.end(typeof d=="string"?d:JSON.stringify(d))}
function sf(res,fp){try{var d=fs.readFileSync(fp);var e=path.extname(fp).toLowerCase();res.writeHead(200,{"Content-Type":MIME[e]||"application/octet-stream","Cache-Control":"no-cache,no-store,must-revalidate","Access-Control-Allow-Origin":"*"});res.end(d)}catch(e){rp(res,404,"Not Found","text/plain")}}
function pb(req){return new Promise(function(r){var b="";req.on("data",function(c){b+=c});req.on("end",function(){try{r(JSON.parse(b))}catch(e){r({})}})})}
function pbForm(req){return new Promise(function(r){var b="";req.on("data",function(c){b+=c});req.on("end",function(){var d={};b.split("&").forEach(function(p){var kv=p.split("=");if(kv.length===2)d[decodeURIComponent(kv[0])]=decodeURIComponent(kv[1])});r(d)})})}
function getTok(req){return req.headers["x-auth-token"]||(req.headers.cookie?req.headers.cookie.match(/token=([^;]+)/)?.[1]:undefined)}

http.createServer(async function(req,res){
  if(req.method==="OPTIONS"){res.writeHead(200,{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type,x-auth-token","Access-Control-Allow-Methods":"GET,PUT,POST,DELETE,OPTIONS"});res.end();return}
  var u=new URL(req.url,"http://localhost"),p=u.pathname,tok=getTok(req);
  
  if(p==="/api/login"&&req.method==="POST"){
    var ct=req.headers["content-type"]||"",bp=ct.includes("json")?pb(req):pbForm(req),b=await bp;
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
  if(p==="/api/admin/defaults"){if(!tokens.has(tok)){rp(res,401,{error:"Unauthorized"});return}if(req.method==="GET"){rp(res,200,ld());return}if(req.method==="PUT"){var b2=await pb(req);sd(b2);rp(res,200,{success:true});return}}
  if(p==="/admin"||p==="/admin/"){sf(res,path.join(__dirname,"admin","dashboard.html"));return}
  if(p==="/admin/login"){sf(res,path.join(__dirname,"admin","login.html"));return}
  if(p.startsWith("/admin/")){sf(res,path.join(__dirname,"admin",p.replace("/admin/","")));return}
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
var sp=p==="/"?"/index.html":p;sf(res,path.join(ROOT,sp));
}).listen(PORT,function(){console.log("Server: http://localhost:"+PORT+"/\nAdmin: http://localhost:"+PORT+"/admin\nPassword: "+ADMIN_PW)});
