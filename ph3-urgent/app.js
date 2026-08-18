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
let rows=[], histories=[], batches=[], tab="current";
const dirtyKeys=new Set();

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
  const candidates=[
    ["aglet_date","束頭/96",o.aglet_date],
    ["sizing_date","上漿/95",o.sizing_date],
    ["dyeing_date","染色/94",o.dyeing_date],
    ["weaving_date","織造/93",o.weaving_date]
  ];
  for(const [field,label,value] of candidates){
    if(value)return {field,label,date:String(value).slice(0,10)};
  }
  return {field:"",label:"—",date:""};
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
    44,58,68,84,46,82,84,58,54,84,52,66,64,142,112,126,94,96,96,96,96
  ][i]||78})),
  {kind:"prevStage",label:"前工段 / Công đoạn trước",width:112},
  {kind:"data",idx:21,label:HEADERS[21],width:118},
  {kind:"prevPh3",label:"PH3 lần trước / PH3上次回覆日",width:102},
  {kind:"data",idx:22,label:HEADERS[22],width:118},
  {kind:"prev99",label:"99 lần trước / 99上次回覆日",width:102},
  {kind:"days",label:"PH3工段天數 / Số ngày PH3",width:88},
  {kind:"status",label:"狀態 / Trạng thái",width:168}
]

function initFreezeSetting(){
  const saved=localStorage.getItem("ph3_freeze_cols");
  $("freezeCols").value=saved!==null?saved:"12";
}
function applyFrozenColumns(){
  const count=Number($("freezeCols")?.value||12);
  localStorage.setItem("ph3_freeze_cols",String(count));
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
    grid.innerHTML=`<thead><tr><th class="fixed">時間 / Thời gian</th><th class="fixed">客戶+訂單號碼+筆數 / KH+Mã đơn+NET</th><th class="fixed">欄位 / Cột</th><th class="progress">原值 / Cũ</th><th class="progress">新值 / Mới</th><th class="fixed">來源 / Nguồn</th></tr></thead><tbody>`+
      histories.map(h=>`<tr><td class="fixed">${esc(new Date(h.changed_at).toLocaleString())}</td><td class="fixed">${esc(h.unique_key)}</td><td class="fixed">${esc(h.field_name)}</td><td class="progress">${esc(fmt(h.old_value))}</td><td class="progress">${esc(fmt(h.new_value))}</td><td class="fixed">${esc(h.source_file||"")}</td></tr>`).join("")+"</tbody>";
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
    h+=`<tr class="${o.needs_reply?"need":""}">`;
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
        }else content=esc(fmt(arr[i]));
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
        content=status;
      }
      h+=`<td data-display-col="${di}" class="${cls}" title="${esc(String(content).replace(/<[^>]*>/g,""))}">${content}</td>`;
    });
    h+="</tr>";
  }
  grid.innerHTML=h+"</tbody>";
  grid.querySelectorAll(".cell-date").forEach(inp=>inp.addEventListener("change",saveDirectCell));
  applyFrozenColumns();
}
async function login(){
  $("loginMsg").textContent="";
  const {data,error}=await sb.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
  if(error){$("loginMsg").innerHTML=`<span class="bad">${esc(error.message)}</span>`;return}
  showApp(data.user); await loadAll();
}
function showApp(user){$("loginPanel").style.display="none";$("appPanel").style.display="block";$("who").textContent=user.email}
async function logout(){await sb.auth.signOut();location.reload()}
async function checkSession(){const {data}=await sb.auth.getSession();if(data.session){showApp(data.session.user);await loadAll()}}

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
      $("replyMsg").innerHTML=`<span class="bad">PH3完工日不能早於前工段日期 ${esc(fmt(prev.date))} / Ngày PH3 không được sớm hơn công đoạn trước</span>`;
      e.target.value=oldPh3;
      return;
    }
    w99=ph3?calendarAdd(ph3,3):"";
  }else{
    w99=e.target.value;
    if(w99 && ph3 && w99 < ph3){
      $("replyMsg").innerHTML='<span class="bad">99入庫日不能早於PH3完工日 / Ngày 99 không được sớm hơn ngày PH3</span>';
      e.target.value=old99;
      return;
    }
  }

  // Draft only: do not reload or reorder the table.
  o.ph3_date=ph3||null;
  o.warehouse99_date=w99||null;
  dirtyKeys.add(key);
  $("replyMsg").innerHTML='<span class="warn">已暫存於畫面，確認全部後請按「儲存目前修改」 / Đã giữ tạm trên màn hình, hãy bấm Lưu các thay đổi khi hoàn tất</span>';
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

    if(ph3 && prev && ph3<prev){invalid.push(`${key}: PH3 < 前站`);continue}
    if(w99 && ph3 && w99<ph3){invalid.push(`${key}: 99 < PH3`);continue}
    payload.push({unique_key:key,ph3_date:ph3,warehouse99_date:w99});
  }

  if(invalid.length){
    $("replyMsg").innerHTML=`<span class="bad">有 ${invalid.length} 筆日期不合法，請先修正 / Có ${invalid.length} dòng ngày không hợp lệ</span>`;
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

async function downloadCurrent(){
  try{
    const data=filtered();
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

      // Dynamic previous-stage display using original R:U fields.
      r.getCell(colPrevStage).value={formula:
        `IF(U${rn}<>"","束頭/96 "&TEXT(U${rn},"yyyy/mm/dd"),IF(T${rn}<>"","上漿/95 "&TEXT(T${rn},"yyyy/mm/dd"),IF(S${rn}<>"","染色/94 "&TEXT(S${rn},"yyyy/mm/dd"),IF(R${rn}<>"","織造/93 "&TEXT(R${rn},"yyyy/mm/dd"),"—"))))`
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

    ws.views=[{state:"frozen",xSplit:12,ySplit:1}];
    ws.autoFilter={from:{row:1,column:1},to:{row:ws.rowCount,column:WEB_COLUMNS.length}};
    ws.getRow(1).height=42;
    ws.getRow(1).eachCell((c,i)=>{
      c.font={bold:true,color:{argb:"FFFFFFFF"},size:10};
      c.alignment={vertical:"middle",horizontal:"center",wrapText:true};
      const col=WEB_COLUMNS[i-1];
      const isProgress=(col.kind==="data"&&col.idx>=17)||["prevStage","prevPh3","prev99","days","status"].includes(col.kind);
      c.fill={type:"pattern",pattern:"solid",fgColor:{argb:isProgress?"FFBF9000":"FF548235"}};
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
    $("replyMsg").innerHTML=`<span class="ok">已下載 ${data.length} 筆，Excel順序與網頁一致 / Đã tải ${data.length} dòng</span>`;
  }catch(err){
    console.error(err);$("replyMsg").innerHTML=`<span class="bad">下載失敗 / Tải thất bại：${esc(err.message||err)}</span>`;
  }
}

async function refillExcel(){
  const file=$("refillFile").files[0];if(!file)return;
  try{
    $("replyMsg").textContent="回填中… / Đang nhập lại…";
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:"array",cellDates:false});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const a=XLSX.utils.sheet_to_json(ws,{header:1,defval:"",raw:true});
    if(a.length<2)throw new Error("Excel沒有資料 / Excel không có dữ liệu");

    // Use header names, not fixed positions, because Excel now mirrors web display order.
    const headers=a[0].map(x=>String(x??"").trim());
    const idxCustomer=headers.indexOf(HEADERS[2]);
    const idxOrder=headers.indexOf(HEADERS[3]);
    const idxNet=headers.indexOf(HEADERS[4]);
    const idxPh3=headers.indexOf(HEADERS[21]);
    const idx99=headers.indexOf(HEADERS[22]);
    const upstreamIdx=[17,18,19,20].map(i=>headers.indexOf(HEADERS[i]));
    if([idxCustomer,idxOrder,idxNet,idxPh3,idx99].some(i=>i<0))throw new Error("Excel欄位不符 / Sai cột Excel");

    const payload=[], invalid=[];
    for(const r of a.slice(1)){
      if(!r.some(v=>v!==""&&v!=null))continue;
      const key=[r[idxCustomer],r[idxOrder],r[idxNet]].map(v=>String(v??"").trim()).join("|");
      if(!key||key==="||")continue;
      const ph3=excelDate(r[idxPh3]),w99=excelDate(r[idx99]);
      const prevDates=upstreamIdx.filter(i=>i>=0).map(i=>excelDate(r[i])).filter(Boolean).sort();
      const prev=prevDates.length?prevDates[prevDates.length-1]:"";
      if(ph3&&prev&&ph3<prev){invalid.push(`${key}: PH3 ${ph3} < ${prev}`);continue}
      if(w99&&ph3&&w99<ph3){invalid.push(`${key}: 99 ${w99} < PH3 ${ph3}`);continue}
      payload.push({unique_key:key,ph3_date:ph3,warehouse99_date:w99});
    }
    if(invalid.length)throw new Error(`有 ${invalid.length} 筆日期不合法，未回填 / Có ${invalid.length} dòng ngày không hợp lệ`);
    if(!payload.length)throw new Error("沒有可回填資料 / Không có dữ liệu");

    const {data,error}=await sb.rpc("ph3_import_replies",{p_rows:payload});
    if(error)throw error;
    $("replyMsg").innerHTML=`<span class="ok">回填完成 ${data.updated} 筆 / Đã nhập lại ${data.updated} dòng</span>`+
      (data.late99?` <span class="warn">；99晚於客需 ${data.late99} 筆</span>`:"")+
      (data.over7?` <span class="warn">；PH3超過7天 ${data.over7} 筆</span>`:"");
    $("refillFile").value="";await loadAll();
  }catch(err){
    console.error(err);$("replyMsg").innerHTML=`<span class="bad">回填失敗 / Nhập lại thất bại：${esc(err.message||err)}</span>`;$("refillFile").value="";
  }
}

$("loginBtn").onclick=login;$("logoutBtn").onclick=logout;$("refreshBtn").onclick=async()=>{dirtyKeys.clear();await loadAll()};$("importBtn").onclick=importFiles;$("calcReplyBtn").onclick=calcBulkReply;$("saveReplyBtn").onclick=saveDraftReplies;$("downloadBtn").onclick=downloadCurrent;
["fCustomer","fOrder","fItem"].forEach(id=>$(id).addEventListener("input",render));
["fStatus","fPrevDate","workScope"].forEach(id=>$(id).addEventListener("change",()=>{updateBatchInfo();render()}));
$("batchSelect").addEventListener("change",()=>{updateBatchInfo();$("workScope").value="latest";render()});
$("refillFile").addEventListener("change",refillExcel);
$("freezeCols").addEventListener("change",applyFrozenColumns);
initFreezeSetting();
document.querySelectorAll(".tab").forEach(b=>b.onclick=async()=>{tab=b.dataset.tab;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));if(tab==="history")await loadHistory();else render()});
checkSession();
