const HEADERS=[
"Tổ 組"," loại đơn 單別","KH 客戶","Mã đơn 訂單號碼","NET 筆","Ngày ĐĐH 訂單日期","Mã SP 料號","Màu 色號","QC 寬度","Độ dài 型號","ĐV 單位","SL 數量","TD 進度參考","Tên SP (SQ) 生管品名","Ghi chú ĐĐH 訂單備注","Ghi chú ĐĐH 摘要","KH YC 客戶要求日期","Ngày 93 HC 織造完工日","Ngày 94 HC 染色完工日","Ngày 95 HC 上漿完工日","Ngày 96 HC 束頭完工日","Ngày PH3 HC PH3完工日","Ngày 99 NK 99入庫日"
];
const COLNAMES=["col_a","col_b","customer","order_no","net","order_date","item_no","color","width","model","unit","qty","progress_ref","product_name","order_note","summary","customer_required","weaving_date","dyeing_date","sizing_date","aglet_date","ph3_date","warehouse99_date"];
const KEYCOLS=[2,3,4], PROGRESS_START=17;
const $=id=>document.getElementById(id);
const cfg=window.PH3_CONFIG||{};
if(!cfg.SUPABASE_URL || !cfg.SUPABASE_PUBLISHABLE_KEY || cfg.SUPABASE_URL.includes("PASTE_")){
  alert("請先設定 config.js 的 Supabase URL 與 Publishable key。");
}
const sb=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
let rows=[], histories=[], batches=[], tab="current", currentProfile=null;
const dirtyKeys=new Set();
const issueKeys=new Map(); // 本次畫面操作發現的日期異常：key -> 訊息

function updateActionState(){
  const n=dirtyKeys.size;
  const save=$("saveReplyBtn"), dl=$("downloadBtn"), mail=$("downloadMailBtn"), guard=$("saveGuard");
  if(save)save.disabled=n===0;
  if(dl)dl.disabled=n>0;
  if(mail)mail.disabled=n>0;
  if(guard){
    guard.innerHTML=n>0
      ? `<span class="bad">⚠ 尚有 ${n} 筆未儲存：請先按「儲存目前修改」，儲存成功後才能下載 / Còn ${n} dòng chưa lưu: phải lưu trước khi tải Excel</span>`
      : `<span class="ok">✓ 目前資料已同步，可下載 / Dữ liệu hiện tại đã đồng bộ, có thể tải Excel</span>`;
  }
}
function blockIfUnsaved(actionText){
  if(!dirtyKeys.size)return false;
  $("replyMsg").innerHTML=`<span class="bad">⚠ 尚有 ${dirtyKeys.size} 筆未儲存，請先按「儲存目前修改」，再${actionText} / Còn dữ liệu chưa lưu, hãy lưu trước</span>`;
  updateActionState();
  return true;
}

function fmt(v){if(!v)return"";if(v instanceof Date)return `${v.getFullYear()}/${v.getMonth()+1}/${v.getDate()}`;if(/^\d{4}-\d{2}-\d{2}/.test(String(v)))return String(v).slice(0,10).replaceAll("-","/");return String(v)}
function excelDate(v){if(!v)return null;if(v instanceof Date)return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,"0")}-${String(v.getDate()).padStart(2,"0")}`;if(typeof v==="number"){const p=XLSX.SSF.parse_date_code(v);return p?`${p.y}-${String(p.m).padStart(2,"0")}-${String(p.d).padStart(2,"0")}`:null}const s=String(v).trim();const m=s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);if(m)return `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;const d=new Date(v);return isNaN(d)?null:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function keyOfArray(r){return [r[2],r[3],r[4]].map(v=>String(v??"").trim()).join("|")}
function dbToArray(o){return COLNAMES.map(c=>o[c]??"")}
function arrToPayload(r){const p={};COLNAMES.forEach((c,i)=>p[c]=[5,16,17,18,19,20,21,22].includes(i)?excelDate(r[i]):r[i]);return p}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function changedSet(o){return new Set(o.changed_fields||[])}
function prevPh3(o){return o.prev_ph3_date||((o.ever_replied&&o.ph3_date)?o.ph3_date:"")}
function prev99(o){return o.prev_99_date||((o.ever_replied&&o.warehouse99_date)?o.warehouse99_date:"")}
function latestPrev(o){return prevPh3(o)?`${fmt(prevPh3(o))} / 99 ${fmt(prev99(o))}`:"—"}
function latestUpstream(o){
  // 前工段不依 93→94→95→96 的固定順序判斷；PH3 接手前，取所有已回覆前工段日期中的「最晚日期」。
  const candidates=[
    ["weaving_date","織造/93",o.weaving_date,93],
    ["dyeing_date","染色/94",o.dyeing_date,94],
    ["sizing_date","上漿/95",o.sizing_date,95],
    ["aglet_date","束頭/96",o.aglet_date,96]
  ].filter(([, ,value])=>!!value)
   .map(([field,label,value,stage])=>({field,label,date:String(value).slice(0,10),stage}));
  if(!candidates.length)return {field:"",label:"—",date:""};
  candidates.sort((a,b)=>b.date.localeCompare(a.date)||b.stage-a.stage);
  return candidates[0];
}
function parseYMD(s){
  if(!s)return null;
  const m=String(s).slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return null;
  return new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0));
}
function ymdUTC(d){
  if(!d)return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
}
function addDaysExcludeSunday(start,days){
  const d=parseYMD(start); if(!d)return "";
  let n=0;
  while(n<Number(days)){
    d.setUTCDate(d.getUTCDate()+1);
    if(d.getUTCDay()!==0)n++;
  }
  return ymdUTC(d);
}
function calendarAdd(start,days){
  const d=parseYMD(start); if(!d)return "";
  d.setUTCDate(d.getUTCDate()+Number(days));
  return ymdUTC(d);
}
function workDaysExcludeSunday(from,to){
  let a=parseYMD(from), b=parseYMD(to);
  if(!a||!b)return null;
  if(b<a)return 0;
  let n=0;
  while(a<b){
    a.setUTCDate(a.getUTCDate()+1);
    if(a.getUTCDay()!==0)n++;
  }
  return n;
}
function is99Late(o){
  return !!(o.warehouse99_date && o.customer_required && String(o.warehouse99_date).slice(0,10)>String(o.customer_required).slice(0,10));
}
function ph3Days(o){
  const p=latestUpstream(o);
  return p.date&&o.ph3_date?workDaysExcludeSunday(p.date,String(o.ph3_date).slice(0,10)):null;
}
function ph3BeforeUpstream(o){
  const p=latestUpstream(o);
  return !!(o.ph3_date && p.date && String(o.ph3_date).slice(0,10) < p.date);
}
function warehouseBeforePh3(o){
  return !!(o.warehouse99_date && o.ph3_date && String(o.warehouse99_date).slice(0,10) < String(o.ph3_date).slice(0,10));
}
function issueReason(o){
  const reasons=[];
  if(issueKeys.has(o.unique_key))reasons.push(issueKeys.get(o.unique_key));
  if(ph3BeforeUpstream(o))reasons.push("PH3早於前工段 / PH3 sớm hơn công đoạn trước");
  if(warehouseBeforePh3(o))reasons.push("99早於PH3 / 99 sớm hơn PH3");
  if(is99Late(o))reasons.push("99晚於客需 / 99 trễ hơn KH");
  if(ph3Days(o)>7)reasons.push("PH3超過7天 / PH3 >7 ngày");
  return [...new Set(reasons)].join("；");
}
function hasIssue(o){return !!issueReason(o)}
function rowDomId(key){return "row_"+String(key).replace(/[^a-zA-Z0-9_-]/g,"_")}
function markIssueAndFocus(o,message){
  issueKeys.set(o.unique_key,message);
  render();
  requestAnimationFrame(()=>{
    const el=document.getElementById(rowDomId(o.unique_key));
    if(el)el.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"});
  });
}
function refreshPrevDateOptions(){
  const el=$("fPrevDate"); if(!el)return;
  const current=el.value;
  const dates=[...new Set(rows.map(o=>latestUpstream(o).date).filter(Boolean))].sort();
  el.innerHTML='<option value="">全部日期 / Tất cả ngày</option>'+
    dates.map(d=>`<option value="${esc(d)}">${esc(fmt(d))}</option>`).join("");
  if(dates.includes(current))el.value=current;
}
function todayYMD(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
async function loadBatches(){
  const {data,error}=await sb.from("ph3_import_batches").select("*").order("created_at",{ascending:false}).limit(100);
  if(error){console.error(error);batches=[];return}
  batches=data||[];
  const el=$("batchSelect");
  const current=el.value;
  el.innerHTML='<option value="">自動選最新 / Tự chọn mới nhất</option>'+
    batches.map(b=>`<option value="${esc(b.id)}">${esc(new Date(b.created_at).toLocaleString())}｜${esc(b.source_file||"")}｜${Number(b.row_count||0)}筆</option>`).join("");
  if(batches.some(b=>String(b.id)===current))el.value=current;
  updateBatchInfo();
}
function selectedBatchId(){
  const manual=$("batchSelect").value;
  if(manual)return manual;
  return batches.length?String(batches[0].id):"";
}
function updateBatchInfo(){
  if(!$("batchInfo"))return;
  const id=selectedBatchId(), b=batches.find(x=>String(x.id)===String(id));
  $("batchInfo").textContent=b
    ? `這一批 ${Number(b.row_count||0)} 筆｜${b.source_file||""} / Lần này ${Number(b.row_count||0)} dòng`
    : "目前沒有匯入批次 / Chưa có lần nhập";
}

function filtered(){
  const c=$("fCustomer").value.trim().toLowerCase(),
        d=$("fOrder").value.trim().toLowerCase(),
        g=$("fItem").value.trim().toLowerCase(),
        st=$("fStatus").value,
        prevDate=$("fPrevDate").value,
        scope=$("workScope").value,
        batchId=selectedBatchId(),
        today=todayYMD();

  const data=rows.filter(o=>{
    if(scope==="latest" && batchId && String(o.last_batch_id||"")!==String(batchId))return false;
    if(scope==="today_unreplied"){
      const imported=String(o.last_imported_at||o.updated_at||"").slice(0,10);
      if(imported!==today || !o.needs_reply)return false;
    }
    if(c&&!String(o.customer??"").toLowerCase().includes(c))return false;
    if(d&&!String(o.order_no??"").toLowerCase().includes(d))return false;
    if(g&&!String(o.item_no??"").toLowerCase().includes(g))return false;
    const prev=latestUpstream(o).date;
    if(prevDate && prev!==prevDate)return false;
    if(st==="need"&&!o.needs_reply)return false;
    if(st==="changed"&&!(o.changed_fields||[]).length)return false;
    if(st==="had"&&!o.ever_replied)return false;
    if(st==="late99"&&!is99Late(o))return false;
    if(st==="over7"&&!(ph3Days(o)>7))return false;
    if(st==="issue"&&!hasIssue(o))return false;
    return true;
  });

  // 編輯後不可因 updated_at 改變而跳列；最新批次固定照原 Excel 列順序。
  return data.sort((a,b)=>{
    if(scope==="latest") return Number(a.last_batch_row_no||999999)-Number(b.last_batch_row_no||999999);
    return String(a.customer||"").localeCompare(String(b.customer||"")) ||
           String(a.order_no||"").localeCompare(String(b.order_no||"")) ||
           String(a.net||"").localeCompare(String(b.net||""));
  });
}
async function loadAll(){
  const {data,error}=await sb.from("ph3_orders").select("*").order("updated_at",{ascending:false}).limit(50000);
  if(error)throw error; rows=data||[];
  $("sAll").textContent=rows.length;
  $("sNeed").textContent=rows.filter(x=>x.needs_reply).length;
  $("sHad").textContent=rows.filter(x=>x.ever_replied).length;
  $("sChanged").textContent=rows.filter(x=>(x.changed_fields||[]).length).length;
  refreshPrevDateOptions();
  await loadBatches();
  render();
}
async function loadHistory(){
  const {data,error}=await sb.from("ph3_order_history").select("*").order("changed_at",{ascending:false}).limit(50000);
  if(error)throw error; histories=data||[];render();
}
const WEB_COLUMNS=[
  ...HEADERS.slice(0,21).map((h,i)=>({kind:"data",idx:i,label:h,width:[
    38,42,58,76,38,78,74,50,46,74,42,58,54,158,108,116,82,84,84,84,84
  ][i]||72})),
  {kind:"prevStage",label:"前工段 / Công đoạn trước",width:108},
  {kind:"data",idx:21,label:HEADERS[21],width:106},
  {kind:"prevPh3",label:"PH3 lần trước / PH3上次回覆日",width:96},
  {kind:"data",idx:22,label:HEADERS[22],width:106},
  {kind:"prev99",label:"99 lần trước / 99上次回覆日",width:96},
  {kind:"days",label:"PH3工段天數 / Số ngày PH3",width:80},
  {kind:"status",label:"狀態 / Trạng thái",width:180}
]

function initFreezeSetting(){
  const el=$("freezeCols");
  el.innerHTML=Array.from({length:WEB_COLUMNS.length+1},(_,i)=>`<option value="${i}">${i}</option>`).join("");
  const saved=localStorage.getItem("ph3_freeze_cols_v8");
  el.value=saved!==null?saved:"5";
}
function applyFrozenColumns(){
  const count=Number($("freezeCols")?.value||5);
  localStorage.setItem("ph3_freeze_cols_v8",String(count));
  const table=$("grid"); if(!table)return;
  table.querySelectorAll(".sticky-col").forEach(x=>{
    x.classList.remove("sticky-col","sticky-head","sticky-edge");
    x.style.left="";
  });
  let left=0;
  for(let i=0;i<count && i<WEB_COLUMNS.length;i++){
    const width=WEB_COLUMNS[i].width;
    table.querySelectorAll(`[data-display-col="${i}"]`).forEach(el=>{
      el.classList.add("sticky-col");
      if(el.tagName==="TH")el.classList.add("sticky-head");
      el.style.left=`${left}px`;
      if(i===count-1)el.classList.add("sticky-edge");
    });
    left+=width;
  }
}

function render(){
  const grid=$("grid");
  if(tab==="history"){
    const fieldLabel=f=>({ph3_date:"PH3",warehouse99_date:"99"}[f]||f||"");
    grid.innerHTML=`<thead><tr><th class="fixed">修改人 / Người sửa</th><th class="fixed">修改時間 / Thời gian</th><th class="fixed">客戶+訂單號碼+筆數 / KH+Mã đơn+NET</th><th class="fixed">修改內容 / Nội dung sửa</th><th class="fixed">來源 / Nguồn</th></tr></thead><tbody>`+
      histories.map(h=>{
        const who=(h.employee_no||h.employee_name)?`${h.employee_no||""} ${h.employee_name||""}`.trim():"系統匯入 / Hệ thống";
        const change=`${fieldLabel(h.field_name)}：${fmt(h.old_value)||"—"} → ${fmt(h.new_value)||"—"}`;
        return `<tr><td class="fixed"><b>${esc(who)}</b></td><td class="fixed">${esc(new Date(h.changed_at).toLocaleString())}</td><td class="fixed">${esc(h.unique_key)}</td><td class="progress"><b>${esc(change)}</b></td><td class="fixed">${esc(h.source_file||"")}</td></tr>`;
      }).join("")+"</tbody>";
    return;
  }

  const data=filtered();
  $("filterCount").textContent=`目前顯示 ${data.length.toLocaleString()} 筆 / Đang hiển thị ${data.length.toLocaleString()} dòng`;

  let h="<colgroup>";
  WEB_COLUMNS.forEach(c=>h+=`<col style="width:${c.width}px;min-width:${c.width}px;max-width:${c.width}px">`);
  h+="</colgroup><thead><tr>";
  WEB_COLUMNS.forEach((c,di)=>{
    let cls="fixed";
    if(c.kind==="data" && c.idx>=17)cls="progress";
    if(c.kind==="data" && KEYCOLS.includes(c.idx))cls="key";
    if(["prevStage","prevPh3","prev99","days","status"].includes(c.kind))cls="progress";
    h+=`<th data-display-col="${di}" class="${cls}" title="${esc(c.label)}">${esc(c.label)}</th>`;
  });
  h+="</tr></thead><tbody>";

  for(const o of data){
    const arr=dbToArray(o), ch=changedSet(o), prev=latestUpstream(o), days=ph3Days(o), late99=is99Late(o);
    const issue=hasIssue(o), issueText=issueReason(o);
    h+=`<tr id="${rowDomId(o.unique_key)}" class="${o.needs_reply?"need":""} ${issue?"issue-row":""}" data-key="${esc(o.unique_key)}">`;
    WEB_COLUMNS.forEach((c,di)=>{
      let cls="fixed", content="";
      if(c.kind==="data"){
        const i=c.idx, field=COLNAMES[i], isChanged=ch.has(field);
        cls=i>=17?"progress":"fixed";
        if(isChanged)cls+=" changed";
        if(i===21 && (days>7 || ph3BeforeUpstream(o)))cls+=" warncell";
        if(i===22 && (late99 || warehouseBeforePh3(o)))cls+=" warncell";
        if(i===21 || i===22){
          if(dirtyKeys.has(o.unique_key))cls+=" draftcell";
          const val=arr[i]?String(arr[i]).slice(0,10):"";
          content=`<input class="cell-date" type="date" data-key="${esc(o.unique_key)}" data-col="${i}" value="${esc(val)}">`;
        }else{
          content=esc(fmt(arr[i]));
          if(i===0 && issue)content=`<span class="issue-marker" title="${esc(issueText)}">⚠</span>`+content;
        }
      }else if(c.kind==="prevStage"){
        cls="progress";content=`${esc(prev.label)} ${esc(fmt(prev.date))}`;
      }else if(c.kind==="prevPh3"){
        cls="progress";content=esc(fmt(prevPh3(o))||"—");
      }else if(c.kind==="prev99"){
        cls="progress";content=esc(fmt(prev99(o))||"—");
      }else if(c.kind==="days"){
        cls="progress";
        if(days===null)content="—";
        else if(days>7)content=`<span class="badge b-red">${days}天 / ${days} ngày</span>`;
        else content=`<span class="badge b-green">${days}天 / ${days} ngày</span>`;
      }else if(c.kind==="status"){
        cls="progress";
        let status=o.needs_reply?'<span class="badge b-red">待重回 / Cần trả lời</span>':'<span class="badge b-green">已回覆 / Đã trả lời</span>';
        if((o.changed_fields||[]).length)status+=' <span class="badge b-orange">有異動 / Có thay đổi</span>';
        if(ph3BeforeUpstream(o))status+=' <span class="badge b-red">PH3早於前站 / PH3 sớm hơn công đoạn trước</span>';
        if(warehouseBeforePh3(o))status+=' <span class="badge b-red">99早於PH3 / 99 sớm hơn PH3</span>';
        if(late99)status+=' <span class="badge b-red">99晚於客需 / 99 trễ hơn KH</span>';
        if(days>7)status+=' <span class="badge b-red">PH3超7天 / PH3 >7 ngày</span>';
        if(dirtyKeys.has(o.unique_key))status+=' <span class="badge draftbadge">尚未儲存 / Chưa lưu</span>';
        if(issueKeys.has(o.unique_key))status=`<span class="badge b-red">⚠ ${esc(issueKeys.get(o.unique_key))}</span> `+status;
        content=status;
      }
      h+=`<td data-display-col="${di}" class="${cls}" title="${esc(String(content).replace(/<[^>]*>/g,""))}">${content}</td>`;
    });
    h+="</tr>";
  }
  grid.innerHTML=h+"</tbody>";
  grid.querySelectorAll(".cell-date").forEach(inp=>inp.addEventListener("change",saveDirectCell));
  applyFrozenColumns();
  updateActionState();
}
async function loadMyProfile(user){
  const {data,error}=await sb.from("employee_profiles").select("id,employee_no,employee_name,is_active,role").eq("id",user.id).maybeSingle();
  if(error)throw error;
  if(!data)throw new Error("找不到員工資料 / Không tìm thấy hồ sơ nhân viên");
  if(data.is_active===false)throw new Error("此帳號已停用 / Tài khoản đã bị vô hiệu hóa");
  currentProfile=data;
  return data;
}
async function login(){
  $("loginMsg").textContent="";
  const employeeNo=$("employeeNo").value.trim().toUpperCase();
  const password=$("password").value;
  if(!employeeNo||!password){$("loginMsg").innerHTML='<span class="bad">請輸入工號與密碼 / Nhập mã nhân viên và mật khẩu</span>';return}
  const email=`${employeeNo.toLowerCase()}@paiho.vn`;
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error){$("loginMsg").innerHTML='<span class="bad">工號或密碼錯誤 / Sai mã nhân viên hoặc mật khẩu</span>';return}
  try{await showApp(data.user);await loadAll()}catch(e){await sb.auth.signOut();$("loginMsg").innerHTML=`<span class="bad">${esc(e.message||e)}</span>`}
}
async function showApp(user){
  const p=await loadMyProfile(user);
  $("loginPanel").style.display="none";$("appPanel").style.display="block";
  $("who").textContent=`${p.employee_no} ${p.employee_name}`;
  if($("accountPanel"))$("accountPanel").style.display=p.role==="admin"?"block":"none";
}
async function logout(){currentProfile=null;await sb.auth.signOut();location.reload()}
async function checkSession(){const {data}=await sb.auth.getSession();if(data.session){try{await showApp(data.session.user);await loadAll()}catch(e){console.error(e);await sb.auth.signOut();$("loginMsg").innerHTML=`<span class="bad">${esc(e.message||e)}</span>`}}}

async function createAccountsBulk(){
  if(currentProfile?.role!=="admin"){$("accountMsg").innerHTML='<span class="bad">只有管理者可以建立帳號 / Chỉ quản trị viên được tạo tài khoản</span>';return}
  const lines=$("accountBulk").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length){$("accountMsg").innerHTML='<span class="warn">請先輸入帳號資料 / Hãy nhập dữ liệu tài khoản</span>';return}
  const employees=[];
  for(const [idx,line] of lines.entries()){
    const parts=line.split(/[,，\t]/).map(x=>x.trim());
    if(parts.length<3||!parts[0]||!parts[1]||!parts[2]){$("accountMsg").innerHTML=`<span class="bad">第 ${idx+1} 行格式錯誤：工號,姓名,密碼 / Sai định dạng dòng ${idx+1}</span>`;return}
    employees.push({employee_no:parts[0].toUpperCase(),employee_name:parts[1],password:parts.slice(2).join(",")});
  }
  $("createAccountsBtn").disabled=true;$("accountMsg").textContent=`建立 ${employees.length} 個帳號中… / Đang tạo ${employees.length} tài khoản…`;
  try{
    const {data,error}=await sb.functions.invoke("create-employees",{body:{employees}});
    if(error)throw error;
    const ok=(data?.results||[]).filter(x=>x.ok).length, fail=(data?.results||[]).filter(x=>!x.ok);
    $("accountMsg").innerHTML=`<span class="ok">✓ 已建立 ${ok} 個帳號 / Đã tạo ${ok} tài khoản</span>`+(fail.length?`<br><span class="bad">失敗 ${fail.length} 個：${esc(fail.map(x=>`${x.employee_no} ${x.error}`).join("；"))}</span>`:"");
    if(!fail.length)$("accountBulk").value="";
  }catch(e){console.error(e);$("accountMsg").innerHTML=`<span class="bad">建立失敗 / Tạo thất bại：${esc(e.message||e)}。請確認 Supabase Edge Function「create-employees」已部署。</span>`}
  finally{$("createAccountsBtn").disabled=false}
}

async function importFiles(){
  const fs=[...$("files").files];
  if(!fs.length){$("importMsg").innerHTML='<span class="warn">請先選 Excel / Chọn Excel</span>';return}
  $("importMsg").textContent="匯入中… / Đang nhập…";

  try{
    const allPayload=[];
    const names=[];
    let rowNo=1;

    for(const f of fs){
      const buf=await f.arrayBuffer();
      const wb=XLSX.read(buf,{type:"array",cellDates:false});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const a=XLSX.utils.sheet_to_json(ws,{header:1,defval:"",raw:true});
      if(a.length<2||HEADERS.some((x,i)=>String(a[0][i]??"").trim()!==String(x).trim())){
        throw new Error(`${f.name} 格式不符 / Sai định dạng`);
      }
      names.push(f.name);
      a.slice(1).filter(r=>r.some(v=>v!==""&&v!=null)).forEach(r=>{
        const row=Array.from({length:23},(_,i)=>r[i]??"");
        allPayload.push({unique_key:keyOfArray(row),source_file:f.name,row_no:rowNo++,data:arrToPayload(row)});
      });
    }

    const user=(await sb.auth.getUser()).data.user;
    const batchName=names.length===1?names[0]:`${names[0]} + ${names.length-1} files`;
    const {data:batch,error:batchErr}=await sb.from("ph3_import_batches")
      .insert({source_file:batchName,row_count:allPayload.length,imported_by:user?.id})
      .select("*").single();
    if(batchErr)throw batchErr;

    let ok=0;
    for(let i=0;i<allPayload.length;i+=500){
      const chunk=allPayload.slice(i,i+500);
      const {data,error}=await sb.rpc("ph3_import_orders",{p_rows:chunk,p_batch_id:batch.id});
      if(error)throw error;
      ok+=Number(data?.processed||chunk.length);
    }

    $("importMsg").innerHTML=`<span class="ok">完成 ${ok} 筆，已自動切到最新一批 / Hoàn tất ${ok} dòng, đã chuyển sang lần mới nhất</span>`;
    $("workScope").value="latest";
    $("batchSelect").value="";
    await loadAll();
  }catch(e){
    console.error(e);
    $("importMsg").innerHTML=`<span class="bad">匯入失敗 / Nhập thất bại：${esc(e.message||e)}</span>`;
  }
}

async function saveDirectCell(e){
  const key=e.target.dataset.key, col=Number(e.target.dataset.col);
  const o=rows.find(x=>x.unique_key===key); if(!o)return;

  const oldPh3=String(o.ph3_date||"").slice(0,10);
  const old99=String(o.warehouse99_date||"").slice(0,10);
  let ph3=oldPh3, w99=old99;

  if(col===21){
    ph3=e.target.value;
    const prev=latestUpstream(o);
    if(ph3 && prev.date && ph3 < prev.date){
      const msg=`PH3早於前工段 ${fmt(prev.date)} / PH3 sớm hơn công đoạn trước`;
      $("replyMsg").innerHTML=`<span class="bad">⚠ ${esc(key)}：${esc(msg)}</span>`;
      e.target.value=oldPh3;
      markIssueAndFocus(o,msg);
      return;
    }
    w99=ph3?calendarAdd(ph3,3):"";
  }else{
    w99=e.target.value;
    if(w99 && ph3 && w99 < ph3){
      const msg="99早於PH3 / 99 sớm hơn PH3";
      $("replyMsg").innerHTML=`<span class="bad">⚠ ${esc(key)}：${esc(msg)}</span>`;
      e.target.value=old99;
      markIssueAndFocus(o,msg);
      return;
    }
  }

  // Draft only: do not reload or reorder the table.
  o.ph3_date=ph3||null;
  o.warehouse99_date=w99||null;
  issueKeys.delete(key);
  dirtyKeys.add(key);
  if($("fStatus").value==="issue" && filtered().length===0){
    $("fStatus").value="";
    $("replyMsg").innerHTML='<span class="ok">異常已修正，已自動返回全部資料 / Đã sửa lỗi, tự động trở về tất cả dữ liệu</span>';
  }else{
    $("replyMsg").innerHTML='<span class="warn">已暫存於畫面，確認全部後請按「儲存目前修改」 / Đã giữ tạm trên màn hình, hãy bấm Lưu các thay đổi khi hoàn tất</span>';
  }
  render();
}

async function calcBulkReply(){
  const data=filtered(), add=Number($("addDays").value);
  if(!data.length){$("replyMsg").innerHTML='<span class="warn">目前篩選沒有資料 / Không có dữ liệu đang lọc</span>';return}
  const missing=data.filter(o=>!latestUpstream(o).date);
  if(missing.length){
    $("replyMsg").innerHTML=`<span class="bad">${missing.length} 筆沒有前工段日期，不能計算 / ${missing.length} dòng thiếu ngày công đoạn trước</span>`;
    return;
  }

  for(const o of data){
    const prev=latestUpstream(o).date;
    const ph3=addDaysExcludeSunday(prev,add);
    o.ph3_date=ph3;
    o.warehouse99_date=calendarAdd(ph3,3);
    dirtyKeys.add(o.unique_key);
  }
  $("replyMsg").innerHTML=`<span class="warn">已計算 ${data.length} 筆但尚未儲存：PH3=前站+${add}天（週日不算），99=PH3+3天 / Đã tính ${data.length} dòng nhưng chưa lưu</span>`;
  render();
}

async function saveDraftReplies(){
  if(!dirtyKeys.size){
    $("replyMsg").innerHTML='<span class="warn">目前沒有尚未儲存的修改 / Không có thay đổi chưa lưu</span>';
    return;
  }

  const payload=[];
  const invalid=[];
  for(const key of dirtyKeys){
    const o=rows.find(x=>x.unique_key===key);
    if(!o)continue;
    const ph3=String(o.ph3_date||"").slice(0,10)||null;
    const w99=String(o.warehouse99_date||"").slice(0,10)||null;
    const prev=latestUpstream(o).date;

    if(ph3 && prev && ph3<prev){invalid.push(`${key}: PH3 < 前站`);issueKeys.set(key,"PH3早於前工段 / PH3 sớm hơn công đoạn trước");continue}
    if(w99 && ph3 && w99<ph3){invalid.push(`${key}: 99 < PH3`);issueKeys.set(key,"99早於PH3 / 99 sớm hơn PH3");continue}
    payload.push({unique_key:key,ph3_date:ph3,warehouse99_date:w99});
  }

  if(invalid.length){
    $("replyMsg").innerHTML=`<span class="bad">⚠ 有 ${invalid.length} 筆日期不合法，已在表格標示；狀態可選「只看異常」 / Có ${invalid.length} dòng lỗi, đã đánh dấu trong bảng</span>`;
    render();
    const firstKey=invalid[0].split(":")[0];
    requestAnimationFrame(()=>document.getElementById(rowDomId(firstKey))?.scrollIntoView({behavior:"smooth",block:"center"}));
    return;
  }

  $("replyMsg").textContent="儲存中… / Đang lưu…";
  const {data,error}=await sb.rpc("ph3_import_replies",{p_rows:payload});
  if(error){
    $("replyMsg").innerHTML=`<span class="bad">${esc(error.message)}</span>`;
    return;
  }

  dirtyKeys.clear();
  $("replyMsg").innerHTML=`<span class="ok">已儲存 ${data.updated} 筆 / Đã lưu ${data.updated} dòng</span>`+
    (data.late99?` <span class="warn">；99晚於客需 ${data.late99} 筆 / ${data.late99} dòng 99 trễ hơn KH</span>`:"")+
    (data.over7?` <span class="warn">；PH3超過7天 ${data.over7} 筆 / PH3 >7 ngày: ${data.over7}</span>`:"");
  await loadAll();
}

function exportData(){
  // 下載永遠以「處理範圍」為準，不受畫面上的客戶/料號/日期/狀態/只看異常篩選影響，避免漏寄資料。
  const scope=$("workScope").value, batchId=selectedBatchId(), today=todayYMD();
  const data=rows.filter(o=>{
    if(scope==="latest" && batchId && String(o.last_batch_id||"")!==String(batchId))return false;
    if(scope==="today_unreplied"){
      const imported=String(o.last_imported_at||o.updated_at||"").slice(0,10);
      if(imported!==today || !o.needs_reply)return false;
    }
    return true;
  });
  return data.sort((a,b)=>{
    if(scope==="latest")return Number(a.last_batch_row_no||999999)-Number(b.last_batch_row_no||999999);
    return String(a.customer||"").localeCompare(String(b.customer||"")) || String(a.order_no||"").localeCompare(String(b.order_no||"")) || String(a.net||"").localeCompare(String(b.net||""));
  });
}
async function downloadCurrent(){
  if(blockIfUnsaved("下載 / tải Excel"))return;
  try{
    const data=exportData();
    if(!data.length){$("replyMsg").innerHTML='<span class="warn">目前沒有可下載資料 / Không có dữ liệu để tải</span>';return}

    const wb=new ExcelJS.Workbook();
    const ws=wb.addWorksheet("PH3回覆");

    const headers=WEB_COLUMNS.map(c=>c.label);
    ws.addRow(headers);

    function dateObj(s){
      if(!s)return "";
      const p=parseYMD(String(s).slice(0,10));
      return p?new Date(p.getUTCFullYear(),p.getUTCMonth(),p.getUTCDate(),12,0,0):s;
    }

    data.forEach(o=>{
      const arr=dbToArray(o), prev=latestUpstream(o);
      const values=[];
      WEB_COLUMNS.forEach(c=>{
        if(c.kind==="data"){
          const v=arr[c.idx];
          values.push([5,16,17,18,19,20,21,22].includes(c.idx)&&v?dateObj(v):(v??""));
        }else if(c.kind==="prevStage")values.push(`${prev.label} ${fmt(prev.date)}`.trim());
        else if(c.kind==="prevPh3")values.push(prevPh3(o)?dateObj(prevPh3(o)):"");
        else if(c.kind==="prev99")values.push(prev99(o)?dateObj(prev99(o)):"");
        else if(c.kind==="days")values.push("");
        else if(c.kind==="status")values.push("");
      });
      const r=ws.addRow(values), rn=r.number;

      // Locate Excel columns by web display order.
      const colPrevStage=WEB_COLUMNS.findIndex(c=>c.kind==="prevStage")+1;
      const colPh3=WEB_COLUMNS.findIndex(c=>c.kind==="data"&&c.idx===21)+1;
      const colPrevPh3=WEB_COLUMNS.findIndex(c=>c.kind==="prevPh3")+1;
      const col99=WEB_COLUMNS.findIndex(c=>c.kind==="data"&&c.idx===22)+1;
      const colPrev99=WEB_COLUMNS.findIndex(c=>c.kind==="prev99")+1;
      const colDays=WEB_COLUMNS.findIndex(c=>c.kind==="days")+1;
      const colStatus=WEB_COLUMNS.findIndex(c=>c.kind==="status")+1;

      const L=n=>ws.getColumn(n).letter;
      const R="R",S="S",T="T",U="U",Q="Q";
      const ph=L(colPh3), w=L(col99), days=L(colDays);

      // 前工段＝R:U (93~96) 已回覆日期中的最晚日期，不依工段欄位順序。
      r.getCell(colPrevStage).value={formula:
        `IF(MAX(R${rn}:U${rn})=0,"—",CHOOSE(MATCH(MAX(R${rn}:U${rn}),R${rn}:U${rn},0),"織造/93 ","染色/94 ","上漿/95 ","束頭/96 ")&TEXT(MAX(R${rn}:U${rn}),"yyyy/mm/dd"))`
      };
      r.getCell(colDays).value={formula:
        `IF(${ph}${rn}="","",IF(MAX(R${rn}:U${rn})=0,"",IF(${ph}${rn}<MAX(R${rn}:U${rn}),-1,NETWORKDAYS.INTL(MAX(R${rn}:U${rn})+1,${ph}${rn},11))))`
      };
      r.getCell(colStatus).value={formula:
        `IF(${ph}${rn}="","待回覆 / Chờ trả lời",`+
        `IF(MAX(R${rn}:U${rn})>0,IF(${ph}${rn}<MAX(R${rn}:U${rn}),"PH3早於前站 / PH3 sớm hơn công đoạn trước；",""),"")&`+
        `IF(AND(${days}${rn}<>"",${days}${rn}>7),"PH3超7天 / PH3 >7 ngày；","")&`+
        `IF(AND(${w}${rn}<>"",${ph}${rn}<>"",${w}${rn}<${ph}${rn}),"99早於PH3 / 99 sớm hơn PH3；","")&`+
        `IF(AND(${w}${rn}<>"",Q${rn}<>"",${w}${rn}>Q${rn}),"99晚於客需 / 99 trễ hơn KH；","")&"已回覆 / Đã trả lời")`
      };

      // Existing changed fields red.
      const changes=new Set(o.changed_fields||[]);
      [16,17,18,19,20].forEach(i=>{
        if(changes.has(COLNAMES[i])){
          // Original A-U are still same letters/positions before derived columns.
          r.getCell(i+1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFB3B3"}};
          r.getCell(i+1).font={color:{argb:"FF7F0000"},bold:true};
        }
      });

      // Date validations same as web.
      r.getCell(colPh3).dataValidation={
        type:"custom",allowBlank:true,
        formulae:[`OR(${ph}${rn}="",MAX(R${rn}:U${rn})=0,${ph}${rn}>=MAX(R${rn}:U${rn}))`],
        showErrorMessage:true,errorStyle:"stop",
        errorTitle:"PH3日期錯誤 / Lỗi ngày PH3",
        error:"PH3完工日不能早於前工段日期 / Ngày PH3 không được sớm hơn công đoạn trước"
      };
      r.getCell(col99).dataValidation={
        type:"custom",allowBlank:true,
        formulae:[`OR(${w}${rn}="",${ph}${rn}="",${w}${rn}>=${ph}${rn})`],
        showErrorMessage:true,errorStyle:"stop",
        errorTitle:"99日期錯誤 / Lỗi ngày 99",
        error:"99入庫日不能早於PH3完工日 / Ngày 99 không được sớm hơn ngày PH3"
      };
    });

    ws.views=[{state:"frozen",xSplit:Number($("freezeCols")?.value||5),ySplit:1}];
    ws.autoFilter={from:{row:1,column:1},to:{row:ws.rowCount,column:WEB_COLUMNS.length}};
    ws.getRow(1).height=42;
    ws.getRow(1).eachCell((c,i)=>{
      c.font={bold:true,color:{argb:"FFFFFFFF"},size:10};
      c.alignment={vertical:"middle",horizontal:"center",wrapText:true};
      const col=WEB_COLUMNS[i-1];
      const isProgress=(col.kind==="data"&&col.idx>=17)||["prevStage","prevPh3","prev99","days","status"].includes(col.kind);
      c.fill={type:"pattern",pattern:"solid",fgColor:{argb:isProgress?"FFBF9000":"FF548235"}};
    });
    // Excel 回填時只需要修改 PH3 與 99 兩欄：用醒目藍色表頭 + 淡黃色資料格標示，避免改錯欄。
    const editColPh3=WEB_COLUMNS.findIndex(c=>c.kind==="data"&&c.idx===21)+1;
    const editCol99=WEB_COLUMNS.findIndex(c=>c.kind==="data"&&c.idx===22)+1;
    [editColPh3,editCol99].forEach(ci=>{
      const head=ws.getCell(1,ci);
      head.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF2F75B5"}};
      head.font={bold:true,color:{argb:"FFFFFFFF"},size:10};
      head.note="★ 請只修改此欄日期 / Chỉ sửa ngày ở cột này";
      for(let rr=2;rr<=ws.rowCount;rr++){
        const cell=ws.getCell(rr,ci);
        cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFF2CC"}};
        cell.border={left:{style:"medium",color:{argb:"FF2F75B5"}},right:{style:"medium",color:{argb:"FF2F75B5"}}};
      }
    });
    WEB_COLUMNS.forEach((c,i)=>ws.getColumn(i+1).width=Math.max(7,Math.min(24,Math.round(c.width/9.4))));
    for(let r=2;r<=ws.rowCount;r++){
      ws.getRow(r).height=22;
      WEB_COLUMNS.forEach((c,i)=>{
        if(c.kind==="data"&&[5,16,17,18,19,20,21,22].includes(c.idx))ws.getCell(r,i+1).numFmt="yyyy/m/d";
        if(c.kind==="prevPh3"||c.kind==="prev99")ws.getCell(r,i+1).numFmt="yyyy/m/d";
      });
    }

    const colPh3=WEB_COLUMNS.findIndex(c=>c.kind==="data"&&c.idx===21)+1;
    const col99=WEB_COLUMNS.findIndex(c=>c.kind==="data"&&c.idx===22)+1;
    const ph=ws.getColumn(colPh3).letter, w=ws.getColumn(col99).letter;
    const last=ws.rowCount;
    if(last>=2){
      ws.addConditionalFormatting({ref:`${ph}2:${ph}${last}`,rules:[
        {type:"expression",formulae:[`AND(${ph}2<>"",MAX(R2:U2)>0,${ph}2<MAX(R2:U2))`],style:{fill:{type:"pattern",pattern:"solid",fgColor:{argb:"FFFFB3B3"}}}},
        {type:"expression",formulae:[`AND(${ph}2<>"",MAX(R2:U2)>0,${ph}2>=MAX(R2:U2),NETWORKDAYS.INTL(MAX(R2:U2)+1,${ph}2,11)>7)`],style:{fill:{type:"pattern",pattern:"solid",fgColor:{argb:"FFFFB3B3"}}}}
      ]});
      ws.addConditionalFormatting({ref:`${w}2:${w}${last}`,rules:[
        {type:"expression",formulae:[`AND(${w}2<>"",${ph}2<>"",${w}2<${ph}2)`],style:{fill:{type:"pattern",pattern:"solid",fgColor:{argb:"FFFFB3B3"}}}},
        {type:"expression",formulae:[`AND(${w}2<>"",Q2<>"",${w}2>Q2)`],style:{fill:{type:"pattern",pattern:"solid",fgColor:{argb:"FFFFB3B3"}}}}
      ]});
    }

    const buf=await wb.xlsx.writeBuffer();
    const blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="PH3目前資料_可修改回填.xlsx";document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    $("replyMsg").innerHTML=`<span class="ok">已下載完整 ${data.length} 筆（不受畫面篩選影響） / Đã tải đủ ${data.length} dòng, không bị ảnh hưởng bởi bộ lọc</span>`;
  }catch(err){
    console.error(err);$("replyMsg").innerHTML=`<span class="bad">下載失敗 / Tải thất bại：${esc(err.message||err)}</span>`;
  }
}

async function downloadMailReady(){
  if(blockIfUnsaved("下載可直接回覆 MAIL 的檔案 / tải file gửi MAIL"))return;
  try{
    const data=exportData();
    if(!data.length){$("replyMsg").innerHTML='<span class="warn">目前沒有可下載資料 / Không có dữ liệu để tải</span>';return}

    const wb=new ExcelJS.Workbook();
    const ws=wb.addWorksheet("PH3回覆");
    ws.addRow(HEADERS);

    function dateObj(s){
      if(!s)return "";
      const p=parseYMD(String(s).slice(0,10));
      return p?new Date(p.getUTCFullYear(),p.getUTCMonth(),p.getUTCDate(),12,0,0):s;
    }

    data.forEach(o=>{
      const arr=dbToArray(o);
      ws.addRow(arr.map((v,i)=>[5,16,17,18,19,20,21,22].includes(i)&&v?dateObj(v):(v??"")));
    });

    // 直接回覆 Mail 的版本只保留原始 A~W 23 欄：不包含網頁額外欄 V/X/Z/AA/AB。
    ws.views=[{state:"frozen",xSplit:5,ySplit:1}];
    ws.autoFilter={from:{row:1,column:1},to:{row:ws.rowCount,column:HEADERS.length}};
    ws.getRow(1).height=38;
    ws.getRow(1).eachCell((c,i)=>{
      c.font={bold:true,color:{argb:"FFFFFFFF"},size:10};
      c.alignment={vertical:"middle",horizontal:"center",wrapText:true};
      c.fill={type:"pattern",pattern:"solid",fgColor:{argb:i>=18?"FFBF9000":"FF548235"}};
      c.border={bottom:{style:"thin",color:{argb:"FFFFFFFF"}}};
    });

    const widths=[5,7,9,12,6,12,11,8,7,11,7,9,9,24,18,20,12,12,12,12,12,13,13];
    widths.forEach((w,i)=>ws.getColumn(i+1).width=w);
    for(let r=2;r<=ws.rowCount;r++){
      ws.getRow(r).height=21;
      for(let c=1;c<=HEADERS.length;c++){
        const cell=ws.getCell(r,c);
        cell.alignment={vertical:"middle",horizontal:"left",wrapText:false};
        cell.border={bottom:{style:"hair",color:{argb:"FFD9E2E8"}}};
      }
      [6,17,18,19,20,21,22,23].forEach(c=>ws.getCell(r,c).numFmt="yyyy/m/d");
    }

    const buf=await wb.xlsx.writeBuffer();
    const blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="PH3回覆_MAIL可直接寄出.xlsx";document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    $("replyMsg").innerHTML=`<span class="ok">已下載可直接回覆 MAIL 的完整 ${data.length} 筆 / Đã tải ${data.length} dòng ở định dạng có thể gửi MAIL trực tiếp</span>`;
  }catch(err){
    console.error(err);$("replyMsg").innerHTML=`<span class="bad">下載失敗 / Tải thất bại：${esc(err.message||err)}</span>`;
  }
}

async function refillExcel(){
  const file=$("refillFile").files[0];if(!file)return;
  try{
    if(dirtyKeys.size){
      $("replyMsg").innerHTML=`<span class="bad">⚠ 畫面上還有 ${dirtyKeys.size} 筆未儲存，請先儲存後再回填另一份 Excel / Còn ${dirtyKeys.size} dòng chưa lưu, hãy lưu trước khi nhập Excel khác</span>`;
      $("refillFile").value="";
      return;
    }
    $("replyMsg").textContent="回填到畫面中… / Đang nhập lại vào màn hình…";
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:"array",cellDates:false});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const a=XLSX.utils.sheet_to_json(ws,{header:1,defval:"",raw:true});
    if(a.length<2)throw new Error("Excel沒有資料 / Excel không có dữ liệu");

    const headers=a[0].map(x=>String(x??"").trim());
    const idxCustomer=headers.indexOf(HEADERS[2]);
    const idxOrder=headers.indexOf(HEADERS[3]);
    const idxNet=headers.indexOf(HEADERS[4]);
    const idxPh3=headers.indexOf(HEADERS[21]);
    const idx99=headers.indexOf(HEADERS[22]);
    const upstreamIdx=[17,18,19,20].map(i=>headers.indexOf(HEADERS[i]));
    if([idxCustomer,idxOrder,idxNet,idxPh3,idx99].some(i=>i<0))throw new Error("Excel欄位不符 / Sai cột Excel");

    const invalid=[], notFound=[];
    let applied=0;
    for(const r of a.slice(1)){
      if(!r.some(v=>v!==""&&v!=null))continue;
      const key=[r[idxCustomer],r[idxOrder],r[idxNet]].map(v=>String(v??"").trim()).join("|");
      if(!key||key==="||")continue;
      const ph3=excelDate(r[idxPh3]),w99=excelDate(r[idx99]);
      const prevDates=upstreamIdx.filter(i=>i>=0).map(i=>excelDate(r[i])).filter(Boolean).sort();
      const prev=prevDates.length?prevDates[prevDates.length-1]:"";
      if(ph3&&prev&&ph3<prev){invalid.push(`${key}: PH3 ${ph3} < ${prev}`);continue}
      if(w99&&ph3&&w99<ph3){invalid.push(`${key}: 99 ${w99} < PH3 ${ph3}`);continue}

      const o=rows.find(x=>x.unique_key===key);
      if(!o){notFound.push(key);continue}
      const oldPh3=String(o.ph3_date||"").slice(0,10);
      const old99=String(o.warehouse99_date||"").slice(0,10);
      if(oldPh3!==String(ph3||"") || old99!==String(w99||"")){
        o.ph3_date=ph3||null;
        o.warehouse99_date=w99||null;
        dirtyKeys.add(key);
        issueKeys.delete(key);
        applied++;
      }
    }
    if(invalid.length)throw new Error(`有 ${invalid.length} 筆日期不合法，未回填 / Có ${invalid.length} dòng ngày không hợp lệ`);
    if(!applied){
      $("replyMsg").innerHTML=`<span class="warn">Excel 已讀取，但沒有不同的 PH3/99 日期需要回填 / Đã đọc Excel nhưng không có ngày PH3/99 thay đổi</span>`+
        (notFound.length?` <span class="warn">；另有 ${notFound.length} 筆找不到對應資料</span>`:"");
      $("refillFile").value="";
      render();
      return;
    }

    $("replyMsg").innerHTML=`<span class="warn">✓ 已把 Excel 的 ${applied} 筆修改帶回畫面，但<strong>尚未儲存到系統</strong>。請確認後按「儲存目前修改」 / Đã nhập ${applied} dòng vào màn hình nhưng <strong>chưa lưu vào hệ thống</strong>. Hãy bấm Lưu các thay đổi.</span>`+
      (notFound.length?` <span class="warn">；${notFound.length} 筆找不到對應資料 / không tìm thấy ${notFound.length} dòng</span>`:"");
    $("refillFile").value="";
    render();
  }catch(err){
    console.error(err);$("replyMsg").innerHTML=`<span class="bad">回填失敗 / Nhập lại thất bại：${esc(err.message||err)}</span>`;$("refillFile").value="";
  }
}

$("loginBtn").onclick=login;$("password").addEventListener("keydown",e=>{if(e.key==="Enter")login()});$("logoutBtn").onclick=logout;if($("createAccountsBtn"))$("createAccountsBtn").onclick=createAccountsBulk;$("refreshBtn").onclick=async()=>{
  if(dirtyKeys.size && !confirm(`尚有 ${dirtyKeys.size} 筆未儲存，重新整理會放棄這些修改。確定要重新整理嗎？\nCòn ${dirtyKeys.size} dòng chưa lưu. Làm mới sẽ bỏ các thay đổi. Tiếp tục?`))return;
  dirtyKeys.clear();issueKeys.clear();await loadAll()
};$("importBtn").onclick=()=>{if(blockIfUnsaved("匯入新資料 / nhập dữ liệu mới"))return;importFiles()};$("calcReplyBtn").onclick=calcBulkReply;$("saveReplyBtn").onclick=saveDraftReplies;$("downloadBtn").onclick=downloadCurrent;$("downloadMailBtn").onclick=downloadMailReady;
["fCustomer","fOrder","fItem"].forEach(id=>$(id).addEventListener("input",render));
["fStatus","fPrevDate","workScope"].forEach(id=>$(id).addEventListener("change",()=>{updateBatchInfo();render()}));
$("batchSelect").addEventListener("change",()=>{updateBatchInfo();$("workScope").value="latest";render()});
$("refillFile").addEventListener("change",refillExcel);
$("freezeCols").addEventListener("change",applyFrozenColumns);
initFreezeSetting();
document.querySelectorAll(".tab").forEach(b=>b.onclick=async()=>{tab=b.dataset.tab;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));if(tab==="history")await loadHistory();else render()});
checkSession();

window.addEventListener("beforeunload",e=>{
  if(!dirtyKeys.size)return;
  e.preventDefault();
  e.returnValue="";
});
