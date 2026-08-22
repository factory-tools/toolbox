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



/* V25 未完工產能分析 / Phân tích năng suất chưa hoàn thành */
const WIP_PAGE_SIZE=100;
let wipRows=[],wipFiltered=[],wipPage=1,wipQuick='ALL';
const WIP_TYPE_META={
  TD:{name:'手印 / IN TAY',group:'HAND'}, SPW:{name:'手印 / IN TAY',group:'HAND'},
  MD:{name:'機印 / IN MÁY',group:'MACHINE'}, MPW:{name:'機印 / IN MÁY',group:'MACHINE'},
  TT:{name:'手印→轉印 / IN TAY TEM IN CHUYỂN',group:'HAND_TRANSFER'},
  MT:{name:'機印→轉印 / IN MÁY IN TEM CHUYỂN',group:'MACHINE_TRANSFER'},
  MY:{name:'移印 / IN CHẤM',group:'PAD'}, MP:{name:'噴塗 / PHUN SILICON',group:'SPRAY'},
  TK:{name:'手印－膠片類 / IN TAY ĐẦU KEO',group:'FILM_HAND'},
  MK:{name:'機印－膠片類 / IN MÁY ĐẦU KEO',group:'FILM_MACHINE'}
};
function wipNormHeader(v){return String(v==null?'':v).trim().toLowerCase().replace(/[\\/\s_-]+/g,'');}
function wipNum(v){if(v==null||v==='')return 0;if(typeof v==='number')return Number.isFinite(v)?v:0;const m=String(v).replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):0;}
function wipWidthNum(v){const n=wipNum(v);return n>0?n:0;}
function wipFmt(n,d=0){return Number(n||0).toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:0});}
function wipFindHeader(matrix){
  const required=['coname','comname','comemo','conote','conum','counit','cofinish','counum','coufinish','cowidth'];
  let best=null;
  for(let r=0;r<Math.min(matrix.length,40);r++){
    const row=matrix[r]||[], map={}; row.forEach((v,i)=>{const k=wipNormHeader(v);if(k)map[k]=i;});
    const score=required.filter(k=>map[k]!=null).length;
    if(!best||score>best.score)best={row:r,map,score};
  }
  return best;
}
function wipExtractMsk(text){
  const s=String(text||'').toUpperCase(); const found=[]; const re=/(?:^|[^A-Z0-9])(MPW|SPW|TD|MD|TT|MT|MY|MP|TK|MK)\s*[-:]?\s*([A-Z0-9]{3,})/g; let m;
  while((m=re.exec(s))){const code=(m[1]+m[2]).replace(/[^A-Z0-9]/g,'');if(/\d/.test(code)&&code.length>=5)found.push({type:m[1],code});}
  const uniq=[]; const seen=new Set(); found.forEach(x=>{const k=x.type+'|'+x.code;if(!seen.has(k)){seen.add(k);uniq.push(x);}}); return uniq;
}
function wipGroupLabel(group){return ({HAND:'手印 / In tay',MACHINE:'機印 / In máy',HAND_TRANSFER:'手印→轉印 / In tay chuyển',MACHINE_TRANSFER:'機印→轉印 / In máy chuyển',PAD:'移印 / In chấm',SPRAY:'噴塗 / Phun silicon',FILM_HAND:'手印膠片 / In tay đầu keo',FILM_MACHINE:'機印膠片 / In máy đầu keo',REVIEW:'待確認 / Cần kiểm tra'})[group]||group;}
function wipRowFromArray(row,map,rowNo){
  const get=(k)=>map[k]!=null?row[map[k]]:'';
  const source=[get('coname'),get('comname'),get('comemo'),get('conote')].filter(v=>v!=null&&String(v).trim()!=='').join(' | ');
  const hits=wipExtractMsk(source),types=[...new Set(hits.map(x=>x.type))];
  let type='',group='REVIEW',judgement='未辨識 MSK / Chưa nhận MSK';
  if(types.length===1){type=types[0];group=WIP_TYPE_META[type].group;judgement='OK';}
  else if(types.length>1){judgement='多種類型：'+types.join(', ')+' / Nhiều loại';}
  const coNum=wipNum(get('conum')),coFinish=wipNum(get('cofinish')),unfinished=Math.max(0,coNum-coFinish);
  const unum=wipNum(get('counum')),ufinish=wipNum(get('coufinish')),unfinishedY=Math.max(0,unum-ufinish),width=wipWidthNum(get('cowidth'));
  let eq25=width>0?unfinishedY*width/25:null;
  if(width<=0&&judgement==='OK')judgement='寬度待確認 / Cần kiểm tra khổ';
  return {rowNo,msk:hits.map(x=>x.code).join(' / '),type,group,printType:type?WIP_TYPE_META[type].name:'待確認 / Cần kiểm tra',unit:String(get('counit')??'').trim()||'空白',widthRaw:get('cowidth'),width,coNum,coFinish,unfinished,unum,ufinish,unfinishedY,eq25,judgement,source};
}
function wipReadWorkbook(file){
  if(typeof XLSX==='undefined'){throw new Error('Excel 解析元件未載入，請確認網路可連線後重新整理。 / Không tải được bộ đọc Excel.');}
  return file.arrayBuffer().then(buf=>XLSX.read(buf,{type:'array',cellDates:false,dense:false}));
}
async function wipImportFile(file){
  const status=$('wipStatus'); status.textContent='正在讀取 Excel… / Đang đọc Excel…'; $('wipFileName').textContent=file.name;
  try{
    const wb=await wipReadWorkbook(file); let chosen=null;
    for(const name of wb.SheetNames){const matrix=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:true});const h=wipFindHeader(matrix);if(h&&h.score>=7){chosen={name,matrix,h};break;}if(!chosen||h.score>chosen.h.score)chosen={name,matrix,h};}
    if(!chosen||chosen.h.score<7)throw new Error('找不到必要欄位。至少需要 co_name、co_mname、co_memo、co_note、CO_Num、CO_Unit、CO_FINISH、co_unum、co_ufinish、CO_Width。');
    const missing=['coname','comname','comemo','conote','conum','counit','cofinish','counum','coufinish','cowidth'].filter(k=>chosen.h.map[k]==null);
    if(missing.length)throw new Error('缺少欄位 / Thiếu cột: '+missing.join(', '));
    wipRows=[];
    for(let r=chosen.h.row+1;r<chosen.matrix.length;r++){const arr=chosen.matrix[r]||[];if(arr.every(v=>v==null||String(v).trim()===''))continue;wipRows.push(wipRowFromArray(arr,chosen.h.map,r+1));}
    wipQuick='ALL'; wipPage=1; wipBuildFilters(); $('wipAnalysisArea').classList.remove('hidden');
    status.textContent=`已完成：${chosen.name}，共 ${wipFmt(wipRows.length)} 筆 / Hoàn tất: ${wipFmt(wipRows.length)} dòng`;
    wipRender();
  }catch(err){console.error(err);status.textContent='⚠ '+(err&&err.message?err.message:String(err));$('wipAnalysisArea').classList.add('hidden');}
}
function wipQuickMatch(r,key){
  if(key==='ALL')return true;if(key==='HAND_TOTAL')return ['HAND','HAND_TRANSFER'].includes(r.group);if(key==='MACHINE_TOTAL')return ['MACHINE','MACHINE_TRANSFER'].includes(r.group);if(key==='TRANSFER')return ['HAND_TRANSFER','MACHINE_TRANSFER'].includes(r.group);if(key==='PAD')return r.group==='PAD';if(key==='SPRAY')return r.group==='SPRAY';if(key==='FILM')return ['FILM_HAND','FILM_MACHINE'].includes(r.group);if(key==='REVIEW')return r.group==='REVIEW'||r.judgement!=='OK';return true;
}
function wipBuildFilters(){
  const setOpts=(id,vals)=>{const el=$(id);el.innerHTML='<option value="ALL">全部 / Tất cả</option>'+vals.map(v=>`<option value="${String(v).replace(/"/g,'&quot;')}">${v}</option>`).join('');};
  setOpts('wipTypeFilter',[...new Set(wipRows.map(r=>r.type).filter(Boolean))].sort());
  setOpts('wipUnitFilter',[...new Set(wipRows.map(r=>r.unit))].sort());
  setOpts('wipWidthFilter',[...new Set(wipRows.map(r=>r.width>0?String(r.width):'待確認'))].sort((a,b)=>parseFloat(a)-parseFloat(b)));
}
function wipApplyFilters(){
  const type=$('wipTypeFilter').value,unit=$('wipUnitFilter').value,width=$('wipWidthFilter').value,q=$('wipSearch').value.trim().toUpperCase();
  wipFiltered=wipRows.filter(r=>wipQuickMatch(r,wipQuick)&&(type==='ALL'||r.type===type)&&(unit==='ALL'||r.unit===unit)&&(width==='ALL'||(width==='待確認'?r.width<=0:String(r.width)===width))&&(!q||(r.msk+' '+r.source+' '+r.printType).toUpperCase().includes(q)));
}
function wipSum(rows,key){return rows.reduce((s,r)=>s+(Number(r[key])||0),0);}
function wipRender(){
  wipApplyFilters(); const allRec=wipRows.filter(r=>r.type).length,review=wipRows.filter(r=>r.group==='REVIEW'||r.judgement!=='OK').length;
  $('wipKpiRows').textContent=wipFmt(wipRows.length);$('wipKpiRecognized').textContent=wipFmt(allRec);$('wipKpiReview').textContent=wipFmt(review);$('wipKpi25').textContent=wipFmt(wipSum(wipRows,'eq25'),0)+' Y';
  $('wipFilteredRows').textContent=wipFmt(wipFiltered.length);$('wipFilteredYards').textContent=wipFmt(wipSum(wipFiltered,'unfinishedY'),0)+' Y';$('wipFiltered25').textContent=wipFmt(wipSum(wipFiltered,'eq25'),0)+' Y';
  wipRenderProcessSummary();wipRenderUnitSummary();wipRenderDetails();
}
function wipRenderProcessSummary(){
  const defs=[['手印 / In tay',['HAND']],['手印→轉印 / In tay chuyển',['HAND_TRANSFER']],['手印總量 / Tổng in tay',['HAND','HAND_TRANSFER']],['機印 / In máy',['MACHINE']],['機印→轉印 / In máy chuyển',['MACHINE_TRANSFER']],['機印總量 / Tổng in máy',['MACHINE','MACHINE_TRANSFER']],['轉印總量 / Tổng in chuyển',['HAND_TRANSFER','MACHINE_TRANSFER']],['移印總量 / Tổng in chấm',['PAD']],['噴塗總量 / Tổng phun silicon',['SPRAY']],['膠片總量 / Tổng đầu keo',['FILM_HAND','FILM_MACHINE']],['待確認 / Cần kiểm tra',['REVIEW']]];
  $('wipProcessSummaryBody').innerHTML=defs.map(([name,groups])=>{const a=wipFiltered.filter(r=>groups.includes(r.group));return `<tr class="${name.includes('總量')?'total-row':''}"><td>${name}</td><td>${wipFmt(a.length)}</td><td>${wipFmt(wipSum(a,'unfinishedY'),0)} Y</td><td><b>${wipFmt(wipSum(a,'eq25'),0)} Y</b></td></tr>`;}).join('');
}
function wipRenderUnitSummary(){
  const map=new Map();wipFiltered.forEach(r=>{if(!map.has(r.unit))map.set(r.unit,{n:0,f:0,u:0});const x=map.get(r.unit);x.n+=r.coNum;x.f+=r.coFinish;x.u+=r.unfinished;});
  $('wipUnitSummaryBody').innerHTML=[...map.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0]))).map(([u,x])=>`<tr><td><b>${u}</b></td><td>${wipFmt(x.n,2)}</td><td>${wipFmt(x.f,2)}</td><td><b>${wipFmt(x.u,2)}</b></td></tr>`).join('')||'<tr><td colspan="4">無資料 / Không có dữ liệu</td></tr>';
}
function wipRenderDetails(){
  const pages=Math.max(1,Math.ceil(wipFiltered.length/WIP_PAGE_SIZE));if(wipPage>pages)wipPage=pages;const start=(wipPage-1)*WIP_PAGE_SIZE,rows=wipFiltered.slice(start,start+WIP_PAGE_SIZE);
  $('wipPageInfo').textContent=`${wipPage} / ${pages}（${wipFmt(wipFiltered.length)} 筆）`;
  $('wipPrevPage').disabled=wipPage<=1;$('wipNextPage').disabled=wipPage>=pages;
  $('wipDetailBody').innerHTML=rows.map(r=>`<tr class="${r.judgement==='OK'?'':'wip-review-row'}"><td>${r.rowNo}</td><td class="msk-cell">${r.msk||'—'}</td><td>${r.type||'—'}</td><td>${r.printType}</td><td>${r.unit}</td><td>${r.width>0?wipFmt(r.width,2):'⚠'}</td><td>${wipFmt(r.coNum,2)}</td><td>${wipFmt(r.coFinish,2)}</td><td><b>${wipFmt(r.unfinished,2)}</b></td><td>${wipFmt(r.unum,2)}</td><td>${wipFmt(r.ufinish,2)}</td><td><b>${wipFmt(r.unfinishedY,2)} Y</b></td><td><b>${r.eq25==null?'⚠':wipFmt(r.eq25,2)+' Y'}</b></td><td>${r.judgement}</td><td class="source-cell" title="${String(r.source).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}">${String(r.source).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td></tr>`).join('')||'<tr><td colspan="15">沒有符合篩選條件的資料 / Không có dữ liệu phù hợp</td></tr>';
}
function wipExportCurrent(){
  if(!wipFiltered.length)return;
  const heads=['Excel列','MSK','MSK類型','印刷分類','CO_Unit','CO_Width','CO_Num','CO_FINISH','原單位未完工','co_unum','co_ufinish','未完工折合碼Y','25MM等效未完工Y','判斷','來源內容'];
  const data=wipFiltered.map(r=>[r.rowNo,r.msk,r.type,r.printType,r.unit,r.widthRaw,r.coNum,r.coFinish,r.unfinished,r.unum,r.ufinish,r.unfinishedY,r.eq25==null?'':r.eq25,r.judgement,r.source]);
  if(typeof XLSX!=='undefined'){const ws=XLSX.utils.aoa_to_sheet([heads,...data]);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'未完工明細');XLSX.writeFile(wb,'未完工產能分析_目前明細.xlsx');}
}
function wipInit(){
  if(!$('wipExcelFile'))return;
  $('wipExcelFile').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(f)wipImportFile(f);});
  $('wipQuickFilters').addEventListener('click',e=>{const b=e.target.closest('button[data-filter]');if(!b)return;wipQuick=b.dataset.filter;[...$('wipQuickFilters').querySelectorAll('button')].forEach(x=>x.classList.toggle('active',x===b));wipPage=1;wipRender();});
  ['wipTypeFilter','wipUnitFilter','wipWidthFilter'].forEach(id=>$(id).addEventListener('change',()=>{wipPage=1;wipRender();}));
  $('wipSearch').addEventListener('input',()=>{wipPage=1;wipRender();});
  $('wipPrevPage').addEventListener('click',()=>{if(wipPage>1){wipPage--;wipRenderDetails();}});$('wipNextPage').addEventListener('click',()=>{if(wipPage*WIP_PAGE_SIZE<wipFiltered.length){wipPage++;wipRenderDetails();}});$('wipExportBtn').addEventListener('click',wipExportCurrent);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wipInit);else wipInit();
