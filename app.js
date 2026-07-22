const $ = id => document.getElementById(id);

function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  $(id).classList.add('active');
  document.querySelector('.actions').classList.toggle('show', id === 'pcsPage');
  window.scrollTo({top:0,behavior:'smooth'});
}

document.querySelectorAll('[data-page]').forEach(btn=>{
  btn.addEventListener('click',()=>showPage(btn.dataset.page));
});
$('backHome').addEventListener('click',()=>showPage('homePage'));

function resetResult(){
  $('pcsResult').textContent='等待輸入 / Chờ nhập dữ liệu';
  $('oneWeight').textContent='—';
  $('netWeight').textContent='—';
}

function calculate(showMessage=true){
  const qty=Number($('sampleQty').value);
  const sample=Number($('sampleWeight').value);
  const total=Number($('totalWeight').value);
  const bag=Number($('bagWeight').value || 0);

  if(!qty || qty<=0 || !sample || !total){
    resetResult();
    $('status').className='status warn';
    $('status').textContent=showMessage
      ? '請輸入完整資料 / Vui lòng nhập đầy đủ dữ liệu'
      : '';
    return;
  }

  const net=total-bag;
  if(net<0){
    resetResult();
    $('status').className='status warn';
    $('status').textContent='空袋重量不能大於整包重量 / Trọng lượng túi không được lớn hơn tổng trọng lượng';
    return;
  }

  const one=sample/qty;
  const pcs=Math.round(net/one);

  $('pcsResult').textContent=pcs.toLocaleString()+' PCS';
  $('oneWeight').textContent=one.toFixed(4)+' g';
  $('netWeight').textContent=net.toFixed(3)+' g';
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
