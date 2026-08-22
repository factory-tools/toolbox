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
function defaultActualTableLength(method){return method==='K3'?29:25;}
function updateActualLengthByMethod(){
  const m=$('actualMethod').value;
  $('actualTableLength').value=defaultActualTableLength(m);
  $('actualLengthHint').textContent=m==='K3'?'K3 預設 29Y，可直接修改 / K3 mặc định 29Y, có thể sửa':'手印預設 25Y，可直接修改 / In tay mặc định 25Y, có thể sửa';
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
function updateMachineSuggestedPullLength(){
  if(machineMode!=='PC') return;
  const productLength=Number($('machineProductLength').value);
  const patterns=Number($('machinePatternsPerRow').value);
  if(productLength>0&&patterns>0){
    $('machinePullLength').value=fmt(productLength*patterns*10,0).replace(/,/g,'');
  }
}
function setMachineMode(mode){
  machineMode=mode;
  if(!$('machineModePc'))return;
  $('machineModePc').classList.toggle('active',mode==='PC');
  $('machineModeY').classList.toggle('active',mode==='Y');
  $('machinePcPatternField').classList.toggle('hidden',mode!=='PC');
  $('machinePcLengthField').classList.toggle('hidden',mode!=='PC');
  $('machinePcGuide').classList.toggle('hidden',mode!=='PC');
  if($('machineOrderLabelZh')) $('machineOrderLabelZh').textContent=`訂單數量（${mode}）`;
  if($('machineOrderLabelVi')) $('machineOrderLabelVi').textContent=`Số lượng đơn hàng（${mode}）`;
  if($('machinePullLengthLabelZh')) $('machinePullLengthLabelZh').textContent=mode==='PC'?'建議拉帶長度設定值（可微調）':'拉帶長度設定值';
  if($('machinePullLengthLabelVi')) $('machinePullLengthLabelVi').textContent=mode==='PC'?'Giá trị chiều dài kéo dây đề nghị（có thể chỉnh）':'Giá trị cài đặt chiều dài kéo dây';
  if($('machinePullLengthHint')) $('machinePullLengthHint').textContent=mode==='PC'?'PC：單個長度 × 每行圖案數 × 10，自動帶入後可微調 / PC: chiều dài × số hình × 10, có thể chỉnh lại':'設定值約 ÷10 = 實際 MM，可依機台微調 / Giá trị ÷10 ≈ MM thực tế, có thể chỉnh theo máy';
  if(mode==='PC') updateMachineSuggestedPullLength();
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
    const mm=Math.max(0,pullLength/10);
    if(mm>0&&strips>0){perFrame=mm*strips/914.4;perHour=perFrame*fph;}
    $('machineFormulaNote').textContent=mm>0&&strips>0&&fph>0?`設定 ${fmt(pullLength,0)} → 預估 ${fmt(mm,0)} MM；${fmt(mm,0)} MM × ${fmt(strips,0)} 條/dây ÷ 914.4 = ${fmt(perFrame,2)} Y/框；${fmt(fph,0)} 框/小時 → ${fmt(perHour,2)} Y/H`:'請輸入網框與機台參數 / Vui lòng nhập thông số khung và máy';
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
  ['machineOrderQty','machineStrips','machinePullLength','machinePullSpeed','machineHoursPerDay'].forEach(id=>$(id).addEventListener('input',calcMachinePrint));
  ['machineProductLength','machinePatternsPerRow'].forEach(id=>$(id).addEventListener('input',()=>{updateMachineSuggestedPullLength();calcMachinePrint();}));
  setMachineStroke(1);
  setMachineMode('PC');
}

// V24 報價標準產能 / Năng suất chuẩn báo giá
// 標準參數由「報價標準參數表 Excel」維護，再由程式更新；網頁僅檢視，不直接修改。
const QUOTE_STANDARD_HISTORY=[
  {
    version:'2026/08/21',
    note:'新增鞋帶／單片特殊排料試用標準 / Thêm tiêu chuẩn thử nghiệm cho dây giày / miếng rời',
    layers:{
      WATER:[{min:0,max:4,tables12:3},{min:5,max:8,tables12:2},{min:9,max:12,tables12:1.5},{min:13,max:16,tables12:1},{min:17,max:25,tables12:.5}],
      SILICONE:[{min:0,max:4,tables12:3},{min:5,max:8,tables12:2},{min:9,max:12,tables12:1.5},{min:13,max:16,tables12:1},{min:17,max:25,tables12:.5}]
    },
    strips:{
      HAND:[{width:8,strips:30},{width:10,strips:26},{width:12,strips:22},{width:15,strips:18},{width:16,strips:14},{width:18,strips:15},{width:20,strips:14},{width:25,strips:12},{width:36,strips:8},{width:40,strips:8},{width:45,strips:7}],
      K3:[{width:8,strips:30},{width:10,strips:26},{width:12,strips:22},{width:15,strips:18},{width:16,strips:14},{width:18,strips:15},{width:20,strips:14},{width:25,strips:12},{width:36,strips:8},{width:40,strips:8},{width:45,strips:7}]
    },
    tableLength:{HAND:25,K3:29},
    sides:2,
    special:{
      SHOELACE:{qtyPerTable:1300,unit:'PAIR',workers:4,layHours:6,temp:true},
      PIECE:{qtyPerTable:1300,unit:'PC',workers:4,layHours:6,temp:true}
    }
  },
  {
    version:'2026/08/20',
    note:'初始標準 / Tiêu chuẩn ban đầu',
    layers:{
      WATER:[{min:0,max:4,tables12:3},{min:5,max:8,tables12:2},{min:9,max:12,tables12:1.5},{min:13,max:16,tables12:1},{min:17,max:25,tables12:.5}],
      SILICONE:[{min:0,max:4,tables12:3},{min:5,max:8,tables12:2},{min:9,max:12,tables12:1.5},{min:13,max:16,tables12:1},{min:17,max:25,tables12:.5}]
    },
    strips:{
      HAND:[{width:8,strips:30},{width:10,strips:26},{width:12,strips:22},{width:15,strips:18},{width:16,strips:14},{width:18,strips:15},{width:20,strips:14},{width:25,strips:12},{width:36,strips:8},{width:40,strips:8},{width:45,strips:7}],
      K3:[{width:8,strips:30},{width:10,strips:26},{width:12,strips:22},{width:15,strips:18},{width:16,strips:14},{width:18,strips:15},{width:20,strips:14},{width:25,strips:12},{width:36,strips:8},{width:40,strips:8},{width:45,strips:7}]
    },
    tableLength:{HAND:25,K3:29},sides:2,special:{}
  }
];
const QUOTE_STANDARD=QUOTE_STANDARD_HISTORY[0];
let quoteUnit='PC';
let quoteStandardsMode='current';
let quoteStripsAuto=true;
let quoteStripsManual=false;
function quoteInkName(v){return v==='SILICONE'?'SILICONE':'水性 / Mực nước';}
function quoteMethodName(v){return v==='K3'?'K3':'手印 / In tay';}
function quoteLayoutName(v){return v==='SHOELACE'?'鞋帶 / Dây giày':v==='PIECE'?'單片 / Miếng rời':'一般長帶 / Dây dài thông thường';}
function quoteFindRule(ink,layers,std=QUOTE_STANDARD){return (std.layers[ink]||[]).find(r=>layers>=Number(r.min)&&layers<=Number(r.max));}
function quoteEscape(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function quoteEstimateStrips(method,width,std=QUOTE_STANDARD){
  const rows=(std.strips[method]||[]).slice().sort((a,b)=>a.width-b.width);
  if(!(width>0)||!rows.length)return null;
  const exact=rows.find(r=>Math.abs(Number(r.width)-width)<1e-9);
  if(exact)return {strips:Number(exact.strips),estimated:false};
  if(rows.length===1)return {strips:Math.max(1,Math.floor(Number(rows[0].strips)*Number(rows[0].width)/width)),estimated:true};
  let a,b;
  if(width<rows[0].width){a=rows[0];b=rows[1];}
  else if(width>rows[rows.length-1].width){a=rows[rows.length-2];b=rows[rows.length-1];}
  else{for(let i=0;i<rows.length-1;i++)if(width>rows[i].width&&width<rows[i+1].width){a=rows[i];b=rows[i+1];break;}}
  if(!a||!b)return null;
  const raw=Number(a.strips)+(width-Number(a.width))*(Number(b.strips)-Number(a.strips))/(Number(b.width)-Number(a.width));
  return {strips:Math.max(1,Math.floor(raw)),estimated:true};
}
function quoteApplyStripSuggestion(force=false){
  if(!$('quoteStrips'))return;
  const layout=$('quoteLayoutType')?$('quoteLayoutType').value:'NORMAL';
  if(layout!=='NORMAL'){calcQuoteCapacity();return;}
  const method=$('quoteMethod').value,width=Number($('quoteWidth').value),r=quoteEstimateStrips(method,width);
  if(r&&(force||quoteStripsAuto||!Number($('quoteStrips').value))){
    $('quoteStrips').value=r.strips;quoteStripsAuto=true;quoteStripsManual=false;$('quoteStrips').readOnly=true;
    if($('quoteStripsEditBtn'))$('quoteStripsEditBtn').classList.remove('active');
    $('quoteStripsHint').textContent=r.estimated?'自動估算單邊條數 / Số sợi 1 bên được ước tính tự động':'依目前標準自動帶入 / Tự động theo tiêu chuẩn hiện tại';
  }else if(!r){if(force)$('quoteStrips').value='';$('quoteStripsHint').textContent='目前沒有可用標準 / Chưa có tiêu chuẩn phù hợp';}
  calcQuoteCapacity();
}
function quoteSetUnit(unit){
  quoteUnit=unit;if(!$('quoteUnitPc'))return;
  $('quoteUnitPc').classList.toggle('active',unit==='PC');$('quoteUnitY').classList.toggle('active',unit==='Y');
  $('quotePcLengthField').classList.toggle('hidden',unit!=='PC'||($('quoteLayoutType')&&$('quoteLayoutType').value!=='NORMAL'));
  calcQuoteCapacity();
}
function updateQuoteTableLength(){
  const m=$('quoteMethod').value;
  $('quoteTableLength').value=QUOTE_STANDARD.tableLength[m]|| (m==='K3'?29:25);
  $('quoteTableLengthHint').textContent=m==='K3'?'K3 預設 29Y，可修改本次報價 / K3 mặc định 29Y, có thể sửa cho lần này':'手印預設 25Y，可修改本次報價 / In tay mặc định 25Y, có thể sửa cho lần này';
  quoteApplyStripSuggestion(true);
}
function updateQuoteLayoutUI(){
  const layout=$('quoteLayoutType').value,isSpecial=layout!=='NORMAL',isPiece=layout==='PIECE',sp=QUOTE_STANDARD.special&&QUOTE_STANDARD.special[layout];
  ['quoteWidthField','quoteStripsField','quoteTableLengthField','quotePcLengthField'].forEach(id=>{if($(id))$(id).classList.toggle('hidden',isSpecial);});
  if($('quoteUnitToggle'))$('quoteUnitToggle').classList.toggle('hidden',isSpecial);
  $('quoteSpecialFields').classList.toggle('hidden',!isSpecial);
  $('quotePieceLengthField').classList.toggle('hidden',!isPiece);
  $('quoteTotalTimeResult').classList.toggle('hidden',!isSpecial);
  $('quoteCapacity12Result').classList.toggle('hidden',!isSpecial);
  if(isSpecial&&sp){
    $('quoteSpecialTitle').textContent=layout==='SHOELACE'?'鞋帶排帶標準 / Tiêu chuẩn xếp dây giày':'單片排料標準 / Tiêu chuẩn xếp miếng rời';
    $('quoteSpecialQty').textContent=`${fmt(sp.qtyPerTable,0)} ${sp.unit==='PAIR'?'雙 / đôi':'PC'}`;
    $('quoteSpecialWorkers').textContent=`${fmt(sp.workers,0)} 人 / người`;
    $('quoteSpecialLayHours').textContent=`${fmt(sp.layHours,2)} H`;
  }
  if(!isSpecial)$('quotePcLengthField').classList.toggle('hidden',quoteUnit!=='PC');
  calcQuoteCapacity();
}
function calcQuoteCapacity(){
  if(!$('quoteCapacity8'))return;
  const method=$('quoteMethod').value,ink=$('quoteInk').value,layout=$('quoteLayoutType')?$('quoteLayoutType').value:'NORMAL',layerRaw=$('quoteLayers').value.trim(),layers=layerRaw===''?NaN:Number(layerRaw);
  const inkLabel=quoteInkName(ink),rule=Number.isFinite(layers)?quoteFindRule(ink,layers):null;
  $('quoteStandardStamp').textContent=`目前標準 / Tiêu chuẩn hiện tại：${QUOTE_STANDARD.version}`;
  if(layout!=='NORMAL'){
    const sp=QUOTE_STANDARD.special&&QUOTE_STANDARD.special[layout];
    const pieceLen=Number($('quotePieceLength')?$('quotePieceLength').value:0);
    const qty=sp?Number(sp.qtyPerTable):0,layHours=sp?Number(sp.layHours):0,workers=sp?Number(sp.workers):0;
    // 特殊排料試用規則：使用者確認 12層=12H 印刷，因此暫以「層數=印刷小時/桌」換算；正式標準確認後由標準表取代。
    const printHours=Number.isFinite(layers)&&layers>0?layers:0;
    const totalHours=layHours+printHours;
    const cap8=totalHours>0?qty/totalHours*8:0,cap12=totalHours>0?qty/totalHours*12:0;
    const unit=sp&&sp.unit==='PAIR'?'雙 / đôi':'PC';
    const yPerTable=(layout==='PIECE'&&pieceLen>0)?qty*pieceLen/914.4:0;
    $('quoteWhatYouAreQuoting').textContent=`目前：${quoteMethodName(method)}｜${quoteLayoutName(layout)}｜${inkLabel}${Number.isFinite(layers)?'｜'+fmt(layers,0)+'層':''} / Hiện tại: ${quoteMethodName(method)}｜${quoteLayoutName(layout)}｜${inkLabel}`;
    $('quoteTotalStrips').textContent='特殊排料 / Xếp liệu đặc biệt';
    $('quotePerTable').textContent=qty>0?`${fmt(qty,0)} ${unit}${yPerTable>0?'（≈ '+fmt(yPerTable,2)+' Y）':''}`:'—';
    $('quoteTables12').textContent=printHours>0?`${fmt(printHours,2)} H / 桌印刷`:'—';
    $('quoteTables8').textContent=totalHours>0?`${fmt(8/totalHours,2)} 桌 / bàn`:'—';
    $('quoteTotalHours').textContent=totalHours>0?`${fmt(totalHours,2)} H（${fmt(layHours,2)}+${fmt(printHours,2)}）`:'—';
    $('quoteCapacity12').textContent=cap12>0?`${fmt(cap12,0)} ${unit}`:'—';
    $('quoteCapacity8').textContent=cap8>0?`${fmt(cap8,0)} ${unit}`:'—';
    if(layout==='PIECE')$('quoteCapacity8Alt').textContent=pieceLen>0?`單片 ${fmt(pieceLen,0)} mm；每桌約 ${fmt(yPerTable,2)} Y / 8H完整產能按 PC 計`:'請輸入單片長度（mm） / Nhập chiều dài miếng (mm)';
    else $('quoteCapacity8Alt').textContent=`排帶 ${fmt(workers,0)}人 × ${fmt(layHours,2)}H = ${fmt(workers*layHours,0)} 人時/桌`;
    if(!sp)$('quoteFormula').textContent='目前沒有特殊排料標準 / Chưa có tiêu chuẩn xếp liệu đặc biệt.';
    else if(!Number.isFinite(layers)||!(layers>0))$('quoteFormula').textContent='請輸入層數；特殊排料需把「排料時間 + 印刷時間」一起計入完整產能。 / Vui lòng nhập số lớp; năng suất hoàn chỉnh = thời gian xếp liệu + thời gian in.';
    else if(layout==='PIECE'&&!(pieceLen>0))$('quoteFormula').textContent='單片請輸入本次長度（mm）。長度不寫入固定標準，只用於本次換算。 / Miếng rời: nhập chiều dài (mm) cho lần này; không lưu vào tiêu chuẩn cố định.';
    else $('quoteFormula').textContent=`每桌 ${fmt(qty,0)} ${unit}；排料 ${fmt(layHours,2)}H + ${fmt(layers,0)}層印刷 ${fmt(printHours,2)}H = ${fmt(totalHours,2)}H/桌；8H = ${fmt(qty,0)} ÷ ${fmt(totalHours,2)} × 8 = ${fmt(cap8,0)} ${unit}；12H = ${fmt(cap12,0)} ${unit}。 / 1 bàn ${fmt(qty,0)} ${unit}; xếp liệu ${fmt(layHours,2)}H + in ${fmt(printHours,2)}H = ${fmt(totalHours,2)}H; năng suất 8H = ${fmt(cap8,0)}, 12H = ${fmt(cap12,0)}.`;
    return;
  }
  const width=Number($('quoteWidth').value),oneSide=Number($('quoteStrips').value),pcLen=Number($('quotePcLength').value),tableY=Number($('quoteTableLength').value),sides=Number(QUOTE_STANDARD.sides)||2;
  $('quoteWhatYouAreQuoting').textContent=`目前：${quoteMethodName(method)}｜一般長帶｜${inkLabel}｜${quoteUnit}${width>0?'｜'+fmt(width,2)+' mm':''} / Hiện tại: ${quoteMethodName(method)}｜Dây dài｜${inkLabel}｜${quoteUnit}${width>0?'｜'+fmt(width,2)+' mm':''}`;
  const totalStrips=(oneSide>0)?oneSide*sides:0;
  const perTableY=(totalStrips>0&&tableY>0)?totalStrips*tableY:0;
  const perStripPc=(pcLen>0&&tableY>0)?Math.floor(tableY*914.4/pcLen):0;
  const perTablePc=(perStripPc>0&&totalStrips>0)?perStripPc*totalStrips:0;
  $('quoteTotalStrips').textContent=totalStrips>0?`${fmt(totalStrips,0)} 條 / sợi（${fmt(oneSide,0)} × ${sides}邊）`:'—';
  $('quotePerTable').textContent=perTableY>0?(quoteUnit==='PC'?(pcLen>0?`${fmt(perTablePc,0)} PC（${fmt(perTableY,2)} Y）`:`${fmt(perTableY,2)} Y`):`${fmt(perTableY,2)} Y`):'—';
  $('quoteTables12').textContent=rule?`${fmt(rule.tables12,2)} 桌 / bàn`:'—';
  const tables8=rule?Number(rule.tables12)*8/12:0;
  $('quoteTables8').textContent=tables8>0?`${fmt(tables8,2)} 桌 / bàn`:'—';
  const capY=perTableY*tables8,capPc=perTablePc*tables8;
  if(quoteUnit==='PC'){$('quoteCapacity8').textContent=(capPc>0&&pcLen>0)?`${fmt(capPc,0)} PC`:'—';$('quoteCapacity8Alt').textContent=capY>0?`≈ ${fmt(capY,2)} Y / 8H`:'—';}
  else{$('quoteCapacity8').textContent=capY>0?`${fmt(capY,2)} Y`:'—';$('quoteCapacity8Alt').textContent=capY>0?'Y 報價不需輸入 PC 長度 / Báo giá Y không cần chiều dài PC':'—';}
  if(!(oneSide>0)||!(tableY>0))$('quoteFormula').textContent='目前無法取得排帶條數，請檢查寬度標準 / Không thể lấy số sợi, vui lòng kiểm tra tiêu chuẩn khổ dây.';
  else if(!rule)$('quoteFormula').textContent=`目前 ${inkLabel} 標準沒有涵蓋 ${Number.isFinite(layers)?fmt(layers,0):'—'} 層。 / Tiêu chuẩn ${inkLabel} hiện chưa bao gồm ${Number.isFinite(layers)?fmt(layers,0):'—'} lớp.`;
  else if(quoteUnit==='PC'&&!(pcLen>0))$('quoteFormula').textContent='報 PC 必須輸入每 PC 長度（mm） / Báo giá PC phải nhập chiều dài mỗi PC (mm).';
  else $('quoteFormula').textContent=`一般長帶排帶時間很短，目前維持原算法：單邊 ${fmt(oneSide,0)}條 × ${sides}邊 × 桌長 ${fmt(tableY,2)}Y = ${fmt(perTableY,2)}Y/桌；${fmt(layers,0)}層 → ${fmt(rule.tables12,2)}桌/12H → ${fmt(tables8,2)}桌/8H。 / Dây dài giữ nguyên cách tính hiện tại; thời gian xếp sợi ngắn nên tạm bỏ qua.`;
}
function quoteLayerTable(std){
  const water=std.layers.WATER||[],sil=std.layers.SILICONE||[],n=Math.max(water.length,sil.length),rows=[];
  for(let i=0;i<n;i++){const w=water[i],s=sil[i];const min=w?w.min:(s?s.min:'—'),max=w?w.max:(s?s.max:'—');rows.push(`<tr><td>${min}</td><td>${max}</td><td>${w?fmt(w.tables12,2):'—'}</td><td>${s?fmt(s.tables12,2):'—'}</td></tr>`);}
  return `<div class="quote-standard-section"><b>層數產能 / Năng suất theo số lớp</b><div class="table-scroll"><table class="quote-settings-table"><thead><tr><th>最低層數<br>Số lớp nhỏ nhất</th><th>最高層數<br>Số lớp lớn nhất</th><th>水性 1人12H桌數<br>Mực nước: Bàn/người/12H</th><th>SILICONE 1人12H桌數<br>Bàn/người/12H</th></tr></thead><tbody>${rows.join('')}</tbody></table></div></div>`;
}
function quoteStripTable(title,rows){
  const body=rows.length?rows.map(r=>`<tr><td>${fmt(r.width,2)}</td><td>${fmt(r.strips,0)}</td></tr>`).join(''):`<tr><td colspan="2">尚未建立標準 / Chưa có tiêu chuẩn</td></tr>`;
  return `<div class="quote-standard-section"><b>${title}</b><table class="quote-settings-table"><thead><tr><th>帶寬 mm<br>Quy cách dây (mm)</th><th>單邊排帶條數<br>Tổng số sợi 1 bên bàn</th></tr></thead><tbody>${body}</tbody></table></div>`;
}
function quoteSpecialTable(std){
  const sp=std.special||{},shoe=sp.SHOELACE,piece=sp.PIECE;
  if(!shoe&&!piece)return '';
  const row=(name,x,unit)=>x?`<tr><td>${name}</td><td>${fmt(x.qtyPerTable,0)} ${unit}</td><td>${fmt(x.workers,0)} 人</td><td>${fmt(x.layHours,2)} H</td><td>${x.temp?'暫定 / Tạm thời':'正式 / Chính thức'}</td></tr>`:'';
  return `<div class="quote-standard-section"><b>特殊排料標準 / Tiêu chuẩn xếp liệu đặc biệt</b><div class="table-scroll"><table class="quote-settings-table quote-special-standard-table"><thead><tr><th>類型<br>Loại</th><th>每桌標準量<br>SL / bàn</th><th>排料人數<br>Số người</th><th>排料時間<br>Giờ xếp liệu</th><th>狀態<br>Trạng thái</th></tr></thead><tbody>${row('鞋帶 / Dây giày',shoe,'雙')}${row('單片 / Miếng rời',piece,'PC')}</tbody></table></div><div class="quote-standard-explain"><b>完整產品怎麼算 / Cách tính sản phẩm hoàn chỉnh</b><br>一般長帶：完成仍包含「排帶 + 印刷」，但因目前排帶很快，所以沿用舊算法、不另外加排帶時間。<br>鞋帶／單片：排料很耗時，必須把排料時間加進去。<br><b>總完成時間 = 排料時間 + 印刷時間</b>；<b>8H完整產能 = 每桌標準量 ÷ 總完成時間 × 8</b>；12H同理。<br><span class="temp">⚠ 目前試用：鞋帶、單片皆先用 1300、4人、6H；特殊排料印刷時間暫以「層數 = H/桌」顯示（例：12層=12H），待現場確認正式標準後再更新。</span><br>單片長度（mm）每次報價手動輸入，不納入固定標準；只用於本次 PC ↔ Y 換算。<br><br>Dây dài: vẫn gồm xếp liệu + in, nhưng thời gian xếp ngắn nên giữ cách tính cũ. Dây giày/miếng rời: phải cộng thời gian xếp liệu. <b>Tổng thời gian = giờ xếp liệu + giờ in.</b> Chiều dài miếng nhập theo từng lần báo giá, không lưu vào tiêu chuẩn cố định.</div></div>`;
}
function quoteSnapshotHtml(std,showHeader=true){
  return `${showHeader?`<div class="quote-version-head"><b>${quoteEscape(std.version)}</b><span>${quoteEscape(std.note)}</span></div>`:''}${quoteLayerTable(std)}<div class="quote-standard-grid">${quoteStripTable('手印 / In tay',std.strips.HAND||[])}${quoteStripTable('K3',std.strips.K3||[])}</div>${quoteSpecialTable(std)}<div class="quote-standard-section"><b>其他基準 / Tiêu chuẩn khác</b><div class="quote-standard-mini">手印桌長 / Chiều dài bàn In tay：<b>${std.tableLength.HAND}Y</b>　｜　K3：<b>${std.tableLength.K3}Y</b>　｜　一桌 / 1 bàn：<b>${std.sides} 邊 / bên</b>　｜　一般長帶 8H：<b>12H × 8/12</b></div></div>`;
}
function renderQuoteStandards(){
  if(!$('quoteStandardsContent'))return;
  if(quoteStandardsMode==='current')$('quoteStandardsContent').innerHTML=quoteSnapshotHtml(QUOTE_STANDARD,true);
  else $('quoteStandardsContent').innerHTML=QUOTE_STANDARD_HISTORY.map((std,i)=>`<details class="quote-history-item" ${i===0?'open':''}><summary>${quoteEscape(std.version)}　${quoteEscape(std.note)}</summary><div class="quote-history-snapshot">${quoteSnapshotHtml(std,false)}</div></details>`).join('');
  $('quoteCurrentTab').classList.toggle('active',quoteStandardsMode==='current');$('quoteHistoryTab').classList.toggle('active',quoteStandardsMode==='history');
}
function openQuoteStandards(){quoteStandardsMode='current';renderQuoteStandards();$('quoteStandardsPanel').classList.remove('hidden');}
function closeQuoteStandards(){$('quoteStandardsPanel').classList.add('hidden');}
if($('quoteUnitPc')){
  $('quoteUnitPc').addEventListener('click',()=>quoteSetUnit('PC'));$('quoteUnitY').addEventListener('click',()=>quoteSetUnit('Y'));
  $('quoteMethod').addEventListener('change',updateQuoteTableLength);
  $('quoteLayoutType').addEventListener('change',updateQuoteLayoutUI);
  $('quoteWidth').addEventListener('input',()=>{quoteStripsAuto=true;quoteApplyStripSuggestion(true);});
  $('quoteStrips').addEventListener('input',()=>{if(quoteStripsManual){quoteStripsAuto=false;calcQuoteCapacity();}});
  $('quoteStripsEditBtn').addEventListener('click',()=>{
    quoteStripsManual=!quoteStripsManual;$('quoteStrips').readOnly=!quoteStripsManual;$('quoteStripsEditBtn').classList.toggle('active',quoteStripsManual);
    if(quoteStripsManual){$('quoteStripsHint').textContent='特殊款式才手動調整；只影響本次報價 / Chỉ điều chỉnh cho trường hợp đặc biệt; chỉ áp dụng lần báo giá này';$('quoteStrips').focus();$('quoteStrips').select();}
    else{quoteStripsAuto=true;quoteApplyStripSuggestion(true);}
  });
  ['quoteInk','quotePcLength','quoteLayers','quoteTableLength','quotePieceLength'].forEach(id=>{if($(id))$(id).addEventListener('input',calcQuoteCapacity);});
  $('quoteStandardsBtn').addEventListener('click',openQuoteStandards);$('quoteStandardsClose').addEventListener('click',closeQuoteStandards);
  $('quoteStandardsPanel').addEventListener('click',e=>{if(e.target===$('quoteStandardsPanel'))closeQuoteStandards();});
  $('quoteCurrentTab').addEventListener('click',()=>{quoteStandardsMode='current';renderQuoteStandards();});$('quoteHistoryTab').addEventListener('click',()=>{quoteStandardsMode='history';renderQuoteStandards();});
  quoteSetUnit('PC');updateQuoteTableLength();updateQuoteLayoutUI();renderQuoteStandards();
}



/* V28 未完工產能分析 / Phân tích năng suất chưa hoàn thành */
const WIP_PAGE_SIZE=100;
let wipRows=[],wipFiltered=[],wipPage=1,wipQuick='ALL',wipSourceHeaders=[],wipSourceRowMap=new Map(),wipSourceSheetName='';
let wipRouteMap={};
const WIP_DEFAULT_ROUTE_MAP={"81Q4645VB":["G10003"],"81Q2556VB":["G10003"],"61SP5363":["G10001","G10005"],"81T1455VA":["G10003"],"81TQ812VB":["G10003"],"90SP4961":["G10001"],"81Q1605VA":["G10003"],"81T4675VB":["G10003"],"81QF176VA":["G10003","G10006"],"81Q2957VA":["G10003"],"67SC0317":["G10001","G10005"],"67SC0977":["G10001","G10005"],"90-860078":["G10006"],"90-860143":["G10005","G10006","G10007"],"68E1388VB":["G10003"],"67SC0500":["G10001"],"68RQ314VB":["G10003"],"68RQ702VH":["G10003"],"86ETN32CQ":["G10006"],"86DI0045R":["G10001","G10006"],"86DI0045L":["G10001","G10006"],"39A22381":["G10005","G10006"],"39N28481":["G10006"],"39B28421":["G10005","G10006"],"68T1176VB":["G10003"],"99Z03-81":["G10003"],"68RE374UA":["G10003"],"68HL384VA":["G10003"],"68RQ433VH":["G10003"],"67SPB51LU":["G10001","G10005"],"61SP5261R":["G10001","G10005"],"61SP5261L":["G10001","G10005"],"67SPB51RU":["G10001","G10005"],"81Q4442VB":["G10003"],"81Q2647VA":["G10003"],"90-670453":["G10005","G10007"],"81Q1086VB":["G10003"],"81Q4707VB":["G10003"],"81Q5055VH":["G10003"],"67SP5087":["G10001","G10005"],"82QOS5380":["G10005"],"82470542":["G10005"],"90-82JL62":["G10001","G10002"],"90-82JL61":["G10002"],"82JL00228":["G10002","G10005","G10009"],"82JL00257":["G10002","G10005","G10009"],"67SP5094":["G10001","G10005"],"61SP5361":["G10001"],"67SP5015":["G10001","G10005"],"86WX-019B":["G10006"],"86WX-019A":["G10006"],"86WX-035B":["G10006"],"90-820481":["G10001"],"86WX-035A":["G10006"],"82TOS1039":["G10005"],"90-81621V":["G10001"],"67CTT0263":["G10005"],"81RTQ87VB":["G10003"],"67FHM0143":["G10004"],"81RQ199VA":["G10003"],"90-6857VM":["G10001","G10004"],"81Q1588VA":["G10003"],"90-68JL4V":["G10002"],"81RQQ87VB":["G10003"],"68RE374VB":["G10003"],"81T2811VA":["G10003"],"9068J101V":["G10002"],"9068JL97V":["G10002"],"81DK1EPVA":["G10003"],"90-390298":["G10005","G10006","G10007"],"67STT1549":["G10004"],"67STT1538":["G10004"],"67STT1533":["G10004"],"67SP5262":["G10001","G10005"],"61JL0635U":["G10002","G10005","G10009"],"67STT1531":["G10001","G10004"],"68QQ667VB":["G10003"],"68SDM31VO":["G10003"],"68SC471VA":["G10001","G10003"],"67SP5065U":["G10001"],"81SC0900V":["G10001"],"81Q3911VH":["G10003"],"67SP4965":["G10001"],"67SP4958":["G10001"],"67SP4703":["G10001"],"8130713VA":["G10003"],"81Q3729VB":["G10003"],"81Q3903VH":["G10003"],"86ETB9PUH":["G10006"],"81Q4053VH":["G10003"],"82JL00261":["G10002","G10005","G10009"],"90-820253":["G10005","G10009"],"81T5305VB":["G10003"],"81T1097VB":["G10003"],"9081J264V":["G10002"],"9081J270V":["G10002"],"81QQ436VB":["G10003"],"81TW37IVH":["G10003"],"68SL208VB":["G10003"],"99Z03-68":["G10003"],"67JL00492":["G10002","G10005","G10009"],"81T1093VB":["G10003"],"67SP5324U":["G10001","G10005"],"81QQ1545B":["G10003"],"67SP4224":["G10001","G10005"],"81QQ529VB":["G10003"],"67SP4992":["G10001","G10005"],"67SP4942":["G10001","G10005"],"81Q2805VB":["G10003"],"81S5341UV":["G10001"],"90-670440":["G10001","G10005","G10007"],"81TOSQ8VA":["G10003"],"82SF00008":["G10005","G10009"],"81T5241VB":["G10003"],"81Q1209VB":["G10003"],"81QOSQ9VB":["G10003"],"68Q1315VA":["G10003"],"68HL384VB":["G10003"],"86ETN-34C":["G10006"],"68RQ665VA":["G10003"],"68T364CVB":["G10003"],"39N10576":["G10006"],"81Q4139VH":["G10003"],"86ETN-72I":["G10006"],"61SC0975":["G10001"],"68Q2492VO":["G10003"],"9081512DV":["G10001","G10007"],"68ST1559V":["G10004"],"68ST1581V":["G10004"],"9081512VB":["G10001","G10007"],"81SPB002V":["G10001"],"81SPB005V":["G10001"],"68ST1548V":["G10004"],"81RQ933VB":["G10003"],"68RQ665VH":["G10003"],"68SPA987V":["G10001"],"68ST1597V":["G10004"],"81SPB003V":["G10001"],"81Q2722VB":["G10003"],"68SL208VH":["G10003"],"81Q3919VB":["G10003"],"81Q3919VH":["G10003"],"81Q4903VH":["G10003"],"67SP5362L":["G10001","G10005"],"67SP5362R":["G10001","G10005"],"68QQ667VH":["G10003"],"67SP1252":["G10001"],"81Q4685VB":["G10003"],"82RCQ0809":["G10005"],"67SP5000":["G10001","G10005"],"67SC0948":["G10001","G10005"],"67SP5277":["G10001","G10005"],"67SC0946":["G10001","G10005"],"67SPB066R":["G10001","G10005"],"67SPB066L":["G10001","G10005"],"67SC0949":["G10001","G10005"],"81RQ199VH":["G10003"],"81RQSQ9VB":["G10003"],"90SF0025":["G10005","G10009"],"9081JS13V":["G10001","G10002"],"9081J268V":["G10002"],"68RQ936VB":["G10003"],"9068JL99V":["G10002"],"68RQ308VA":["G10003"],"81QQW30VB":["G10003"],"83FW-46C":["G10004","G10008"],"68RT638VB":["G10003"],"68RQ665VB":["G10003"],"77J2547VK":["G10003"],"81Q1114VB":["G10003"],"82SP5275":["G10001"],"81Q2399VB":["G10003"],"82SP4821":["G10001","G10005"],"68ST626VN":["G10003"],"81QF255VA":["G10003"],"67SP4828R":["G10001","G10005"],"67SPB026R":["G10001","G10005"],"67SPB025R":["G10001","G10005"],"67SP4828L":["G10001","G10005"],"67SPB026L":["G10001","G10005"],"67SPB025L":["G10001","G10005"],"68Q3695VB":["G10003"],"67SP2629":["G10001"],"68RQ665VK":["G10003"],"67STT083":["G10001","G10004"],"68LT366VH":["G10003"],"81Q2259VB":["G10003"],"68RQ495VB":["G10003"],"68RQ492VB":["G10003"],"68RQ316VB":["G10003"],"82JL00441":["G10002","G10005","G10009"],"81QQ647VB":["G10003"],"68RQ316VH":["G10003"],"81TS742VH":["G10003"],"68RQ314VH":["G10003"],"67SP4864":["G10001","G10005"],"67JL00583":["G10002","G10005","G10009"],"67SP5140":["G10001","G10005"],"68RQ936VH":["G10003"],"811028UVB":["G10003"],"908100034":["G10005"],"82SF00151":["G10005","G10009"],"82ST1611U":["G10004"],"90-82JL76":["G10002"],"68ST1451V":["G10004"],"81Q5386VB":["G10003"],"81Q5205VA":["G10003"],"82JL00569":["G10002","G10005","G10009"],"81QQ815VB":["G10003"],"81TQ815VB":["G10003"],"68F2298VH":["G10003"],"67SP2602U":["G10001"],"67SP2600":["G10001"],"81D3581VB":["G10003"],"81D4689VB":["G10003"],"81Q3033VB":["G10003"],"81T1955VB":["G10003"],"67SP4894":["G10001"],"81D1333VB":["G10003"],"67UFW2243":["G10004"],"81RTDC8VB":["G10003"],"68GT356VB":["G10003"],"811553UVB":["G10003"],"81REF39VA":["G10003"],"68Q354ZVB":["G10003"],"81RD446VB":["G10003"],"39B28489":["G10005"],"39A20429":["G10005"],"90-390300":["G10005","G10006","G10007"],"81RCKT2VA":["G10003"],"81Q3201AH":["G10003"],"81RQQ87VH":["G10003"],"61OQQ3336":["G10005"],"81TS542VH":["G10003"],"81RQQ87VK":["G10003"],"99Z07":["G10002","G10009"],"81Q5115UH":["G10003"],"67UFW1183":["G10004"],"67UFW1210":["G10004"],"68QQ667VA":["G10003"],"67RLQ0842":["G10005"],"67UFW1870":["G10004"],"68QL384VB":["G10003"],"59SC0947":["G10001"],"82JL00439":["G10002","G10005","G10009"],"65SP5145":["G10001"],"81T1372VB":["G10003"],"81T1299VH":["G10003"],"81T6003VB":["G10003"],"908100033":["G10005"],"81Q4649VH":["G10003"],"81Q1435VB":["G10003"],"82JL00501":["G10002","G10005","G10009"],"82JL00475":["G10002","G10005","G10009"],"68R1148VB":["G10003"],"81Q3201VB":["G10003"],"9081J17UV":["G10002"],"68RQ315VB":["G10003"],"68Q1043VA":["G10003"],"90-670450":["G10001","G10005","G10007"],"66EM0301":["G10008"],"81RCKT2VH":["G10003"],"39B28486":["G10005"],"81RC915VA":["G10003"],"39A20426":["G10005"],"68SL283VB":["G10003"],"81BL102VB":["G10003"],"81QF162VB":["G10003"],"67UFW1930":["G10004"],"65VTJ096":["G10005"],"61SC0899":["G10004"],"68LQ542VH":["G10003"],"67SP4701":["G10001"],"81SPA94V":["G10001"],"67SP5356":["G10001"],"68RQ190VH":["G10003"],"81RDQ16VA":["G10003"],"81Q4851VB":["G10003"],"81Q3923VH":["G10003"],"81RQ1007A":["G10003"],"81Q5308VH":["G10003"],"81RQ831VH":["G10003"],"81Q3925VH":["G10003"],"81Q5100VB":["G10003"],"9081393VB":["G10009"],"81T1299VK":["G10003"],"90-820325":["G10005","G10009"],"90-820222":["G10005","G10009"],"90-82JL19":["G10002","G10005","G10009"],"82TOS2122":["G10005"],"82JL00634":["G10002","G10005","G10009"],"67SP4617R":["G10001","G10005"],"67SP4617L":["G10001","G10005"],"67SPB54RU":["G10001","G10005"],"67SC0862":["G10001","G10005"],"67SPB35LU":["G10001","G10005"],"67SPB34LU":["G10001","G10005"],"67SPB53LU":["G10001","G10005"],"67SC0868":["G10001","G10005"],"67SPB54LU":["G10001","G10005"],"68TL384VB":["G10003"],"67SC0869":["G10001","G10005"],"81T5083VO":["G10003"],"67SPB35RU":["G10001","G10005"],"67SPB34RU":["G10001","G10005"],"81Q2547VH":["G10003"],"67SPB53RU":["G10001","G10005"],"68NH212VA":["G10003"],"67FHM0131":["G10004"],"68R747ZVB":["G10003"],"61SP5350":["G10001","G10005"],"68RQ936VT":["G10003"],"68RQ936VA":["G10003"],"61SP5351":["G10001","G10005"],"81QF165VA":["G10003"],"81S934VAH":["G10001","G10003"],"81QF165VH":["G10003"],"83FW-38C":["G10004","G10008"],"67SP4723":["G10001","G10004"],"82JL00633":["G10001","G10002","G10005"],"81RKC17VB":["G10003"],"81Q4725UB":["G10003"],"81TS742VA":["G10003"],"81Q4723UB":["G10003"],"81TQ529VB":["G10003"],"81T4675DV":["G10003"],"82JL00202":["G10002","G10005","G10009"],"82SF00112":["G10005","G10009"],"68Q552UVB":["G10003"],"81RQ1013A":["G10003"],"67SPB024R":["G10001","G10005"],"67SPB024L":["G10001","G10005"],"81QF176VH":["G10003"],"81R103LDV":["G10003"],"68ST1521V":["G10004","G10007"],"81RC151VB":["G10003"],"81TH79RVB":["G10003"],"68Q1315VB":["G10003"],"99Z02-81":["G10003"],"81TB949VB":["G10003"],"68ST1483V":["G10004","G10007"],"68TTL27VB":["G10003"],"68QE373VB":["G10003"],"81Q5493DV":["G10003"],"81QQ356VB":["G10003"],"90-82JL77":["G10001"],"67FHM0142":["G10004"],"67BF1976Z":["G10004"],"68STP03VB":["G10003"],"61HS0223":["G10004"],"61SP5357":["G10001","G10005"],"61SC0759":["G10001"],"90-590019":["G10005","G10009"],"82JL00409":["G10002","G10005","G10009"],"67SPB053R":["G10001","G10005"],"81EM316VB":["G10003"],"67SPB054L":["G10001","G10005"],"67SPB035R":["G10001","G10005"],"81Q3857VB":["G10003"],"67SPB034L":["G10001","G10005"],"67SPB053L":["G10001","G10005"],"67SPB035L":["G10001","G10005"],"81T5083VB":["G10003"],"67SPB034R":["G10001","G10005"],"67SPB054R":["G10001","G10005"],"908100032":["G10005"],"82JL00354":["G10002","G10005","G10009"],"67SP5213":["G10001","G10005"],"67SP5353":["G10001","G10005"],"68RQ665VN":["G10003"],"67SPB52RU":["G10001","G10005"],"81Q4876VA":["G10003"],"68RQ421VA":["G10003"],"39A1650":["G10006"],"39N105761":["G10006"],"81RQ755VB":["G10003"],"81RCKQ2VB":["G10003"],"81T2586VB":["G10003"],"90SP5216":["G10001"],"68F1942VB":["G10003"],"68QQ245VB":["G10003"],"68Q667UVB":["G10003"],"81ST1585V":["G10004"],"68QQ538VH":["G10003"],"68F2492VB":["G10003"],"82JL00522":["G10002","G10005","G10009"],"67SP2158":["G10001"],"67SP5201U":["G10001","G10005"],"82JL00564":["G10002","G10005","G10009"],"99Z02-68R":["G10003"],"81Q3921VH":["G10003"],"67SP5256R":["G10001","G10005"],"67SP5256L":["G10001","G10005"],"81T4042VB":["G10003"],"81DK1EPVB":["G10003"],"68RQ492VH":["G10003"],"81RQ345VB":["G10003"],"66REQ0510":["G10004"],"81Q529UVB":["G10003"],"90-660061":["G10005"],"59SC0044":["G10004"],"61SC0314":["G10001"],"81QOSQ8VB":["G10003"],"67SP3686":["G10001"],"86ETN326C":["G10005","G10006"],"81Q2811VB":["G10003"],"81EM0316V":["G10003"],"67SP5349":["G10001","G10005"],"81Q1162VB":["G10003"],"81Q4762VH":["G10003"],"9081595DV":["G10001","G10004","G10007"],"9081595VB":["G10001","G10003","G10004"],"9081595TV":["G10001","G10007"],"67JL00617":["G10002","G10005","G10009"],"9081J171V":["G10002"],"82JL00608":["G10002","G10005","G10009"],"90-820129":["G10005","G10009"],"82JL00619":["G10002","G10005","G10009"],"81RD819VA":["G10003"],"68RT507VA":["G10003"],"90-6859VH":["G10001","G10004"],"68RC13ZVH":["G10003"],"90-6859VB":["G10001","G10004"],"81QR060VB":["G10003"],"81TQ487VB":["G10003"],"68RQ570VB":["G10003"],"67FHM0158":["G10004"],"67SPB058L":["G10001","G10005"],"67SPB058R":["G10001","G10005"],"908200023":["G10005"],"61XW0005":["G10004"],"81SC973VA":["G10001"],"81SC974VA":["G10001"],"81Q3607VB":["G10003"],"67FHM0118":["G10004"],"61SP5260":["G10001","G10005"],"67FTT0170":["G10005"],"82ST1561U":["G10004"],"61JL00631":["G10002","G10005"],"68D1255OA":["G10003"],"81SP5341V":["G10001"],"67SP3153U":["G10001"],"81T37IUVH":["G10003"],"67SP3153":["G10001"],"81Q4745VB":["G10003"],"81TQ047VH":["G10003"],"81RD329VA":["G10003"],"67SP5303":["G10001"],"67SP5305":["G10001"],"67SP892LU":["G10001","G10005"],"67SP5033L":["G10001","G10005"],"67SP892RU":["G10001","G10005"],"67SP5033R":["G10001","G10005"],"68LQ681VB":["G10003"],"81Q4827VB":["G10003"],"67F2586ZU":["G10004"],"82552907":["G10005"],"81TQ960VB":["G10003"],"81Q1489VB":["G10003"],"81QF162VA":["G10003"],"56SC0747":["G10001"],"81T5331VB":["G10003"],"90-820457":["G10001"],"67SP4936":["G10001","G10005"],"67SP5167":["G10001","G10005"],"81TQ465VB":["G10003"],"67SP5328":["G10001","G10005"],"67SPB077L":["G10001","G10005"],"67SPB077R":["G10001","G10005"],"81QF209VB":["G10003"],"81T2107VB":["G10003"],"68ST1596V":["G10004"],"90-67JL16":["G10002"],"68RAT16VH":["G10003"],"81Q1588VH":["G10003"],"90-39220R":["G10005","G10006"],"68TL308VA":["G10003"],"68TL27UVH":["G10003"],"68QQ461VB":["G10003"],"67SP5338":["G10001","G10005"],"86ETN-62I":["G10005","G10006"],"90-670447":["G10001","G10005","G10007"],"68Q2585VH":["G10003"],"90-6839VH":["G10003"],"90-670446":["G10004","G10005","G10009"],"67UFW2454":["G10004"],"61SC0979":["G10004"],"81Q2603VB":["G10003"],"67SP5182":["G10001","G10005"],"68IK208VB":["G10003"],"68SL325VB":["G10003"],"61SP5346R":["G10001","G10005"],"81RQC18VB":["G10003"],"68RQ421VH":["G10003"],"81D5391VH":["G10003"],"68SDM09VB":["G10003"],"81BL013VA":["G10003"],"81QF205VH":["G10003"],"81RQ1009A":["G10003"],"67SP5148L":["G10001","G10004"],"67SP5148R":["G10001","G10004"],"86ETB09PU":["G10005","G10006"],"81T5434VB":["G10003"],"81TQ848VH":["G10003"],"67UF2571Z":["G10004"],"90-670196":["G10005"],"9081J279V":["G10002"],"68T1176VH":["G10003"],"67SPB030L":["G10001","G10005"],"67SP4665":["G10001","G10005","G10009"],"67SPB069L":["G10001","G10005"],"67SPB030R":["G10001","G10005"],"67SPB069R":["G10001","G10005"],"67SP5224":["G10001","G10005"],"67SPA892R":["G10001","G10005"],"81BL076VB":["G10003"],"81RD148VH":["G10003"],"67SP5336":["G10001","G10005"],"67SP5339":["G10001","G10005"],"67SP4878R":["G10001","G10005"],"67SPA892L":["G10001","G10005"],"67SP5335":["G10001","G10005"],"66SP5012R":["G10001","G10005"],"67SP4878L":["G10001","G10005"],"67SP5337":["G10001","G10005"],"67SP5340":["G10001","G10005"],"67SP4940":["G10001","G10005"],"68RQ314VA":["G10003"],"68HL384VH":["G10003"],"68RQ308VH":["G10003"],"68F2285VH":["G10003"],"81Q2556UH":["G10003"],"68TL384VH":["G10003"],"61SP5346L":["G10001","G10005"],"68T384UVA":["G10003"],"68RQ307VB":["G10003"],"81TSB1UVH":["G10003"],"90-6838VB":["G10003","G10004","G10007"],"68SC0933V":["G10001"],"81T5422VA":["G10003"],"81Q1047VH":["G10003"],"68RE374DV":["G10003"],"68RE374VH":["G10003"],"68RQ323VB":["G10003"],"68Q1043VH":["G10003"],"61SP5249":["G10001","G10005"],"61OTE3316":["G10005"],"67F2589ZU":["G10004"],"67UF2533Z":["G10004"],"81TS399VB":["G10003"],"68RQ904VB":["G10003"],"67F2590ZU":["G10004"],"67F1976ZU":["G10004"],"68RQ307VA":["G10003"],"90-670156":["G10001","G10005","G10009"],"90-390301":["G10006","G10007"],"90-390302":["G10005","G10006","G10007"],"67SP5316R":["G10001","G10005"],"81TQ464VB":["G10003"],"67SP4222":["G10001","G10005"],"67SP5348":["G10001","G10005"],"67SP4526":["G10001","G10005"],"67SP4871":["G10001","G10005"],"67SC0920":["G10001","G10005"],"81Q4487VB":["G10003"],"67SP4608":["G10001","G10005"],"68GT385ZB":["G10003"],"81Q4238VB":["G10003"],"67SPB031R":["G10001","G10005"],"81BL076VH":["G10003"],"81T3255VB":["G10003"],"67STT1607":["G10004"],"68F2229VH":["G10003"],"67SPB031L":["G10001","G10005"],"67SP5334":["G10001","G10005"],"68SL208VA":["G10003"],"67SPB52LU":["G10001","G10005"],"68QQ584VB":["G10003"],"81Q464UVB":["G10003"],"82SP5032":["G10001"],"81TQ812VH":["G10003"],"81TF5422V":["G10003"],"81Q2811VA":["G10003"],"811588UVA":["G10003"],"81TQ047VB":["G10003"],"82SP3897":["G10001"],"81Q2598VB":["G10003"],"82SP3534":["G10001"],"66SP5012L":["G10001","G10005"],"67F2584ZU":["G10004"],"81RQ636VA":["G10003"],"39K22381":["G10006"],"9081J281V":["G10002"],"81Q2598UB":["G10003"],"67UF2587Z":["G10004"],"67FHM0107":["G10004"],"67F2592ZU":["G10004"],"67SP5345":["G10001","G10005"],"90-82JL14":["G10002"],"81RQ119VB":["G10003"],"67SP5315":["G10001","G10005"],"81RQ1007H":["G10003"],"82SF00114":["G10005","G10009"],"81BL076VA":["G10003"],"82SF00030":["G10005","G10009"],"68QE721VB":["G10003"],"81QF205VB":["G10003"],"81ST1605V":["G10004"],"67SP4225U":["G10001"],"77J1164BE":["G10003"],"82JL00256":["G10002","G10005","G10009"],"81Q2600UV":["G10003"],"81T5253VB":["G10003"],"67MQQ0220":["G10005"],"67SP5314":["G10001","G10005"],"90-670051":["G10001","G10005","G10009"],"82SF00052":["G10005","G10009"],"81RTQ87VA":["G10003"],"81QQ236VK":["G10003"],"68LE632UB":["G10003"],"68QQ667VT":["G10003"],"61HS0053":["G10004","G10007"],"61XW0026":["G10004"],"66EM0312":["G10008"],"81Q4820UB":["G10003"],"812680UVB":["G10003"],"66EM0313":["G10008"],"906700056":["G10001","G10005"],"906700055":["G10001","G10005"],"906700053":["G10001","G10005"],"68GQ414VO":["G10003"],"9081J177V":["G10002"],"90-670443":["G10001","G10005","G10007"],"67SP5343U":["G10001","G10005"],"90-670444":["G10004","G10005","G10007"],"68RQ190VB":["G10003"],"81RDSQ8VB":["G10003"],"81RD33UVH":["G10003"],"81Q4751VH":["G10003"],"68TL364VA":["G10003"],"82QFRU410":["G10005"],"81QOF205V":["G10003"],"68S1441VH":["G10003","G10004"],"68S1559VA":["G10003","G10004"],"81QOSQ8VT":["G10003"],"67SP932LU":["G10001","G10005"],"67SP4213":["G10001"],"67SP4212":["G10001"],"67SP4214":["G10001"],"67SP4486":["G10001"],"81Q2647VH":["G10003"],"67SC0902U":["G10001"],"67SP932RU":["G10001","G10005"],"67SP4541":["G10001"],"67SP4666":["G10001"],"67SP4542":["G10001"],"67SP4211":["G10001"],"67SP2602":["G10001"],"81Q2399VH":["G10003"],"81Q3955VB":["G10003"],"81Q1306UH":["G10003"],"81Q5205VH":["G10003"],"81Q1047VA":["G10001","G10003"],"68ST1441V":["G10004"],"81Q1086VA":["G10003"],"65VTJQ099":["G10005"],"81QF205VA":["G10003"],"61LTT348C":["G10005"],"67UF2578U":["G10004"],"67UF2579U":["G10004"],"67UF2553Z":["G10004"],"81TB977VB":["G10003"],"61XW0023":["G10004"],"81RQC36VH":["G10003"],"61FHM0154":["G10004"],"81Q2749VB":["G10003"],"813241UVA":["G10003"],"67SPB33RU":["G10001","G10005"],"67SPB32LU":["G10001","G10005"],"67SPB33LU":["G10001","G10005"],"67SPB32RU":["G10001","G10005"],"9081J278V":["G10002"],"67SPB073L":["G10001","G10005"],"67SPB74LU":["G10001","G10005"],"67SPB74RU":["G10001","G10005"],"67SP5207U":["G10001","G10005"],"67SPB073R":["G10001","G10005"],"67SPB72LU":["G10001","G10005"],"67SPB73LU":["G10001","G10005"],"81RC979LA":["G10003"],"67SPB072L":["G10001","G10005"],"67SP5001U":["G10001","G10005"],"67SPB73RU":["G10001","G10005"],"67SPB074R":["G10001","G10005"],"67SPB72RU":["G10001","G10005"],"67SPB074L":["G10001","G10005"],"67SPB072R":["G10001","G10005"],"82SP4364":["G10001"],"68QQ552VB":["G10003"],"67SPB37RU":["G10001","G10005"],"67SPB28LU":["G10001","G10005"],"67SPB28RU":["G10001","G10005"],"67SPB37LU":["G10001","G10005"],"67SPB36RU":["G10001","G10005"],"67SPB36LU":["G10001","G10005"],"67SP5317":["G10001","G10005"],"81T2749VH":["G10003"],"67F2585ZU":["G10004"],"67UF2393Z":["G10004"],"81RQ199VB":["G10003"],"81Q4502VB":["G10003"],"81Q5493VB":["G10003"],"81RDS79VH":["G10003"],"81SPB64DV":["G10001","G10004"],"81Q1277VB":["G10003"],"81BL101VB":["G10003"],"9081J261V":["G10002"],"67SPB028R":["G10001","G10005"],"67SP4846":["G10001","G10004"],"67SP4844":["G10001","G10004"],"67SP5235U":["G10001","G10005"],"67SP4847":["G10001","G10004"],"67SPB028L":["G10001","G10005"],"67SP3262":["G10001"],"67SPB056L":["G10001","G10005"],"67SPB056R":["G10001","G10005"],"99Z03-39":["G10006"],"90-660060":["G10001","G10004","G10007"],"67BFW2231":["G10004"],"81SPA954V":["G10001"],"81TSB140B":["G10003"],"67UF2558Z":["G10004"],"67UF2535Z":["G10004"],"67UF2534Z":["G10004"],"67UF2549Z":["G10004"],"81Q4249VH":["G10003"],"81Q3913VH":["G10003"],"68F2102VB":["G10003"],"67SPB047R":["G10001","G10005"],"67SPB047L":["G10001","G10005"],"67SPB041R":["G10001","G10005"],"67SPB041L":["G10001","G10005"],"67SPB56RU":["G10001","G10005"],"67SP4848":["G10001","G10004"],"67SPB56LU":["G10001","G10005"],"67SP5234":["G10001","G10005"],"67SP4674":["G10001","G10005"],"81RC339VB":["G10003"],"67SP5205U":["G10001","G10005"],"68RQ824VB":["G10003"],"67SP4482":["G10001","G10004","G10005"],"67SP5170U":["G10001","G10005"],"90SF0021":["G10001","G10005","G10009"],"68QQQ446B":["G10003"],"90-390268":["G10005"],"90-68059V":["G10001","G10004"],"81Q4247VH":["G10003"],"81T3301VB":["G10003"],"81Q1408VA":["G10003"],"81Q5365VB":["G10003"],"68QQ416VB":["G10003"],"82QRU2-2U":["G10005","G10009"],"61HS0224":["G10004"],"67UFW1643":["G10004"],"90-6854VB":["G10001","G10004"],"67SP5308":["G10001","G10005"],"90-6839VB":["G10003"],"67SPB011L":["G10001","G10005"],"68Q576VAI":["G10003"],"67SPB011R":["G10001","G10005"],"81RQ205VB":["G10003"],"68QQ676VB":["G10003"],"68RQ301VB":["G10003"],"68SIK01VB":["G10003"],"67SP5172U":["G10001","G10005"],"68RQ295VA":["G10003"],"67UF2507U":["G10004"],"67OFW2275":["G10004"],"81QF281VB":["G10003"],"66EM0311":["G10008"],"82151190":["G10005"],"81Q3211VH":["G10003"],"67SPB033L":["G10001","G10005"],"67SPB033R":["G10001","G10005"],"67SP5234U":["G10001","G10005"],"82JL00585":["G10002","G10005","G10009"],"67SP5161R":["G10001","G10005"],"67SP5161L":["G10001","G10005"],"67SP5149R":["G10001","G10005"],"67SP5149L":["G10001","G10005"],"67SP5203":["G10001","G10005"],"90-81583V":["G10001","G10004","G10007"],"67SP5325":["G10001","G10005"],"68QQ576VB":["G10003"],"67SPB067L":["G10001","G10005"],"67SPB067R":["G10001","G10005"],"67SPB068R":["G10001","G10005"],"67SPB068L":["G10001","G10005"],"813241UAH":["G10003"],"67SP5227":["G10001","G10005"],"67SP5226":["G10001","G10005"],"67SP4610":["G10001","G10005"],"67SP5237U":["G10001","G10005"],"67UF2449U":["G10004"],"67SP5329R":["G10001","G10005"],"67SP5304":["G10001"],"67SP5330L":["G10001","G10005"],"67SP5329L":["G10001","G10005"],"67SP5330R":["G10001","G10005"],"81RQ823VH":["G10003"],"82SC0873":["G10001"],"90-670437":["G10004","G10005","G10007"],"81RD206VB":["G10003"],"99Z03-82":["G10005"],"67SP5333":["G10001","G10005"],"99Z03-86":["G10006"],"81QQ2647V":["G10003"],"67SPA973R":["G10001","G10005"],"67SPA973L":["G10001","G10005"],"61SP5250":["G10001","G10005"],"67UF1930U":["G10004"],"81Q5404UB":["G10003"],"61XW0002":["G10004"],"81Q3857VH":["G10003"],"90-390216":["G10001"],"81T4146VB":["G10003"],"68RAQ16VA":["G10003"],"67SP3862":["G10001","G10005"],"67DI0057":["G10004","G10005"],"67DI0058":["G10004"],"68R685ZVB":["G10003"],"67SP5326":["G10001","G10005"],"67SPB27LU":["G10001","G10005"],"67SPB032R":["G10001","G10005"],"67SPB032L":["G10001","G10005"],"67SPB27RU":["G10001","G10005"],"67SPB027R":["G10001","G10005"],"90-820496":["G10001"],"81T1065VB":["G10003"],"67SPB027L":["G10001","G10005"],"90-670428":["G10001","G10005","G10007"],"68TL27VAG":["G10003"],"67SP4022U":["G10001","G10005"],"67SP5206":["G10001","G10005","G10009"],"81Q3203VB":["G10003"],"81QR060VN":["G10003"],"86ETN-32C":["G10006"],"67SP4243":["G10001","G10005"],"61SP4116":["G10001"],"81QF209VK":["G10003"],"90-670416":["G10001","G10005","G10007"],"67SC0902":["G10001"],"90SP5312":["G10001"],"812647UVA":["G10003"],"90-670430":["G10001","G10005","G10007"],"67UF2555Z":["G10004"],"67SP5239U":["G10001","G10005"],"67SP5190":["G10001","G10005","G10009"],"67SP5168U":["G10001","G10005"],"67SP5171U":["G10001","G10005"],"67SP5236":["G10001","G10005"],"67SP5238":["G10001","G10005"],"81Q1557VB":["G10003"],"86ETN72IM":["G10006"],"67SP5316L":["G10001","G10005"],"68RQ380VH":["G10003"],"68R1369VB":["G10003"],"61SC0770":["G10001"],"81TH48SDV":["G10003"],"81TH48SVB":["G10003"],"66REQ0504":["G10004"],"67SP5189":["G10001","G10005"],"81QSQ70VA":["G10003"],"813241VAH":["G10003"],"81ST1127V":["G10004"],"68F2404VB":["G10003"],"81ST1601V":["G10004"],"61SP4869":["G10001"],"67SP4963":["G10001"],"67SP4946":["G10001"],"67SP4964":["G10001"],"67SP4611":["G10001","G10005"],"68F1639VB":["G10003"],"908100029":["G10003","G10009"],"68TL384VA":["G10003"],"67SP1687":["G10001","G10005"],"67SP4941":["G10001","G10005"],"68SPB057V":["G10001"],"81RDQ16VH":["G10003"],"90-670439":["G10004","G10005","G10007"],"81Q1933UB":["G10003"],"90-67438U":["G10004","G10005","G10007"],"81Q3897VB":["G10003"],"81BL075VB":["G10003"],"68F2065VB":["G10003"],"67UFW2233":["G10004"],"67UFW2198":["G10004"],"68LQ681VH":["G10003"],"81QQ738VH":["G10003"],"81QW30YVB":["G10003"],"81SP980VB":["G10001","G10003","G10004"],"0558SSG-H":["G10005"],"81Q4535VB":["G10003"],"0558RSG-R":["G10005"],"9068J103V":["G10002"],"61STT1425":["G10001"],"82JL00589":["G10002","G10005","G10009"],"82SC0922":["G10001"],"81RC151VA":["G10003"],"81QF255VH":["G10003"],"67SP5169U":["G10001","G10005"],"67SP5173U":["G10001","G10005"],"67SP4904U":["G10001","G10005"],"67SP5000U":["G10001","G10005"],"67SP5001":["G10001","G10005"],"67SP5235":["G10001","G10005"],"67SP4903U":["G10001","G10005"],"90-67JL13":["G10002"],"9068JL98V":["G10002"],"90-68043V":["G10001","G10004"],"68TL308VH":["G10003"],"61HS0067":["G10004"],"68RTC27VB":["G10003"],"81TQ637VB":["G10003"],"68QE577VA":["G10003"],"81T4514VB":["G10003"],"81TS728VB":["G10003"],"67SP5321U":["G10001","G10005"],"81Q3907VH":["G10003"],"61XW0042":["G10004"],"81T1371VB":["G10003"],"61XW0014":["G10004"],"67SC0406U":["G10001"],"68R256ZVB":["G10003"],"81RC1017B":["G10003"],"81RD145VA":["G10003"],"90-670422":["G10001","G10004","G10005","G10007"],"66EM0289":["G10008"],"68RQ301VH":["G10003"],"81Q3241VA":["G10003"],"61XW0030":["G10004"],"67BFW2451":["G10004"],"67FFW2482":["G10005"],"67UFW2570":["G10004"],"90-860092":["G10005"],"39BQQ44":["G10006"],"81QF176VT":["G10003"],"39AQQ31":["G10006"],"81T1299VB":["G10003"],"68RQC30ZB":["G10003"],"81Q1489VH":["G10003"],"68LQ609VB":["G10003"],"90-820407":["G10001","G10002"],"82RQDS157":["G10005"],"81Q5421VB":["G10003"],"66EM0296":["G10008"],"81T5108VA":["G10003"],"67SP3818":["G10001","G10005"],"68QQ348VB":["G10003"],"61SP5225L":["G10001","G10005"],"61SP5225R":["G10001","G10005"],"81Q1418VB":["G10003"],"67SP1984":["G10001"],"68QE523VA":["G10003"],"90-390112":["G10005"],"90-390111":["G10005"],"81ST1272V":["G10004"],"68SC0471V":["G10001","G10003"],"67SP5251":["G10001","G10005"],"81Q1003VA":["G10003"],"67UF1217U":["G10004"],"67FFW2569":["G10004"],"67FFW2568":["G10004"],"81RC979LH":["G10003"],"82JL00148":["G10002","G10005","G10009"],"82SF00081":["G10005","G10009"],"81TSB26VB":["G10003"],"9081J200V":["G10002"],"81SPB015V":["G10001"],"81SPA980V":["G10001"],"81RQ636VH":["G10003"],"81BL013VH":["G10003"],"68RQ301VK":["G10003"],"67SP4330":["G10001"],"81QQ890VB":["G10003"],"81T2319VA":["G10003"],"81Q5509VB":["G10003"],"81RQ1031A":["G10003"],"81ST1603V":["G10004"],"90-820433":["G10005","G10008","G10009"],"67HS0221":["G10007"],"90-670368":["G10001"],"81Q4635VA":["G10003"],"81BS421VH":["G10003"],"83MFW-51C":["G10004","G10008"],"81Q2863VB":["G10003"],"82SP4092":["G10001"],"68E1388DV":["G10003"],"90-670432":["G10004","G10005","G10007"],"82SP5195":["G10001"],"81Q4938VO":["G10003"],"81Q5237VB":["G10003"],"81Q4085VB":["G10003"],"68Q1145VB":["G10003"],"65F2335NC":["G10004"],"67SP4616R":["G10001","G10005"],"81Q4633VH":["G10003"],"90-820610":["G10005","G10009"],"86ETB-09Q":["G10005"],"9082TLK24":["G10001","G10008"],"90-6850VB":["G10001","G10003","G10004"],"82TOSQ416":["G10002","G10005","G10009"],"82QSQ3449":["G10005"],"67SP5258":["G10001","G10005"],"81QF250VB":["G10003"],"81QQ611VB":["G10003"],"82RCS0094":["G10005"],"67SP5162L":["G10001","G10005"],"67SP4187":["G10001","G10005"],"67SP5162R":["G10001","G10005"],"82SP5098":["G10001"],"67SP4993L":["G10001","G10004"],"81S1600VB":["G10001","G10007"],"67SP4993R":["G10001","G10004"],"68ST1565V":["G10004"],"67OFW2332":["G10004"],"67SP4689":["G10001","G10004"],"67SP4691":["G10001","G10004"],"81N5321VB":["G10003"],"67SP4686":["G10001","G10004"],"67SP4684":["G10001","G10004"],"67SP4690":["G10001","G10004"],"67SP4688":["G10001","G10004"],"67SP4462U":["G10001","G10005"],"67SP4532U":["G10001","G10005"],"81T3403VB":["G10003"],"90-670345":["G10004","G10005","G10009"],"90-810007":["G10005","G10009"],"67UFW2566":["G10004"],"67UFW2506":["G10004"],"67BFW2177":["G10004"],"67FHM0156":["G10004"],"67SP4562":["G10001","G10005"],"90-670395":["G10001","G10004","G10005","G10009"],"81RQ1031H":["G10003"],"81TSQ135A":["G10003"],"81Q908VHC":["G10003"],"82COS0038":["G10005"],"82QS5380U":["G10005"],"90-670425":["G10005","G10007","G10008","G10009"],"81Q4901VB":["G10003"],"81Q4899VB":["G10003"],"81Q4488VB":["G10003"],"61XW0036":["G10004"],"81Q890UVB":["G10003"],"68RK188VB":["G10003"],"67FHM044U":["G10004"],"66EM0294":["G10005","G10008"],"66EM0293":["G10005","G10008"],"81RQC36VB":["G10003"],"81RQ823VB":["G10003"],"81RTQ48VB":["G10003"],"67SP5247":["G10001","G10004"],"81TS420VA":["G10003"],"67SP4673":["G10001"],"9081423VH":["G10001"],"86ETB07PU":["G10006"],"81RQ264VB":["G10003"],"67SP4990":["G10001","G10005"],"67SP4136":["G10001","G10005"],"67SP3929":["G10001","G10005"],"67SP5290":["G10001"],"81Q5372VH":["G10003"],"67SP4015U":["G10001"],"67SPB010L":["G10001","G10005"],"67SPB010R":["G10001","G10005"],"81Q3859VH":["G10003"],"67STT1576":["G10004"],"672554NCU":["G10004"],"672555NCU":["G10004"],"81Q3861VH":["G10003"],"672556NCU":["G10004"],"82QOF0188":["G10005"],"61SC0486":["G10001","G10004"],"81Q4751VK":["G10003"],"90-82JL65":["G10002","G10005","G10009"],"68RQ702VA":["G10003"],"67SP5241":["G10001","G10004"],"67SP5245":["G10001","G10004"],"67SP5242":["G10001","G10004"],"67SP5244":["G10001","G10004"],"81S1577VT":["G10003","G10004"],"90-390299":["G10006","G10008"],"68E1388TV":["G10003"],"81T5413VA":["G10003"],"82JL0509A":["G10001","G10002","G10005","G10009"],"82SF00084":["G10005","G10009"],"81RQ739VB":["G10003"],"81Q3638VA":["G10003"],"81Q4155VH":["G10003"],"81QQW030V":["G10003"],"68R665VAH":["G10003"],"67SC0952":["G10001","G10005"],"90-670341":["G10005"],"812598UDV":["G10003"],"82RCQ0476":["G10005"],"90-68058V":["G10001","G10004"],"67HS0184":["G10004","G10005","G10007"],"67SP5188":["G10001","G10005"],"67HS0190":["G10004","G10005","G10007"],"67FHM0044":["G10004"],"81RQ446VB":["G10003"],"83MFW-61C":["G10004","G10005","G10008"],"81QR060VH":["G10003"],"67SP5246":["G10001","G10004"],"67SP4732":["G10001","G10004"],"67SP4735":["G10001","G10004"],"67SP4737":["G10001","G10004"],"67SP4736":["G10001","G10004"],"81D4235VB":["G10003"],"67SP4738":["G10001","G10004"],"67SP4733":["G10001","G10004"],"67SP4731":["G10001","G10004"],"67SP5038U":["G10001","G10005"],"0558RSG-B":["G10005"],"0558SSG-R":["G10005"],"90-590018":["G10005","G10009"],"81SP935VK":["G10003"],"81BD46UVB":["G10003"],"81Q1364VB":["G10003"],"66EM0297":["G10008"],"81FRTQ8VB":["G10003"],"811086VAH":["G10003"],"67SP5200":["G10001","G10005"],"67SP4765":["G10001"],"67SP3768":["G10001","G10005"],"67SP5199":["G10001","G10005"],"67SP5008":["G10001","G10005"],"67SP4863":["G10001","G10005"],"67SP4442":["G10001","G10005"],"67SP4443":["G10001","G10005"],"67SP4454":["G10001","G10005"],"67SP4453":["G10001","G10005"],"81TQ481VA":["G10003"],"81TQ812VA":["G10003"],"67SP1467":["G10001"],"90-82JL32":["G10002","G10005","G10009"],"81SL040VB":["G10003"],"8161521VA":["G10003"],"66EM0295U":["G10005","G10008"],"90-670295":["G10005"],"81Q3033VK":["G10003"],"90-670407":["G10004","G10005","G10009"],"81Q4241VB":["G10003"],"81Q4361VB":["G10003"],"81Q3927VH":["G10003"],"81Q4245VH":["G10003"],"67IS0024":["G10001","G10004","G10005","G10007"],"67SPB044R":["G10001","G10005"],"81TQ481VB":["G10003"],"67SPB044L":["G10001","G10005"],"90-660030":["G10005"],"82SP2921":["G10001"],"67SP5215U":["G10001"],"67SP4849":["G10001","G10004"],"90-6852VB":["G10001","G10003","G10004"],"67SP5283":["G10001","G10005"],"68GQ435VA":["G10003"],"67BFW2501":["G10004"],"90-670427":["G10001","G10002"],"67SP4515":["G10001","G10005"],"81Q4321VH":["G10003"],"81QQ529VH":["G10003"],"67SP5306U":["G10001","G10005"],"67UFW2282":["G10004"],"0558RSG-H":["G10005"],"67BF1691U":["G10004"],"67SP5307U":["G10001","G10005"],"67SP4781U":["G10001","G10005"],"56JW2509Z":["G10005"],"90-820010":["G10001","G10005","G10009"],"81Q3469VB":["G10003"],"81Q5425VA":["G10003"],"68IK231VB":["G10003"],"67SP5282":["G10001","G10005"],"68SD13ZVB":["G10003"],"81RQ212VH":["G10003"],"67SP4150":["G10001","G10005"],"68F2419VH":["G10003"],"68Q364CVB":["G10003"],"81Q3638VB":["G10003"],"67SP5230U":["G10001"],"67SP4927U":["G10001"],"81SPB004V":["G10001"],"82JL00221":["G10002","G10005","G10009"],"68Q1251VB":["G10003"],"81Q4731VH":["G10003"],"68Q1272VB":["G10003"],"68E1353VB":["G10003"],"67SP5274U":["G10001","G10005"],"81T1787VA":["G10003"],"68Q1256VB":["G10003"],"90-82JL70":["G10002"],"90-67JL25":["G10001","G10002"],"90-67423U":["G10001","G10004","G10005","G10007"],"68STT584V":["G10004"],"81TSB-1VH":["G10003"],"68RQ492VA":["G10003"],"81TOSQ8VB":["G10003"],"67STT1592":["G10004"],"67SP4843":["G10001","G10004"],"81Q5298VB":["G10003"],"90-670142":["G10001","G10005","G10009"],"90-670179":["G10004"],"67SP5174U":["G10001"],"82TFS1209":["G10005"],"68QQ742VB":["G10003"],"82QOS4492":["G10005"],"67SC0110":["G10001"],"82QOF0191":["G10005"],"82QSQ4529":["G10005"],"82CKQO018":["G10005"],"82JL0521A":["G10002","G10005"],"82QRU0699":["G10005"],"81Q4247VB":["G10003"],"81Q4321VB":["G10003"],"81Q4085VH":["G10003"],"81Q4361VH":["G10003"],"68RQFT1VA":["G10003"],"81Q2784VB":["G10003"],"67SP5264":["G10001","G10005"],"81Q4011VB":["G10003"],"81TS742VB":["G10003"],"67SP5292":["G10001","G10005"],"67SP5293":["G10001","G10005"],"67SP5294":["G10001","G10005"],"39B28487":["G10005"],"81QRU01VB":["G10003"],"81DK1EPVH":["G10003"],"90-81603V":["G10001","G10004"],"67UFW1217":["G10004"],"90-6856AF":["G10001","G10004"],"67UFW2128":["G10004"],"67UFW1254":["G10004"],"67SP4726":["G10001","G10004"],"67SP4730":["G10001","G10004"],"67SP4725":["G10001","G10004"],"68Q1160VB":["G10003"],"67SP4727":["G10001","G10004"],"67SP4724":["G10001","G10004"],"90SF0020":["G10005","G10008","G10009"],"67SP4728":["G10001","G10004"],"68Q1384VB":["G10003"],"90-820464":["G10001"],"81QOS5UVB":["G10003"],"90-810053":["G10002","G10005","G10009"],"67SP5278":["G10001","G10005"],"67SP5287":["G10001","G10005"],"81Q4684UB":["G10003"],"67SP5286":["G10001","G10005"],"90-81SF05":["G10005","G10009"],"82TOS0542":["G10005"],"82TOS5032":["G10005"],"81Q1114VH":["G10003"],"68RQ665VC":["G10003"],"90-81034V":["G10009"],"61HS0222":["G10007"],"90-390030":["G10006","G10007"],"81SP996VB":["G10001","G10003","G10004"],"68TL364VK":["G10003"],"68SL101VB":["G10003"],"68RQ3075N":["G10003"],"65VTJQ144":["G10005"],"68LTT43VH":["G10003"],"81Q4053VB":["G10003"],"9081J273V":["G10002"],"90-820552":["G10001"],"90-81JL6V":["G10002"],"67SP5086U":["G10001","G10005"],"67SP4223":["G10001","G10005"],"90-82JL36":["G10002"],"67SP4465":["G10001","G10005"],"67SP4308":["G10001","G10005"],"82JL00527":["G10002","G10005","G10009"],"90-820439":["G10002","G10005","G10009"],"82QOS3122":["G10005"],"81RD446VH":["G10003"],"68RQT752B":["G10003"],"82QOS4734":["G10005"],"81S935VAH":["G10001"],"81Q4773VB":["G10003"],"81Q4771VH":["G10003"],"68F2404VN":["G10003"],"67SP5185":["G10001","G10005"],"82SP3601":["G10001","G10005"],"90-82JL43":["G10002","G10005","G10009"],"90-81503V":["G10009"],"9081J235U":["G10002"],"82SF00096":["G10005","G10009"],"90-82JL69":["G10002"],"61R2252NC":["G10005"],"67CFW1708":["G10005"],"82TFRS066":["G10005"],"82QRU0712":["G10005"],"82CKQRU11":["G10005"],"82TRU0304":["G10005"],"82JL00594":["G10002","G10005","G10009"],"81Q5144VA":["G10003"],"68RQ433VA":["G10003"],"68E1353TV":["G10003"],"81QF263VB":["G10003"],"81Q3165VA":["G10003"],"81Q3165VH":["G10003"],"61DFW2538":["G10004","G10005"],"90-660010":["G10005","G10008","G10009"],"81BS421VA":["G10003"],"900000014":["G10005","G10006","G10007"],"77J1809VB":["G10003"],"90-390165":["G10006","G10007"],"672557NCU":["G10004"],"81Q4249VB":["G10003"],"81Q3923VB":["G10003"],"81Q2630VB":["G10003"],"81TQ481VH":["G10003"],"81T5361UB":["G10003"],"81Q4539VB":["G10003"],"81R1003VA":["G10003"],"81Q4533VB":["G10003"],"67SP5288":["G10001","G10005"],"67UF2403Z":["G10004"],"67BF2493U":["G10004"],"90-590014":["G10005","G10009"],"81QF240VA":["G10003"],"81TD541VH":["G10003"],"81QQ434VA":["G10003"],"67SP5280":["G10001","G10005","G10007"],"67SP5296":["G10001"],"67SP5295":["G10001","G10005"],"67SP5281":["G10001","G10005","G10007"],"90-390109":["G10006"],"99Z02-68":["G10003"],"68S1578VM":["G10007","G10009"],"90-390193":["G10006"],"82JL00507":["G10002","G10005","G10009"],"56JW2394":["G10005"],"90-68053V":["G10001","G10004"],"56Q3593NC":["G10005"],"56J1987NC":["G10005"],"81Q4903VB":["G10003"],"67QC29ZNC":["G10004","G10005"],"67SP5257U":["G10001"],"90-650002":["G10001","G10004","G10005"],"67UFW2543":["G10004"],"67UFW2539":["G10004"],"67SP5009":["G10001","G10005"],"67SP5257":["G10001"],"90-670419":["G10001","G10005","G10009"],"68RQ1141B":["G10003"],"67OQQC24Z":["G10005"],"67UFW2540":["G10004"],"67UFW2547":["G10004"],"39BT28385":["G10006"],"81SP979VB":["G10001","G10004"],"81Q4383VB":["G10003"],"828056771":["G10005"],"67SP5272":["G10001","G10005"],"67SP4685":["G10001","G10004"],"90-82JL66":["G10002","G10005","G10009"],"81Q5419VB":["G10003"],"67CDD0013":["G10005"],"9082TLK27":["G10008"],"61TTD-001":["G10005"],"67ODD0750":["G10005"],"67RMC0376":["G10005"],"61HS0141":["G10004","G10005"],"61TG-81":["G10005"],"65PQQ0544":["G10005"],"59PTT0481":["G10005"],"65VTJ137":["G10005"],"61SC0904":["G10001","G10005"],"61OQE3052":["G10005"],"59PNT0423":["G10005"],"67FQ976NC":["G10005"],"67ODD0082":["G10005"],"61SC0885":["G10005"],"65VTJ167":["G10005"],"67OQQ2577":["G10005"],"67ONT3599":["G10005"],"61TG81-1":["G10005"],"59PTT0181":["G10005"],"59PTT0127":["G10005"],"59P601522":["G10005"],"61SC0907":["G10001","G10005"],"67RON1308":["G10005"],"59C-913":["G10005"],"67ODD0926":["G10005"],"59P6S7":["G10005"],"59P701":["G10005"],"67BFW1899":["G10004"],"61TG-82":["G10005"],"61WWS0122":["G10005"],"61TQQ0019":["G10005"],"61RON2000":["G10005"],"67BFW1261":["G10004"],"61RONE026":["G10005"],"59PTT0182":["G10005"],"65PNQ0582":["G10005"],"61RUR2029":["G10005"],"59PTT0046":["G10005"],"81Q3167VB":["G10003"],"61SP4409":["G10001"],"67STT1388":["G10002","G10005"],"90-390225":["G10006","G10007"],"90-590021":["G10005","G10009"],"81ST1489V":["G10004"],"68Q1197VB":["G10003"],"90-390201":["G10006","G10007"],"56OQQ2848":["G10005"],"68Q1146VB":["G10003"],"68QQ680VB":["G10003"],"90-820597":["G10001"],"56Q3078NC":["G10005"],"56JW2004":["G10005"],"56JW1710Z":["G10005"],"56SC0817":["G10001"],"90-820594":["G10005","G10009"],"81Q4311VO":["G10003"],"59PTT0541":["G10005"],"90-670421":["G10001","G10005"],"81RQ446VH":["G10003"],"59RPQ0622":["G10005"],"61DTE0427":["G10005"],"61OTE2008":["G10005"],"61OTT2686":["G10005"],"67UFW2476":["G10004"],"68QT588VB":["G10003"],"68S1578VB":["G10003","G10007"],"90-670157":["G10004"],"81Q4241VH":["G10003"],"81REF39VH":["G10003"],"81RQ831VB":["G10003"],"90-670429":["G10001","G10005","G10007"],"82SF00018":["G10005","G10009"],"81RQ630VB":["G10003"],"86369141":["G10005"],"90-67JL29":["G10001","G10002"],"81QF237VB":["G10003"],"81T1364VH":["G10003"],"67SP4757":["G10001","G10004"],"67SP4760":["G10001","G10004"],"67SP4759":["G10001","G10004"],"67SP4761":["G10001","G10004"],"67STT1523":["G10004"],"67SP4758":["G10001","G10004"],"67SP4762":["G10001","G10004"],"67SP4756":["G10001","G10004"],"68T384BNA":["G10003"],"81RD446VA":["G10003"],"90-860134":["G10006","G10007"],"68RT449VB":["G10003"],"68RQ537VH":["G10003"],"68RQ665UB":["G10003"],"67SP5289":["G10001","G10005"],"81S941VAH":["G10001"],"67SP3817":["G10001","G10005"],"9068JL91V":["G10002"],"81Q1086VH":["G10003"],"67SP4820R":["G10001","G10005"],"67SP4820L":["G10001","G10005"],"81RC640LH":["G10003"],"68E1353VH":["G10003"],"67UFW1801":["G10004"],"9081J260V":["G10002"],"81RQ1009H":["G10003"],"61FTT0312":["G10005"],"67BFW1167":["G10004"],"61SP5060R":["G10001","G10005"],"67BFW2550":["G10004"],"61SP5060L":["G10001","G10005"],"82SP4995":["G10001"],"90-390103":["G10005"],"67SP973RU":["G10001","G10005"],"67SP973LU":["G10001","G10005"],"67SP4346U":["G10001"],"90-670080":["G10001","G10005","G10009"],"68RQ917VH":["G10003"],"67SP4729":["G10001","G10004"],"81Q848VAB":["G10003"],"81QRU01VH":["G10003"],"61SC0783":["G10001"],"67SP5212":["G10001"],"67SP5284L":["G10001","G10004"],"67SP5284R":["G10001","G10004"],"90-660013":["G10009"],"9081J272V":["G10002"],"81Q1277VH":["G10003"],"67SP4929U":["G10001"],"81Q2722VH":["G10003"],"90-81361V":["G10009"],"81ST1337V":["G10004"],"68ST1510V":["G10004"],"68NT680VB":["G10003"],"90-82362U":["G10005"],"81QQ783VB":["G10003"],"81RC997VB":["G10003"],"67UFW2545":["G10004"],"67FHM0153":["G10004"],"67UFW2548":["G10004"],"67UFW2479":["G10004"],"67UFW2544":["G10004"],"67UFW2542":["G10004"],"67UFW2541":["G10004"],"67SP5274":["G10001","G10005"],"81QRU01VA":["G10003"],"90-390102":["G10008"],"90-390258":["G10001","G10006"],"81T2749VK":["G10003"],"81T3259VB":["G10003"],"68GM244VT":["G10003"],"81Q4031VH":["G10003"],"67SP995LU":["G10001","G10005"],"67SP995RU":["G10001","G10005"],"81Q3117VH":["G10003"],"67SC0953":["G10001","G10005"],"67SP5084":["G10001"],"67SP4564":["G10001","G10005"],"67SP3184":["G10001"],"90-860018":["G10006"],"90-82JL42":["G10002","G10005","G10009"],"67RQT0752":["G10005"],"67UFW1448":["G10004"],"67SP5139":["G10001","G10005"],"67SC0499":["G10001","G10005"],"67SP5020":["G10001","G10005"],"82EM0045":["G10005","G10008","G10009"],"67SP4734":["G10001","G10004"],"67SP5072":["G10001","G10005"],"90-68035V":["G10009"],"90-670050":["G10001","G10005","G10009"],"86ETN32CH":["G10006"],"82JL00324":["G10002","G10005","G10009"],"61SP4345L":["G10001","G10005"],"61SP4345R":["G10001","G10005"],"67UFW2383":["G10004"],"82SF00150":["G10005","G10009"],"67SP4616L":["G10001","G10005"],"81S1337DV":["G10004"],"67SP5267":["G10001","G10005"],"81ST1584V":["G10004"],"67SC0864":["G10001","G10005"],"67SP4930U":["G10001"],"67SP4687":["G10001","G10004"],"67SP5181":["G10001"],"67SP5178U":["G10001","G10005"],"90-39281Q":["G10005"],"9081J180V":["G10002"],"82JL00607":["G10002","G10005","G10009"],"90-39280Q":["G10005"],"67SP5176U":["G10001","G10005"],"61SP5077":["G10001","G10005"],"67SPB20LU":["G10001"],"90-68046V":["G10001","G10004"],"67SP5082":["G10001","G10005"],"67SP5081":["G10001","G10005"],"67UFW2212":["G10004"],"67SP4845":["G10004"],"90-820506":["G10001"],"66EM0281":["G10004"],"66EM0282":["G10004"],"67SP5202U":["G10001","G10005"],"67SP4581":["G10001","G10005"],"67SP5206U":["G10001","G10005"],"67HM0022":["G10004"],"67SP5202":["G10001","G10005"],"67SP5236U":["G10001","G10005"],"67SP5263":["G10001","G10005"],"67BFW2007":["G10004"],"67SP5085":["G10001","G10005"],"67SP4022":["G10001","G10005"],"82TOSQ008":["G10005"],"82JL00255":["G10002","G10005","G10009"],"67SP5075U":["G10001"],"61SP4347R":["G10001","G10005"],"61SP4347L":["G10001","G10005"],"67SP5165U":["G10001"],"67SP5165":["G10001"],"39N2848Q":["G10006"],"39A2238Q":["G10006"],"86EN32CB9":["G10005"],"82SF00133":["G10005","G10009"],"9081J271V":["G10002"],"9081503VB":["G10003","G10009"],"90-820538":["G10004","G10005","G10008","G10009"],"90-820540":["G10004","G10005","G10008","G10009"],"67SP4328":["G10001"],"67BFW1691":["G10004"],"67SC0925":["G10001","G10003","G10005"],"67SC0924":["G10001","G10003","G10005"],"67SP5252":["G10001","G10005"],"67SP5110":["G10001","G10004"],"39A20427":["G10005"],"68ST1540V":["G10004"],"67SP4461U":["G10001","G10005"],"90-82JL64":["G10001","G10002"],"67BF1868U":["G10004"],"67SP5003":["G10001"],"67STT1490":["G10004"],"67LE0041":["G10004"],"82JL00159":["G10002","G10005","G10009"],"67SP5231":["G10001"],"90-390219":["G10005"],"82JL00434":["G10002","G10005","G10009"],"39B2842V":["G10005"],"39A2238V":["G10005"],"90-39220L":["G10005","G10006","G10007"],"67SP5243":["G10001","G10004"],"67SC0941":["G10001","G10005"],"67SC0911":["G10001","G10005"],"82TOS1482":["G10005"],"67SC0923":["G10001","G10003","G10005"],"90-670393":["G10005","G10009"],"67FWA0508":["G10004"],"67SP5191":["G10001","G10005"],"67SP5230":["G10001"],"90-670346":["G10004","G10005","G10009"],"67UF1183U":["G10004"],"67UFW1802":["G10004"],"61SC0921":["G10001","G10005"],"82JL00318":["G10002","G10005","G10009"],"9068JL92V":["G10002"],"67SP4837":["G10001","G10004"],"67SP5163":["G10001","G10005"],"82JL00134":["G10002","G10005","G10009"],"67SC0916":["G10001","G10005"],"67SP5181U":["G10001"],"90-390177":["G10006","G10007"],"67UF2495Z":["G10004"],"61HS0171":["G10004"],"90-390028":["G10006","G10007"],"67UF2240Z":["G10004"],"90-670390":["G10005","G10008","G10009"],"67STT1567":["G10004","G10005"],"908600010":["G10006"],"82STT1561":["G10004"],"67SP5186":["G10001","G10005"],"82JL00297":["G10002","G10005","G10009"],"90-860028":["G10006"],"67SP988LU":["G10001","G10005"],"67SPA988R":["G10001","G10005","G10009"],"67SP988RU":["G10001","G10005"],"67SPA988L":["G10001","G10005","G10009"],"61XW0003":["G10004"],"99Z03-67":["G10004"],"90-670251":["G10004","G10005","G10009"],"90-390279":["G10005","G10006","G10007"],"67OFW2389":["G10004"],"59SC0853":["G10001"],"82JL00576":["G10002","G10005","G10009"],"67ST1566U":["G10004","G10005","G10007"],"90-6847VB":["G10001"],"67HS0218":["G10004"],"61SP5208":["G10001","G10005"],"9068J102V":["G10002"],"67SC0932":["G10001","G10005"],"82JL00609":["G10001","G10002","G10005","G10009"],"90-860138":["G10005","G10006","G10007"],"67BF2491U":["G10004"],"67SP5222":["G10001","G10005"],"67SP5223":["G10001","G10005"],"67FHM0010":["G10004"],"67FHM0011":["G10004"],"67UF2409Z":["G10004"],"68ST1570V":["G10004"],"67SP4148":["G10001","G10005"],"68ST1571V":["G10004"],"82JL00018":["G10002","G10005","G10009"],"90-6849VI":["G10005"],"67SP4055":["G10001","G10005"],"67SP4573":["G10001","G10005"],"68ST1560V":["G10004"],"908200029":["G10005"],"67SC0466":["G10001"],"82QRU0001":["G10005"],"82EM0130":["G10005","G10008","G10009"],"82TRU0036":["G10005"],"90-390274":["G10005"],"90-860020":["G10005"],"90-390252":["G10006"],"66SP5217":["G10001"],"67SP5221":["G10001","G10005"],"67UFW2256":["G10004"],"67UF2526Z":["G10004"],"61SC0908":["G10001","G10005"],"67SP3067":["G10001"],"67SP2453":["G10001"],"67SP5218":["G10001","G10005"],"67SP3812":["G10001"],"61SC0675":["G10001"],"90-390115":["G10006"],"903900035":["G10006"],"903900005":["G10006"],"903900002":["G10006"],"90-670342":["G10001","G10005","G10009"],"67SP5175":["G10001","G10005"],"67SP5156":["G10001","G10005"],"67SP5158":["G10001","G10005"],"67JL00610":["G10002","G10005","G10009"],"67SP5153":["G10001","G10005"],"67SP5152":["G10001","G10005"],"67SP5151":["G10001","G10005"],"82SF00134":["G10005","G10009"],"61SP5197R":["G10001","G10005"],"61SP5197L":["G10001","G10005"],"67BF1261U":["G10004"],"90-67JL19":["G10002"],"90-820422":["G10001"],"67SPB29RU":["G10001","G10005"],"67SPB29LU":["G10001","G10005"],"9081J263V":["G10002"],"67SP4576":["G10001","G10005"],"90-860035":["G10005"],"67SP5150":["G10001","G10005"],"66SP5204":["G10001"],"67BFW2269":["G10004"],"90-67JL21":["G10002"],"90-820608":["G10008"],"68S1510VH":["G10004"],"67SP4328U":["G10001"],"67SP939LU":["G10001","G10005"],"67SP939RU":["G10001","G10005"],"67SPA898L":["G10001","G10005"],"67SPA898R":["G10001","G10005"],"67SP898LU":["G10001","G10005"],"67SP898RU":["G10001","G10005"],"67SP4233L":["G10001","G10005"],"67SPA939R":["G10001","G10005"],"67SP4233R":["G10001","G10005"],"67SPA939L":["G10001","G10005"],"67SP3710":["G10001"],"81SP979DV":["G10001"],"67HS0200":["G10004","G10005"],"90-670417":["G10005","G10009"],"82SP4827":["G10001"],"906841VAF":["G10001","G10003"],"67SC0931":["G10001","G10005"],"67SP5146":["G10001"],"90-390108":["G10006","G10008"],"67SP4862":["G10001","G10005"],"67TLD-569":["G10004"],"67UF2212U":["G10004"],"67UFW2265":["G10004"],"61SC0940":["G10001"],"67SP2638":["G10001"],"61SP4281":["G10001"],"67SP5126":["G10001","G10004"],"67UF2281Z":["G10004"],"81ST1505V":["G10004"],"90-670355":["G10001","G10004","G10005","G10009"],"67UFW2232":["G10004"],"67OFW2283":["G10004"],"67SP4739":["G10001","G10004"],"67SP4436":["G10001","G10005"],"90-670007":["G10001","G10005","G10009"],"67SP4740":["G10001","G10004"],"67SP4980":["G10001","G10004"],"82SPA796":["G10001"],"90-390271":["G10006","G10007"],"90-660045":["G10001","G10005","G10007"],"9081535VB":["G10001","G10003","G10007","G10009"],"67SP4745":["G10001","G10004"],"39NQQ45":["G10006"],"67SP4488U":["G10001","G10005"],"67SP5154":["G10001","G10005"],"61SP5013R":["G10001","G10005"],"61SP5013L":["G10001","G10005"],"67SPB18RU":["G10001"],"67SPB18LU":["G10001"],"67UQT2033":["G10005"],"90-390029":["G10006","G10007"],"90-820546":["G10001","G10005","G10008","G10009"],"67SP4955L":["G10001","G10005"],"67SP981LU":["G10001","G10005"],"67SP4955R":["G10001","G10005"],"67SP981RU":["G10001","G10005"],"67SP2643":["G10001"],"67SP4854":["G10001"],"67388453":["G10004"],"83FW-10C":["G10004","G10008"],"67UF2198U":["G10004"],"67UF2233U":["G10004"],"67UF2232U":["G10004"],"67UF2464U":["G10004"],"67UF2255U":["G10004"],"67SP5079":["G10001"],"67OFW2388":["G10004"],"67OFW2329":["G10004"],"83FW-44C":["G10004","G10008"],"61OTT1579":["G10005"],"68SPA286V":["G10001"],"67SPB012L":["G10001"],"67SPB013R":["G10001"],"67SPB012R":["G10001"],"67SPB013L":["G10001"],"67SPB008L":["G10001"],"67SPB008R":["G10001"],"67SP4746":["G10001","G10004"],"67SP4743":["G10001","G10004"],"67SP4744":["G10001","G10004"],"67SP4741":["G10001","G10004"],"67SP3797":["G10001"],"61SP4430L":["G10001","G10005"],"61SP4430R":["G10001","G10005"],"67UFW2009":["G10004"],"67FHM0150":["G10004"],"67UFW2520":["G10004"],"67UFW2519":["G10004"],"67FHM0151":["G10004"],"81SPA861V":["G10001"],"90-670392":["G10004","G10005","G10009"],"61SP5035R":["G10001","G10005"],"61SP5035L":["G10001","G10005"],"67SP5101":["G10001"],"90-670052":["G10001","G10005","G10009"],"68SP227VB":["G10001"],"67SP5187":["G10001"],"67BFW1206":["G10004"],"67SC0927":["G10001"],"67SC0928":["G10001"],"66SP4522U":["G10001"],"67UFW2278":["G10004"],"61OQQ3461":["G10005"],"81SPA902V":["G10001"],"90-390176":["G10006","G10007"],"67SPB10RU":["G10001"],"67STT1263":["G10001"],"67SPB10LU":["G10001"],"39NNN105Q":["G10006"],"67SP4579":["G10001"],"61SP5034L":["G10001","G10005"],"67SP4742":["G10001","G10004"],"67UF2514U":["G10004"],"61SP5034R":["G10001","G10005"],"67SP4855":["G10001"],"82SP3226":["G10001"],"67SP5004":["G10001"],"67SP4931U":["G10001"],"67SP4928U":["G10001"],"67SP5074U":["G10001"],"67SP4414":["G10001"],"67SP4419":["G10001"],"67UFW2191":["G10004"],"67SP4977":["G10001"],"903900037":["G10006"],"903900009":["G10006"],"903900006":["G10006"],"903900036":["G10006"],"903900001":["G10006"],"903900004":["G10006"],"67BFW2022":["G10004"],"68SP286VB":["G10001"],"61SC0889":["G10001","G10005"],"90-67JL20":["G10002"],"67SP4241":["G10001"],"67SP5073":["G10001"],"67UFW2280":["G10004"],"90-670406":["G10001","G10005"],"61CTT0275":["G10005"],"61FTT0136":["G10005"],"67UF2506U":["G10004"],"67UFW2207":["G10004"],"67SP4234":["G10001"],"68SPA883V":["G10001"],"815089UVH":["G10003"],"99Z02":["G10006"],"90-390275":["G10006"],"81Q5137VB":["G10003"],"81SP980DV":["G10001"],"90-6836VB":["G10001","G10003"],"81Q4850VB":["G10003"],"99Z02-39":["G10006"],"81Q5072VA":["G10003"],"81Q3631VB":["G10003"],"81T1794VB":["G10003"],"81Q5214VB":["G10003"],"83FW-43C":["G10004","G10008"],"67SC0507":["G10001","G10005"],"67FHM131U":["G10004"],"86ETN-33C":["G10006"],"82JL00605":["G10002","G10005","G10009"],"67FHM0146":["G10004"],"67SP4596":["G10001","G10005"]};
const WIP_TYPE_META={
  TD:{name:'手印 / IN TAY',group:'HAND'},SPW:{name:'手印 / IN TAY',group:'HAND'},
  MD:{name:'機印 / IN MÁY',group:'MACHINE'},MPW:{name:'機印 / IN MÁY',group:'MACHINE'},
  TT:{name:'手印→轉印 / IN TAY TEM IN CHUYỂN',group:'HAND_TRANSFER'},
  MT:{name:'機印→轉印 / IN MÁY IN TEM CHUYỂN',group:'MACHINE_TRANSFER'},
  MY:{name:'移印 / IN CHẤM',group:'PAD'},MP:{name:'噴塗 / PHUN SILICON',group:'SPRAY'},
  TK:{name:'手印－膠片類 / IN TAY ĐẦU KEO',group:'FILM'},MK:{name:'機印－膠片類 / IN MÁY ĐẦU KEO',group:'FILM'}
};
const WIP_PROCESS_META={
  HAND:{name:'手印 / In tay',unit:'Y'},HAND_TRANSFER:{name:'手印→轉印 / In tay chuyển',unit:'Y'},
  MACHINE:{name:'機印 / In máy',unit:'Y'},MACHINE_TRANSFER:{name:'機印→轉印 / In máy chuyển',unit:'Y'},
  PAD:{name:'移印 / In chấm',unit:'Y'},SPRAY:{name:'噴塗 / Phun silicon',unit:'Y'},FILM:{name:'膠片 / Đầu keo',unit:'雙'},REVIEW:{name:'待確認 / Cần kiểm tra',unit:'Y'}
};
const WIP_PROCESS_ORDER=['HAND','HAND_TRANSFER','MACHINE','MACHINE_TRANSFER','PAD','SPRAY','FILM','REVIEW'];
const WIP_ROUTE_META={
  G10001:{name:'in 印刷',unit:'PRINT'},G10002:{name:'nhúng sơn 浸染',unit:'PC'},G10003:{name:'đầu keo 膠片',unit:'PAIR'},
  G10004:{name:'dán / in chuyển nhiệt / phun 貼合/昇華轉印/噴塗',unit:'Y25'},G10005:{name:'cắt 切',unit:'PC_Y25'},
  G10006:{name:'băng nhám 黏扣帶',unit:'PC'},G10007:{name:'ép 壓',unit:'Y25'},G10008:{name:'may 針車',unit:'Y25'},G10009:{name:'thủ công 手工',unit:'PC'}
};
const WIP_DEFAULT_CAPACITY={HAND:7000,HAND_TRANSFER:1600,MACHINE:19200,MACHINE_TRANSFER:38400,PAD:14400,SPRAY:6000,FILM:80000};
const WIP_DEFAULT_ROUTE_CAPACITY={G10002:0,G10003:80000,G10004:0,G10005:150000,G10006:0,G10007:0,G10008:0,G10009:0};
let wipCapacity={},wipRouteCapacity={};
function wipNormHeader(v){return String(v==null?'':v).trim().toLowerCase().replace(/[\/\s_\-<>br]+/g,'');}
function wipNum(v){if(v==null||v==='')return 0;if(typeof v==='number')return Number.isFinite(v)?v:0;const m=String(v).replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):0;}
function wipWidthNum(v){const n=wipNum(v);return n>0?n:0;}
function wipFmt(n,d=0){return Number(n||0).toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:0});}
function wipEsc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function wipFindHeader(matrix){
  const wanted=['coname','comname','comemo','conote','conum','counit','cofinish','counum','coufinish','cowidth','coproc','cosproc','comate','cokeydate'];
  let best=null;
  for(let r=0;r<Math.min(matrix.length,50);r++){
    const row=matrix[r]||[],map={};
    row.forEach((v,i)=>{const k=wipNormHeader(v);if(k)map[k]=i;});
    const score=wanted.filter(k=>map[k]!=null).length;
    if(!best||score>best.score)best={row:r,map,score};
  }
  return best;
}
function wipExtractMsk(text){
  const s=String(text||'').toUpperCase(),found=[];
  const re=/(?:^|[^A-Z0-9])(MPW|SPW|TD|MD|TT|MT|MY|MP|TK|MK)\s*[-:]?\s*([A-Z0-9]{3,})/g;let m;
  while((m=re.exec(s))){const code=(m[1]+m[2]).replace(/[^A-Z0-9]/g,'');if(/\d/.test(code)&&code.length>=5)found.push({type:m[1],code});}
  const uniq=[],seen=new Set();found.forEach(x=>{const k=x.type+'|'+x.code;if(!seen.has(k)){seen.add(k);uniq.push(x);}});return uniq;
}
function wipExcelDate(v){
  if(v==null||v==='')return null;
  if(v instanceof Date&&!isNaN(v))return new Date(v.getFullYear(),v.getMonth(),v.getDate());
  if(typeof v==='number'&&v>1000){const d=new Date(Date.UTC(1899,11,30)+Math.round(v)*86400000);return new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());}
  const s=String(v).trim();let m=s.match(/(20\d{2})[\/-](\d{1,2})[\/-](\d{1,2})/);if(m)return new Date(+m[1],+m[2]-1,+m[3]);
  m=s.match(/(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})/);if(m)return new Date(+m[3],+m[2]-1,+m[1]);
  const d=new Date(s);return isNaN(d)?null:new Date(d.getFullYear(),d.getMonth(),d.getDate());
}
function wipDateFmt(d){return d&&!isNaN(d)?`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`:'';}
function wipAddWorkdaysNoSunday(d,days){if(!d)return null;const x=new Date(d);let n=0;while(n<days){x.setDate(x.getDate()+1);if(x.getDay()!==0)n++;}return x;}
function wipDaysLate(deadline){if(!deadline)return 0;const today=new Date();today.setHours(0,0,0,0);if(today<=deadline)return 0;return Math.floor((today-deadline)/86400000);}
function wipPcFromOriginal(unit,unfinished){const u=String(unit||'').toUpperCase().replace(/\s/g,'');if(/(^|[^A-Z])9P|PC|PCS|PIECE|CÁI|CAI/.test(u)||u==='9P')return unfinished;if(u==='9D'||u.includes('DOZ'))return unfinished*12;if(u.includes('PAIR')||u.includes('ĐÔI')||u.includes('DOI')||u.includes('雙'))return unfinished*2;return null;}
function wipPairFromOriginal(unit,unfinished){const u=String(unit||'').toUpperCase().replace(/\s/g,'');if(/PC|PCS|PIECE|CÁI|CAI/.test(u)||u==='9P')return unfinished/2;if(u==='9D'||u.includes('DOZ'))return unfinished*6;if(u.includes('PAIR')||u.includes('ĐÔI')||u.includes('DOI')||u.includes('雙'))return unfinished;return null;}
function wipRowFromArray(row,map,rowNo){
  const get=k=>map[k]!=null?row[map[k]]:'';
  const source=[get('coname'),get('comname'),get('comemo'),get('conote')].filter(v=>v!=null&&String(v).trim()!=='').join(' | ');
  const hits=wipExtractMsk(source),types=[...new Set(hits.map(x=>x.type))],groups=[...new Set(types.map(t=>WIP_TYPE_META[t]?.group).filter(Boolean))];
  let judgement=groups.length?'OK':'未辨識 MSK / Chưa nhận MSK';
  const coNum=wipNum(get('conum')),coFinish=wipNum(get('cofinish')),unfinished=Math.max(0,coNum-coFinish);
  const unum=wipNum(get('counum')),ufinish=wipNum(get('coufinish')),unfinishedY=Math.max(0,unum-ufinish),width=wipWidthNum(get('cowidth')),eq25=width>0?unfinishedY*width/25:null;
  const unit=String(get('counit')??'').trim()||'空白',pc=wipPcFromOriginal(unit,unfinished),pairs=wipPairFromOriginal(unit,unfinished);
  const coProc=String(get('coproc')??'').trim(),coSproc=String(get('cosproc')??'').trim(),stage=(coProc.slice(0,2).toUpperCase()==='98'&&coSproc.toUpperCase()==='G100')?'ARRIVED':'NOT_ARRIVED';
  const stageLabel=stage==='ARRIVED'?'已到 98-G100 / Đã tới 98-G100':'未到 98-G100 / Chưa tới 98-G100';
  const mate=String(get('comate')??'').trim().toUpperCase(),routeStages=(wipRouteMap[mate]||[]).slice();
  const keyDate=wipExcelDate(get('cokeydate')),deadline=wipAddWorkdaysNoSunday(keyDate,30),lateDays=wipDaysLate(deadline),overdue=lateDays>0&&(unfinished>0||unfinishedY>0);
  if(width<=0&&groups.some(g=>g!=='FILM'))judgement=judgement==='OK'?'寬度待確認 / Cần kiểm tra khổ':judgement;
  return {rowNo,source,hits,msk:hits.map(x=>x.code).join(' / '),types,groups:groups.length?groups:['REVIEW'],printType:groups.length?groups.map(g=>WIP_PROCESS_META[g].name).join(' + '):WIP_PROCESS_META.REVIEW.name,unit,width,coNum,coFinish,unfinished,unum,ufinish,unfinishedY,eq25,pc,pairs,coProc,coSproc,stage,stageLabel,mate,routeStages,routeMatched:routeStages.length>0,keyDate,deadline,lateDays,overdue,judgement};
}
function wipReadWorkbook(file){if(typeof XLSX==='undefined')throw new Error('Excel 解析元件未載入，請確認網路後重新整理。');return file.arrayBuffer().then(buf=>XLSX.read(buf,{type:'array',cellDates:false,dense:false}));}
function wipLoadSettings(){
  try{wipRouteMap=JSON.parse(localStorage.getItem('wipRouteMapV28')||'null')||WIP_DEFAULT_ROUTE_MAP;}catch(e){wipRouteMap=WIP_DEFAULT_ROUTE_MAP;}
  try{wipCapacity={...WIP_DEFAULT_CAPACITY,...JSON.parse(localStorage.getItem('wipCapacityV28')||'{}')};}catch(e){wipCapacity={...WIP_DEFAULT_CAPACITY};}
  try{wipRouteCapacity={...WIP_DEFAULT_ROUTE_CAPACITY,...JSON.parse(localStorage.getItem('wipRouteCapacityV28')||'{}')};}catch(e){wipRouteCapacity={...WIP_DEFAULT_ROUTE_CAPACITY};}
  const meta=localStorage.getItem('wipRouteMetaV28');if($('wipRouteStatus'))$('wipRouteStatus').textContent=meta||`內建製程表：2026/08/22，共 ${Object.keys(wipRouteMap).length.toLocaleString()} 個訂單料號`;
}
async function wipImportRouteFile(file){
  const status=$('wipRouteStatus');status.textContent='正在更新料號製程表…';
  try{
    const wb=await wipReadWorkbook(file),matrix=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:true});let hr=-1,mateCol=-1,condCol=-1;
    for(let r=0;r<Math.min(20,matrix.length);r++){(matrix[r]||[]).forEach((v,c)=>{const s=String(v||'').toLowerCase();if(mateCol<0&&(s.includes('mã sp đơn')||s.includes('訂單料號')))mateCol=c;if(condCol<0&&(s.includes('điều kiện sản xuất')||s.includes('生產條件')))condCol=c;});if(mateCol>=0&&condCol>=0){hr=r;break;}}
    if(hr<0)throw new Error('找不到「Mã SP Đơn 訂單料號」或「điều kiện sản xuất 生產條件」欄位。');
    const m={};for(let r=hr+1;r<matrix.length;r++){const mate=String((matrix[r]||[])[mateCol]||'').trim().toUpperCase();if(!mate)continue;const cond=String((matrix[r]||[])[condCol]||'').toUpperCase(),st=[...new Set(cond.match(/G1000[1-9]/g)||[])];if(st.length)m[mate]=[...new Set([...(m[mate]||[]),...st])].sort();}
    if(!Object.keys(m).length)throw new Error('沒有解析到 G10001～G10009。');
    wipRouteMap=m;localStorage.setItem('wipRouteMapV28',JSON.stringify(m));const meta=`目前製程表：${file.name}｜${Object.keys(m).length.toLocaleString()} 個訂單料號｜${new Date().toLocaleString()}`;localStorage.setItem('wipRouteMetaV28',meta);status.textContent=meta;
    if(wipRows.length){wipRows.forEach(r=>{r.routeStages=(wipRouteMap[r.mate]||[]).slice();r.routeMatched=r.routeStages.length>0;});wipBuildFilters();wipRender();}
  }catch(err){status.textContent='⚠ '+(err.message||err);}
}
async function wipImportFile(file){
  const status=$('wipStatus');status.textContent='正在讀取 Excel… / Đang đọc Excel…';$('wipFileName').textContent=file.name;
  try{
    const wb=await wipReadWorkbook(file);let chosen=null;
    for(const name of wb.SheetNames){const matrix=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:true});const h=wipFindHeader(matrix);if(!chosen||h.score>chosen.h.score)chosen={name,matrix,h};if(h.score>=14)break;}
    const req=['coname','comname','comemo','conote','conum','counit','cofinish','counum','coufinish','cowidth','coproc','cosproc','comate','cokeydate'];if(!chosen||chosen.h.score<10)throw new Error('找不到必要欄位。');const missing=req.filter(k=>chosen.h.map[k]==null);if(missing.length)throw new Error('缺少欄位 / Thiếu cột: '+missing.join(', '));
    wipRows=[];wipSourceHeaders=(chosen.matrix[chosen.h.row]||[]).slice();wipSourceRowMap=new Map();wipSourceSheetName=chosen.name;
    for(let r=chosen.h.row+1;r<chosen.matrix.length;r++){const arr=chosen.matrix[r]||[];if(arr.every(v=>v==null||String(v).trim()===''))continue;const rowNo=r+1;wipSourceRowMap.set(rowNo,arr.slice());wipRows.push(wipRowFromArray(arr,chosen.h.map,rowNo));}
    wipQuick='ALL';wipPage=1;wipBuildFilters();$('wipAnalysisArea').classList.remove('hidden');status.textContent=`已完成：${chosen.name}，共 ${wipFmt(wipRows.length)} 筆 / Hoàn tất ${wipFmt(wipRows.length)} dòng`;wipRender();
  }catch(err){console.error(err);status.textContent='⚠ '+(err.message||err);$('wipAnalysisArea').classList.add('hidden');}
}
function wipQuickMatch(r,key){const gs=r.groups||[];if(key==='ALL')return true;if(key==='HAND_TOTAL')return gs.some(g=>['HAND','HAND_TRANSFER'].includes(g));if(key==='MACHINE_TOTAL')return gs.some(g=>['MACHINE','MACHINE_TRANSFER'].includes(g));if(key==='TRANSFER')return gs.some(g=>['HAND_TRANSFER','MACHINE_TRANSFER'].includes(g));if(key==='FILM')return gs.includes('FILM');if(key==='REVIEW')return gs.includes('REVIEW')||r.judgement!=='OK';return gs.includes(key);}
function wipBuildFilters(){
  const setOpts=(id,vals)=>{const el=$(id);if(!el)return;const old=el.value;el.innerHTML='<option value="ALL">全部 / Tất cả</option>'+vals.map(v=>`<option value="${wipEsc(v)}">${wipEsc(v)}</option>`).join('');if([...el.options].some(o=>o.value===old))el.value=old;};
  setOpts('wipTypeFilter',[...new Set(wipRows.flatMap(r=>r.types))].sort());setOpts('wipUnitFilter',[...new Set(wipRows.map(r=>r.unit))].sort());setOpts('wipWidthFilter',[...new Set(wipRows.map(r=>r.width>0?String(r.width):'待確認'))].sort((a,b)=>parseFloat(a)-parseFloat(b)));const re=$('wipRouteFilter'),oldRoute=re.value;re.innerHTML='<option value="ALL">全部 / Tất cả</option>'+Object.entries(WIP_ROUTE_META).map(([k,m])=>`<option value="${k}">${k}｜${wipEsc(m.name)}</option>`).join('');if([...re.options].some(o=>o.value===oldRoute))re.value=oldRoute;
}
function wipApplyFilters(){
  const type=$('wipTypeFilter').value,unit=$('wipUnitFilter').value,width=$('wipWidthFilter').value,stage=$('wipStageFilter').value,od=$('wipOverdueFilter').value,route=$('wipRouteFilter').value,q=$('wipSearch').value.trim().toUpperCase();
  wipFiltered=wipRows.filter(r=>wipQuickMatch(r,wipQuick)&&(type==='ALL'||r.types.includes(type))&&(unit==='ALL'||r.unit===unit)&&(width==='ALL'||(width==='待確認'?r.width<=0:String(r.width)===width))&&(stage==='ALL'||r.stage===stage)&&(od==='ALL'||(od==='OVERDUE'?r.overdue:!r.overdue))&&(route==='ALL'||r.routeStages.includes(route))&&(!q||(`${r.msk} ${r.mate} ${r.source} ${r.printType} ${r.coProc} ${r.coSproc} ${r.routeStages.join(' ')}`).toUpperCase().includes(q)));
}
function wipSum(rows,key){return rows.reduce((s,r)=>s+(Number(r[key])||0),0);}
function wipRowsForProcess(rows,key){return rows.filter(r=>(r.groups||[]).includes(key));}
function wipProcessQty(rows,key){const a=wipRowsForProcess(rows,key);if(key==='FILM'){return {qty:a.reduce((s,r)=>s+(r.pairs==null?0:r.pairs),0),unit:'雙',unresolved:a.filter(r=>r.pairs==null).length};}return {qty:wipSum(a,'eq25'),unit:'Y',unresolved:a.filter(r=>r.eq25==null).length};}
function wipRenderActiveFilters(){
  const chips=[];const qmap={HAND_TOTAL:'手印總量',MACHINE_TOTAL:'機印總量',TRANSFER:'轉印',PAD:'移印',SPRAY:'噴塗',FILM:'膠片',REVIEW:'待確認'};if(wipQuick!=='ALL')chips.push(qmap[wipQuick]||wipQuick);
  [['wipTypeFilter','MSK'],['wipUnitFilter','單位'],['wipWidthFilter','寬度'],['wipStageFilter','98-G100'],['wipOverdueFilter','30天'],['wipRouteFilter','站別']].forEach(([id,l])=>{const e=$(id);if(e&&e.value!=='ALL')chips.push(`${l}: ${e.options[e.selectedIndex].text}`);});const q=$('wipSearch').value.trim();if(q)chips.push(`搜尋: ${q}`);
  $('wipActiveFilters').innerHTML=chips.length?'<b>目前 / Hiện tại：</b>'+chips.map(x=>`<span class="wip-filter-chip">${wipEsc(x)}</span>`).join(''):'<span class="wip-filter-chip all">目前：全部資料 / Hiện tại: tất cả</span>';
}
function wipRender(){
  wipApplyFilters();wipRenderActiveFilters();const rec=wipRows.filter(r=>!r.groups.includes('REVIEW')).length,review=wipRows.filter(r=>r.groups.includes('REVIEW')||r.judgement!=='OK').length;
  $('wipKpiRows').textContent=wipFmt(wipRows.length);$('wipKpiRecognized').textContent=wipFmt(rec);$('wipKpiReview').textContent=wipFmt(review);$('wipRouteUnmatched').textContent=wipFmt(wipRows.filter(r=>!r.routeMatched).length);$('wipFilteredRows').textContent=wipFmt(wipFiltered.length);$('wipFiltered25').textContent=wipFmt(wipSum(wipFiltered,'eq25'),0)+' Y';$('wipOverdue25').textContent=wipFmt(wipSum(wipFiltered.filter(r=>r.overdue),'eq25'),0)+' Y';$('wipArrived25').textContent=wipFmt(wipSum(wipFiltered.filter(r=>r.stage==='ARRIVED'),'eq25'),0)+' Y';
  wipRenderStageSummary();wipRenderProcessSummary();wipRenderCapacity();wipRenderOverdue();wipRenderRouteSummary();wipRenderDetails();
}
function wipCellQty(rows,key){const q=wipProcessQty(rows,key);return `${wipFmt(q.qty,0)} ${q.unit}${q.unresolved?` <small>⚠${q.unresolved}</small>`:''}`;}
function wipRenderStageSummary(){
  const keys=['HAND','HAND_TRANSFER','MACHINE','MACHINE_TRANSFER','PAD','SPRAY','FILM','REVIEW'],states=[['ARRIVED','已到98-G100'],['NOT_ARRIVED','未到98-G100'],['ALL','總計']];
  $('wipStageSummaryBody').innerHTML=states.map(([st,label])=>`<tr class="${st==='ALL'?'total-row':''}"><td><b>${label}</b></td>${keys.map(k=>{const rows=wipFiltered.filter(r=>(st==='ALL'||r.stage===st)&&r.groups.includes(k));return `<td><button type="button" class="wip-matrix-cell" data-process="${k}" data-stage="${st}">${wipCellQty(rows,k)}</button></td>`;}).join('')}</tr>`).join('');
}
function wipUnitBreakdown(rows,key){
  const a=wipRowsForProcess(rows,key),m=new Map();a.forEach(r=>{const x=m.get(r.unit)||{unit:r.unit,rows:0,n:0,f:0,u:0};x.rows++;x.n+=r.coNum;x.f+=r.coFinish;x.u+=r.unfinished;m.set(r.unit,x);});
  return `<div class="wip-inline-title"><b>${WIP_PROCESS_META[key].name}｜原始 CO_Unit</b></div><div class="table-scroll"><table class="wip-summary-table small"><thead><tr><th>CO_Unit</th><th>筆數</th><th>訂單量</th><th>已完工</th><th>未完工</th></tr></thead><tbody>${[...m.values()].sort((a,b)=>a.unit.localeCompare(b.unit,undefined,{numeric:true})).map(x=>`<tr><td>${wipEsc(x.unit)}</td><td>${wipFmt(x.rows)}</td><td>${wipFmt(x.n,2)}</td><td>${wipFmt(x.f,2)}</td><td><b>${wipFmt(x.u,2)}</b></td></tr>`).join('')||'<tr><td colspan="5">無資料</td></tr>'}</tbody></table></div>`;
}
function wipRenderProcessSummary(){
  const defs=[['HAND'],['HAND_TRANSFER'],['HAND_TOTAL'],['MACHINE'],['MACHINE_TRANSFER'],['MACHINE_TOTAL'],['PAD'],['SPRAY'],['FILM'],['REVIEW']];
  const name={HAND_TOTAL:'手印總量 / Tổng in tay',MACHINE_TOTAL:'機印總量 / Tổng in máy'};
  $('wipProcessSummaryBody').innerHTML=defs.map(([k])=>{
    if(k==='HAND_TOTAL'||k==='MACHINE_TOTAL'){const ks=k==='HAND_TOTAL'?['HAND','HAND_TRANSFER']:['MACHINE','MACHINE_TRANSFER'];const qty=ks.reduce((s,x)=>s+wipProcessQty(wipFiltered,x).qty,0),cnt=ks.reduce((s,x)=>s+wipRowsForProcess(wipFiltered,x).length,0);return `<tr class="total-row"><td><b>${name[k]}</b></td><td>${wipFmt(cnt)}</td><td><b>${wipFmt(qty,0)} Y</b></td><td>—</td></tr>`;}
    const a=wipRowsForProcess(wipFiltered,k),q=wipProcessQty(wipFiltered,k);return `<tr><td>${WIP_PROCESS_META[k].name}</td><td>${wipFmt(a.length)}</td><td><b>${wipFmt(q.qty,0)} ${q.unit}</b>${q.unresolved?` <span class="warn">⚠ ${q.unresolved}筆無法換算</span>`:''}</td><td><button type="button" class="wip-unit-btn" data-unit-process="${k}">看單位 / Xem</button></td></tr>`;
  }).join('');
}
function wipCapacityInput(key){return `<input class="wip-cap-input" type="number" min="0" step="any" data-cap-key="${key}" value="${Number(wipCapacity[key]||0)}">`;}
function wipDays(qty,cap24,h){if(!(qty>0))return 0;return cap24>0?qty/(cap24*h/24):null;}
function wipSharedDays(q1,c1,q2,c2,h){const a=wipDays(q1,c1,h),b=wipDays(q2,c2,h);if(a==null||b==null)return null;return a+b;}
function wipDayTxt(v){return v==null?'待設定':(Number.isFinite(v)?wipFmt(v,2)+' 天':'—');}
function wipRenderCapacity(){
  const plan=Number($('wipPlanHours').value)||24,entries=[];
  const add=(key,label,resource=true)=>{const q=wipProcessQty(wipFiltered,key);entries.push({key,label,qty:q.qty,unit:q.unit,cap:wipCapacity[key]||0,resource});};
  add('HAND','手印',false);add('HAND_TRANSFER','手印→轉印',false);
  const hq=wipProcessQty(wipFiltered,'HAND').qty,htq=wipProcessQty(wipFiltered,'HAND_TRANSFER').qty;entries.push({key:'HAND_SHARED',label:'手印共用桌總負荷',qty:null,unit:'',cap:null,resource:true,custom:h=>wipSharedDays(hq,wipCapacity.HAND||0,htq,wipCapacity.HAND_TRANSFER||0,h)});
  add('MACHINE','機印',false);add('MACHINE_TRANSFER','機印→轉印',false);const mq=wipProcessQty(wipFiltered,'MACHINE').qty,mtq=wipProcessQty(wipFiltered,'MACHINE_TRANSFER').qty;entries.push({key:'MACHINE_SHARED',label:'機印共用設備總負荷',qty:null,unit:'',cap:null,resource:true,custom:h=>wipSharedDays(mq,wipCapacity.MACHINE||0,mtq,wipCapacity.MACHINE_TRANSFER||0,h)});
  add('PAD','移印');add('SPRAY','噴塗');add('FILM','膠片');
  let bottleneck=null,best=-1;entries.filter(x=>x.resource).forEach(x=>{const d=x.custom?x.custom(plan):wipDays(x.qty,x.cap,plan);if(d!=null&&d>best){best=d;bottleneck=x;}});
  $('wipCapacityBody').innerHTML=entries.map(x=>{const d12=x.custom?x.custom(12):wipDays(x.qty,x.cap,12),d16=x.custom?x.custom(16):wipDays(x.qty,x.cap,16),d24=x.custom?x.custom(24):wipDays(x.qty,x.cap,24),isShared=x.key.includes('SHARED'),isBottle=bottleneck&&bottleneck.key===x.key;return `<tr class="${isShared?'total-row ':''}${isBottle?'bottleneck-row':''}"><td><b>${x.label}</b></td><td>${x.qty==null?'依子製程換算工時':`${wipFmt(x.qty,0)} ${x.unit}`}</td><td>${x.cap==null?'—':wipCapacityInput(x.key)}</td><td>${wipDayTxt(d12)}</td><td>${wipDayTxt(d16)}</td><td>${wipDayTxt(d24)}</td><td>${isBottle?'🔴 瓶頸 / Nút thắt':''}</td></tr>`;}).join('');
  $('wipBottleneck').innerHTML=bottleneck?`依目前選擇 <b>${plan}H</b>：瓶頸製程為 <b>${bottleneck.label}</b>，約需 <b>${wipFmt(best,2)} 天</b>。可優先調人或增加工時。`:'尚未有足夠產能資料判斷瓶頸。';
}
function wipRenderOverdue(){
  const defs=[['手印總量',['HAND','HAND_TRANSFER'],'Y'],['機印總量',['MACHINE','MACHINE_TRANSFER'],'Y'],['移印',['PAD'],'Y'],['噴塗',['SPRAY'],'Y'],['膠片',['FILM'],'雙']];
  $('wipOverdueSummaryBody').innerHTML=defs.map(([name,ks,unit])=>{const base=wipFiltered.filter(r=>r.overdue),cnt=ks.reduce((s,k)=>s+wipRowsForProcess(base,k).length,0),qty=ks.reduce((s,k)=>s+wipProcessQty(base,k).qty,0);return `<tr><td>${name}</td><td>${wipFmt(cnt)}</td><td><b>${wipFmt(qty,0)} ${unit}</b></td></tr>`;}).join('');
}
function wipRouteRows(code){return wipFiltered.filter(r=>r.routeStages.includes(code));}
function wipRouteQty(rows,meta){
  if(meta.unit==='Y25')return {qty:wipSum(rows,'eq25'),unit:'Y',unresolved:rows.filter(r=>r.eq25==null).length,secondary:''};
  if(meta.unit==='PC'||meta.unit==='PC_Y25'){const vals=rows.filter(r=>r.pc!=null),qty=vals.reduce((s,r)=>s+r.pc,0),unresolved=rows.length-vals.length,secondary=meta.unit==='PC_Y25'?`${wipFmt(wipSum(rows,'eq25'),0)} Y (25MM)`:'';return {qty,unit:'PC',unresolved,secondary};}
  if(meta.unit==='PAIR'){const vals=rows.filter(r=>r.pairs!=null),qty=vals.reduce((s,r)=>s+r.pairs,0);return {qty,unit:'雙',unresolved:rows.length-vals.length,secondary:''};}
  return {qty:0,unit:'',unresolved:0,secondary:''};
}
function wipRouteCapInput(code){return `<input class="wip-cap-input" type="number" min="0" step="any" data-route-cap="${code}" value="${Number(wipRouteCapacity[code]||0)}">`;}
function wipRenderRouteSummary(){
  const printDays={12:null,16:null,24:null};[12,16,24].forEach(h=>{const hq=wipProcessQty(wipFiltered.filter(r=>r.routeStages.includes('G10001')),'HAND').qty,htq=wipProcessQty(wipFiltered.filter(r=>r.routeStages.includes('G10001')),'HAND_TRANSFER').qty,mq=wipProcessQty(wipFiltered.filter(r=>r.routeStages.includes('G10001')),'MACHINE').qty,mtq=wipProcessQty(wipFiltered.filter(r=>r.routeStages.includes('G10001')),'MACHINE_TRANSFER').qty,pq=wipProcessQty(wipFiltered.filter(r=>r.routeStages.includes('G10001')),'PAD').qty,sq=wipProcessQty(wipFiltered.filter(r=>r.routeStages.includes('G10001')),'SPRAY').qty,fq=wipProcessQty(wipFiltered.filter(r=>r.routeStages.includes('G10001')),'FILM').qty;const vals=[wipSharedDays(hq,wipCapacity.HAND,htq,wipCapacity.HAND_TRANSFER,h),wipSharedDays(mq,wipCapacity.MACHINE,mtq,wipCapacity.MACHINE_TRANSFER,h),wipDays(pq,wipCapacity.PAD,h),wipDays(sq,wipCapacity.SPRAY,h),wipDays(fq,wipCapacity.FILM,h)].filter(v=>v!=null);printDays[h]=vals.length?Math.max(...vals):null;});
  $('wipRouteSummaryBody').innerHTML=Object.entries(WIP_ROUTE_META).map(([code,meta])=>{const rows=wipRouteRows(code),ar=rows.filter(r=>r.stage==='ARRIVED'),na=rows.filter(r=>r.stage==='NOT_ARRIVED');if(code==='G10001'){return `<tr><td><b>${code}</b></td><td>${meta.name}</td><td>${wipFmt(ar.length)}筆</td><td>${wipFmt(na.length)}筆</td><td>看上方印刷細分類</td><td>依印刷細分類</td><td>${wipDayTxt(printDays[12])}</td><td>${wipDayTxt(printDays[16])}</td><td>${wipDayTxt(printDays[24])}</td><td>天數取印刷瓶頸</td></tr>`;}
    const qa=wipRouteQty(ar,meta),qn=wipRouteQty(na,meta),qt=wipRouteQty(rows,meta),cap=wipRouteCapacity[code]||0,d12=wipDays(qt.qty,cap,12),d16=wipDays(qt.qty,cap,16),d24=wipDays(qt.qty,cap,24),note=[qt.secondary,qt.unresolved?`⚠ ${qt.unresolved}筆原單位無法換${qt.unit}`:''].filter(Boolean).join('；');return `<tr><td><b>${code}</b></td><td>${meta.name}</td><td>${wipFmt(qa.qty,0)} ${qa.unit}</td><td>${wipFmt(qn.qty,0)} ${qn.unit}</td><td><b>${wipFmt(qt.qty,0)} ${qt.unit}</b>${qt.secondary?`<br><small>${qt.secondary}</small>`:''}</td><td>${wipRouteCapInput(code)}</td><td>${wipDayTxt(d12)}</td><td>${wipDayTxt(d16)}</td><td>${wipDayTxt(d24)}</td><td>${note||'—'}</td></tr>`;}).join('');
}
function wipRenderDetails(){
  const pages=Math.max(1,Math.ceil(wipFiltered.length/WIP_PAGE_SIZE));if(wipPage>pages)wipPage=pages;const start=(wipPage-1)*WIP_PAGE_SIZE,rows=wipFiltered.slice(start,start+WIP_PAGE_SIZE);$('wipPageInfo').textContent=`${wipPage} / ${pages}（${wipFmt(wipFiltered.length)} 筆）`;$('wipPrevPage').disabled=wipPage<=1;$('wipNextPage').disabled=wipPage>=pages;
  $('wipDetailBody').innerHTML=rows.map(r=>`<tr class="${r.judgement==='OK'?'':'wip-review-row'}"><td>${r.rowNo}</td><td>${wipEsc(r.mate)||'—'}</td><td class="msk-cell">${wipEsc(r.msk)||'—'}</td><td>${wipEsc(r.types.join(', '))||'—'}</td><td>${wipEsc(r.printType)}</td><td>${wipEsc(r.routeStages.join(' / '))||'⚠未匹配'}</td><td><b>${r.stageLabel}</b></td><td>${wipEsc(r.coProc)||'—'}</td><td>${wipEsc(r.coSproc)||'—'}</td><td>${wipEsc(r.unit)}</td><td>${r.width>0?wipFmt(r.width,2):'⚠'}</td><td>${wipFmt(r.coNum,2)}</td><td>${wipFmt(r.coFinish,2)}</td><td><b>${wipFmt(r.unfinished,2)}</b></td><td>${wipFmt(r.unfinishedY,2)} Y</td><td>${r.eq25==null?'⚠':wipFmt(r.eq25,2)+' Y'}</td><td>${r.pc==null?'—':wipFmt(r.pc,2)}</td><td>${r.pairs==null?'—':wipFmt(r.pairs,2)}</td><td>${wipDateFmt(r.keyDate)||'—'}</td><td>${wipDateFmt(r.deadline)||'—'}</td><td>${r.lateDays||0}</td><td>${r.overdue?'🔴 超過30天':'—'}</td><td>${wipEsc(r.judgement)}</td></tr>`).join('')||'<tr><td colspan="23">沒有符合篩選條件的資料 / Không có dữ liệu phù hợp</td></tr>';
}
function wipResetFilters(){wipQuick='ALL';[...$('wipQuickFilters').querySelectorAll('button')].forEach(b=>b.classList.toggle('active',b.dataset.filter==='ALL'));['wipTypeFilter','wipUnitFilter','wipWidthFilter','wipStageFilter','wipOverdueFilter','wipRouteFilter'].forEach(id=>$(id).value='ALL');$('wipSearch').value='';wipPage=1;wipRender();}
function wipSaveCapacity(e){const el=e.target;if(el.matches('[data-cap-key]')){wipCapacity[el.dataset.capKey]=Math.max(0,Number(el.value)||0);localStorage.setItem('wipCapacityV28',JSON.stringify(wipCapacity));wipRenderCapacity();wipRenderRouteSummary();}if(el.matches('[data-route-cap]')){wipRouteCapacity[el.dataset.routeCap]=Math.max(0,Number(el.value)||0);localStorage.setItem('wipRouteCapacityV28',JSON.stringify(wipRouteCapacity));wipRenderRouteSummary();}}
async function wipExportCurrent(){
  if(!wipFiltered.length)return;const added=['擷取MSK','MSK類型','涉及印刷製程','G100需求站','98-G100狀態','原單位未完工','未完工折合碼Y','25MM等效未完工Y','可換算PC','可換算雙','CO_KEYDATE解析','30天期限','逾期天數','是否超30天','料號製程匹配','分析判斷'],heads=[...wipSourceHeaders,...added];
  const data=wipFiltered.map(r=>{const original=(wipSourceRowMap.get(r.rowNo)||[]).slice();while(original.length<wipSourceHeaders.length)original.push('');return [...original,r.msk,r.types.join(', '),r.printType,r.routeStages.join(' / '),r.stageLabel,r.unfinished,r.unfinishedY,r.eq25==null?'':r.eq25,r.pc==null?'':r.pc,r.pairs==null?'':r.pairs,wipDateFmt(r.keyDate),wipDateFmt(r.deadline),r.lateDays,r.overdue?'超過30天':'',r.routeMatched?'已匹配':'未匹配',r.judgement];});
  if(typeof ExcelJS==='undefined'){const ws=XLSX.utils.aoa_to_sheet([heads,...data]);ws['!autofilter']={ref:XLSX.utils.encode_range({r:0,c:0},{r:data.length,c:heads.length-1})};const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'明細');XLSX.writeFile(wb,'未完工產能分析_目前明細.xlsx');return;}
  const wb=new ExcelJS.Workbook();wb.creator='工廠工具箱';const detail=wb.addWorksheet('明細 Chi tiết',{views:[{state:'frozen',ySplit:1}]});detail.addRow(heads);data.forEach(x=>detail.addRow(x));detail.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,data.length+1),column:heads.length}};const a0=wipSourceHeaders.length+1;detail.getRow(1).height=34;detail.getRow(1).eachCell((c,col)=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:col>=a0?'FF1F6D5A':'FF17365D'}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});for(let c=1;c<=heads.length;c++)detail.getColumn(c).width=c>=a0?20:Math.min(30,Math.max(11,String(heads[c-1]||'').length+4));for(let r=2;r<=detail.rowCount;r++){const row=detail.getRow(r);row.height=20;row.eachCell((c,col)=>{c.alignment={vertical:'middle'};if(typeof c.value==='number')c.numFmt='#,##0.00';if(col>=a0)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF1F7F4'}};});const overdue=String(row.getCell(a0+13).value||'');const match=String(row.getCell(a0+14).value||'');if(overdue){for(let c=a0;c<=heads.length;c++)row.getCell(c).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFE5E5'}};}else if(match==='未匹配'){for(let c=a0;c<=heads.length;c++)row.getCell(c).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF2CC'}};}}
  function addSummary(name,headers,rows,widths){const ws=wb.addWorksheet(name,{views:[{state:'frozen',ySplit:1}]});ws.addRow(headers);rows.forEach(x=>ws.addRow(x));wipStyleSummarySheet(ws,widths);return ws;}
  const proc=[];for(const k of ['HAND','HAND_TRANSFER','MACHINE','MACHINE_TRANSFER','PAD','SPRAY','FILM','REVIEW']){const q=wipProcessQty(wipFiltered,k);proc.push([WIP_PROCESS_META[k].name,wipRowsForProcess(wipFiltered,k).length,q.qty,q.unit,q.unresolved]);}addSummary('製程統計 Thống kê',['製程','製程筆數','未完工標準量','單位','無法換算筆數'],proc,[34,14,22,12,18]);
  const stageRows=[['已到98-G100','ARRIVED'],['未到98-G100','NOT_ARRIVED'],['總計','ALL']].map(([n,s])=>[n,...['HAND','HAND_TRANSFER','MACHINE','MACHINE_TRANSFER','PAD','SPRAY','FILM'].map(k=>{const rr=wipFiltered.filter(r=>(s==='ALL'||r.stage===s)&&r.groups.includes(k));return wipProcessQty(rr,k).qty;})]);addSummary('98-G100',['狀態','手印Y','手印→轉印Y','機印Y','機印→轉印Y','移印Y','噴塗Y','膠片雙'],stageRows,[20,18,18,18,18,18,18,18]);
  const capRows=[];[['HAND','手印'],['HAND_TRANSFER','手印→轉印'],['MACHINE','機印'],['MACHINE_TRANSFER','機印→轉印'],['PAD','移印'],['SPRAY','噴塗'],['FILM','膠片']].forEach(([k,n])=>{const q=wipProcessQty(wipFiltered,k);capRows.push([n,q.qty,q.unit,wipCapacity[k]||0,wipDays(q.qty,wipCapacity[k]||0,12),wipDays(q.qty,wipCapacity[k]||0,16),wipDays(q.qty,wipCapacity[k]||0,24)]);});addSummary('產能天數 Năng lực',['製程','未完工','單位','24H標準產能','12H需天數','16H需天數','24H需天數'],capRows,[26,18,10,20,16,16,16]);
  const routeRows=[];for(const [code,meta] of Object.entries(WIP_ROUTE_META)){const rows=wipRouteRows(code);if(code==='G10001'){routeRows.push([code,meta.name,rows.length,'看印刷細分','','','','']);continue;}const q=wipRouteQty(rows,meta),cap=wipRouteCapacity[code]||0;routeRows.push([code,meta.name,q.qty,q.unit,q.secondary,cap,wipDays(q.qty,cap,12),wipDays(q.qty,cap,16),wipDays(q.qty,cap,24)]);}addSummary('G100各站',['站別','製程','未完工標準量','單位','附帶換算','24H標準產能','12H需天數','16H需天數','24H需天數'],routeRows,[12,40,20,12,22,20,16,16,16]);
  const od=[];for(const [n,ks,u] of [['手印總量',['HAND','HAND_TRANSFER'],'Y'],['機印總量',['MACHINE','MACHINE_TRANSFER'],'Y'],['移印',['PAD'],'Y'],['噴塗',['SPRAY'],'Y'],['膠片',['FILM'],'雙']]){const b=wipFiltered.filter(r=>r.overdue),cnt=ks.reduce((s,k)=>s+wipRowsForProcess(b,k).length,0),qty=ks.reduce((s,k)=>s+wipProcessQty(b,k).qty,0);od.push([n,cnt,qty,u]);}addSummary('超30天 Quá 30 ngày',['製程群組','超30天製程筆數','未完工標準量','單位'],od,[28,20,22,12]);
  const buf=await wb.xlsx.writeBuffer(),blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='未完工產能分析_目前明細_管理版.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function wipStyleSummarySheet(ws,widths){ws.getRow(1).height=30;ws.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF17365D'}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});widths.forEach((w,i)=>ws.getColumn(i+1).width=w);for(let r=2;r<=ws.rowCount;r++){const row=ws.getRow(r);row.height=21;row.eachCell((c,col)=>{c.alignment={vertical:'middle',horizontal:col===1?'left':'right'};if(typeof c.value==='number')c.numFmt='#,##0.00';});}}
function wipInit(){
  if(!$('wipExcelFile'))return;wipLoadSettings();
  $('wipExcelFile').addEventListener('change',e=>{const f=e.target.files?.[0];if(f)wipImportFile(f);});$('wipRouteFile').addEventListener('change',e=>{const f=e.target.files?.[0];if(f)wipImportRouteFile(f);});
  $('wipQuickFilters').addEventListener('click',e=>{const b=e.target.closest('button[data-filter]');if(!b)return;wipQuick=b.dataset.filter;[...$('wipQuickFilters').querySelectorAll('button')].forEach(x=>x.classList.toggle('active',x===b));wipPage=1;wipRender();});
  ['wipTypeFilter','wipUnitFilter','wipWidthFilter','wipStageFilter','wipOverdueFilter','wipRouteFilter'].forEach(id=>$(id).addEventListener('change',()=>{wipPage=1;wipRender();}));$('wipSearch').addEventListener('input',()=>{wipPage=1;wipRender();});$('wipClearFilters').addEventListener('click',wipResetFilters);$('wipPlanHours').addEventListener('change',()=>{wipRenderCapacity();});
  $('wipStageSummaryBody').addEventListener('click',e=>{const b=e.target.closest('[data-process]');if(!b)return;const st=b.dataset.stage,k=b.dataset.process,rows=wipFiltered.filter(r=>(st==='ALL'||r.stage===st)&&r.groups.includes(k));const box=$('wipStageUnitDetail');box.innerHTML=wipUnitBreakdown(rows,k);box.classList.remove('hidden');});
  $('wipProcessSummaryBody').addEventListener('click',e=>{const b=e.target.closest('[data-unit-process]');if(!b)return;const box=$('wipProcessUnitDetail');box.innerHTML=wipUnitBreakdown(wipFiltered,b.dataset.unitProcess);box.classList.remove('hidden');});
  $('wipCapacityBody').addEventListener('change',wipSaveCapacity);$('wipRouteSummaryBody').addEventListener('change',wipSaveCapacity);$('wipPrevPage').addEventListener('click',()=>{if(wipPage>1){wipPage--;wipRenderDetails();}});$('wipNextPage').addEventListener('click',()=>{if(wipPage*WIP_PAGE_SIZE<wipFiltered.length){wipPage++;wipRenderDetails();}});$('wipExportBtn').addEventListener('click',wipExportCurrent);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wipInit);else wipInit();
