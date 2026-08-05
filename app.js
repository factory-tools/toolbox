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
function excelCell(value,type='String',style=''){const attr=style?` ss:StyleID="${style}"`:'';const data=type==='Number'&&Number.isFinite(Number(value))?Number(value):xmlEscape(value);return `<Cell${attr}><Data ss:Type="${type}">${data}</Data></Cell>`;}
function exportExcel(){
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
  const rowXml=[];
  rowXml.push(`<Row>${headers.map(h=>excelCell(h,'String','Header')).join('')}</Row>`);
  dataRows.forEach(r=>rowXml.push(`<Row>${r.map((v,j)=>excelCell(v,[0,1,3,4,7,8,9,10,11,12,13].includes(j)?'Number':'String',j===8?'Yard':j===9?'Pc':j===10?'Pair':'Body')).join('')}</Row>`));
  rowXml.push(`<Row>${excelCell('合計 / Tổng','String','Total')}${excelCell(dataRows.length,'Number','Total')}${excelCell('','','Total')}${excelCell('','','Total')}${excelCell('','','Total')}${excelCell('','','Total')}${excelCell('','','Total')}${excelCell(sumY,'Number','Total')}${excelCell('','','Total')}${excelCell('','','Total')}${excelCell('','','Total')}${excelCell(sumExact,'Number','Total')}${excelCell(sumPlan,'Number','Total')}${excelCell(sumHours,'Number','Total')}</Row>`);
  const settings=[['每桌總工時 / Tổng giờ mỗi bàn',Number($('hoursPerTable').value)||0],['前置／收料工時 / Giờ chuẩn bị / thu liệu',Number($('setupHours').value)||0],['實際印刷工時 / Giờ in thực tế',Number($('printHours').value)||0],['基準寬度 mm / Khổ chuẩn mm',Number($('baseWidth').value)||25],['手印基準產能 Y/桌 / Năng suất in tay',Number($('baseHandCapacity').value)||0],['K3基準產能 Y/桌 / Năng suất K3',Number($('baseK3Capacity').value)||0]];
  const settingRows=settings.map(r=>`<Row>${excelCell(r[0],'String','Header')}${excelCell(r[1],'Number','Body')}</Row>`).join('');
  const workbook=`<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11"/></Style><Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#17365D" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style><Style ss:ID="Body"><Alignment ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style><Style ss:ID="Yard"><Interior ss:Color="#FFF2CC" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style><Style ss:ID="Pc"><Interior ss:Color="#E2F0D9" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style><Style ss:ID="Pair"><Interior ss:Color="#EADCF8" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style><Style ss:ID="Total"><Font ss:Bold="1"/><Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style></Styles><Worksheet ss:Name="手印桌數試算"><Table>${headers.map(()=>'<Column ss:Width="95"/>').join('')}${rowXml.join('')}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane></WorksheetOptions></Worksheet><Worksheet ss:Name="設定"><Table><Column ss:Width="260"/><Column ss:Width="120"/>${settingRows}</Table></Worksheet></Workbook>`;
  const blob=new Blob(['\ufeff',workbook],{type:'application/vnd.ms-excel;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  const now=new Date(),pad=n=>String(n).padStart(2,'0');
  a.href=url;a.download=`批量印刷桌數試算_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.xls`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('printingStatus').className='status ok';$('printingStatus').textContent='Excel 已下載 / Đã tải Excel';
}

$('addOrderBtn').addEventListener('click',()=>addOrder());$('downloadExcelBtn').addEventListener('click',exportExcel);$('pasteToTableBtn').addEventListener('click',parseBatch);$('clearOrdersBtn').addEventListener('click',()=>{$('orderBody').innerHTML='';recalcSummary();});['hoursPerTable','setupHours','printHours','baseWidth','baseHandCapacity','baseK3Capacity'].forEach(id=>{const el=$(id);if(el)el.addEventListener('input',()=>{if(id==='setupHours'||id==='printHours')$('hoursPerTable').value=(Number($('setupHours').value)||0)+(Number($('printHours').value)||0);recalcAll();});});
addOrder({qty:'',unit:'PC',width:25,length:'',method:'HAND',side:'SINGLE'});

