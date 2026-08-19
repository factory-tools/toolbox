(()=>{
'use strict';
const $=id=>document.getElementById(id);
const EXPECTED_HEADERS=[
"Tổ 組","loại đơn 單別","KH 客戶","Mã đơn 訂單號碼","NET 筆","Ngày ĐĐH 訂單日期","Mã SP 料號","Màu 色號","QC 寬度","Độ dài 型號","ĐV 單位","SL 數量","TD 進度參考","Tên SP (SQ) 生管品名","Ghi chú ĐĐH 訂單備注","Ghi chú ĐĐH 摘要","KH YC 客戶要求日期","Ngày 93 HC 織造完工日","Ngày 94 HC 染色完工日","Ngày 95 HC 上漿完工日","Ngày 96 HC 束頭完工日","Ngày PH3 HC PH3完工日","Ngày 99 NK 99入庫日"
];
const letters=n=>{let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s};
const norm=s=>String(s??'').replace(/\s+/g,' ').trim().toLowerCase();
let importProblems=[];

function headerIndex(headers,patterns){return headers.findIndex(h=>patterns.some(p=>norm(h).includes(norm(p))))}
function getGridInfo(){
 const grid=$('grid'); if(!grid) return null;
 const ths=[...grid.querySelectorAll('thead th')]; if(!ths.length) return null;
 const headers=ths.map(x=>x.textContent.trim());
 return {grid,headers,ths, rows:[...grid.querySelectorAll('tbody tr')]};
}
function rowKeyFromTr(tr,headers){
 const cells=[...tr.children];
 const ci=headerIndex(headers,['KH 客戶']);
 const di=headerIndex(headers,['Mã đơn 訂單號碼','訂單號碼']);
 const ei=headerIndex(headers,['NET 筆']);
 if(ci<0||di<0||ei<0) return '';
 return [ci,di,ei].map(i=>cells[i]?.textContent?.trim()||'').join('|');
}
function currentUser(){return ($('who')?.textContent||'').trim()||''}

function getCfg(){
 let url='',key='';
 try{if(typeof SUPABASE_URL!=='undefined') url=SUPABASE_URL}catch(e){}
 try{if(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined') key=SUPABASE_PUBLISHABLE_KEY}catch(e){}
 try{if(!key&&typeof SUPABASE_ANON_KEY!=='undefined') key=SUPABASE_ANON_KEY}catch(e){}
 try{if(!key&&typeof SUPABASE_KEY!=='undefined') key=SUPABASE_KEY}catch(e){}
 const objs=[window.PH3_CONFIG,window.APP_CONFIG,window.CONFIG,window.config].filter(Boolean);
 for(const o of objs){url=url||o.SUPABASE_URL||o.supabaseUrl||o.url||'';key=key||o.SUPABASE_PUBLISHABLE_KEY||o.SUPABASE_ANON_KEY||o.supabaseKey||o.anonKey||o.key||''}
 return {url,key};
}
let auditClient=null;
function getAuditClient(){
 if(auditClient) return auditClient;
 const {url,key}=getCfg();
 if(!url||!key||!window.supabase?.createClient) return null;
 try{auditClient=window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});return auditClient}catch(e){return null}
}
async function resolveUser(){
 let u=currentUser(); if(u) return u;
 const c=getAuditClient(); if(!c) return '';
 try{const {data}=await c.auth.getUser();return data?.user?.email||data?.user?.user_metadata?.name||''}catch(e){return ''}
}
async function saveAuditKeys(keys){
 keys=[...new Set(keys.filter(Boolean))]; if(!keys.length) return;
 const c=getAuditClient(); if(!c) return;
 const u=await resolveUser(); if(!u) return;
 const now=new Date().toISOString();
 const payload=keys.map(k=>({unique_key:k,last_reply_user:u,last_reply_at:now}));
 try{await c.from('ph3_reply_audit').upsert(payload,{onConflict:'unique_key'})}catch(e){console.warn('audit save',e)}
}
async function loadAuditMap(keys){
 keys=[...new Set(keys.filter(Boolean))]; const m=new Map(); if(!keys.length) return m;
 const c=getAuditClient(); if(!c) return m;
 try{
   const {data,error}=await c.from('ph3_reply_audit').select('unique_key,last_reply_user,last_reply_at').in('unique_key',keys);
   if(error) throw error; (data||[]).forEach(r=>m.set(r.unique_key,r));
 }catch(e){console.warn('audit load',e)}
 return m;
}

async function decorateLastReply(){
 const info=getGridInfo(); if(!info) return;
 if(info.grid.dataset.auditBusy==='1') return; info.grid.dataset.auditBusy='1';
 try{
   let idx=info.headers.findIndex(h=>norm(h).includes('最後回覆人')||norm(h).includes('người trả lời cuối'));
   if(idx<0){
     const statusIdx=info.headers.findIndex(h=>norm(h).includes('狀態')||norm(h).includes('trạng thái'));
     idx=statusIdx>=0?statusIdx+1:info.headers.length;
     const th=document.createElement('th'); th.className='progress'; th.textContent='最後回覆人 / Người trả lời cuối';
     const hr=info.grid.querySelector('thead tr'); if(hr){if(hr.children[idx]) hr.insertBefore(th,hr.children[idx]); else hr.appendChild(th)}
     info.rows.forEach(tr=>{const td=document.createElement('td');td.className='progress audit-user'; if(tr.children[idx]) tr.insertBefore(td,tr.children[idx]); else tr.appendChild(td)});
   }
   const info2=getGridInfo(); if(!info2) return;
   idx=info2.headers.findIndex(h=>norm(h).includes('最後回覆人')||norm(h).includes('người trả lời cuối'));
   const keys=info2.rows.map(tr=>rowKeyFromTr(tr,info2.headers)); const map=await loadAuditMap(keys);
   info2.rows.forEach((tr,i)=>{const td=tr.children[idx];if(!td)return;const r=map.get(keys[i]);td.textContent=r?.last_reply_user||'';td.title=r?.last_reply_at?`最後回覆時間 / Thời gian: ${new Date(r.last_reply_at).toLocaleString()}`:''});
 }finally{info.grid.dataset.auditBusy='0'}
 applyAllSearch();
}

async function validateFiles(){
 importProblems=[]; const detail=$('importDetail'); if(detail) detail.innerHTML='';
 const files=[...($('files')?.files||[])]; if(!files.length) return;
 for(const file of files){
   try{
     const buf=await file.arrayBuffer(); const wb=XLSX.read(buf,{type:'array',cellDates:true});
     if(!wb.SheetNames.length){importProblems.push({file:file.name,msg:'沒有工作表 / Không có sheet'});continue}
     const ws=wb.Sheets[wb.SheetNames[0]]; const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
     if(!rows.length){importProblems.push({file:file.name,msg:'工作表是空白 / Sheet trống'});continue}
     const hdr=rows[0].slice(0,23);
     for(let i=0;i<23;i++){
       if(norm(hdr[i])!==norm(EXPECTED_HEADERS[i])) importProblems.push({file:file.name,msg:`第 ${letters(i+1)} 欄標題不符：目前「${hdr[i]||'空白'}」→ 應為「${EXPECTED_HEADERS[i]}」 / Cột ${letters(i+1)} sai tiêu đề`});
     }
     rows.slice(1).forEach((r,ri)=>{
       if(r.every(v=>String(v??'').trim()==='')) return;
       [2,3,4].forEach(ci=>{if(String(r[ci]??'').trim()==='') importProblems.push({file:file.name,msg:`第 ${ri+2} 列 ${letters(ci+1)} 欄「${EXPECTED_HEADERS[ci]}」不可空白，請補資料 / Dòng ${ri+2} cột ${letters(ci+1)} không được trống`})});
       for(let ci=16;ci<=22;ci++){
         const v=r[ci]; if(v===''||v==null) continue;
         let ok=v instanceof Date&&!isNaN(v); if(!ok&&typeof v==='number') ok=!!XLSX.SSF.parse_date_code(v)?.y; if(!ok&&typeof v==='string') ok=!isNaN(new Date(v.replace(/\./g,'/')));
         if(!ok) importProblems.push({file:file.name,msg:`第 ${ri+2} 列 ${letters(ci+1)} 欄「${EXPECTED_HEADERS[ci]}」日期格式無法辨識：${v}。請改成 yyyy/mm/dd / Ngày không hợp lệ`});
       }
     });
   }catch(e){importProblems.push({file:file.name,msg:`檔案讀取失敗：${e.message} / Không đọc được file`})}
 }
 if(detail){
   if(importProblems.length){
     const show=importProblems.slice(0,80); detail.innerHTML=`<div class="import-errors"><b>⚠ 匯入前檢查發現 ${importProblems.length} 個問題 / Phát hiện ${importProblems.length} lỗi</b><br>${show.map((x,i)=>`${i+1}. <b>${escapeHtml(x.file)}</b>：${escapeHtml(x.msg)}`).join('<br>')}${importProblems.length>80?'<br>…其餘問題請先修正前面格式後再重新選檔。':''}</div>`;
   } else detail.innerHTML='<div class="msg ok">✓ Excel 欄位檢查通過，可匯入 / Kiểm tra Excel đạt, có thể nhập</div>';
 }
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function applyAllSearch(){
 const q=norm($('searchAll')?.value||''); const info=getGridInfo(); if(!info)return;
 let visible=0;
 info.rows.forEach(tr=>{const base=tr.dataset.baseDisplay||''; if(!tr.dataset.baseDisplay) tr.dataset.baseDisplay=getComputedStyle(tr).display==='none'?'none':''; const match=!q||norm(tr.textContent).includes(q); const should=match && tr.dataset.baseDisplay!=='none'; tr.style.display=should?'':'none'; if(should) visible++});
 if(q&&$('filterCount')) $('filterCount').textContent=`搜尋結果 ${visible} 筆 / Kết quả tìm kiếm ${visible} dòng`;
}

async function exportGridExcel(){
 const info=getGridInfo(); if(!info||!window.ExcelJS){alert('目前沒有可下載資料 / Không có dữ liệu');return}
 await decorateLastReply(); const i2=getGridInfo();
 const visibleRows=i2.rows.filter(tr=>getComputedStyle(tr).display!=='none');
 const wb=new ExcelJS.Workbook(); const ws=wb.addWorksheet('PH3目前資料');
 const headers=i2.headers; ws.addRow(headers);
 visibleRows.forEach(tr=>{const vals=[...tr.children].map(td=>{const inp=td.querySelector('input,select'); return inp?inp.value:td.textContent.trim()});ws.addRow(vals)});
 const header=ws.getRow(1); header.font={bold:true,color:{argb:'FFFFFFFF'}}; header.alignment={vertical:'middle',horizontal:'center',wrapText:true}; header.height=34;
 header.eachCell((cell,col)=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:col<=17?'FF548235':'FFBF9000'}};cell.border={bottom:{style:'thin',color:{argb:'FFB7C3CF'}}}});
 ws.views=[{state:'frozen',ySplit:1,xSplit:Number($('freezeCols')?.value||0)}];
 ws.columns.forEach((col,ci)=>{
   let max=String(headers[ci]||'').length;
   col.eachCell({includeEmpty:true},cell=>{const s=String(cell.value??''); const lines=s.split(/\r?\n/); max=Math.max(max,...lines.map(x=>[...x].length))});
   col.width=Math.max(8,Math.min(42,max+3));
   col.alignment={vertical:'middle',wrapText:false};
 });
 ws.eachRow((row,ri)=>{if(ri>1) row.height=22}); ws.autoFilter={from:{row:1,column:1},to:{row:1,column:headers.length}};
 const buf=await wb.xlsx.writeBuffer(); const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`PH3目前資料_${new Date().toISOString().slice(0,10)}.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}

function bind(){
 $('files')?.addEventListener('change',validateFiles,true);
 $('importBtn')?.addEventListener('click',e=>{if(importProblems.length){e.preventDefault();e.stopImmediatePropagation();$('importMsg').innerHTML=`<span class="bad">✖ 無法匯入：請先修正下方 ${importProblems.length} 個問題 / Không thể nhập: vui lòng sửa lỗi bên dưới</span>`}},true);
 $('searchAll')?.addEventListener('input',applyAllSearch);
 ['fCustomer','fOrder','fItem','fPrevDate','fStatus','workScope','batchSelect'].forEach(id=>$(id)?.addEventListener('input',()=>setTimeout(()=>{decorateLastReply();applyAllSearch()},80)));
 $('calcReplyBtn')?.addEventListener('click',()=>{const info=getGridInfo();const keys=info?info.rows.filter(tr=>getComputedStyle(tr).display!=='none').map(tr=>rowKeyFromTr(tr,info.headers)):[];setTimeout(async()=>{await saveAuditKeys(keys);await decorateLastReply()},700)},false);
 $('grid')?.addEventListener('change',e=>{if(e.target.matches('input[type=date],input.cell-date')){const tr=e.target.closest('tr');const info=getGridInfo();const k=tr&&info?rowKeyFromTr(tr,info.headers):'';setTimeout(async()=>{await saveAuditKeys([k]);await decorateLastReply()},500)}});
 $('refillFile')?.addEventListener('change',()=>setTimeout(async()=>{const info=getGridInfo();const keys=info?info.rows.map(tr=>rowKeyFromTr(tr,info.headers)):[];await saveAuditKeys(keys);await decorateLastReply()},1200));
 $('downloadBtn')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();exportGridExcel()},true);
 const grid=$('grid'); if(grid){let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(()=>decorateLastReply(),120)}).observe(grid,{childList:true,subtree:true})}
 $('addDays')?.addEventListener('input',()=>{const n=$('addDays').value||0;const info=getGridInfo();const count=info?info.rows.filter(tr=>getComputedStyle(tr).display!=='none').length:0;const x=$('batchExplain');if(x)x.innerHTML=`目前設定：每筆前工段日 + <b>${n}</b> 天（週日不算），一次套用目前畫面 ${count} 筆。<br>Hiện tại: mỗi dòng + <b>${n}</b> ngày (không tính CN), áp dụng cho ${count} dòng đang hiển thị.`});
 setTimeout(()=>decorateLastReply(),500);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
})();
