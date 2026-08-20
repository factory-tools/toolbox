const $=id=>document.getElementById(id);
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));$(id).classList.add('active');document.querySelectorAll('.actions').forEach(a=>a.classList.remove('show'));if(id==='quantityPage')document.querySelector('.quantity-actions').classList.add('show');window.scrollTo({top:0,behavior:'smooth'});}
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
function unit(){if($('sampleUnit').value==='custom')return $('customUnit').value.trim()||'單位 / đơn vị';return $('sampleUnit').value;}
function reset(){ $('quantityResult').textContent='等待輸入 / Chờ nhập dữ liệu';$('oneWeight').textContent='—';$('netWeight').textContent='—';}
function fmt(n,d=3){return Number(n).toLocaleString('en-US',{maximumFractionDigits:d});}
function calc(show=true){const q=Number($('sampleQty').value),s=Number($('sampleWeight').value),t=Number($('totalWeight').value),b=Number($('bagWeight').value||0),u=unit();if(!q||q<=0||!s||s<=0||!t||t<=0){reset();$('status').className='status warn';$('status').textContent=show?'請輸入完整且正確的資料 / Vui lòng nhập đầy đủ và chính xác':'';return;}const net=t-b;if(net<0){reset();$('status').className='status warn';$('status').textContent='空袋重量不能大於整包重量 / Trọng lượng túi không được lớn hơn tổng trọng lượng';return;}const one=s/q,res=net/one,dec=(u==='PCS'||u==='捲')?0:2;$('quantityResult').textContent=fmt(res,dec)+' '+u;$('oneWeight').textContent=fmt(one,4)+' g / '+u;$('netWeight').textContent=fmt(net,3)+' g';$('status').className='status ok';$('status').textContent='計算完成 / Đã tính xong';}
function clearAll(){$('sampleQty').value='5';$('sampleUnit').value='PCS';$('customUnit').value='';$('customUnitBox').classList.add('hidden');$('sampleWeight').value='';$('totalWeight').value='';$('bagWeight').value='0';reset();$('status').textContent='';}
$('sampleUnit').addEventListener('change',()=>{$('customUnitBox').classList.toggle('hidden',$('sampleUnit').value!=='custom');calc(false);});$('calcBtn').addEventListener('click',()=>calc(true));$('clearBtn').addEventListener('click',clearAll);['sampleQty','sampleWeight','totalWeight','bagWeight','customUnit'].forEach(id=>$(id).addEventListener('input',()=>calc(false)));

const unitAliases={Y:'Y',碼:'Y',YARD:'Y',M:'M',米:'M',MET:'M',MÉT:'M',PC:'PC',PCS:'PC',個:'PC','雙':'PAIR','对':'PAIR','對':'PAIR','ĐÔI':'PAIR','DOI':'PAIR','PAIR':'PAIR'};
const methodAliases={'手印':'HAND','IN TAY':'HAND','HAND':'HAND','K3':'K3'};
const sideAliases={'單面':'SINGLE','单面':'SINGLE','MỘT MẶT':'SINGLE','MOT MAT':'SINGLE','MOT':'SINGLE','MỘT':'SINGLE','1':'SINGLE','SINGLE':'SINGLE','雙面':'DOUBLE','双面':'DOUBLE','HAI MẶT':'DOUBLE','HAI MAT':'DOUBLE','HAI':'DOUBLE','2':'DOUBLE','DOUBLE':'DOUBLE'};
function normUnit(v){return unitAliases[String(v||'').trim().toUpperCase()]||String(v||'').trim().toUpperCase();}
function normMethod(v){return methodAliases[String(v||'').trim().toUpperCase()]||String(v||'').trim().toUpperCase();}
function normSide(v){const t=String(v||'').trim().toUpperCase();return sideAliases[t]||'SINGLE';}
function capacityFor(width,method){const bw=$('baseWidth'),bh=$('baseHandCapacity'),bk=$('baseK3Capacity');const baseWidth=Number(bw?bw.value:25)||25;const base=method==='K3'?(Number(bk?bk.value:450)||0):(Number(bh?bh.value:400)||0);return width>0&&base>0?base*baseWidth/width:0;}
function convertToYards(q,u,length){if(!(q>0))return NaN;if(u==='Y')return q;if(u==='M')return q/0.9144;if(u==='PC')return length>0?q*length/914.4:NaN;if(u==='PAIR')return length>0?q*2*length/914.4:NaN;return NaN;}
function makeSelect(options,value,cls){const s=document.createElement('select');s.className=cls;options.forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;if(v===value)o.selected=true;s.appendChild(o);});return s;}
function addOrder(data={qty:'',unit:'PC',width:25,length:'',method:'HAND',side:'SINGLE'}){const body=$('orderBody'),tr=document.createElement('tr');tr.innerHTML=`<td class="row-no"></td><td><input class="o-qty" type="number" min="0" step="any" value="${data.qty??''}"></td><td class="unit-cell"></td><td><input class="o-width" type="number" min="0" step="any" value="${data.width??''}"></td><td><input class="o-length" type="number" min="0" step="any" value="${data.length??''}"></td><td class="method-cell"></td><td class="side-cell"></td><td class="out yards">—</td><td class="out capacity metric-yard-cell">—</td><td class="out pcs-table metric-pc-cell">—</td><td class="out pairs-table metric-pair-cell">—</td><td class="out exact">—</td><td class="out planned">—</td><td class="out hours">—</td><td><button class="icon-btn delete-order" title="刪除 / Xóa">×</button></td>`;tr.querySelector('.unit-cell').appendChild(makeSelect([['Y','Y / yard'],['M','M / mét'],['PC','PC'],['PAIR','雙 / đôi']],data.unit,'o-unit'));tr.querySelector('.method-cell').appendChild(makeSelect([['HAND','手印 / In tay'],['K3','K3']],data.method,'o-method'));tr.querySelector('.side-cell').appendChild(makeSelect([['SINGLE','單面 / Một mặt'],['DOUBLE','雙面 / Hai mặt']],data.side||'SINGLE','o-side'));body.appendChild(tr);tr.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',()=>recalcRow(tr)));tr.querySelector('.delete-order').addEventListener('click',()=>{tr.remove();renumber();recalcSummary();});renumber();recalcRow(tr);}
function recalcRow(tr){const q=Number(tr.querySelector('.o-qty').value),u=tr.querySelector('.o-unit').value,w=Number(tr.querySelector('.o-width').value),l=Number(tr.querySelector('.o-length').value),m=tr.querySelector('.o-method').value,side=tr.querySelector('.o-side').value,sideFactor=side==='DOUBLE'?2:1,baseYards=convertToYards(q,u,l),y=Number.isFinite(baseYards)?baseYards*sideFactor:NaN,cap=capacityFor(w,m),pcsPerTable=l>0?cap*914.4/l/sideFactor:NaN,pairsPerTable=Number.isFinite(pcsPerTable)?pcsPerTable/2:NaN;tr.classList.remove('row-error');delete tr.dataset.yards;delete tr.dataset.exact;delete tr.dataset.tables;delete tr.dataset.hours;if(!Number.isFinite(y)||!(cap>0)){tr.querySelector('.yards').textContent=Number.isFinite(y)?fmt(y,2)+' Y':'—';tr.querySelector('.capacity').textContent=cap>0?fmt(cap,2)+' Y':'—';tr.querySelector('.pcs-table').textContent=Number.isFinite(pcsPerTable)?fmt(pcsPerTable,0)+' PC':'需長度 / Cần dài';tr.querySelector('.pairs-table').textContent=Number.isFinite(pairsPerTable)?fmt(pairsPerTable,0)+' 雙':'需長度 / Cần dài';tr.querySelector('.exact').textContent='—';tr.querySelector('.planned').textContent='—';tr.querySelector('.hours').textContent='—';if(q>0)tr.classList.add('row-error');}else{const exact=y/cap,planned=Math.ceil(exact),hours=planned*(Number($('hoursPerTable').value)||0);tr.querySelector('.yards').textContent=fmt(y,2)+' Y';tr.querySelector('.capacity').textContent=fmt(cap,2)+' Y';tr.querySelector('.pcs-table').textContent=Number.isFinite(pcsPerTable)?fmt(pcsPerTable,0)+' PC':'需長度 / Cần dài';tr.querySelector('.pairs-table').textContent=Number.isFinite(pairsPerTable)?fmt(pairsPerTable,0)+' 雙':'需長度 / Cần dài';tr.querySelector('.exact').textContent=fmt(exact,3);tr.querySelector('.planned').textContent=fmt(planned,0);tr.querySelector('.hours').textContent=fmt(hours,1)+' h';tr.dataset.yards=y;tr.dataset.exact=exact;tr.dataset.tables=planned;tr.dataset.hours=hours;}recalcSummary();}
function renumber(){[...$('orderBody').rows].forEach((r,i)=>r.querySelector('.row-no').textContent=i+1);}
function recalcAll(){[...$('orderBody').rows].forEach(recalcRow);}
function recalcSummary(){const rows=[...$('orderBody').rows],valid=rows.filter(r=>r.dataset.yards&&!r.classList.contains('row-error'));const sy=valid.reduce((a,r)=>a+Number(r.dataset.yards||0),0),se=valid.reduce((a,r)=>a+Number(r.dataset.exact||0),0),st=valid.reduce((a,r)=>a+Number(r.dataset.tables||0),0),sh=valid.reduce((a,r)=>a+Number(r.dataset.hours||0),0);$('sumOrders').textContent=rows.length;$('sumYards').textContent=fmt(sy,2)+' Y';$('sumExactTables').textContent=fmt(se,3);$('sumTables').textContent=fmt(st,0);$('sumHours').textContent=fmt(sh,1)+' 小時 / giờ';const errors=rows.filter(r=>r.classList.contains('row-error')).length;$('printingStatus').className='status '+(errors?'warn':'ok');$('printingStatus').textContent=errors?`${errors} 筆資料缺少必要資料 / ${errors} dòng thiếu dữ liệu cần thiết`:(rows.length?'計算完成；不同寬度依 25 mm 基準比例推估 / Đã tính; khổ khác được ước tính theo chuẩn 25 mm':'');}
function splitExcelLine(line){
  const raw=String(line||'').replace(/\u00a0/g,' ').trim();
  if(!raw)return [];
  // Excel copies columns with TAB. This is the preferred and most reliable path.
  if(raw.includes('\t'))return raw.split('\t').map(v=>v.trim());
  if(raw.includes(';'))return raw.split(';').map(v=>v.trim());
  // Also accept comma-separated rows. Do not treat comma thousands separators as columns.
  if(raw.includes(',') && !/^\s*\d{1,3}(,\d{3})+(?:\.\d+)?\s+/.test(raw)){
    const out=[];let cur='',quoted=false;
    for(let i=0;i<raw.length;i++){
      const c=raw[i];
      if(c==='"' && raw[i+1]==='"'){cur+='"';i++;continue;}
      if(c==='"'){quoted=!quoted;continue;}
      if(c===','&&!quoted){out.push(cur.trim());cur='';continue;}
      cur+=c;
    }
    out.push(cur.trim());
    return out;
  }
  const parts=raw.split(/\s+/).filter(Boolean);
  // Allow manually typed rows where method "IN TAY" contains a space.
  // First four fields are fixed: quantity, unit, width, length.
  if(parts.length>=5){
    const first=parts.slice(0,4);
    const tail=parts.slice(4);
    const upper=tail.map(v=>v.toUpperCase());
    let side='';
    if(upper.length && ['MOT','MỘT','HAI','SINGLE','DOUBLE','單面','雙面','单面','双面','1','2'].includes(upper[upper.length-1])) side=tail.pop();
    else if(upper.length>=2){
      const last2=upper.slice(-2).join(' ');
      if(['MOT MAT','MỘT MẶT','HAI MAT','HAI MẶT'].includes(last2)) side=tail.splice(-2).join(' ');
    }
    let method=tail.join(' ');
    if(!method) method='HAND';
    return [...first,method,side||'SINGLE'];
  }
  return parts;
}
function cleanNumber(v){
  let t=String(v??'').trim().replace(/\s/g,'').replace(/，/g,',');
  if(!t)return NaN;
  if(/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t))t=t.replace(/,/g,'');
  else if(/^\d+,\d+$/.test(t))t=t.replace(',','.');
  return Number(t);
}
function isHeaderRow(cols){
  const t=cols.join(' ').toUpperCase();
  return /訂單|數量|SL\s*ĐƠN|ORDER|寬度|KHỔ|LENGTH|長度|印刷方式|PHƯƠNG\s*PHÁP|ĐƠN\s*VỊ/.test(t);
}
function parseBatch(){
  const box=$('batchPaste');
  const text=String(box?box.value:'').replace(/\u00a0/g,' ').trim();
  if(!text){$('printingStatus').className='status warn';$('printingStatus').textContent='請先從 Excel 複製資料並貼到黃色區域 / Vui lòng sao chép dữ liệu Excel và dán vào ô màu vàng';return;}
  const parsed=[];const bad=[];
  text.split(/\r?\n/).forEach((line,idx)=>{
    if(!line.trim())return;
    const cols=splitExcelLine(line);
    if(isHeaderRow(cols))return;
    if(cols.length<3){bad.push(idx+1);return;}
    const qty=cleanNumber(cols[0]);
    const unit=normUnit(cols[1]);
    const width=cleanNumber(cols[2]);
    const length=cleanNumber(cols[3]);
    const method=normMethod(cols[4]||'HAND');
    const side=normSide(cols[5]||'SINGLE');
    if(!(qty>0)||!(width>0)||!['Y','M','PC','PAIR'].includes(unit)){bad.push(idx+1);return;}
    const needLength=unit==='PC'||unit==='PAIR';
    if(needLength && !(length>0)){bad.push(idx+1);return;}
    parsed.push({qty,unit,width,length:length>0?length:'',method:method==='K3'?'K3':'HAND',side});
  });
  if(!parsed.length){$('printingStatus').className='status warn';$('printingStatus').textContent='無法匯入。請依序貼上：訂單量、單位、寬度mm、長度mm、印刷方式、單／雙面 / Không thể nhập. Thứ tự: SL, đơn vị, khổ mm, dài mm, phương pháp, một/hai mặt';return;}
  $('orderBody').innerHTML='';
  parsed.forEach(row=>addOrder(row));
  renumber();recalcAll();
  $('printingStatus').className='status '+(bad.length?'warn':'ok');
  $('printingStatus').textContent=bad.length?`已匯入 ${parsed.length} 筆；第 ${bad.join('、')} 行格式不完整 / Đã nhập ${parsed.length} dòng; dòng ${bad.join(', ')} chưa đúng`:`已成功匯入 ${parsed.length} 筆訂單 / Đã nhập thành công ${parsed.length} đơn hàng`;
}

function xmlEscape(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
function xlsxCell(value,type='s',style=0){
  if(type==='n' && Number.isFinite(Number(value))) return `<c s="${style}" t="n"><v>${Number(value)}</v></c>`;
  return `<c s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}
function xlsxRow(values,types=[],styles=[]){return `<row>${values.map((v,i)=>xlsxCell(v,types[i]||'s',styles[i]||0)).join('')}</row>`;}
function crc32(bytes){
  if(!crc32.table){const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}crc32.table=t;}
  let c=0xFFFFFFFF;for(let i=0;i<bytes.length;i++)c=crc32.table[(c^bytes[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;
}
function u16(n){return [n&255,(n>>>8)&255];}
function u32(n){return [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];}
function zipStore(fileMap){
  const enc=new TextEncoder(), locals=[], centrals=[];let offset=0;
  Object.entries(fileMap).forEach(([name,content])=>{
    const nb=enc.encode(name),db=typeof content==='string'?enc.encode(content):content,crc=crc32(db);
    const local=new Uint8Array([80,75,3,4,20,0,0,8,0,0,0,0,0,0,...u32(crc),...u32(db.length),...u32(db.length),...u16(nb.length),0,0,...nb,...db]);
    locals.push(local);
    const central=new Uint8Array([80,75,1,2,20,0,20,0,0,8,0,0,0,0,0,0,...u32(crc),...u32(db.length),...u32(db.length),...u16(nb.length),0,0,0,0,0,0,0,0,0,0,0,0,...u32(offset),...nb]);
    centrals.push(central);offset+=local.length;
  });
  const csize=centrals.reduce((a,b)=>a+b.length,0),count=centrals.length;
  const end=new Uint8Array([80,75,5,6,0,0,0,0,...u16(count),...u16(count),...u32(csize),...u32(offset),0,0]);
  const total=offset+csize+end.length,out=new Uint8Array(total);let p=0;[...locals,...centrals,end].forEach(a=>{out.set(a,p);p+=a.length;});return out;
}
function saveBlob(blob,filename){
  if(window.navigator && window.navigator.msSaveOrOpenBlob){window.navigator.msSaveOrOpenBlob(blob,filename);return;}
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},1500);
}
function csvCell(value){
  const text=String(value??'');
  return '"'+text.replace(/"/g,'""')+'"';
}
function exportExcel(){
  try{
    const rows=[...$('orderBody').rows];
    const valid=rows.filter(r=>r.dataset.yards&&!r.classList.contains('row-error'));
    if(!valid.length){
      $('printingStatus').className='status warn';
      $('printingStatus').textContent='目前沒有可下載的完整資料 / Hiện không có dữ liệu đầy đủ để tải';
      return;
    }
    const headers=['項次 STT','訂單量 SL đơn hàng','單位 Đơn vị','寬度 mm Khổ mm','長度 mm Dài mm','印刷方式 Phương pháp','單／雙面 Một／hai mặt','換算碼數 Y Số yard','每桌碼數 Y Y mỗi bàn','每桌約可印 PC PC mỗi bàn','每桌約可印雙 Đôi mỗi bàn','實際桌數 Số bàn thực tế','排程桌數 Số bàn kế hoạch','所需工時 Giờ cần'];
    const num=t=>Number(String(t).replace(/,/g,'').replace(/[^0-9.\-]/g,''))||0;
    const data=valid.map((tr,i)=>{
      const unitLabel={Y:'Y / yard',M:'M / mét',PC:'PC',PAIR:'雙 / đôi'}[tr.querySelector('.o-unit').value]||tr.querySelector('.o-unit').value;
      const methodLabel=tr.querySelector('.o-method').value==='K3'?'K3':'手印 / In tay';
      const sideLabel=tr.querySelector('.o-side').value==='DOUBLE'?'雙面 / Hai mặt':'單面 / Một mặt';
      return [i+1,Number(tr.querySelector('.o-qty').value)||0,unitLabel,Number(tr.querySelector('.o-width').value)||0,Number(tr.querySelector('.o-length').value)||0,methodLabel,sideLabel,Number(tr.dataset.yards)||0,num(tr.querySelector('.capacity').textContent),num(tr.querySelector('.pcs-table').textContent),num(tr.querySelector('.pairs-table').textContent),Number(tr.dataset.exact)||0,Number(tr.dataset.tables)||0,Number(tr.dataset.hours)||0];
    });
    const sumY=data.reduce((a,r)=>a+r[7],0),sumExact=data.reduce((a,r)=>a+r[11],0),sumPlan=data.reduce((a,r)=>a+r[12],0),sumHours=data.reduce((a,r)=>a+r[13],0);
    data.push(['合計 / Tổng',data.length,'','','','','',sumY,'','','',sumExact,sumPlan,sumHours]);
    const csv=[headers,...data].map(row=>row.map(csvCell).join(',')).join('\r\n');
    const blob=new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8;'});
    const now=new Date(),pad=n=>String(n).padStart(2,'0');
    saveBlob(blob,`批量印刷桌數試算_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.csv`);
    $('printingStatus').className='status ok';
    $('printingStatus').textContent='資料已下載，可直接用 Excel 開啟 / Đã tải dữ liệu, có thể mở trực tiếp bằng Excel';
  }catch(err){
    console.error(err);
    $('printingStatus').className='status warn';
    $('printingStatus').textContent='下載失敗，請重新整理後再試 / Tải xuống thất bại, vui lòng tải lại trang';
  }
}

$('addOrderBtn').addEventListener('click',()=>addOrder());$('downloadExcelBtn').addEventListener('click',exportExcel);$('pasteToTableBtn').addEventListener('click',parseBatch);$('clearOrdersBtn').addEventListener('click',()=>{$('orderBody').innerHTML='';recalcSummary();});['hoursPerTable','setupHours','printHours','baseWidth','baseHandCapacity','baseK3Capacity'].forEach(id=>{const el=$(id);if(el)el.addEventListener('input',()=>{if(id==='setupHours'||id==='printHours')$('hoursPerTable').value=(Number($('setupHours').value)||0)+(Number($('printHours').value)||0);recalcAll();});});
addOrder({qty:'',unit:'PC',width:25,length:'',method:'HAND',side:'SINGLE'});


// 實際每桌產量換算 / Quy đổi sản lượng thực tế mỗi bàn
function defaultActualTableLength(method){return method==='K3'?32:25;}
function updateActualLengthByMethod(){
  const m=$('actualMethod').value;
  $('actualTableLength').value=defaultActualTableLength(m);
  $('actualLengthHint').textContent=m==='K3'?'K3 預設 32Y，可直接修改 / K3 mặc định 32Y, có thể sửa':'手印預設 25Y，可直接修改 / In tay mặc định 25Y, có thể sửa';
  calcActualTable();
}
function calcActualTable(){
  if(!$('actualPcPerTable'))return;
  const qty=Number($('actualOrderQty').value), pcLen=Number($('actualPcLength').value), strips=Number($('actualStrips').value), tableY=Number($('actualTableLength').value);
  if(!(pcLen>0)&&!(strips>0)&&!(tableY>0)){return;}
  if(!(pcLen>0)||!(strips>0)||!(tableY>0)){
    $('actualPcPerStrip').textContent='—';$('actualPcPerTable').textContent='—';$('actualYPerTable').textContent='—';$('actualTablesNeeded').textContent='—';return;
  }
  const pcsEachStrip=Math.floor(tableY*914.4/pcLen);
  const pcsPerTable=pcsEachStrip*strips;
  const totalTableY=tableY*strips;
  $('actualPcPerStrip').textContent=fmt(pcsEachStrip,0)+' PC';
  $('actualPcPerTable').textContent=fmt(pcsPerTable,0)+' PC';
  $('actualYPerTable').textContent=fmt(totalTableY,2)+' Y';
  $('actualTablesNeeded').textContent=qty>0?fmt(Math.ceil(qty/pcsPerTable),0)+' 桌 / bàn':'—';
  const width=fmt(Number($('actualWidth').value)||0,2);
  if($('actualCalcNoteZh')) $('actualCalcNoteZh').textContent=`驗算：每條 ${fmt(pcsEachStrip,0)} PC × ${fmt(strips,0)} 條 = 每桌 ${fmt(pcsPerTable,0)} PC；帶寬 ${width} mm 僅供辨識。`;
  if($('actualCalcNoteVi')) $('actualCalcNoteVi').textContent=`Kiểm tra: ${fmt(pcsEachStrip,0)} PC mỗi sợi × ${fmt(strips,0)} sợi = ${fmt(pcsPerTable,0)} PC mỗi bàn; khổ dây ${width} mm chỉ dùng để nhận biết.`;
}
if($('actualMethod')){
  $('actualMethod').addEventListener('change',updateActualLengthByMethod);
  ['actualOrderQty','actualWidth','actualPcLength','actualStrips','actualTableLength'].forEach(id=>$(id).addEventListener('input',calcActualTable));
  calcActualTable();
}

// 機印實際產能試算 / Tính năng suất thực tế máy in
let machineMode='PC';
let machineStroke=1;
const MACHINE_STROKE_SECONDS={1:5,2:12,3:17};
function machineTimeText(hours, hoursPerDay){
  if(!(hours>=0) || !Number.isFinite(hours)) return '—';
  const totalMin=Math.round(hours*60);
  const h=Math.floor(totalMin/60), m=totalMin%60;
  const simple=`約 ${h} 小時 ${m} 分鐘 / Khoảng ${h} giờ ${m} phút`;
  if(!(hoursPerDay>0) || hours<=hoursPerDay) return simple;
  const days=Math.floor(hours/hoursPerDay);
  const remainHours=hours-days*hoursPerDay;
  const remainMin=Math.round(remainHours*60);
  const rh=Math.floor(remainMin/60), rm=remainMin%60;
  return `約 ${days} 工作日 ${rh} 小時 ${rm} 分鐘 / Khoảng ${days} ngày làm việc ${rh} giờ ${rm} phút`;
}
function estimatedPullSeconds(lengthSetting,speedSetting){
  if(!(lengthSetting>0) || !(speedSetting>0)) return 0;
  return Math.max(0,0.2780031561*(lengthSetting/speedSetting)+0.1900992076);
}
function setMachineMode(mode){
  machineMode=mode;
  if(!$('machineModePc'))return;
  $('machineModePc').classList.toggle('active',mode==='PC');
  $('machineModeY').classList.toggle('active',mode==='Y');
  $('machinePcPatternField').classList.toggle('hidden',mode!=='PC');
  $('machineYLengthField').classList.toggle('hidden',mode!=='Y');
  $('machinePcGuide').classList.toggle('hidden',mode!=='PC');
  if($('machineOrderLabelZh')) $('machineOrderLabelZh').textContent=`訂單數量（${mode}）`;
  if($('machineOrderLabelVi')) $('machineOrderLabelVi').textContent=`Số lượng đơn hàng（${mode}）`;
  calcMachinePrint();
}
function setMachineStroke(stroke){
  machineStroke=stroke;
  document.querySelectorAll('.machine-stroke-btn').forEach(btn=>btn.classList.toggle('active',Number(btn.dataset.stroke)===stroke));
  calcMachinePrint();
}
function calcMachinePrint(){
  if(!$('machinePerHour'))return;
  const order=Number($('machineOrderQty').value);
  const strips=Number($('machineStrips').value);
  const pullLength=Number($('machinePullLength').value);
  const pullSpeed=Number($('machinePullSpeed').value);
  const hpd=Number($('machineHoursPerDay').value);
  const pullSec=estimatedPullSeconds(pullLength,pullSpeed);
  const printSec=MACHINE_STROKE_SECONDS[machineStroke]||0;
  const cycleSec=pullSec+printSec;
  const fph=cycleSec>0?3600/cycleSec:0;
  let perFrame=0, perHour=0, unit=machineMode;
  if(machineMode==='PC'){
    const patterns=Number($('machinePatternsPerRow').value);
    if(patterns>0&&strips>0){perFrame=patterns*strips;perHour=perFrame*fph;}
    $('machineFormulaNote').textContent=patterns>0&&strips>0&&fph>0?`${fmt(patterns,0)} 圖案/hình × ${fmt(strips,0)} 條/dây = ${fmt(perFrame,0)} PC/框；${fmt(fph,0)} 框/小時 → ${fmt(perHour,0)} PC/H`:'請輸入網框與機台參數 / Vui lòng nhập thông số khung và máy';
  }else{
    const mm=Number($('machineFrameLength').value);
    if(mm>0&&strips>0){perFrame=mm*strips/914.4;perHour=perFrame*fph;}
    $('machineFormulaNote').textContent=mm>0&&strips>0&&fph>0?`${fmt(mm,0)} MM × ${fmt(strips,0)} 條/dây ÷ 914.4 = ${fmt(perFrame,2)} Y/框；${fmt(fph,0)} 框/小時 → ${fmt(perHour,2)} Y/H`:'請輸入網框與機台參數 / Vui lòng nhập thông số khung và máy';
  }
  $('machinePullTime').textContent=pullSec>0?`${fmt(pullSec,2)} 秒 / giây`:'—';
  $('machinePrintTime').textContent=printSec>0?`${fmt(printSec,0)} 秒 / giây`:'—';
  $('machineCycleTime').textContent=cycleSec>0?`${fmt(cycleSec,2)} 秒 / giây`:'—';
  $('machineFramesHour').textContent=fph>0?`${fmt(fph,0)} 框/H`:'—';
  $('machinePerFrame').textContent=perFrame>0?fmt(perFrame,machineMode==='PC'?0:2)+' '+unit:'—';
  $('machinePerHour').textContent=perHour>0?fmt(perHour,machineMode==='PC'?0:2)+' '+unit+'/H':'—';
  $('machinePerHourHint').textContent=strips>0?`${fmt(strips,0)}條合計 / Tổng ${fmt(strips,0)} dây`:'整機合計 / Tổng máy';
  const perDay=perHour*(hpd>0?hpd:0);
  $('machinePerDay').textContent=perDay>0?fmt(perDay,machineMode==='PC'?0:2)+' '+unit:'—';
  $('machineOrderTime').textContent=(order>0&&perHour>0)?machineTimeText(order/perHour,hpd):'—';
}
if($('machineModePc')){
  $('machineModePc').addEventListener('click',()=>setMachineMode('PC'));
  $('machineModeY').addEventListener('click',()=>setMachineMode('Y'));
  document.querySelectorAll('.machine-stroke-btn').forEach(btn=>btn.addEventListener('click',()=>setMachineStroke(Number(btn.dataset.stroke))));
  ['machineOrderQty','machinePatternsPerRow','machineFrameLength','machineStrips','machinePullLength','machinePullSpeed','machineHoursPerDay'].forEach(id=>$(id).addEventListener('input',calcMachinePrint));
  setMachineStroke(1);
  setMachineMode('PC');
}
