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
function filtered(){
  const c=$("fCustomer").value.trim().toLowerCase(), d=$("fOrder").value.trim().toLowerCase(), g=$("fItem").value.trim().toLowerCase(), st=$("fStatus").value;
  return rows.filter(o=>{
    if(c&&!String(o.customer??"").toLowerCase().includes(c))return false;
    if(d&&!String(o.order_no??"").toLowerCase().includes(d))return false;
    if(g&&!String(o.item_no??"").toLowerCase().includes(g))return false;
    if(st==="need"&&!o.needs_reply)return false;
    if(st==="changed"&&!(o.changed_fields||[]).length)return false;
    if(st==="had"&&!o.ever_replied)return false;
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
  const data=filtered();$("filterCount").textContent=`目前顯示 ${data.length.toLocaleString()} 筆 / Đang hiển thị ${data.length.toLocaleString()} dòng`;
  let h="<thead><tr>";
  HEADERS.forEach((x,i)=>h+=`<th class="${i>=17?"progress":(KEYCOLS.includes(i)?"key":"fixed")}">${esc(x)}</th>`);
  h+=`<th class="progress">上次PH3回覆<br>PH3 lần trước</th><th class="progress">PH3最晚日<br>Ngày PH3 muộn nhất</th><th class="progress">狀態<br>Trạng thái</th></tr></thead><tbody>`;
  for(const o of data){
    const arr=dbToArray(o), ch=changedSet(o);
    h+=`<tr class="${o.needs_reply?"need":""}">`;
    arr.forEach((v,i)=>{
      const field=COLNAMES[i], isChanged=ch.has(field);
      h+=`<td class="${i>=17?"progress":"fixed"} ${isChanged?"changed":""}">${esc(fmt(v))}</td>`;
    });
    h+=`<td class="progress">${esc(latestPrev(o))}</td><td class="progress">${esc(fmt(o.ph3_latest_allowed))}</td>`;
    let status=o.needs_reply?'<span class="badge b-red">待重回 / Cần trả lời</span>':'<span class="badge b-green">已回覆 / Đã trả lời</span>';
    if((o.changed_fields||[]).length)status+=' <span class="badge b-orange">有異動 / Có thay đổi</span>';
    h+=`<td class="progress">${status}</td></tr>`;
  }
  grid.innerHTML=h+"</tbody>";
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

function addDays(s,n){const d=new Date(s+"T00:00:00");d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
$("replyDate").addEventListener("change",()=>{$("warehouseDate").value=$("replyDate").value?addDays($("replyDate").value,3):""});
async function bulkReply(){
  const date=$("replyDate").value, data=filtered();
  if(!date){$("replyMsg").innerHTML='<span class="warn">請選 PH3 完工日 / Chọn ngày PH3</span>';return}
  if(!data.length){$("replyMsg").innerHTML='<span class="warn">目前沒有資料 / Không có dữ liệu</span>';return}
  $("replyMsg").textContent="儲存中…";
  const keys=data.map(x=>x.unique_key);
  const {data:result,error}=await sb.rpc("ph3_bulk_reply",{p_keys:keys,p_ph3_date:date});
  if(error){$("replyMsg").innerHTML=`<span class="bad">${esc(error.message)}</span>`;return}
  $("replyMsg").innerHTML=`<span class="ok">已回覆 ${result.updated} 筆，99 已自動 +3 天 / Đã trả lời ${result.updated} dòng</span>`;
  await loadAll();
}
async function downloadCurrent(){
  const data=filtered(), wb=new ExcelJS.Workbook(), ws=wb.addWorksheet("PH3");
  ws.addRow(HEADERS);
  data.forEach(o=>ws.addRow(dbToArray(o)));
  ws.views=[{state:"frozen",ySplit:1}]; ws.autoFilter={from:{row:1,column:1},to:{row:1,column:23}};
  ws.getRow(1).eachCell((c,i)=>{c.font={bold:true,color:{argb:"FFFFFFFF"}};c.fill={type:"pattern",pattern:"solid",fgColor:{argb:i>=18?"FFBF9000":"FF548235"}};c.alignment={wrapText:true,horizontal:"center"}});
  [6,17,18,19,20,21,22,23].forEach(i=>ws.getColumn(i).numFmt="yyyy/m/d");
  ws.getColumns().forEach((c,i)=>c.width=[7,10,11,14,8,13,14,9,8,14,8,12,11,28,22,25,16,17,17,17,17,17,17][i]||15);
  const buf=await wb.xlsx.writeBuffer(), blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="PH3目前篩選資料.xlsx";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

$("loginBtn").onclick=login;$("logoutBtn").onclick=logout;$("refreshBtn").onclick=loadAll;$("importBtn").onclick=importFiles;$("bulkReplyBtn").onclick=bulkReply;$("downloadBtn").onclick=downloadCurrent;
["fCustomer","fOrder","fItem"].forEach(id=>$(id).addEventListener("input",render));$("fStatus").addEventListener("change",render);
document.querySelectorAll(".tab").forEach(b=>b.onclick=async()=>{tab=b.dataset.tab;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));if(tab==="history")await loadHistory();else render()});
checkSession();
