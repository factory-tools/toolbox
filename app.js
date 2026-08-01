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
function normUnit(v){return unitAliases[String(v||'').trim().toUpperCase()]||String(v||'').trim().toUpperCase();}
function normMethod(v){return methodAliases[String(v||'').trim().toUpperCase()]||String(v||'').trim().toUpperCase();}
function capacityFor(width,method){const baseWidth=Number($('baseWidth').value)||25,base=method==='K3'?(Number($('baseK3Capacity').value)||0):(Number($('baseHandCapacity').value)||0);return width>0&&base>0?base*baseWidth/width:0;}
function convertToYards(q,u,length){if(!(q>0))return NaN;if(u==='Y')return q;if(u==='M')return q/0.9144;if(u==='PC')return length>0?q*length/914.4:NaN;if(u==='PAIR')return length>0?q*2*length/914.4:NaN;return NaN;}
function makeSelect(options,value,cls){const s=document.createElement('select');s.className=cls;options.forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;if(v===value)o.selected=true;s.appendChild(o);});return s;}
function addOrder(data={qty:'',unit:'PC',width:25,length:'',method:'HAND'}){const body=$('orderBody'),tr=document.createElement('tr');tr.innerHTML=`<td class="row-no"></td><td><input class="o-qty" type="number" min="0" step="any" value="${data.qty??''}"></td><td class="unit-cell"></td><td><input class="o-width" type="number" min="0" step="any" value="${data.width??''}"></td><td><input class="o-length" type="number" min="0" step="any" value="${data.length??''}"></td><td class="method-cell"></td><td class="out yards">—</td><td class="out capacity">—</td><td class="out pcs-table">—</td><td class="out exact">—</td><td class="out planned">—</td><td class="out hours">—</td><td><button class="icon-btn delete-order" title="刪除 / Xóa">×</button></td>`;tr.querySelector('.unit-cell').appendChild(makeSelect([['Y','Y / yard'],['M','M / mét'],['PC','PC'],['PAIR','雙 / đôi']],data.unit,'o-unit'));tr.querySelector('.method-cell').appendChild(makeSelect([['HAND','手印 / In tay'],['K3','K3']],data.method,'o-method'));body.appendChild(tr);tr.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',()=>recalcRow(tr)));tr.querySelector('.delete-order').addEventListener('click',()=>{tr.remove();renumber();recalcSummary();});renumber();recalcRow(tr);}
function recalcRow(tr){const q=Number(tr.querySelector('.o-qty').value),u=tr.querySelector('.o-unit').value,w=Number(tr.querySelector('.o-width').value),l=Number(tr.querySelector('.o-length').value),m=tr.querySelector('.o-method').value,y=convertToYards(q,u,l),cap=capacityFor(w,m),pcsPerTable=l>0?cap*914.4/l:NaN;tr.classList.remove('row-error');delete tr.dataset.yards;delete tr.dataset.tables;delete tr.dataset.hours;if(!Number.isFinite(y)||!(cap>0)){tr.querySelector('.yards').textContent=Number.isFinite(y)?fmt(y,2)+' Y':'—';tr.querySelector('.capacity').textContent=cap>0?fmt(cap,2)+' Y':'—';tr.querySelector('.pcs-table').textContent=Number.isFinite(pcsPerTable)?fmt(pcsPerTable,0)+' PC':'需長度 / Cần dài';tr.querySelector('.exact').textContent='—';tr.querySelector('.planned').textContent='—';tr.querySelector('.hours').textContent='—';if(q>0)tr.classList.add('row-error');}else{const exact=y/cap,planned=Math.ceil(exact),hours=planned*(Number($('hoursPerTable').value)||0);tr.querySelector('.yards').textContent=fmt(y,2)+' Y';tr.querySelector('.capacity').textContent=fmt(cap,2)+' Y';tr.querySelector('.pcs-table').textContent=Number.isFinite(pcsPerTable)?fmt(pcsPerTable,0)+' PC':'需長度 / Cần dài';tr.querySelector('.exact').textContent=fmt(exact,3);tr.querySelector('.planned').textContent=fmt(planned,0);tr.querySelector('.hours').textContent=fmt(hours,1)+' h';tr.dataset.yards=y;tr.dataset.tables=planned;tr.dataset.hours=hours;}recalcSummary();}
function renumber(){[...$('orderBody').rows].forEach((r,i)=>r.querySelector('.row-no').textContent=i+1);}
function recalcAll(){[...$('orderBody').rows].forEach(recalcRow);}
function recalcSummary(){const rows=[...$('orderBody').rows],valid=rows.filter(r=>r.dataset.yards&&!r.classList.contains('row-error'));const sy=valid.reduce((a,r)=>a+Number(r.dataset.yards||0),0),st=valid.reduce((a,r)=>a+Number(r.dataset.tables||0),0),sh=valid.reduce((a,r)=>a+Number(r.dataset.hours||0),0);$('sumOrders').textContent=rows.length;$('sumYards').textContent=fmt(sy,2)+' Y';$('sumTables').textContent=fmt(st,0);$('sumHours').textContent=fmt(sh,1)+' 小時 / giờ';const errors=rows.filter(r=>r.classList.contains('row-error')).length;$('printingStatus').className='status '+(errors?'warn':'ok');$('printingStatus').textContent=errors?`${errors} 筆資料缺少必要資料 / ${errors} dòng thiếu dữ liệu cần thiết`:(rows.length?'計算完成；不同寬度依 25 mm 基準比例推估 / Đã tính; khổ khác được ước tính theo chuẩn 25 mm':'');}
function splitExcelLine(line){
  if(line.includes('\t')) return line.split('\t');
  if(line.includes(';')) return line.split(';');
  // CSV only when no tabs; keep thousands separators such as 1,000 intact when possible.
  if(line.includes(',')){
    const csv=line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g)||[];
    return csv.map(v=>v.replace(/^,/, '').replace(/^"|"$/g,'').replace(/""/g,'"'));
  }
  return line.trim().split(/\s+/);
}
function cleanNumber(v){
  const t=String(v??'').trim().replace(/\s/g,'');
  if(/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) return Number(t.replace(/,/g,''));
  return Number(t.replace(/，/g,'').replace(',','.'));
}
function isHeaderRow(cols){
  const t=cols.join(' ').toUpperCase();
  return /訂單|數量|SL\s*ĐƠN|ORDER|寬度|KHỔ|LENGTH|長度|印刷方式|PHƯƠNG PHÁP/.test(t);
}
function parseBatch(){
  const text=$('batchPaste').value.replace(/\u00a0/g,' ').trim();
  if(!text){$('printingStatus').className='status warn';$('printingStatus').textContent='請先從 Excel 複製資料並貼上 / Vui lòng sao chép dữ liệu từ Excel rồi dán vào';return;}
  const parsed=[];
  text.split(/\r?\n/).filter(line=>line.trim()).forEach(line=>{
    const cols=splitExcelLine(line).map(x=>String(x).trim());
    if(isHeaderRow(cols))return;
    const qty=cleanNumber(cols[0]);
    if(!(qty>0))return;
    const unit=normUnit(cols[1]);
    const width=cleanNumber(cols[2]);
    const length=cleanNumber(cols[3]);
    const method=normMethod(cols[4]||'HAND');
    parsed.push({qty,unit:['Y','M','PC','PAIR'].includes(unit)?unit:'PC',width:width>0?width:25,length:length>0?length:'',method:method==='K3'?'K3':'HAND'});
  });
  if(!parsed.length){$('printingStatus').className='status warn';$('printingStatus').textContent='無法辨識資料，請確認 Excel 欄位順序 / Không thể nhận dạng dữ liệu, vui lòng kiểm tra thứ tự cột';return;}
  $('orderBody').innerHTML='';
  parsed.forEach(addOrder);
  $('printingStatus').className='status ok';
  $('printingStatus').textContent=`已匯入 ${parsed.length} 筆訂單 / Đã nhập ${parsed.length} đơn hàng`;
}
$('addOrderBtn').addEventListener('click',()=>addOrder());$('pasteToTableBtn').addEventListener('click',parseBatch);$('clearOrdersBtn').addEventListener('click',()=>{$('orderBody').innerHTML='';recalcSummary();});['hoursPerTable','setupHours','printHours','baseHandCapacity','baseK3Capacity'].forEach(id=>$(id).addEventListener('input',()=>{if(id==='setupHours'||id==='printHours')$('hoursPerTable').value=(Number($('setupHours').value)||0)+(Number($('printHours').value)||0);recalcAll();}));
addOrder({qty:'',unit:'PC',width:25,length:'',method:'HAND'});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
