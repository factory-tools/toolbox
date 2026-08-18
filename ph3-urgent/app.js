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
let rows=[], histories=[], tab="current";

function fmt(v){if(!v)return"";if(v instanceof Date)return `${v.getFullYear()}/${v.getMonth()+1}/${v.getDate()}`;if(/^\d{4}-\d{2}-\d{2}/.test(String(v)))return String(v).slice(0,10).replaceAll("-","/");return String(v)}
function excelDate(v){if(!v)return null;if(v instanceof Date)return v.toISOString().slice(0,10);if(typeof v==="number"){const p=XLSX.SSF.parse_date_code(v);return p?`${p.y}-${String(p.m).padStart(2,"0")}-${String(p.d).padStart(2,"0")}`:null}const d=new Date(v);return isNaN(d)?null:d.toISOString().slice(0,10)}
function keyOfArray(r){return [r[2],r[3],r[4]].map(v=>String(v??"").trim()).join("|")}
function dbToArray(o){return COLNAMES.map(c=>o[c]??"")}
function arrToPayload(r){const p={};COLNAMES.forEach((c,i)=>p[c]=[5,16,17,18,19,20,21,22].includes(i)?excelDate(r[i]):r[i]);return p}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function changedSet(o){return new Set(o.changed_fields||[])}
function latestPrev(o){return o.prev_ph3_date?`${fmt(o.prev_ph3_date)} / 99 ${fmt(o.prev_99_date)}`:"—"}
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
function addDaysExcludeSunday(start,days){
  if(!start)return "";
  const d=new Date(start+"T00:00:00");
  let n=0;
  while(n<Number(days)){
    d.setDate(d.getDate()+1);
    if(d.getDay()!==0)n++;
  }
  return d.toISOString().slice(0,10);
}
function calendarAdd(start,days){
  if(!start)return "";
  const d=new Date(start+"T00:00:00");
  d.setDate(d.getDate()+Number(days));
  return d.toISOString().slice(0,10);
}
function workDaysExcludeSunday(from,to){
  if(!from||!to)return null;
  let a=new Date(from+"T00:00:00"), b=new Date(to+"T00:00:00");
  if(b<a)return 0;
  let n=0;
  while(a<b){
    a.setDate(a.getDate()+1);
    if(a.getDay()!==0)n++;
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
function filtered(){
  const c=$("fCustomer").value.trim().toLowerCase(),
        d=$("fOrder").value.trim().toLowerCase(),
        g=$("fItem").value.trim().toLowerCase(),
        st=$("fStatus").value,
        from=$("fPrevFrom").value,
        to=$("fPrevTo").value;
  return rows.filter(o=>{
    if(c&&!String(o.customer??"").toLowerCase().includes(c))return false;
    if(d&&!String(o.order_no??"").toLowerCase().includes(d))return false;
    if(g&&!String(o.item_no??"").toLowerCase().includes(g))return false;
    const prev=latestUpstream(o).date;
    if(from && (!prev || prev<from))return false;
    if(to && (!prev || prev>to))return false;
    if(st==="need"&&!o.needs_reply)return false;
    if(st==="changed"&&!(o.changed_fields||[]).length)return false;
    if(st==="had"&&!o.ever_replied)return false;
    if(st==="late99"&&!is99Late(o))return false;
    if(st==="over7"&&!(ph3Days(o)>7))return false;
    return true;
  });
}
async function loadAll(){
  const {data,error}=await sb.from("ph3_orders").select("*").order("updated_at",{ascending:false}).limit(50000);
  if(error)throw error; rows=data||[];
  $("sAll").textContent=rows.length;
  $("sNeed").textContent=rows.filter(x=>x.needs_reply).length;
  $("sHad").textContent=rows.filter(x=>x.ever_replied).length;
  $("sChanged").textContent=rows.filter(x=>(x.changed_fields||[]).length).length;
  render();
}
async function loadHistory(){
  const {data,error}=await sb.from("ph3_order_history").select("*").order("changed_at",{ascending:false}).limit(50000);
  if(error)throw error; histories=data||[];render();
}
function render(){
  const grid=$("grid");
  if(tab==="history"){
    grid.innerHTML=`<thead><tr><th class="fixed">時間 / Thời gian</th><th class="fixed">C+D+E</th><th class="fixed">欄位 / Cột</th><th class="progress">原值 / Cũ</th><th class="progress">新值 / Mới</th><th class="fixed">來源 / Nguồn</th></tr></thead><tbody>`+
      histories.map(h=>`<tr><td class="fixed">${esc(new Date(h.changed_at).toLocaleString())}</td><td class="fixed">${esc(h.unique_key)}</td><td class="fixed">${esc(h.field_name)}</td><td class="progress">${esc(fmt(h.old_value))}</td><td class="progress">${esc(fmt(h.new_value))}</td><td class="fixed">${esc(h.source_file||"")}</td></tr>`).join("")+"</tbody>";
    return;
  }
  const data=filtered();
  $("filterCount").textContent=`目前顯示 ${data.length.toLocaleString()} 筆 / Đang hiển thị ${data.length.toLocaleString()} dòng`;
  let h="<thead><tr>";
  HEADERS.forEach((x,i)=>h+=`<th class="${i>=17?"progress":(KEYCOLS.includes(i)?"key":"fixed")}">${esc(x)}</th>`);
  h+=`<th class="progress">前工段<br>Công đoạn trước</th><th class="progress">PH3工段天數<br>Số ngày PH3</th><th class="progress">上次PH3回覆<br>PH3 lần trước</th><th class="progress">狀態<br>Trạng thái</th></tr></thead><tbody>`;

  for(const o of data){
    const arr=dbToArray(o), ch=changedSet(o), prev=latestUpstream(o), days=ph3Days(o), late99=is99Late(o);
    h+=`<tr class="${o.needs_reply?"need":""}">`;
    arr.forEach((v,i)=>{
      const field=COLNAMES[i], isChanged=ch.has(field);
      let cls=`${i>=17?"progress":"fixed"} ${isChanged?"changed":""}`;
      if(i===21 && days>7)cls+=" warncell";
      if(i===22 && late99)cls+=" warncell";
      if(i===21 || i===22){
        const val=v?String(v).slice(0,10):"";
        h+=`<td class="${cls}"><input class="cell-date" type="date" data-key="${esc(o.unique_key)}" data-col="${i}" value="${esc(val)}"></td>`;
      }else{
        h+=`<td class="${cls}">${esc(fmt(v))}</td>`;
      }
    });
    let dayBadge="—";
    if(days!==null){
      if(days>7)dayBadge=`<span class="badge b-red">${days}天：超過7天 / >7 ngày</span>`;
      else if(days>=5)dayBadge=`<span class="badge b-green">${days}天 / ${days} ngày</span>`;
      else dayBadge=`<span class="badge b-blue">${days}天：提前 / sớm</span>`;
    }
    let status=o.needs_reply?'<span class="badge b-red">待重回 / Cần trả lời</span>':'<span class="badge b-green">已回覆 / Đã trả lời</span>';
    if((o.changed_fields||[]).length)status+=' <span class="badge b-orange">有異動 / Có thay đổi</span>';
    if(late99)status+=' <span class="badge b-red">99晚於客需 / 99 trễ hơn KH</span>';
    if(days>7)status+=' <span class="badge b-red">PH3超7天 / PH3 >7 ngày</span>';
    h+=`<td class="progress">${esc(prev.label)} ${esc(fmt(prev.date))}</td><td class="progress">${dayBadge}</td><td class="progress">${esc(latestPrev(o))}</td><td class="progress">${status}</td></tr>`;
  }
  grid.innerHTML=h+"</tbody>";

  grid.querySelectorAll(".cell-date").forEach(inp=>inp.addEventListener("change",saveDirectCell));
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
  const fs=[...$("files").files]; if(!fs.length){$("importMsg").innerHTML='<span class="warn">請先選 Excel / Chọn Excel</span>';return}
  $("importMsg").textContent="匯入中… / Đang nhập…";
  let total=0,ok=0,err=0;
  for(const f of fs){
    try{
      const buf=await f.arrayBuffer(), wb=XLSX.read(buf,{type:"array",cellDates:true}), ws=wb.Sheets[wb.SheetNames[0]];
      const a=XLSX.utils.sheet_to_json(ws,{header:1,defval:"",raw:true});
      if(a.length<2||HEADERS.some((x,i)=>String(a[0][i]??"").trim()!==String(x).trim()))throw new Error("格式不符");
      const payload=a.slice(1).filter(r=>r.some(v=>v!==""&&v!=null)).map(r=>{
        const row=Array.from({length:23},(_,i)=>r[i]??"");
        return {unique_key:keyOfArray(row),source_file:f.name,data:arrToPayload(row)}
      });
      total+=payload.length;
      const {data,error}=await sb.rpc("ph3_import_orders",{p_rows:payload});
      if(error)throw error; ok+=Number(data?.processed||payload.length);
    }catch(e){console.error(e);err++; }
  }
  $("importMsg").innerHTML=`<span class="ok">完成 ${ok} 筆 / Hoàn tất ${ok} dòng</span>`+(err?` <span class="bad">；${err} 個檔案失敗</span>`:"");
  await loadAll();
}

async function saveDirectCell(e){
  const key=e.target.dataset.key, col=Number(e.target.dataset.col);
  const o=rows.find(x=>x.unique_key===key); if(!o)return;
  let ph3=String(o.ph3_date||"").slice(0,10), w99=String(o.warehouse99_date||"").slice(0,10);
  if(col===21){
    ph3=e.target.value;
    w99=ph3?calendarAdd(ph3,3):"";
  }else{
    w99=e.target.value;
  }
  const {data,error}=await sb.rpc("ph3_set_reply",{p_key:key,p_ph3_date:ph3||null,p_99_date:w99||null});
  if(error){$("replyMsg").innerHTML=`<span class="bad">${esc(error.message)}</span>`;await loadAll();return}
  $("replyMsg").innerHTML=`<span class="ok">已更新 / Đã cập nhật</span>`+
    (data?.warning?` <span class="warn">${esc(data.warning)}</span>`:"");
  await loadAll();
}

async function calcBulkReply(){
  const data=filtered(), add=Number($("addDays").value);
  if(!data.length){$("replyMsg").innerHTML='<span class="warn">目前篩選沒有資料 / Không có dữ liệu đang lọc</span>';return}
  const missing=data.filter(o=>!latestUpstream(o).date);
  if(missing.length){
    $("replyMsg").innerHTML=`<span class="bad">${missing.length} 筆沒有前工段日期，不能計算 / ${missing.length} dòng thiếu ngày công đoạn trước</span>`;
    return;
  }
  $("replyMsg").textContent="計算並儲存中… / Đang tính và lưu…";
  const keys=data.map(o=>o.unique_key);
  const {data:result,error}=await sb.rpc("ph3_bulk_reply_by_days",{p_keys:keys,p_add_days:add});
  if(error){$("replyMsg").innerHTML=`<span class="bad">${esc(error.message)}</span>`;return}
  $("replyMsg").innerHTML=`<span class="ok">已更新 ${result.updated} 筆：V=前站+${add}天（週日不算），W=V+3天 / Đã cập nhật ${result.updated} dòng</span>`+
    (result.late99>0?` <span class="warn">；其中 ${result.late99} 筆 99 晚於客需，已警示 / ${result.late99} dòng 99 trễ hơn KH</span>`:"");
  await loadAll();
}

async function downloadCurrent(){
  try{
    const data=filtered();
    if(!data.length){$("replyMsg").innerHTML='<span class="warn">目前沒有可下載資料 / Không có dữ liệu để tải</span>';return}
    const aoa=[HEADERS,...data.map(o=>dbToArray(o).map((v,i)=>{
      if([5,16,17,18,19,20,21,22].includes(i) && v)return String(v).slice(0,10);
      return v??"";
    }))];
    const ws=XLSX.utils.aoa_to_sheet(aoa);
    ws["!autofilter"]={ref:`A1:W${aoa.length}`};
    ws["!cols"]=[7,10,11,14,8,13,14,9,8,14,8,12,11,28,22,25,16,17,17,17,17,17,17].map(w=>({wch:w}));
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"PH3");
    XLSX.writeFile(wb,"PH3目前篩選資料.xlsx",{compression:true});
    $("replyMsg").innerHTML=`<span class="ok">已下載 ${data.length} 筆 / Đã tải ${data.length} dòng</span>`;
  }catch(err){
    console.error(err);
    $("replyMsg").innerHTML=`<span class="bad">下載失敗 / Tải thất bại：${esc(err.message||err)}</span>`;
  }
}

$("loginBtn").onclick=login;$("logoutBtn").onclick=logout;$("refreshBtn").onclick=loadAll;$("importBtn").onclick=importFiles;$("calcReplyBtn").onclick=calcBulkReply;$("downloadBtn").onclick=downloadCurrent;
["fCustomer","fOrder","fItem"].forEach(id=>$(id).addEventListener("input",render));
["fStatus","fPrevFrom","fPrevTo"].forEach(id=>$(id).addEventListener("change",render));
document.querySelectorAll(".tab").forEach(b=>b.onclick=async()=>{tab=b.dataset.tab;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));if(tab==="history")await loadHistory();else render()});
checkSession();
