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
function exportExcel(){
  try{
    const rows=[...$('orderBody').rows];
    const valid=rows.filter(r=>r.dataset.yards&&!r.classList.contains('row-error'));
    if(!valid.length){$('printingStatus').className='status warn';$('printingStatus').textContent='目前沒有可下載的完整資料 / Hiện không có dữ liệu đầy đủ để tải';return;}
    const headers=['項次 STT','訂單量 SL đơn hàng','單位 Đơn vị','寬度 mm Khổ mm','長度 mm Dài mm','印刷方式 Phương pháp','單／雙面 Một／hai mặt','換算碼數 Y Số yard','每桌碼數 Y Y mỗi bàn','每桌約可印 PC PC mỗi bàn','每桌約可印雙 Đôi mỗi bàn','實際桌數 Số bàn thực tế','排程桌數 Số bàn kế hoạch','所需工時 Giờ cần'];
    const dataRows=valid.map((tr,i)=>{
      const unitLabel={Y:'Y / yard',M:'M / mét',PC:'PC',PAIR:'雙 / đôi'}[tr.querySelector('.o-unit').value]||tr.querySelector('.o-unit').value;
      const methodLabel=tr.querySelector('.o-method').value==='K3'?'K3':'手印 / In tay';
      const sideLabel=tr.querySelector('.o-side').value==='DOUBLE'?'雙面 / Hai mặt':'單面 / Một mặt';
      const num=t=>Number(String(t).replace(/,/g,'').replace(/[^0-9.\-]/g,''))||0;
      return [i+1,Number(tr.querySelector('.o-qty').value)||0,unitLabel,Number(tr.querySelector('.o-width').value)||0,Number(tr.querySelector('.o-length').value)||0,methodLabel,sideLabel,Number(tr.dataset.yards)||0,num(tr.querySelector('.capacity').textContent),num(tr.querySelector('.pcs-table').textContent),num(tr.querySelector('.pairs-table').textContent),Number(tr.dataset.exact)||0,Number(tr.dataset.tables)||0,Number(tr.dataset.hours)||0];
    });
    const sumY=dataRows.reduce((a,r)=>a+r[7],0),sumExact=dataRows.reduce((a,r)=>a+r[11],0),sumPlan=dataRows.reduce((a,r)=>a+r[12],0),sumHours=dataRows.reduce((a,r)=>a+r[13],0);
    const numericCols=new Set([0,1,3,4,7,8,9,10,11,12,13]);
    let sheetRows=xlsxRow(headers,headers.map(()=> 's'),headers.map(()=>1));
    dataRows.forEach(r=>{sheetRows+=xlsxRow(r,r.map((_,j)=>numericCols.has(j)?'n':'s'),r.map((_,j)=>j===8?2:j===9?3:j===10?4:0));});
    const total=['合計 / Tổng',dataRows.length,'','','','','',sumY,'','','',sumExact,sumPlan,sumHours];
    sheetRows+=xlsxRow(total,total.map((_,j)=>numericCols.has(j)?'n':'s'),total.map(()=>5));
    const colXml=headers.map(()=>'<col width="15" customWidth="1"/>').join('');
    const sheet1=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${colXml}</cols><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${sheetRows}</sheetData></worksheet>`;
    const settings=[['每桌總工時 / Tổng giờ mỗi bàn',Number($('hoursPerTable').value)||0],['前置／收料工時 / Giờ chuẩn bị / thu liệu',Number($('setupHours').value)||0],['實際印刷工時 / Giờ in thực tế',Number($('printHours').value)||0],['基準寬度 mm / Khổ chuẩn mm',Number($('baseWidth').value)||25],['手印基準產能 Y/桌 / Năng suất in tay',Number($('baseHandCapacity').value)||0],['K3基準產能 Y/桌 / Năng suất K3',Number($('baseK3Capacity').value)||0]];
    let settingRows=xlsxRow(['設定項目 / Hạng mục','數值 / Giá trị'],['s','s'],[1,1]);settings.forEach(r=>settingRows+=xlsxRow(r,['s','n'],[0,0]));
    const sheet2=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col width="42" customWidth="1"/><col width="18" customWidth="1"/></cols><sheetData>${settingRows}</sheetData></worksheet>`;
    const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17365D"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2F0D9"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEADCF8"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="4" borderId="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="5" borderId="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="2" borderId="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const files={
      '[Content_Types].xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
      '_rels/.rels':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      'xl/workbook.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="手印桌數試算" sheetId="1" r:id="rId1"/><sheet name="設定" sheetId="2" r:id="rId2"/></sheets></workbook>`,
      'xl/_rels/workbook.xml.rels':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      'xl/worksheets/sheet1.xml':sheet1,'xl/worksheets/sheet2.xml':sheet2,'xl/styles.xml':styles
    };
    const bytes=zipStore(files),blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const now=new Date(),pad=n=>String(n).padStart(2,'0');
    saveBlob(blob,`批量印刷桌數試算_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.xlsx`);
    $('printingStatus').className='status ok';$('printingStatus').textContent='真正的 XLSX 已下載 / Đã tải tệp XLSX';
  }catch(err){console.error(err);$('printingStatus').className='status warn';$('printingStatus').textContent='下載失敗，請重新整理後再試 / Tải xuống thất bại, vui lòng tải lại trang';}
}

$('addOrderBtn').addEventListener('click',()=>addOrder());$('downloadExcelBtn').addEventListener('click',exportExcel);$('pasteToTableBtn').addEventListener('click',parseBatch);$('clearOrdersBtn').addEventListener('click',()=>{$('orderBody').innerHTML='';recalcSummary();});['hoursPerTable','setupHours','printHours','baseWidth','baseHandCapacity','baseK3Capacity'].forEach(id=>{const el=$(id);if(el)el.addEventListener('input',()=>{if(id==='setupHours'||id==='printHours')$('hoursPerTable').value=(Number($('setupHours').value)||0)+(Number($('printHours').value)||0);recalcAll();});});
addOrder({qty:'',unit:'PC',width:25,length:'',method:'HAND',side:'SINGLE'});

