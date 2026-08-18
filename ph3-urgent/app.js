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
function excelDate(v){if(!v)return null;if(v instanceof Date)return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,"0")}-${String(v.getDate()).padStart(2,"0")}`;if(typeof v==="number"){const p=XLSX.SSF.parse_date_code(v);return p?`${p.y}-${String(p.m).padStart(2,"0")}-${String(p.d).padStart(2,"0")}`:null}const s=String(v).trim();const m=s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);if(m)return `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;const d=new Date(v);return isNaN(d)?null:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
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
function filtered(){
  const c=$("fCustomer").value.trim().toLowerCase(),
        d=$("fOrder").value.trim().toLowerCase(),
        g=$("fItem").value.trim().toLowerCase(),
        st=$("fStatus").value,
        prevDate=$("fPrevDate").value;
  return rows.filter(o=>{
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
}
async function loadAll(){
  const {data,error}=await sb.from("ph3_orders").select("*").order("updated_at",{ascending:false}).limit(50000);
  if(error)throw error; rows=data||[];
  $("sAll").textContent=rows.length;
  $("sNeed").textContent=rows.filter(x=>x.needs_reply).length;
  $("sHad").textContent=rows.filter(x=>x.ever_replied).length;
  $("sChanged").textContent=rows.filter(x=>(x.changed_fields||[]).length).length;
  refreshPrevDateOptions();
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
      if(i===21 && (days>7 || ph3BeforeUpstream(o)))cls+=" warncell";
      if(i===22 && (late99 || warehouseBeforePh3(o)))cls+=" warncell";
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
    if(ph3BeforeUpstream(o))status+=' <span class="badge b-red">PH3早於前站 / PH3 sớm hơn công đoạn trước</span>';
    if(warehouseBeforePh3(o))status+=' <span class="badge b-red">99早於PH3 / 99 sớm hơn PH3</span>';
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
      const buf=await f.arrayBuffer(), wb=XLSX.read(buf,{type:"array",cellDates:false}), ws=wb.Sheets[wb.SheetNames[0]];
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

  let ph3=String(o.ph3_date||"").slice(0,10);
  let w99=String(o.warehouse99_date||"").slice(0,10);

  if(col===21){
    ph3=e.target.value;
    const prev=latestUpstream(o);
    if(ph3 && prev.date && ph3 < prev.date){
      $("replyMsg").innerHTML=`<span class="bad">PH3完工日不能早於前工段日期 ${esc(fmt(prev.date))} / Ngày PH3 không được sớm hơn công đoạn trước</span>`;
      await loadAll(); return;
    }
    // V changed on web => W defaults to V+3
    w99=ph3?calendarAdd(ph3,3):"";
  }else{
    w99=e.target.value;
    if(w99 && ph3 && w99 < ph3){
      $("replyMsg").innerHTML='<span class="bad">99入庫日不能早於PH3完工日 / Ngày 99 không được sớm hơn ngày PH3</span>';
      await loadAll(); return;
    }
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
    if(!data.length){
      $("replyMsg").innerHTML='<span class="warn">目前沒有可下載資料 / Không có dữ liệu để tải</span>';
      return;
    }

    const wb=new ExcelJS.Workbook();
    const ws=wb.addWorksheet("PH3回覆");

    // EXACTLY same order as web:
    // A-W original + X previous stage + Y PH3 days + Z last PH3 reply + AA status
    const excelHeaders=[
      ...HEADERS,
      "前工段 / Công đoạn trước",
      "PH3工段天數 / Số ngày PH3",
      "上次PH3回覆 / PH3 lần trước",
      "狀態 / Trạng thái"
    ];
    ws.addRow(excelHeaders);

    function excelDateObj(s){
      if(!s)return "";
      const p=parseYMD(String(s).slice(0,10));
      return p ? new Date(p.getUTCFullYear(),p.getUTCMonth(),p.getUTCDate(),12,0,0) : s;
    }

    data.forEach(o=>{
      const arr=dbToArray(o);
      const rowVals=arr.map((v,i)=>{
        if([5,16,17,18,19,20,21,22].includes(i) && v) return excelDateObj(v);
        return v??"";
      });
      const r=ws.addRow(rowVals);
      const rn=r.number;

      // X: same content style as web, formula reacts if R-U are modified in Excel.
      r.getCell(24).value={formula:
        `IF(U${rn}<>"","束頭/96 "&TEXT(U${rn},"yyyy/mm/dd"),`+
        `IF(T${rn}<>"","上漿/95 "&TEXT(T${rn},"yyyy/mm/dd"),`+
        `IF(S${rn}<>"","染色/94 "&TEXT(S${rn},"yyyy/mm/dd"),`+
        `IF(R${rn}<>"","織造/93 "&TEXT(R${rn},"yyyy/mm/dd"),"—"))))`
      };

      // Y: workdays from latest upstream to V, excluding Sunday.
      r.getCell(25).value={formula:
        `IF(V${rn}="","",IF(MAX(R${rn}:U${rn})=0,"",`+
        `IF(V${rn}<MAX(R${rn}:U${rn}),-1,NETWORKDAYS.INTL(MAX(R${rn}:U${rn})+1,V${rn},11))))`
      };

      // Z: previous PH3 reply - snapshot from DB, same as web.
      r.getCell(26).value=latestPrev(o);

      // AA: same status rules as web and reacts to V/W edits.
      r.getCell(27).value={formula:
        `IF(V${rn}="","待回覆 / Chờ trả lời",`+
        `IF(MAX(R${rn}:U${rn})>0,IF(V${rn}<MAX(R${rn}:U${rn}),"PH3早於前站 / PH3 sớm hơn công đoạn trước；",""),"")&`+
        `IF(AND(Y${rn}<>"",Y${rn}>7),"PH3超7天 / PH3 >7 ngày；","")&`+
        `IF(AND(W${rn}<>"",V${rn}<>"",W${rn}<V${rn}),"99早於PH3 / 99 sớm hơn PH3；","")&`+
        `IF(AND(W${rn}<>"",Q${rn}<>"",W${rn}>Q${rn}),"99晚於客需 / 99 trễ hơn KH；","")&`+
        `"已回覆 / Đã trả lời")`
      };

      // Keep DB-detected changed fields red (Q + R-U)
      const changes=new Set(o.changed_fields||[]);
      [16,17,18,19,20].forEach(i=>{
        if(changes.has(COLNAMES[i])){
          r.getCell(i+1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFB3B3"}};
          r.getCell(i+1).font={color:{argb:"FF7F0000"},bold:true};
        }
      });
    });

    ws.views=[{state:"frozen",ySplit:1}];
    ws.autoFilter={from:{row:1,column:1},to:{row:ws.rowCount,column:27}};

    // Header style: same green/yellow grouping as web
    ws.getRow(1).height=42;
    ws.getRow(1).eachCell((c,i)=>{
      c.font={bold:true,color:{argb:"FFFFFFFF"},size:10};
      c.alignment={vertical:"middle",horizontal:"center",wrapText:true};
      c.fill={type:"pattern",pattern:"solid",fgColor:{argb:(i>=18&&i<=23)?"FFBF9000":"FF548235"}};
    });

    const widths=[7,10,11,14,8,13,14,9,8,14,8,12,11,28,22,25,16,17,17,17,17,17,17,24,16,24,34];
    widths.forEach((w,i)=>ws.getColumn(i+1).width=w);

    for(let r=2;r<=ws.rowCount;r++){
      [6,17,18,19,20,21,22,23].forEach(c=>ws.getCell(r,c).numFmt="yyyy/m/d");
      ws.getCell(r,12).numFmt="#,##0";
      ws.getRow(r).height=22;

      // Excel validation: V cannot be earlier than latest previous stage.
      ws.getCell(r,22).dataValidation={
        type:"custom",
        allowBlank:true,
        formulae:[`OR(V${r}="",MAX(R${r}:U${r})=0,V${r}>=MAX(R${r}:U${r}))`],
        showErrorMessage:true,
        errorStyle:"stop",
        errorTitle:"PH3日期錯誤 / Lỗi ngày PH3",
        error:"PH3完工日不能早於前工段日期 / Ngày PH3 không được sớm hơn công đoạn trước"
      };

      // Excel validation: W cannot be earlier than V.
      ws.getCell(r,23).dataValidation={
        type:"custom",
        allowBlank:true,
        formulae:[`OR(W${r}="",V${r}="",W${r}>=V${r})`],
        showErrorMessage:true,
        errorStyle:"stop",
        errorTitle:"99日期錯誤 / Lỗi ngày 99",
        error:"99入庫日不能早於PH3完工日 / Ngày 99 không được sớm hơn ngày PH3"
      };
    }

    const last=ws.rowCount;
    if(last>=2){
      // V < previous stage => red
      ws.addConditionalFormatting({
        ref:`V2:V${last}`,
        rules:[{type:"expression",formulae:[`AND(V2<>"",MAX(R2:U2)>0,V2<MAX(R2:U2))`],
          style:{fill:{type:"pattern",pattern:"solid",bgColor:{argb:"FFFFB3B3"},fgColor:{argb:"FFFFB3B3"}},font:{color:{argb:"FF7F0000"},bold:true}}}]
      });
      // V > 7 workdays => red warning
      ws.addConditionalFormatting({
        ref:`V2:V${last}`,
        rules:[{type:"expression",formulae:[`AND(V2<>"",MAX(R2:U2)>0,V2>=MAX(R2:U2),NETWORKDAYS.INTL(MAX(R2:U2)+1,V2,11)>7)`],
          style:{fill:{type:"pattern",pattern:"solid",bgColor:{argb:"FFFFB3B3"},fgColor:{argb:"FFFFB3B3"}},font:{color:{argb:"FF7F0000"},bold:true}}}]
      });
      // W < V => red
      ws.addConditionalFormatting({
        ref:`W2:W${last}`,
        rules:[{type:"expression",formulae:[`AND(W2<>"",V2<>"",W2<V2)`],
          style:{fill:{type:"pattern",pattern:"solid",bgColor:{argb:"FFFFB3B3"},fgColor:{argb:"FFFFB3B3"}},font:{color:{argb:"FF7F0000"},bold:true}}}]
      });
      // W > customer requested => red warning, but allowed
      ws.addConditionalFormatting({
        ref:`W2:W${last}`,
        rules:[{type:"expression",formulae:[`AND(W2<>"",Q2<>"",W2>Q2)`],
          style:{fill:{type:"pattern",pattern:"solid",bgColor:{argb:"FFFFB3B3"},fgColor:{argb:"FFFFB3B3"}},font:{color:{argb:"FF7F0000"},bold:true}}}]
      });
    }

    const buf=await wb.xlsx.writeBuffer();
    const blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="PH3目前篩選_可修改回填.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);

    $("replyMsg").innerHTML=`<span class="ok">已下載 ${data.length} 筆，欄位順序與網頁一致，可修改 V/W 後回填 / Đã tải ${data.length} dòng</span>`;
  }catch(err){
    console.error(err);
    $("replyMsg").innerHTML=`<span class="bad">下載失敗 / Tải thất bại：${esc(err.message||err)}</span>`;
  }
}

async function refillExcel(){
  const file=$("refillFile").files[0];
  if(!file)return;

  try{
    $("replyMsg").textContent="回填中… / Đang nhập lại…";

    // IMPORTANT: read Excel dates as raw serial numbers.
    // This avoids timezone shifts such as 9/18 becoming 9/17.
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:"array",cellDates:false});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const a=XLSX.utils.sheet_to_json(ws,{header:1,defval:"",raw:true});

    if(a.length<2 || HEADERS.some((h,i)=>String(a[0][i]??"").trim()!==String(h).trim())){
      throw new Error("Excel格式不符，請使用本系統下載的檔案 / Sai định dạng Excel");
    }

    const payload=[];
    const invalid=[];

    for(const r of a.slice(1)){
      if(!r.some(v=>v!==""&&v!=null))continue;

      const key=[r[2],r[3],r[4]].map(v=>String(v??"").trim()).join("|");
      if(!key || key==="||")continue;

      const ph3=excelDate(r[21]);
      const w99=excelDate(r[22]);

      // Calculate latest previous-stage date from R-U using raw Excel values.
      const prevDates=[17,18,19,20].map(i=>excelDate(r[i])).filter(Boolean).sort();
      const prev=prevDates.length?prevDates[prevDates.length-1]:"";

      if(ph3 && prev && ph3 < prev){
        invalid.push(`${key}: PH3 ${ph3} < 前站 ${prev}`);
        continue;
      }
      if(w99 && ph3 && w99 < ph3){
        invalid.push(`${key}: 99 ${w99} < PH3 ${ph3}`);
        continue;
      }

      payload.push({unique_key:key,ph3_date:ph3,warehouse99_date:w99});
    }

    if(invalid.length){
      throw new Error(
        `有 ${invalid.length} 筆日期不合法，未回填。例：${invalid.slice(0,3).join("；")} / Có ${invalid.length} dòng ngày không hợp lệ`
      );
    }
    if(!payload.length)throw new Error("沒有可回填資料 / Không có dữ liệu");

    const {data,error}=await sb.rpc("ph3_import_replies",{p_rows:payload});
    if(error)throw error;

    $("replyMsg").innerHTML=`<span class="ok">回填完成 ${data.updated} 筆 / Đã nhập lại ${data.updated} dòng</span>`+
      (data.late99?` <span class="warn">；99晚於客需 ${data.late99} 筆 / ${data.late99} dòng 99 trễ hơn KH</span>`:"")+
      (data.over7?` <span class="warn">；PH3超過7天 ${data.over7} 筆 / PH3 >7 ngày: ${data.over7}</span>`:"");

    $("refillFile").value="";
    await loadAll();
  }catch(err){
    console.error(err);
    $("replyMsg").innerHTML=`<span class="bad">回填失敗 / Nhập lại thất bại：${esc(err.message||err)}</span>`;
    $("refillFile").value="";
  }
}

$("loginBtn").onclick=login;$("logoutBtn").onclick=logout;$("refreshBtn").onclick=loadAll;$("importBtn").onclick=importFiles;$("calcReplyBtn").onclick=calcBulkReply;$("downloadBtn").onclick=downloadCurrent;
["fCustomer","fOrder","fItem"].forEach(id=>$(id).addEventListener("input",render));
["fStatus","fPrevDate"].forEach(id=>$(id).addEventListener("change",render));
$("refillFile").addEventListener("change",refillExcel);
document.querySelectorAll(".tab").forEach(b=>b.onclick=async()=>{tab=b.dataset.tab;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));if(tab==="history")await loadHistory();else render()});
checkSession();
