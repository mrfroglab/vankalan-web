/* Domain demo: semua data lokal. Bukan validasi keamanan untuk produksi. */
(function(global){
'use strict';
const KEY='pv-prototype-v1';
const seedMenu=[
{id:'m1',name:'Indomie Goreng',description:'Mi goreng favorit, sayuran segar, dan bawang renyah.',price:10000,category:'Mi',kind:'noodle',available:true,egg:true,popular:true},
{id:'m2',name:'Indomie Soto',description:'Kuah hangat rasa soto. Teman enak di segala waktu.',price:10000,category:'Mi',kind:'soup',available:true,egg:true,popular:true},
{id:'m3',name:'Mi Goreng Double',description:'Porsi dua bungkus untuk lapar yang lebih serius.',price:17000,category:'Mi',kind:'noodle',available:true,egg:true,popular:false},
{id:'m4',name:'Nasi Telur Warmindo',description:'Nasi hangat, telur ceplok, sambal, dan timun.',price:14000,category:'Nasi',kind:'rice',available:true,egg:false,popular:true},
{id:'m5',name:'Nasi Goreng Kampung',description:'Nasi goreng gurih dengan telur dan kerupuk.',price:18000,category:'Nasi',kind:'rice',available:true,egg:false,popular:false},
{id:'m6',name:'Roti Bakar Cokelat',description:'Roti panggang, cokelat lumer, dan susu manis.',price:12000,category:'Camilan',kind:'toast',available:true,egg:false,popular:false},
{id:'m7',name:'Teh Manis',description:'Seduhan teh yang pas manisnya. Pilih panas atau dingin.',price:4000,category:'Minuman',kind:'tea',available:true,temperatures:['Panas','Dingin'],coldExtra:1000,popular:true},
{id:'m8',name:'Kopi Susu',description:'Kopi dan susu, teman ngobrol sampai larut.',price:6000,category:'Minuman',kind:'coffee',available:true,temperatures:['Panas','Dingin'],coldExtra:1000,popular:false},
{id:'m9',name:'Jeruk Segar',description:'Segar dan ringan, cocok untuk menemani makan.',price:7000,category:'Minuman',kind:'orange',available:false,temperatures:['Dingin'],coldExtra:0,popular:false}
];
function uid(){return global.crypto?.randomUUID?.() || Date.now().toString(36)+Math.random().toString(36).slice(2);}
function createSeed(){return {version:1,menu:JSON.parse(JSON.stringify(seedMenu)),categories:['Mi','Nasi','Camilan','Minuman'],cart:[],orders:[],settings:{open:true,estimate:10,eggPrice:4000,recipient:'s1',waConnected:true},shifts:[{id:'s1',name:'Aa Iis',phone:'6281234500001'},{id:'s2',name:'Penjaga malam',phone:'6281234500002'}]};}
function money(x){return 'Rp'+Number(x||0).toLocaleString('id-ID');}
function date(x){return new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(x));}
function time(x){return new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit'}).format(new Date(x));}
function price(item,choice,settings){return item.price+(choice.egg?settings.eggPrice:0)+(choice.temp==='Dingin'?(item.coldExtra||0):0);}
function lines(state){return state.cart.map(c=>{const m=state.menu.find(m=>m.id===c.menuId);return {...c,item:m,unit:m?price(m,c,state.settings):0};});}
function total(state){return lines(state).reduce((s,c)=>s+c.unit*c.qty,0);}
function phone(input){let s=input.replace(/[\s()+-]/g,'');if(s.startsWith('0'))s='62'+s.slice(1);if(!/^62\d{8,13}$/.test(s))throw Error('Masukkan nomor WhatsApp Indonesia yang valid, misalnya 081234567890.');return s;}
function validate(state,form,now=Date.now()){
if(!state.settings.open)throw Error('Pemesanan online sedang ditutup. Keranjangmu tetap tersimpan.');
if(!state.shifts.some(s=>s.id===state.settings.recipient))throw Error('Penjaga aktif belum dipilih. Coba lagi nanti.');
if(!state.cart.length)throw Error('Keranjang masih kosong.');
if(lines(state).some(c=>!c.item?.available))throw Error('Ada menu yang sudah habis atau dihapus. Periksa keranjang.');
if(!form.name.trim())throw Error('Isi nama pemesan terlebih dahulu.');
phone(form.phone);
if(state.settings.estimate>60)throw Error('Belum ada waktu pengambilan tersedia dalam satu jam.');
const pickup=form.mode==='scheduled'?Number(form.pickup):now+state.settings.estimate*60000;
if(form.mode==='scheduled'&&(pickup<now+state.settings.estimate*60000-1000||pickup>now+3600000))throw Error('Waktu ambil sudah tidak tersedia. Pilih waktu baru.');
return pickup;
}
function makeOrder(state,form,now=Date.now()){
const pickup=validate(state,form,now);const seq=state.orders.length+1;
const order={id:uid(),token:uid(),number:'PV-'+new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now)).replaceAll('-','')+'-'+String(seq).padStart(4,'0'),created:now,pickup,estimate:state.settings.estimate,mode:form.mode,name:form.name.trim(),phone:phone(form.phone),note:form.note.trim(),payment:'PENDING',fulfillment:'NEW',notification:'QUEUED',refund:{status:'NONE',amount:0,reason:''},recipient:state.settings.recipient,attempts:0,items:lines(state).map(c=>({name:c.item.name,qty:c.qty,unit:c.unit,egg:c.egg,temp:c.temp,note:c.note})),total:total(state)};
state.orders.unshift(order);return order;
}
function pay(state,order,outcome){if(order.payment==='PAID')return;order.payment=outcome;if(outcome==='PAID'){order.paid=Date.now();if(order.mode==='asap')order.pickup=order.paid+order.estimate*60000;order.recipient=state.settings.recipient;order.notification=state.settings.waConnected?'SENT':'FAILED';order.attempts++;state.cart=[];}}
function save(state){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch{return false;}}
function load(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d?.version===1&&Array.isArray(d.menu)&&Array.isArray(d.orders))return d;}catch{}return createSeed();}
function reset(){localStorage.removeItem(KEY);return createSeed();}
const api={KEY,uid,createSeed,money,date,time,price,lines,total,phone,validate,makeOrder,pay,save,load,reset};
global.PV=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
