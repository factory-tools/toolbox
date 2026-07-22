const $ = id => document.getElementById(id);

function resetResult(){
  $('pcsResult').textContent='—';
  $('oneWeight').textContent='—';
  $('netWeight').textContent='—';
}

function calculate(showMessage=true){
  const qty = Number($('sampleQty').value);
  const sample = Number($('sampleWeight').value);
  const total = Number($('totalWeight').value);
  const bag = Number($('bagWeight').value || 0);

  if(!qty || qty <= 0 || !sample || !total){
    resetResult();
    $('status').className='status warn';
    $('status').textContent = showMessage
      ? '請輸入完整資料 / Vui lòng nhập đủ dữ liệu'
      : '';
    return;
  }

  const net = total - bag;

  if(net < 0){
    resetResult();
    $('status').className='status warn';
    $('status').textContent='空袋重量不能大於整包重量';
    return;
  }

  const one = sample / qty;
  const pcs = Math.round(net / one);

  $('pcsResult').textContent = pcs.toLocaleString() + ' PCS';
  $('oneWeight').textContent = one.toFixed(4) + ' g';
  $('netWeight').textContent = net.toFixed(3) + ' g';
  $('status').className='status ok';
  $('status').textContent='計算完成 / Đã tính xong';
}

function clearAll(){
  $('sampleQty').value='10';
  $('sampleWeight').value='';
  $('totalWeight').value='';
  $('bagWeight').value='0';
  resetResult();
  $('status').textContent='';
}

$('calcBtn').addEventListener('click',()=>calculate(true));
$('clearBtn').addEventListener('click',clearAll);

['sampleQty','sampleWeight','totalWeight','bagWeight'].forEach(id=>{
  $(id).addEventListener('input',()=>calculate(false));
});

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
}
