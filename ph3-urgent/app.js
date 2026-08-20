// PH3 V27：沿用 V26 正常版，只新增印刷色解析、細分 MSK 印刷類型與更簡潔提示；原有功能不重做。
const HEADERS=[
"Tổ 組"," loại đơn 單別","KH 客戶","Mã đơn 訂單號碼","NET 筆","Ngày ĐĐH 訂單日期","Mã SP 料號","Màu 色號","QC 寬度","Độ dài 型號","ĐV 單位","SL 數量","TD 進度參考","Tên SP (SQ) 生管品名","Ghi chú ĐĐH 訂單備注","Ghi chú ĐĐH 摘要","KH YC 客戶要求日期","Ngày 93 HC 織造完工日","Ngày 94 HC 染色完工日","Ngày 95 HC 上漿完工日","Ngày 96 HC 束頭完工日","Ngày PH3 HC PH3完工日","Ngày 99 NK 99入庫日"
];
const COLNAMES=["col_a","col_b","customer","order_no","net","order_date","item_no","color","width","model","unit","qty","progress_ref","product_name","order_note","summary","customer_required","weaving_date","dyeing_date","sizing_date","aglet_date","ph3_date","warehouse99_date"];
const PROD_MODE_HEADER="生產方式 / Hình thức sản xuất";
const MSK_HEADER="MSK 網版 / Khuôn MSK";
const PRINT_COLOR_HEADER="印刷色 / Màu in";
const PROD_MODES=["機印 / In máy","手印 / In tay","GCN"];
const MSK_MODE_RULES={TD:"手印 / In tay",TT:"手印 / In tay",TK:"手印 / In tay",MPW:"手印 / In tay",MD:"機印 / In máy",MT:"機印 / In máy",MY:"機印 / In máy",MP:"機印 / In máy",MK:"機印 / In máy"};
const MSK_TYPE_RULES={
  TD:"手印 / In tay",MD:"機印 / In máy",
  TT:"手印－轉印 / In tay - In chuyển",MT:"機印－轉印 / In máy - In chuyển",
  MY:"機印－移印 / In máy - In chạm",MP:"機印－噴印 / In máy - Phun silicon",
  TK:"手印－膠片束頭 / In tay - Đầu keo",MK:"機印－膠片束頭 / In máy - Đầu keo",
  MPW:"手印 / In tay"
};
const KEYCOLS=[2,3,4], PROGRESS_START=17;
const $=id=>document.getElementById(id);
const cfg=window.PH3_CONFIG||{};
if(!cfg.SUPABASE_URL || !cfg.SUPABASE_PUBLISHABLE_KEY || cfg.SUPABASE_URL.includes("PASTE_")){
  alert("請先設定 config.js 的 Supabase URL 與 Publishable key。");
}
const sb=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
let rows=[], histories=[], batches=[], tab="current", currentProfile=null;
let lastReplyMap=new Map();
const dirtyKeys=new Set();
const dirtyDateKeys=new Set();
const dirtyModeKeys=new Set();
const issueKeys=new Map(); // 本次畫面操作發現的日期異常：key -> 訊息

function updateActionState(){
  const n=dirtyKeys.size;
  const save=$("saveReplyBtn"), dl=$("downloadBtn"), mail=$("downloadMailBtn"), split=$("downloadSplitBtn"), guard=$("saveGuard");
  if(save)save.disabled=n===0;
  if(dl)dl.disabled=n>0;
  if(mail)mail.disabled=n>0;
  if(split)split.disabled=n>0;
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
function syncDirtyKey(key){
  if(dirtyDateKeys.has(key)||dirtyModeKeys.has(key))dirtyKeys.add(key); else dirtyKeys.delete(key);
}
function markDateDirty(key){dirtyDateKeys.add(key);dirtyKeys.add(key)}
function productionModeLabel(v){return PROD_MODES.includes(String(v||""))?String(v):""}
function productionModeShort(v){return ({"機印 / In máy":"機印 / In máy","手印 / In tay":"手印 / In tay","GCN":"GCN"})[String(v||"")]||"—"}

function mskCodes(o){
  const text=[o.product_name,o.order_note,o.summary].map(v=>String(v||"")).join(" ").toUpperCase();
  const out=[];
  const re=/(?:^|\s|[，,;；])MSK\s*[:：-]?\s*([A-Z0-9][A-Z0-9\-\/]{3,})/g;
  let m;
  while((m=re.exec(text))){
    const code=String(m[1]||"").replace(/[.,，;；:：)）]+$/g,"");
    if(code&&!out.includes(code))out.push(code);
  }
  return out;
}
function primaryMsk(o){return mskCodes(o)[0]||""}
function mskSuggestedModeFromCode(code){
  const c=String(code||"").toUpperCase();
  const prefix=Object.keys(MSK_MODE_RULES).find(k=>c.startsWith(k));
  return prefix?MSK_MODE_RULES[prefix]:"";
}
function mskSuggestedMode(o){return mskSuggestedModeFromCode(primaryMsk(o))}
function mskPrintTypeFromCode(code){
  const c=String(code||"").toUpperCase();
  const prefix=Object.keys(MSK_TYPE_RULES).sort((a,b)=>b.length-a.length).find(k=>c.startsWith(k));
  return prefix?MSK_TYPE_RULES[prefix]:"";
}
function mskPrintType(o){return mskPrintTypeFromCode(primaryMsk(o))}
function printColors(o){
  // 三欄一起看：生管品名＋訂單備注＋摘要。只抓「MAU/MÀU 後的色名或色號」，不計算顏色數量。
  const text=[o.product_name,o.order_note,o.summary].map(v=>String(v||"")).join(" ").toUpperCase();
  const out=[];
  const stop=new Set(["IN","LOGO","MSK","MAT","MẶT","CHAM","CHẠM","CHUYEN","CHUYỂN","BONG","BÓNG","PHUN","SILICON","TRUC","TRỰC","TIEP","TIẾP","MAU","MÀU","COLOR","COLOUR"]);
  const re=/(?:\b\d+\s*)?M(?:A|À)U\s*[:：=-]?\s*([A-Z0-9][A-Z0-9.\-\/]{1,30})/g;
  let m;
  while((m=re.exec(text))){
    let token=String(m[1]||"").replace(/^[,;，；]+|[,;，；:：)）]+$/g,"");
    if(!token||/^\d+$/.test(token)||stop.has(token))continue;
    if(!out.includes(token))out.push(token);
  }
  return out;
}
function printColorText(o){return printColors(o).join(" / ")}
function chaseCount(o){const n=Number(o.chase_count||1);return Number.isFinite(n)&&n>0?n:1}
function chaseState(o){
  const repeated=chaseCount(o)>1;
  const changed=(o.changed_fields||[]).length>0;
  if(!repeated)return {key:"new",label:"新追單 / Mới",cls:"b-blue"};
  if(changed)return {key:"repeat_changed",label:"再次追問＋有異動 / Hỏi lại + thay đổi",cls:"b-red"};
  if(o.ever_replied)return {key:"repeat_replied",label:"再次追問＋已回過 / Hỏi lại + đã trả lời",cls:"b-orange"};
  return {key:"repeat",label:"再次追問 / Hỏi lại",cls:"b-orange"};
}
function mskSameCount(o){
  const code=primaryMsk(o);if(!code)return 0;
  return rows.reduce((n,x)=>n+(primaryMsk(x)===code?1:0),0);
}
function applyProductionModeDraft(o,newMode){
  newMode=productionModeLabel(newMode);
  if(!o._modeEditSnapshot){
    o._modeEditSnapshot={
      mode:o.production_mode||"",prevMode:o.previous_production_mode||"",
      ph3:o.ph3_date||null,w99:o.warehouse99_date||null,
      prevPh3:o.prev_ph3_date||null,prev99:o.prev_99_date||null,
      needs:o.needs_reply,wasDateDirty:dirtyDateKeys.has(o.unique_key)
    };
  }
  const snap=o._modeEditSnapshot, saved=snap.mode||"";
  if(newMode===saved){
    o.production_mode=snap.mode||null;o.previous_production_mode=snap.prevMode||null;
    o.ph3_date=snap.ph3;o.warehouse99_date=snap.w99;o.prev_ph3_date=snap.prevPh3;o.prev_99_date=snap.prev99;o.needs_reply=snap.needs;
    dirtyModeKeys.delete(o.unique_key);
    if(snap.wasDateDirty)dirtyDateKeys.add(o.unique_key);else dirtyDateKeys.delete(o.unique_key);
    delete o._modeEditSnapshot;syncDirtyKey(o.unique_key);return;
  }
  o.production_mode=newMode||null;
  dirtyModeKeys.add(o.unique_key);dirtyKeys.add(o.unique_key);
  if(saved && newMode!==saved){
    o.previous_production_mode=saved;
    if(o.ph3_date)o.prev_ph3_date=o.ph3_date;
    if(o.warehouse99_date)o.prev_99_date=o.warehouse99_date;
    o.ph3_date=null;o.warehouse99_date=null;o.needs_reply=true;
    dirtyDateKeys.delete(o.unique_key);syncDirtyKey(o.unique_key);
  }
}

function fmt(v){if(!v)return"";if(v instanceof Date)return `${v.getFullYear()}/${v.getMonth()+1}/${v.getDate()}`;if(/^\d{4}-\d{2}-\d{2}/.test(String(v)))return String(v).slice(0,10).replaceAll("-","/");return String(v)}
function excelDate(v){if(!v)return null;if(v instanceof Date)return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,"0")}-${String(v.getDate()).padStart(2,"0")}`;if(typeof v==="number"){const p=XLSX.SSF.parse_date_code(v);return p?`${p.y}-${String(p.m).padStart(2,"0")}-${String(p.d).padStart(2,"0")}`:null}const s=String(v).trim();const m=s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);if(m)return `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;const d=new Date(v);return isNaN(d)?null:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function keyOfArray(r){return [r[2],r[3],r[4]].map(v=>String(v??"").trim()).join("|")}
function dbToArray(o){return COLNAMES.map(c=>o[c]??"")}
function arrToPayload(r){const p={};COLNAMES.forEach((c,i)=>p[c]=[5,16,17,18,19,20,21,22].includes(i)?excelDate(r[i]):r[i]);return p}
// TD 進度參考可能在不同版本 Excel 中持續更新。從文字中抓 MM/DD HH:mm，保留日期時間最新的那一筆。
function progressStamp(v){
  const s=String(v??"");
  const re=/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/g;
  let m,best=-1;
  while((m=re.exec(s))){
    const mo=Number(m[1]),d=Number(m[2]),h=Number(m[3]||0),mi=Number(m[4]||0);
    if(mo>=1&&mo<=12&&d>=1&&d<=31&&h<=23&&mi<=59)best=Math.max(best,(((mo*32+d)*24+h)*60+mi));
  }
  return best;
}
function latestProgressRef(a,b){
  const sa=progressStamp(a),sb=progressStamp(b);
  if(sa>=0&&sb>=0)return sb>=sa?(b||a):(a||b);
  if(sb>=0)return b;
  if(sa>=0)return a;
  return String(b??"").trim()?b:a;
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

function lastReplyUser(o){
  const h=lastReplyMap.get(o.unique_key);
  return h?`${h.employee_no||""} ${h.employee_name||""}`.trim():"";
}
function statusText(o){
  const parts=[];
  if(o.needs_reply)parts.push("待回覆 / Cần trả lời"); else if(o.ever_replied)parts.push("已回覆 / Đã trả lời");
  if(o.previous_production_mode&&o.production_mode&&o.previous_production_mode!==o.production_mode)parts.push(`原${productionModeShort(o.previous_production_mode)} → ${productionModeShort(o.production_mode)}`);
  if(is99Late(o))parts.push("99晚於客需 / 99 trễ hơn KH");
  if(ph3Days(o)>7)parts.push("PH3超過7天 / PH3 >7 ngày");
  if(ph3BeforeUpstream(o))parts.push("PH3早於前工段 / PH3 sớm hơn công đoạn trước");
  if(warehouseBeforePh3(o))parts.push("99早於PH3 / 99 sớm hơn PH3");
  return parts.join("；");
}
function searchableText(o){
  const arr=dbToArray(o).map(v=>fmt(v));
  const p=latestUpstream(o);
  return [...arr,primaryMsk(o),mskPrintType(o),printColorText(o),mskSuggestedMode(o),chaseState(o).label,productionModeShort(o.production_mode),productionModeShort(o.previous_production_mode),p.label,fmt(p.date),fmt(prevPh3(o)),fmt(prev99(o)),ph3Days(o)??"",statusText(o),lastReplyUser(o)].join(" | ").toLowerCase();
}
function autoFitWorksheet(ws,{min=7,max=42,padding=2}={}){
  ws.columns.forEach(col=>{
    let longest=0;
    col.eachCell({includeEmpty:true},cell=>{
      let text="";
      if(cell.value instanceof Date) text="yyyy/mm/dd";
      else if(cell.value && typeof cell.value==="object" && cell.value.formula) text=String(cell.value.result??cell.value.formula??"");
      else text=cell.text??String(cell.value??"");
      longest=Math.max(longest,...String(text).split(/\r?\n/).map(x=>x.length));
    });
    col.width=Math.min(max,Math.max(min,longest+padding));
  });
}
function importColumnLetter(n){let s="";while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
function validateImportRows(fileName,a){
  const problems=[];
  if(!a.length){problems.push(`${fileName}：Excel 是空白 / Excel trống`);return problems}
  const hdr=a[0]||[];
  for(let i=0;i<HEADERS.length;i++){
    const got=String(hdr[i]??"").trim(), exp=String(HEADERS[i]).trim();
    const gotClean=got.replace(/\s*\*\s*$/g,"").trim();
    if(gotClean!==exp)problems.push(`${fileName}｜第 ${importColumnLetter(i+1)} 欄：標題「${got||"空白"}」應為「${exp}」 / Cột ${importColumnLetter(i+1)} sai tiêu đề`);
  }
  a.slice(1).forEach((r,ri)=>{
    if(!r.some(v=>v!==""&&v!=null))return;
    [2,3,4].forEach(i=>{if(String(r[i]??"").trim()==="")problems.push(`${fileName}｜Excel 第 ${ri+2} 列 ${importColumnLetter(i+1)} 欄「${HEADERS[i]}」不可空白，請補資料 / Dòng ${ri+2} cột ${importColumnLetter(i+1)} không được trống`)});
    [5,16,17,18,19,20,21,22].forEach(i=>{
      const v=r[i]; if(v===""||v==null)return;
      if(!excelDate(v))problems.push(`${fileName}｜Excel 第 ${ri+2} 列 ${importColumnLetter(i+1)} 欄「${HEADERS[i]}」日期無法辨識：${v}，請改成 yyyy/mm/dd / Ngày không hợp lệ`);
    });
  });
  return problems;
}
function showImportProblems(problems){
  const box=$("importDetail"); if(!box)return;
  if(!problems.length){box.innerHTML="";return}
  const shown=problems.slice(0,80);
  box.innerHTML=`<div class="import-help"><b>⚠ 發現 ${problems.length} 個匯入問題 / Phát hiện ${problems.length} lỗi</b><br>${shown.map((x,i)=>`${i+1}. ${esc(x)}`).join("<br>")}${problems.length>80?"<br>…請先修正前面的錯誤後再重新匯入 / Hãy sửa các lỗi trên trước":""}</div>`;
}

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
  const allq=($("fAllSearch")?.value||"").trim().toLowerCase(),
        c=$("fCustomer").value.trim().toLowerCase(),
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
    if(allq&&!searchableText(o).includes(allq))return false;
    if(c&&!String(o.customer??"").toLowerCase().includes(c))return false;
    if(d&&!String(o.order_no??"").toLowerCase().includes(d))return false;
    if(g&&!String(o.item_no??"").toLowerCase().includes(g))return false;
    const prev=latestUpstream(o).date;
    if(prevDate && prev!==prevDate)return false;
    if(st==="need"&&!o.needs_reply)return false;
    if(st==="changed"&&!(o.changed_fields||[]).length)return false;
    if(st==="had"&&!o.ever_replied)return false;
    if(st==="new"&&chaseCount(o)!==1)return false;
    if(st==="repeat"&&chaseCount(o)<=1)return false;
    if(st==="repeat_changed"&&!(chaseCount(o)>1&&(o.changed_fields||[]).length))return false;
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
  // 用既有異動歷史推算每筆「最後回覆人」，不新增資料表、不改原本儲存流程。
  const {data:replyHistory,error:replyHistoryErr}=await sb.from("ph3_order_history")
    .select("unique_key,field_name,employee_no,employee_name,changed_at")
    .in("field_name",["ph3_date","warehouse99_date"])
    .order("changed_at",{ascending:false}).limit(50000);
  if(replyHistoryErr)console.warn(replyHistoryErr);
  lastReplyMap=new Map();
  (replyHistory||[]).forEach(h=>{if(!lastReplyMap.has(h.unique_key))lastReplyMap.set(h.unique_key,h)});
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
  // C＋D＋E 是訂單唯一鍵；MSK 與印刷色緊接在唯一鍵後，讓現場不用橫向捲到 P 欄後才看得到。
  ...HEADERS.slice(0,5).map((h,i)=>({kind:"data",idx:i,label:h,width:[38,42,58,76,38][i]||72})),
  {kind:"msk",label:MSK_HEADER,width:132},
  {kind:"printColor",label:PRINT_COLOR_HEADER,width:104},
  ...HEADERS.slice(5,16).map((h,j)=>({kind:"data",idx:j+5,label:h,width:[78,74,50,46,74,42,58,54,158,108,116][j]||72})),
  ...HEADERS.slice(16,21).map((h,j)=>({kind:"data",idx:j+16,label:h,width:[82,84,84,84,84][j]||72})),
  {kind:"mode",label:PROD_MODE_HEADER,width:118},
  {kind:"prevStage",label:"前工段 / Công đoạn trước",width:108},
  {kind:"data",idx:21,label:HEADERS[21],width:106},
  {kind:"prevPh3",label:"PH3 lần trước / PH3上次回覆日",width:96},
  {kind:"data",idx:22,label:HEADERS[22],width:106},
  {kind:"prev99",label:"99 lần trước / 99上次回覆日",width:96},
  {kind:"days",label:"PH3工段天數 / Số ngày PH3",width:80},
  {kind:"status",label:"狀態 / Trạng thái",width:180},
  {kind:"lastReply",label:"最後回覆人 / Người trả lời cuối",width:120}
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
    const fieldLabel=f=>({ph3_date:"PH3",warehouse99_date:"99",production_mode:"生產方式 / Hình thức sản xuất"}[f]||f||"");
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
    if(["msk","printColor","mode","prevStage","prevPh3","prev99","days","status","lastReply"].includes(c.kind))cls="progress";
    if(c.kind==="prevStage")cls+=" h-prevstage";
    if(c.kind==="prevPh3")cls+=" h-prevph3";
    if(c.kind==="prev99")cls+=" h-prev99";
    if(c.kind==="days")cls+=" h-days";
    if(c.kind==="status")cls+=" h-status";
    if(c.kind==="lastReply")cls+=" h-lastreply";
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
      }else if(c.kind==="msk"){
        cls="progress c-msk";
        const codes=mskCodes(o), code=codes[0]||"", printType=mskPrintType(o), same=mskSameCount(o);
        if(!code)content='<span class="muted">—</span>';
        else content=`<b>${esc(codes.join(" / "))}</b>`+
          (printType?`<div class="msk-suggest">${esc(printType)}</div>`:`<div class="msk-suggest">待確認 / Cần xác nhận</div>`)+
          (same>1?`<button type="button" class="msk-same" data-msk="${esc(code)}">同 MSK ${same} 筆 / Cùng MSK ${same}</button>`:``);
      }else if(c.kind==="printColor"){
        cls="progress c-printcolor";
        const color=printColorText(o);
        content=color?`<b>${esc(color)}</b>`:'<span class="muted">—</span>';
      }else if(c.kind==="mode"){
        cls="progress c-mode";
        if(dirtyKeys.has(o.unique_key))cls+=" draftcell";
        const cur=productionModeLabel(o.production_mode), old=productionModeLabel(o.previous_production_mode);
        content=`<select class="cell-mode" data-key="${esc(o.unique_key)}"><option value="">請選擇 / Chọn</option>${PROD_MODES.map(m=>`<option value="${esc(m)}" ${cur===m?"selected":""}>${esc(m)}</option>`).join("")}</select>`+
          (old&&old!==cur?`<div class="mode-prev">原 / Trước: ${esc(productionModeShort(old))}</div>`:"");
      }else if(c.kind==="prevStage"){
        cls="progress c-prevstage";content=`${esc(prev.label)} ${esc(fmt(prev.date))}`;
      }else if(c.kind==="prevPh3"){
        cls="progress c-prevph3";content=esc(fmt(prevPh3(o))||"—");
      }else if(c.kind==="prev99"){
        cls="progress c-prev99";content=esc(fmt(prev99(o))||"—");
      }else if(c.kind==="days"){
        cls="progress c-days";
        if(days===null)content="—";
        else if(days>7)content=`<span class="badge b-red">${days}天 / ${days} ngày</span>`;
        else content=`<span class="badge b-green">${days}天 / ${days} ngày</span>`;
      }else if(c.kind==="status"){
        cls="progress c-status";
        const chase=chaseState(o);
        let status=`<span class="badge ${chase.cls}">${esc(chase.label)}</span> `+(o.needs_reply?'<span class="badge b-red">待回覆 / Cần trả lời</span>':'<span class="badge b-green">已回覆 / Đã trả lời</span>');
        if(!o.production_mode)status+=' <span class="badge b-orange">未分配 / Chưa phân công</span>';
        if(o.previous_production_mode&&o.production_mode&&o.previous_production_mode!==o.production_mode)status+=` <span class="badge b-orange">原 ${esc(productionModeShort(o.previous_production_mode))} → ${esc(productionModeShort(o.production_mode))}</span>`;
        if((o.changed_fields||[]).length)status+=' <span class="badge b-orange">有異動 / Có thay đổi</span>';
        if(ph3BeforeUpstream(o))status+=' <span class="badge b-red">PH3早於前站 / PH3 sớm hơn công đoạn trước</span>';
        if(warehouseBeforePh3(o))status+=' <span class="badge b-red">99早於PH3 / 99 sớm hơn PH3</span>';
        if(late99)status+=' <span class="badge b-red">99晚於客需 / 99 trễ hơn KH</span>';
        if(days>7)status+=' <span class="badge b-red">PH3超7天 / PH3 >7 ngày</span>';
        if(dirtyKeys.has(o.unique_key))status+=' <span class="badge draftbadge">尚未儲存 / Chưa lưu</span>';
        if(issueKeys.has(o.unique_key))status=`<span class="badge b-red">⚠ ${esc(issueKeys.get(o.unique_key))}</span> `+status;
        content=status;
      }else if(c.kind==="lastReply"){
        cls="progress c-lastreply";content=esc(lastReplyUser(o)||"—");
      }
      h+=`<td data-display-col="${di}" class="${cls}" title="${esc(String(content).replace(/<[^>]*>/g,""))}">${content}</td>`;
    });
    h+="</tr>";
  }
  grid.innerHTML=h+"</tbody>";
  grid.querySelectorAll(".cell-date").forEach(inp=>inp.addEventListener("change",saveDirectCell));
  grid.querySelectorAll(".cell-mode").forEach(inp=>inp.addEventListener("change",saveDirectMode));
  grid.querySelectorAll(".msk-same").forEach(btn=>btn.addEventListener("click",()=>{if($("fAllSearch")){ $("fAllSearch").value=btn.dataset.msk||""; render(); }}));
  updateWorkflowStatus();
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
      const problems=validateImportRows(f.name,a);
      if(problems.length){showImportProblems(problems);throw new Error(`請依下方提示修正 ${f.name} / Hãy sửa lỗi theo hướng dẫn bên dưới`);}
      showImportProblems([]);
      if(a.length<2)throw new Error(`${f.name} 沒有資料 / Không có dữ liệu`);
      names.push(f.name);
      a.slice(1).filter(r=>r.some(v=>v!==""&&v!=null)).forEach(r=>{
        const row=Array.from({length:23},(_,i)=>r[i]??"");
        allPayload.push({unique_key:keyOfArray(row),source_file:f.name,row_no:rowNo++,data:arrToPayload(row)});
      });
    }

    // 同一筆訂單的 TD 進度參考，以文字中「日期時間最新」者為準。
    // 即使不小心先後匯入不同版本 Excel，也不讓較舊的 TD 日期覆蓋較新的資料。
    const existingProgress=new Map(rows.map(o=>[o.unique_key,o.progress_ref||""]));
    const newestProgress=new Map(existingProgress);
    for(const item of allPayload){
      const chosen=latestProgressRef(newestProgress.get(item.unique_key)||"",item.data.progress_ref||"");
      newestProgress.set(item.unique_key,chosen||"");
    }
    for(const item of allPayload)item.data.progress_ref=newestProgress.get(item.unique_key)||item.data.progress_ref||"";

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

function saveDirectMode(e){
  const key=e.target.dataset.key, o=rows.find(x=>x.unique_key===key);if(!o)return;
  applyProductionModeDraft(o,e.target.value);
  $("replyMsg").innerHTML='<span class="warn">生產方式已暫存於畫面；若從原單位改到新單位，原交期會保留在「上次回覆」並要求新單位重新回覆 / Đã tạm lưu hình thức sản xuất; nếu đổi bộ phận, ngày cũ được giữ ở lần trước và phải trả lời lại.</span>';
  render();
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
  markDateDirty(key);
  if($("fStatus").value==="issue" && filtered().length===0){
    $("fStatus").value="";
    $("replyMsg").innerHTML='<span class="ok">異常已修正，已自動返回全部資料 / Đã sửa lỗi, tự động trở về tất cả dữ liệu</span>';
  }else{
    $("replyMsg").innerHTML='<span class="warn">已暫存於畫面，確認全部後請按「儲存目前修改」 / Đã giữ tạm trên màn hình, hãy bấm Lưu các thay đổi khi hoàn tất</span>';
  }
  render();
}

async function calcBulkReply(){
  const rawDays=Number($("addDays").value);
  if(!Number.isInteger(rawDays)||rawDays<0||rawDays>60){
    $("replyMsg").innerHTML='<span class="bad">PH3 加天數請輸入 0～60 的整數 / Số ngày PH3 phải là số nguyên từ 0～60</span>';return;
  }

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
    markDateDirty(o.unique_key);
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
  const modePayload=[];
  const invalid=[];
  for(const key of dirtyDateKeys){
    const o=rows.find(x=>x.unique_key===key);
    if(!o)continue;
    const ph3=String(o.ph3_date||"").slice(0,10)||null;
    const w99=String(o.warehouse99_date||"").slice(0,10)||null;
    const prev=latestUpstream(o).date;
    if(ph3 && prev && ph3<prev){invalid.push(`${key}: PH3 < 前站`);issueKeys.set(key,"PH3早於前工段 / PH3 sớm hơn công đoạn trước");continue}
    if(w99 && ph3 && w99<ph3){invalid.push(`${key}: 99 < PH3`);issueKeys.set(key,"99早於PH3 / 99 sớm hơn PH3");continue}
    payload.push({unique_key:key,ph3_date:ph3,warehouse99_date:w99});
  }
  for(const key of dirtyModeKeys){
    const o=rows.find(x=>x.unique_key===key);if(!o)continue;
    const mode=productionModeLabel(o.production_mode);
    if(!mode){invalid.push(`${key}: 未選擇生產方式 / Chưa chọn hình thức sản xuất`);continue}
    modePayload.push({unique_key:key,production_mode:mode});
  }

  if(invalid.length){
    $("replyMsg").innerHTML=`<span class="bad">⚠ 有 ${invalid.length} 筆資料不合法，請先修正 / Có ${invalid.length} dòng lỗi, hãy sửa trước</span>`;
    render();return;
  }

  $("replyMsg").textContent="儲存中… / Đang lưu…";
  try{
    let modeUpdated=0,dateUpdated=0,late99=0,over7=0;
    if(modePayload.length){
      const {data,error}=await sb.rpc("ph3_update_production_modes",{p_rows:modePayload});
      if(error)throw new Error(`生產方式儲存失敗 / Lưu hình thức sản xuất thất bại：${error.message}`);
      modeUpdated=Number(data?.updated||modePayload.length);
    }
    if(payload.length){
      const {data,error}=await sb.rpc("ph3_import_replies",{p_rows:payload});
      if(error)throw error;
      dateUpdated=Number(data?.updated||payload.length);late99=Number(data?.late99||0);over7=Number(data?.over7||0);
    }
    dirtyKeys.clear();dirtyDateKeys.clear();dirtyModeKeys.clear();
    $("replyMsg").innerHTML=`<span class="ok">已儲存：生產方式 ${modeUpdated} 筆、交期 ${dateUpdated} 筆 / Đã lưu: hình thức ${modeUpdated}, ngày giao ${dateUpdated}</span>`+
      (late99?` <span class="warn">；99晚於客需 ${late99} 筆 / ${late99} dòng 99 trễ hơn KH</span>`:"")+
      (over7?` <span class="warn">；PH3超過7天 ${over7} 筆 / PH3 >7 ngày: ${over7}</span>`:"");
    await loadAll();
  }catch(error){
    $("replyMsg").innerHTML=`<span class="bad">${esc(error.message||error)}</span>`;
  }
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
function excelHeaderColorByOriginalIndex(i){
  // i 為 1-based Excel 欄號：93~96 使用金色；PH3 使用藍色；99 使用青綠色。
  if(i===22)return "FF2F75B5"; // V: PH3
  if(i===23)return "FF008C95"; // W: 99
  if(i>=18)return "FFBF9000";  // R~U: 93~96
  return "FF548235";
}
function excelDerivedColor(kind){
  // 所有系統提示/參考欄統一藍色，與 93~96 的黃色工段欄清楚區隔。
  return ["printColor","prevStage","prevPh3","prev99","days","status","lastReply"].includes(kind)?"FF4472C4":null;
}
function excelDerivedBodyColor(kind){
  // 生產方式可編輯欄用淡黃；系統提示/參考欄維持淡藍。
  if(kind==="mode")return "FFFFF2CC";
  return ["printColor","prevStage","prevPh3","prev99","days","status","lastReply"].includes(kind)?"FFEAF2FF":null;
}

async function downloadBlankTemplate(){
  try{
    const wb=new ExcelJS.Workbook();
    const ws=wb.addWorksheet("PH3匯入範本");
    ws.addRow(HEADERS);
    ws.views=[{state:"frozen",xSplit:5,ySplit:1}];
    ws.autoFilter={from:{row:1,column:1},to:{row:1,column:HEADERS.length}};
    ws.getRow(1).height=38;
    ws.getRow(1).eachCell((c,i)=>{
      c.font={bold:true,color:{argb:"FFFFFFFF"},size:10};
      c.alignment={vertical:"middle",horizontal:"center",wrapText:true};
      c.fill={type:"pattern",pattern:"solid",fgColor:{argb:excelHeaderColorByOriginalIndex(i)}};
      c.border={bottom:{style:"thin",color:{argb:"FFFFFFFF"}}};
    });

    // 必填欄位用「紅色 * + 淺黃色表頭」提醒，但仍保留原欄名供系統辨識。
    const requiredCols=[3,4,5];
    requiredCols.forEach(c=>{
      const cell=ws.getCell(1,c);
      const base=HEADERS[c-1];
      cell.value={richText:[
        {text:base,font:{bold:true,color:{argb:"FFFFFFFF"},size:10}},
        {text:" *",font:{bold:true,color:{argb:"FFFF3333"},size:11}}
      ]};
      cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF4B183"}};
    });

    // 欄寬依內容預先設定，避免日期顯示 ######、料號/訂單號被過度折行。
    const widths=[7,10,12,18,8,13,14,12,9,15,8,12,22,30,22,24,14,14,14,14,14,14,14];
    widths.forEach((w,i)=>ws.getColumn(i+1).width=w);

    // 先把 1000 列儲存格格式設定好，直接貼值即可使用。
    // 文字欄用 @，避免客戶代碼 020891 之類的前導 0 被 Excel 吃掉。
    const textCols=[1,2,3,4,5,7,8,10,11,13,14,15,16];
    const numberCols=[9,12];
    const dateCols=[6,17,18,19,20,21,22,23];
    const last=1001;
    for(let r=2;r<=last;r++){
      const row=ws.getRow(r); row.height=21;
      textCols.forEach(c=>{ws.getCell(r,c).numFmt="@"});
      numberCols.forEach(c=>{ws.getCell(r,c).numFmt="#,##0.###"});
      dateCols.forEach(c=>{ws.getCell(r,c).numFmt="yyyy/m/d"});
      for(let c=1;c<=HEADERS.length;c++)ws.getCell(r,c).border={bottom:{style:"hair",color:{argb:"FFD9E2E8"}}};
    }

    // A：表頭只保留「需要時才看」的中越文 Note，不再出現長篇常駐說明。
    ws.getCell(1,3).note="必填 / Bắt buộc\n請保留前導 0，例如 020891。\nGiữ số 0 ở đầu, ví dụ 020891.";
    ws.getCell(1,4).note="必填 / Bắt buộc\n請以文字格式輸入訂單號碼。\nNhập mã đơn dưới dạng văn bản.";
    ws.getCell(1,5).note="必填 / Bắt buộc\nNET 是辨識同筆資料的關鍵欄位。\nNET là trường khóa để xác định đúng dòng.";
    ws.getCell(1,13).note="TD 進度參考可持續更新；重複匯入時保留日期時間最新的一筆。\nTD có thể tiếp tục cập nhật; khi nhập trùng, hệ thống giữ bản mới nhất theo ngày giờ.";
    dateCols.forEach(c=>{
      ws.getCell(1,c).note="日期格式 / Định dạng ngày\nyyyy/mm/dd";
    });

    // C：點到儲存格才出現短提示，不占畫面。
    ws.getRange = ws.getRange || null; // 相容註記；實際以每欄設定 dataValidation。
    const setPrompt=(col,rule)=>{
      for(let r=2;r<=last;r++)ws.getCell(r,col).dataValidation=rule;
    };
    setPrompt(3,{
      type:"textLength",operator:"greaterThan",allowBlank:false,formulae:[0],
      showInputMessage:true,promptTitle:"KH 客戶 * / Bắt buộc",prompt:"請輸入客戶代碼並保留前導 0。\nNhập mã KH và giữ số 0 ở đầu.",
      showErrorMessage:true,errorStyle:"stop",errorTitle:"必填 / Bắt buộc",error:"KH 客戶不可空白 / KH không được để trống"
    });
    setPrompt(4,{
      type:"textLength",operator:"greaterThan",allowBlank:false,formulae:[0],
      showInputMessage:true,promptTitle:"訂單號碼 * / Mã đơn",prompt:"請以文字格式輸入。\nNhập dưới dạng văn bản.",
      showErrorMessage:true,errorStyle:"stop",errorTitle:"必填 / Bắt buộc",error:"訂單號碼不可空白 / Mã đơn không được để trống"
    });
    setPrompt(5,{
      type:"textLength",operator:"greaterThan",allowBlank:false,formulae:[0],
      showInputMessage:true,promptTitle:"NET * / Bắt buộc",prompt:"NET 為同筆資料辨識鍵。\nNET là khóa nhận diện dòng dữ liệu.",
      showErrorMessage:true,errorStyle:"stop",errorTitle:"必填 / Bắt buộc",error:"NET 不可空白 / NET không được để trống"
    });
    setPrompt(13,{
      type:"textLength",operator:"greaterThanOrEqual",allowBlank:true,formulae:[0],
      showInputMessage:true,promptTitle:"TD 進度參考 / Tham khảo TD",prompt:"可持續更新；重複匯入保留最新日期時間。\nCó thể cập nhật; nhập trùng sẽ giữ bản mới nhất.",
      showErrorMessage:false
    });
    dateCols.forEach(c=>setPrompt(c,{
      type:"date",operator:"between",allowBlank:true,
      formulae:[new Date(2000,0,1),new Date(2100,11,31)],
      showInputMessage:true,promptTitle:"日期 / Ngày",prompt:"格式 / Định dạng：yyyy/mm/dd",
      showErrorMessage:true,errorStyle:"stop",errorTitle:"日期格式錯誤 / Sai định dạng ngày",error:"請輸入有效日期 yyyy/mm/dd / Nhập ngày hợp lệ yyyy/mm/dd"
    }));

    // 必填欄位：有資料但 C/D/E 空白時，以淡紅色提醒。
    requiredCols.forEach(c=>{
      const letter=ws.getColumn(c).letter;
      ws.addConditionalFormatting({ref:`${letter}2:${letter}${last}`,rules:[{
        type:"expression",
        formulae:[`AND(COUNTA($A2:$W2)>0,${letter}2="")`],
        style:{fill:{type:"pattern",pattern:"solid",fgColor:{argb:"FFFFC7CE"}},font:{color:{argb:"FF9C0006"}}}
      }]});
    });

    // 日期欄如果貼成無法辨識的文字（貼上可能略過資料驗證），仍用紅底警示。
    dateCols.forEach(c=>{
      const letter=ws.getColumn(c).letter;
      ws.addConditionalFormatting({ref:`${letter}2:${letter}${last}`,rules:[{
        type:"expression",
        formulae:[`AND(${letter}2<>"",NOT(ISNUMBER(${letter}2)))`],
        style:{fill:{type:"pattern",pattern:"solid",fgColor:{argb:"FFFFC7CE"}},font:{color:{argb:"FF9C0006"}}}
      }]});
    });

    const buf=await wb.xlsx.writeBuffer();
    const blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="PH3匯入空白範本_A+C提示版.xlsx";document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    $("importMsg").innerHTML='<span class="ok">已下載空白範本：平常畫面乾淨，滑過表頭看 Note；點儲存格顯示輸入提示 / Đã tải mẫu: xem Note ở tiêu đề, bấm ô để xem hướng dẫn</span>';
  }catch(err){
    console.error(err);$("importMsg").innerHTML=`<span class="bad">下載空白範本失敗 / Tải mẫu thất bại：${esc(err.message||err)}</span>`;
  }
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
        }else if(c.kind==="msk")values.push(primaryMsk(o));
        else if(c.kind==="printColor")values.push(printColorText(o));
        else if(c.kind==="mode")values.push(productionModeLabel(o.production_mode));
        else if(c.kind==="prevStage")values.push(`${prev.label} ${fmt(prev.date)}`.trim());
        else if(c.kind==="prevPh3")values.push(prevPh3(o)?dateObj(prevPh3(o)):"");
        else if(c.kind==="prev99")values.push(prev99(o)?dateObj(prev99(o)):"");
        else if(c.kind==="days")values.push("");
        else if(c.kind==="status")values.push("");
        else if(c.kind==="lastReply")values.push(lastReplyUser(o));
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
      const origCol=idx=>WEB_COLUMNS.findIndex(c=>c.kind==="data"&&c.idx===idx)+1;
      const c93=L(origCol(17)), c96=L(origCol(20)), cReq=L(origCol(16));
      const upstreamRange=`${c93}${rn}:${c96}${rn}`;
      const ph=L(colPh3), w=L(col99), days=L(colDays);

      // 前工段＝93~96 已回覆日期中的最晚日期；使用實際欄位位置，避免新增 MSK 欄後公式位移。
      r.getCell(colPrevStage).value={formula:
        `IF(MAX(${upstreamRange})=0,"—",CHOOSE(MATCH(MAX(${upstreamRange}),${upstreamRange},0),"織造/93 ","染色/94 ","上漿/95 ","束頭/96 ")&TEXT(MAX(${upstreamRange}),"yyyy/mm/dd"))`
      };
      r.getCell(colDays).value={formula:
        `IF(${ph}${rn}="","",IF(MAX(${upstreamRange})=0,"",IF(${ph}${rn}<MAX(${upstreamRange}),-1,NETWORKDAYS.INTL(MAX(${upstreamRange})+1,${ph}${rn},11))))`
      };
      r.getCell(colStatus).value={formula:
        `IF(${ph}${rn}="","待回覆 / Chờ trả lời",`+
        `IF(MAX(${upstreamRange})>0,IF(${ph}${rn}<MAX(${upstreamRange}),"PH3早於前站 / PH3 sớm hơn công đoạn trước；",""),"")&`+
        `IF(AND(${days}${rn}<>"",${days}${rn}>7),"PH3超7天 / PH3 >7 ngày；","")&`+
        `IF(AND(${w}${rn}<>"",${ph}${rn}<>"",${w}${rn}<${ph}${rn}),"99早於PH3 / 99 sớm hơn PH3；","")&`+
        `IF(AND(${w}${rn}<>"",${cReq}${rn}<>"",${w}${rn}>${cReq}${rn}),"99晚於客需 / 99 trễ hơn KH；","")&"已回覆 / Đã trả lời")`
      };

      // 提示/參考欄統一使用淡藍色，與黃色工段欄清楚區隔。
      WEB_COLUMNS.forEach((col,idx)=>{
        const bodyColor=excelDerivedBodyColor(col.kind);
        if(bodyColor) r.getCell(idx+1).fill={type:"pattern",pattern:"solid",fgColor:{argb:bodyColor}};
      });

      // Existing changed fields red.
      const changes=new Set(o.changed_fields||[]);
      [16,17,18,19,20].forEach(i=>{
        if(changes.has(COLNAMES[i])){
          const ci=WEB_COLUMNS.findIndex(c=>c.kind==="data"&&c.idx===i)+1;
          if(ci>0){
            r.getCell(ci).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFB3B3"}};
            r.getCell(ci).font={color:{argb:"FF7F0000"},bold:true};
          }
        }
      });

      // Date validations same as web.
      r.getCell(colPh3).dataValidation={
        type:"custom",allowBlank:true,
        formulae:[`OR(${ph}${rn}="",MAX(${upstreamRange})=0,${ph}${rn}>=MAX(${upstreamRange}))`],
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
      let headerColor="FF548235";
      if(col.kind==="data") headerColor=excelHeaderColorByOriginalIndex(col.idx+1);
      else headerColor=excelDerivedColor(col.kind)||"FF548235";
      c.fill={type:"pattern",pattern:"solid",fgColor:{argb:headerColor}};
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
    const editColMode=WEB_COLUMNS.findIndex(c=>c.kind==="mode")+1;
    if(editColMode>0){
      const head=ws.getCell(1,editColMode);head.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF7030A0"}};
      head.font={bold:true,color:{argb:"FFFFFFFF"},size:10};
      head.note="★ 可修改：機印 / In máy、手印 / In tay、GCN。若由原單位改到新單位，原交期會失效並要求重新回覆。";
      for(let rr=2;rr<=ws.rowCount;rr++){
        const cell=ws.getCell(rr,editColMode);cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFF2CC"}};
        cell.dataValidation={type:"list",allowBlank:true,formulae:['"機印 / In máy,手印 / In tay,GCN"'],showErrorMessage:true,errorTitle:"請選擇清單 / Chọn từ danh sách",error:"只能選機印 / In máy、手印 / In tay、GCN"};
      }
    }
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
    const col93=WEB_COLUMNS.findIndex(c=>c.kind==="data"&&c.idx===17)+1;
    const col96=WEB_COLUMNS.findIndex(c=>c.kind==="data"&&c.idx===20)+1;
    const colReq=WEB_COLUMNS.findIndex(c=>c.kind==="data"&&c.idx===16)+1;
    const ph=ws.getColumn(colPh3).letter, w=ws.getColumn(col99).letter;
    const c93=ws.getColumn(col93).letter,c96=ws.getColumn(col96).letter,cReq=ws.getColumn(colReq).letter;
    const last=ws.rowCount;
    if(last>=2){
      ws.addConditionalFormatting({ref:`${ph}2:${ph}${last}`,rules:[
        {type:"expression",formulae:[`AND(${ph}2<>"",MAX(${c93}2:${c96}2)>0,${ph}2<MAX(${c93}2:${c96}2))`],style:{fill:{type:"pattern",pattern:"solid",fgColor:{argb:"FFFFB3B3"}}}},
        {type:"expression",formulae:[`AND(${ph}2<>"",MAX(${c93}2:${c96}2)>0,${ph}2>=MAX(${c93}2:${c96}2),NETWORKDAYS.INTL(MAX(${c93}2:${c96}2)+1,${ph}2,11)>7)`],style:{fill:{type:"pattern",pattern:"solid",fgColor:{argb:"FFFFB3B3"}}}}
      ]});
      ws.addConditionalFormatting({ref:`${w}2:${w}${last}`,rules:[
        {type:"expression",formulae:[`AND(${w}2<>"",${ph}2<>"",${w}2<${ph}2)`],style:{fill:{type:"pattern",pattern:"solid",fgColor:{argb:"FFFFB3B3"}}}},
        {type:"expression",formulae:[`AND(${w}2<>"",${cReq}2<>"",${w}2>${cReq}2)`],style:{fill:{type:"pattern",pattern:"solid",fgColor:{argb:"FFFFB3B3"}}}}
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


function workflowScopeData(){return exportData()}
function updateWorkflowStatus(){
  const el=$("workflowStatus");if(!el||tab==="history")return;
  let data=[];try{data=workflowScopeData()}catch(e){return}
  const count=m=>data.filter(o=>productionModeLabel(o.production_mode)===m).length;
  const pending=m=>data.filter(o=>productionModeLabel(o.production_mode)===m&&o.needs_reply).length;
  const un=data.filter(o=>!productionModeLabel(o.production_mode)).length;
  const fresh=data.filter(o=>chaseCount(o)===1).length, repeat=data.filter(o=>chaseCount(o)>1).length;
  const parts=PROD_MODES.map(m=>`${productionModeShort(m)} ${count(m)}（待回 ${pending(m)}）`);
  el.innerHTML=`<b>目前 / Hiện tại：</b>新單 ${fresh}｜再次追問 ${repeat}｜未分配 ${un}｜${parts.join("｜")}`;
}
function responseHeaders(){return [...HEADERS.slice(0,16),MSK_HEADER,PRINT_COLOR_HEADER,...HEADERS.slice(16,21),PROD_MODE_HEADER,HEADERS[21],HEADERS[22]]}
async function buildResponsibilityWorkbook(mode,data){
  const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet("PH3交期回覆");const headers=responseHeaders();ws.addRow(headers);
  const meta=wb.addWorksheet("__PH3_META");meta.addRow(["TYPE","RESPONSIBILITY"]);meta.addRow(["MODE",mode]);meta.state="veryHidden";
  const dateObj=s=>{if(!s)return "";const p=parseYMD(String(s).slice(0,10));return p?new Date(p.getUTCFullYear(),p.getUTCMonth(),p.getUTCDate(),12,0,0):s};
  data.forEach(o=>{
    const arr=dbToArray(o);const vals=[];
    for(let i=0;i<=15;i++)vals.push([5].includes(i)&&arr[i]?dateObj(arr[i]):(arr[i]??""));
    vals.push(primaryMsk(o));
    vals.push(printColorText(o));
    for(let i=16;i<=20;i++)vals.push([16,17,18,19,20].includes(i)&&arr[i]?dateObj(arr[i]):(arr[i]??""));
    vals.push(mode);vals.push(o.ph3_date?dateObj(o.ph3_date):"");vals.push(o.warehouse99_date?dateObj(o.warehouse99_date):"");
    ws.addRow(vals);
  });
  ws.views=[{state:"frozen",xSplit:5,ySplit:1}];ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,ws.rowCount),column:headers.length}};
  const modeCol=headers.indexOf(PROD_MODE_HEADER)+1, ph3Col=headers.indexOf(HEADERS[21])+1, w99Col=headers.indexOf(HEADERS[22])+1;
  const colorCol=headers.indexOf(PRINT_COLOR_HEADER)+1;
  ws.getRow(1).height=40;ws.getRow(1).eachCell((c,i)=>{
    c.font={bold:true,color:{argb:"FFFFFFFF"},size:10};c.alignment={vertical:"middle",horizontal:"center",wrapText:true};
    const fill=(i===modeCol)?"FF7030A0":((i===ph3Col||i===w99Col)?"FF2F75B5":((i===colorCol)?"FF4472C4":"FF548235"));
    c.fill={type:"pattern",pattern:"solid",fgColor:{argb:fill}};
  });
  ws.getCell(1,modeCol).note="此檔已分配的生產方式，請勿修改 / Hình thức đã phân công, không sửa.";
  ws.getCell(1,colorCol).note="系統從生管品名＋訂單備注＋摘要自動抓取；如無法辨識顯示空白 / Hệ thống tự lấy từ 3 cột thông tin.";
  [ph3Col,w99Col].forEach(ci=>{ws.getCell(1,ci).note="★ 請回填日期 yyyy/mm/dd / Hãy nhập ngày yyyy/mm/dd"});
  const dateHeaders=[HEADERS[5],HEADERS[16],HEADERS[17],HEADERS[18],HEADERS[19],HEADERS[20],HEADERS[21],HEADERS[22]];
  const dateCols=dateHeaders.map(h=>headers.indexOf(h)+1).filter(x=>x>0);
  for(let r=2;r<=Math.max(2,ws.rowCount);r++){
    ws.getRow(r).height=22;
    ws.getCell(r,modeCol).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFE4DFEC"}};
    ws.getCell(r,colorCol).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFEAF2FF"}};
    [ph3Col,w99Col].forEach(ci=>{ws.getCell(r,ci).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFF2CC"}};ws.getCell(r,ci).numFmt="yyyy/m/d"});
    dateCols.forEach(ci=>ws.getCell(r,ci).numFmt="yyyy/m/d");
  }
  autoFitWorksheet(ws,{min:7,max:30,padding:2});
  return wb;
}
async function triggerWorkbookDownload(wb,name){
  const buf=await wb.xlsx.writeBuffer();const blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function downloadSplitFiles(){
  if(blockIfUnsaved("下載三份交期檔 / tải 3 file"))return;
  try{
    const data=exportData();if(!data.length){$("replyMsg").innerHTML='<span class="warn">目前沒有可下載資料 / Không có dữ liệu để tải</span>';return}
    const unassigned=data.filter(o=>!productionModeLabel(o.production_mode));
    if(unassigned.length){$("replyMsg").innerHTML=`<span class="bad">⚠ 還有 ${unassigned.length} 筆未選生產方式，請先完成機印／手印／GCN 分配並儲存，再下載三份交期檔 / Còn ${unassigned.length} dòng chưa phân công.</span>`;return}
    const stamp=todayYMD().replaceAll("-","");
    const names={"機印 / In máy":`PH3_機印_In máy_${stamp}.xlsx`,"手印 / In tay":`PH3_手印_In tay_${stamp}.xlsx`,"GCN":`PH3_GCN_${stamp}.xlsx`};
    for(const mode of PROD_MODES){
      const subset=data.filter(o=>productionModeLabel(o.production_mode)===mode);const wb=await buildResponsibilityWorkbook(mode,subset);await triggerWorkbookDownload(wb,names[mode]);
      await new Promise(r=>setTimeout(r,220));
    }
    $("replyMsg").innerHTML=`<span class="ok">已下載 3 份：機印 ${data.filter(o=>o.production_mode===PROD_MODES[0]).length} 筆、手印 ${data.filter(o=>o.production_mode===PROD_MODES[1]).length} 筆、GCN ${data.filter(o=>o.production_mode===PROD_MODES[2]).length} 筆 / Đã tải 3 file.</span>`;
  }catch(err){console.error(err);$("replyMsg").innerHTML=`<span class="bad">下載三份交期檔失敗 / Tải 3 file thất bại：${esc(err.message||err)}</span>`}
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
      c.fill={type:"pattern",pattern:"solid",fgColor:{argb:excelHeaderColorByOriginalIndex(i)}};
      c.border={bottom:{style:"thin",color:{argb:"FFFFFFFF"}}};
    });
    autoFitWorksheet(ws,{min:7,max:42,padding:2});
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
  const files=[...$("refillFile").files];if(!files.length)return;
  const showProblems=(title,items)=>{const shown=items.slice(0,80);$("replyMsg").innerHTML=`<div class="import-help"><b>⚠ ${esc(title)}</b><br>${shown.map((x,i)=>`${i+1}. ${esc(x)}`).join("<br>")}${items.length>80?`<br>…另外還有 ${items.length-80} 個問題 / Còn ${items.length-80} lỗi khác`:""}</div>`};
  try{
    if(dirtyKeys.size){$("replyMsg").innerHTML=`<span class="bad">⚠ 畫面上還有 ${dirtyKeys.size} 筆未儲存，請先儲存後再回填 Excel / Còn ${dirtyKeys.size} dòng chưa lưu.</span>`;$("refillFile").value="";return}
    $("replyMsg").textContent=`檢查 ${files.length} 份回填 Excel… / Đang kiểm tra ${files.length} file…`;
    const issues=[],staged=[],seenKeys=new Set();
    for(const file of files){
      const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:"array",cellDates:false});if(!wb.SheetNames.length){issues.push(`${file.name}: Excel 沒有工作表`);continue}
      let expectedMode="";
      if(wb.SheetNames.includes("__PH3_META")){
        const ma=XLSX.utils.sheet_to_json(wb.Sheets["__PH3_META"],{header:1,defval:"",raw:true});
        const typeRow=ma.find(r=>String(r[0]||"")==="TYPE"),modeRow=ma.find(r=>String(r[0]||"")==="MODE");
        if(String(typeRow?.[1]||"")==="RESPONSIBILITY")expectedMode=productionModeLabel(modeRow?.[1]);
      }
      const mainName=wb.SheetNames.find(n=>n!=="__PH3_META")||wb.SheetNames[0];const a=XLSX.utils.sheet_to_json(wb.Sheets[mainName],{header:1,defval:"",raw:true});
      if(a.length<2){continue}
      const headers=a[0].map(x=>String(x??"").trim());
      const find=n=>headers.indexOf(n);
      const idxCustomer=find(HEADERS[2]),idxOrder=find(HEADERS[3]),idxNet=find(HEADERS[4]),idxPh3=find(HEADERS[21]),idx99=find(HEADERS[22]),idxMode=find(PROD_MODE_HEADER);
      const missing=[[idxCustomer,HEADERS[2]],[idxOrder,HEADERS[3]],[idxNet,HEADERS[4]],[idxPh3,HEADERS[21]],[idx99,HEADERS[22]]].filter(x=>x[0]<0);
      if(missing.length){issues.push(`${file.name}：缺少 ${missing.map(x=>`「${x[1]}」`).join("、")} / Thiếu cột`);continue}
      const upstreamIdx=[17,18,19,20].map(i=>find(HEADERS[i]));
      for(let i=1;i<a.length;i++){
        const r=a[i],excelRow=i+1;if(!r.some(v=>v!==""&&v!=null))continue;
        const customer=String(r[idxCustomer]??"").trim(),order=String(r[idxOrder]??"").trim(),net=String(r[idxNet]??"").trim();
        if(!customer||!order||!net){issues.push(`${file.name} 第 ${excelRow} 列：KH／訂單號／NET 不可空白 / Không được để trống`);continue}
        const key=[customer,order,net].join("|");if(seenKeys.has(key)){issues.push(`${file.name} 第 ${excelRow} 列：重複資料 ${key} / Dữ liệu trùng`);continue}seenKeys.add(key);
        const o=rows.find(x=>x.unique_key===key);if(!o){issues.push(`${file.name} 第 ${excelRow} 列（${key}）：系統找不到此筆 / Không tìm thấy`);continue}
        const fileMode=idxMode>=0?productionModeLabel(r[idxMode]):"";
        if(expectedMode){
          if(!fileMode||fileMode!==expectedMode){issues.push(`${file.name} 第 ${excelRow} 列：生產方式被修改或不符（應為 ${expectedMode}）/ Hình thức sản xuất không đúng`);continue}
          if(productionModeLabel(o.production_mode)!==expectedMode){issues.push(`${file.name} 第 ${excelRow} 列（${key}）：此單目前已改分配為 ${productionModeShort(o.production_mode)}，不能再使用舊的 ${expectedMode} 回覆；請重新下載新單位檔案 / Đơn đã đổi bộ phận, không thể dùng file cũ`);continue}
        }
        const rawPh3=r[idxPh3],raw99=r[idx99],ph3=rawPh3===""||rawPh3==null?"":excelDate(rawPh3),w99=raw99===""||raw99==null?"":excelDate(raw99);
        if(rawPh3!==""&&rawPh3!=null&&!ph3){issues.push(`${file.name} 第 ${excelRow} 列：PH3 日期格式錯誤 ${rawPh3} / Sai ngày PH3`);continue}
        if(raw99!==""&&raw99!=null&&!w99){issues.push(`${file.name} 第 ${excelRow} 列：99 日期格式錯誤 ${raw99} / Sai ngày 99`);continue}
        const prevDates=[];let badPrev=false;upstreamIdx.forEach(ci=>{if(ci<0)return;const raw=r[ci];if(raw===""||raw==null)return;const d=excelDate(raw);if(!d)badPrev=true;else prevDates.push(d)});if(badPrev){issues.push(`${file.name} 第 ${excelRow} 列：前工段日期格式錯誤 / Sai ngày công đoạn trước`);continue}
        prevDates.sort();const prev=prevDates.at(-1)||"";if(ph3&&prev&&ph3<prev){issues.push(`${file.name} 第 ${excelRow} 列（${key}）：PH3 早於前工段 / PH3 sớm hơn công đoạn trước`);continue}if(w99&&ph3&&w99<ph3){issues.push(`${file.name} 第 ${excelRow} 列（${key}）：99 早於 PH3 / 99 sớm hơn PH3`);continue}
        staged.push({o,key,ph3:ph3||null,w99:w99||null,newMode:expectedMode?productionModeLabel(o.production_mode):(idxMode>=0?fileMode:productionModeLabel(o.production_mode)),expectedMode,file:file.name});
      }
    }
    if(issues.length){showProblems(`發現 ${issues.length} 個問題，為避免部分資料誤寫，本次完全沒有回填 / Phát hiện ${issues.length} lỗi; chưa nhập dữ liệu`,issues);$("refillFile").value="";return}
    let appliedDates=0,appliedModes=0;
    staged.forEach(x=>{
      const oldMode=productionModeLabel(x.o.production_mode),newMode=productionModeLabel(x.newMode);
      if(!x.expectedMode&&newMode&&newMode!==oldMode){applyProductionModeDraft(x.o,newMode);appliedModes++;return}
      const oldPh3=String(x.o.ph3_date||"").slice(0,10),old99=String(x.o.warehouse99_date||"").slice(0,10);
      if(oldPh3!==String(x.ph3||"")||old99!==String(x.w99||"")){x.o.ph3_date=x.ph3;x.o.warehouse99_date=x.w99;markDateDirty(x.key);issueKeys.delete(x.key);appliedDates++}
    });
    if(!appliedDates&&!appliedModes){$("replyMsg").innerHTML=`<span class="warn">Excel 檢查通過，但沒有任何變更 / Excel hợp lệ nhưng không có thay đổi</span>`;$("refillFile").value="";render();return}
    $("replyMsg").innerHTML=`<span class="warn">✓ 已彙總 ${files.length} 份 Excel：交期 ${appliedDates} 筆、生產方式 ${appliedModes} 筆已帶回畫面，但<strong>尚未儲存</strong>。請確認後按「儲存目前修改」 / Đã gộp ${files.length} file; <strong>chưa lưu</strong>.</span>`;$("refillFile").value="";render();
  }catch(err){console.error(err);$("replyMsg").innerHTML=`<span class="bad">回填失敗 / Nhập lại thất bại：${esc(err.message||err)}</span>`;$("refillFile").value=""}
}

$("loginBtn").onclick=login;$("password").addEventListener("keydown",e=>{if(e.key==="Enter")login()});$("logoutBtn").onclick=logout;if($("createAccountsBtn"))$("createAccountsBtn").onclick=createAccountsBulk;$("refreshBtn").onclick=async()=>{
  if(dirtyKeys.size && !confirm(`尚有 ${dirtyKeys.size} 筆未儲存，重新整理會放棄這些修改。確定要重新整理嗎？\nCòn ${dirtyKeys.size} dòng chưa lưu. Làm mới sẽ bỏ các thay đổi. Tiếp tục?`))return;
  dirtyKeys.clear();dirtyDateKeys.clear();dirtyModeKeys.clear();issueKeys.clear();await loadAll()
};$("importBtn").onclick=()=>{if(blockIfUnsaved("匯入新資料 / nhập dữ liệu mới"))return;importFiles()};if($("downloadTemplateBtn"))$("downloadTemplateBtn").onclick=downloadBlankTemplate;$("calcReplyBtn").onclick=calcBulkReply;$("saveReplyBtn").onclick=saveDraftReplies;$("downloadBtn").onclick=downloadCurrent;$("downloadMailBtn").onclick=downloadMailReady;if($("downloadSplitBtn"))$("downloadSplitBtn").onclick=downloadSplitFiles;
["fAllSearch","fCustomer","fOrder","fItem"].forEach(id=>$(id)?.addEventListener("input",render));
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
