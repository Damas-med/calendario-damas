// ============================================
//  CALENDÁRIO DE EVENTOS – DAMAS
//  Edite apenas as variáveis abaixo
// ============================================

const CONFIG = {
  SHEET_ID:   "13riRjRO7DpZIfyOljLoIgknITe-zDLLxot0ikQxnV4o",
  SHEET_NAME: "Sheet1",
};

const CAT_COR = {
  congresso:"#4F46E5", simposio:"#4F46E5", jornada:"#9333EA",
  workshop:"#16A34A", curso:"#EA580C", palestra:"#E11D48",
};
const CAT_BG = {
  congresso:"#EEF2FF", simposio:"#EEF2FF", jornada:"#F5F3FF",
  workshop:"#F0FDF4", curso:"#FFF7ED", palestra:"#FFF1F2",
};
const CAT_TEXT = {
  congresso:"#3730A3", simposio:"#3730A3", jornada:"#6B21A8",
  workshop:"#14532D", curso:"#9A3412", palestra:"#9F1239",
};
const CAT_EMOJI = {
  congresso:"🏆", simposio:"👥", jornada:"🩺", workshop:"🪡", curso:"📖", palestra:"🎤",
};
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_CURTO = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const DIAS_SEMANA = ["D","S","T","Q","Q","S","S"];
const DIAS_SEMANA_CURTO = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];

function slug(str){ return (str||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z]/g,""); }
function parseData(s){
  if(!s) return null;
  if(typeof s === "number"){
    // Google Sheets serial date
    const d = new Date(Math.round((s - 25569) * 86400 * 1000));
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  s = String(s).trim();
  if(s.includes("/")){const[d,m,a]=s.split("/").map(Number);return new Date(a,m-1,d);}
  if(s.match(/^\d{4}-\d{2}-\d{2}$/)){const[a,m,d]=s.split("-").map(Number);return new Date(a,m-1,d);}
  return null;
}
function fmtDataCurta(s){ const d=parseData(s); if(!d)return s; return d.toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"}); }
function statusClass(s){ const sl=slug(s||""); if(sl.includes("aberta"))return"status-aberto"; if(sl.includes("vaga"))return"status-vagas"; if(sl.includes("gratu"))return"status-gratuito"; return"status-breve"; }
function corCat(cat){ return CAT_COR[slug(cat||"")] || "#6B7280"; }
function bgCat(cat){ return CAT_BG[slug(cat||"")] || "#F3F4F6"; }
function tcCat(cat){ return CAT_TEXT[slug(cat||"")] || "#6B7280"; }
function emCat(cat){ return CAT_EMOJI[slug(cat||"")] || "📅"; }

let todosEventos = [];
let eventosFiltrados = [];
let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let diaSelecionado = null;
let viewAtual = "calendario";

// Visualização inferior
let mesMini = new Date().getMonth();
let anoMini = new Date().getFullYear();
let semanaOffset = 0; // semana relativa ao próximo evento
let diaDetalhes = null;

// ── BUSCA PLANILHA ──
async function buscarEventos(){
  const url=`https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.SHEET_NAME)}`;
  const res=await fetch(url);
  const text=await res.text();
  const json=JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)[1]);
  const cols=json.table.cols.map(c=>c.label.toLowerCase().trim());
  return (json.table.rows||[]).map(row=>{
    const obj={};
    cols.forEach((col,i)=>{
      const cell=row.c[i];
      if(!cell){ obj[col]=""; return; }
      // Para coluna de data, usar valor numérico serial diretamente
      if(col==="data" && typeof cell.v === "number"){
        obj[col]=cell.v;
      } else {
        obj[col]=cell.f||cell.v||"";
      }
    });
    return obj;
  }).filter(e=>e.data&&e.evento);
}

// ── POPULAR FILTRO DE ORGANIZAÇÃO ──
function popularFiltroOrg(eventos){
  const sel=document.getElementById("filtro-org");
  const orgs=[...new Set(eventos.map(e=>e.organizacao).filter(Boolean))].sort();
  orgs.forEach(o=>{ const opt=document.createElement("option"); opt.value=o; opt.textContent=o; sel.appendChild(opt); });
}

// ── APLICAR FILTROS ──
function aplicarFiltros(){
  const busca=(document.getElementById("busca").value||"").toLowerCase();
  const cat=document.getElementById("filtro-cat").value;
  const org=document.getElementById("filtro-org").value;
  const status=document.getElementById("filtro-status").value;
  eventosFiltrados=todosEventos.filter(e=>{
    if(busca&&!e.evento.toLowerCase().includes(busca)&&!(e.local||"").toLowerCase().includes(busca)&&!(e.organizacao||"").toLowerCase().includes(busca))return false;
    if(cat&&(e.categoria||"").toLowerCase()!==cat.toLowerCase())return false;
    if(org&&e.organizacao!==org)return false;
    if(status&&(e.status||"")!==status)return false;
    return true;
  });
  renderizarTudo();
  renderizarPaineis();
}

function limparFiltros(){
  document.getElementById("busca").value="";
  document.getElementById("filtro-cat").value="";
  document.getElementById("filtro-org").value="";
  document.getElementById("filtro-status").value="";
  eventosFiltrados=[...todosEventos];
  renderizarTudo();
  renderizarPaineis();
}

// ── MUDAR MÊS ──
function mudarMes(dir){
  mesAtual+=dir;
  if(mesAtual>11){mesAtual=0;anoAtual++;}
  if(mesAtual<0){mesAtual=11;anoAtual--;}
  diaSelecionado=null;
  renderizarTudo();
}

// ── TROCAR VIEW ──
function setView(v){
  viewAtual=v;
  document.getElementById("view-calendario").style.display=v==="calendario"?"":"none";
  document.getElementById("view-lista").style.display=v==="lista"?"":"none";
  document.getElementById("btn-cal").classList.toggle("active",v==="calendario");
  document.getElementById("btn-lista").classList.toggle("active",v==="lista");
  if(v==="lista")renderizarLista();
}

// ── RENDERIZAR TUDO ──
function renderizarTudo(){
  document.getElementById("mes-label").textContent=`${MESES[mesAtual]} de ${anoAtual}`;
  renderizarCalendario();
  if(viewAtual==="lista")renderizarLista();
}

// ── CALENDÁRIO ──
function renderizarCalendario(){
  const grid=document.getElementById("cal-grid");
  const primeiroDia=new Date(anoAtual,mesAtual,1).getDay();
  const diasNoMes=new Date(anoAtual,mesAtual+1,0).getDate();
  const hoje=new Date(); hoje.setHours(0,0,0,0);

  const eventosPorDia={};
  eventosFiltrados.forEach(e=>{
    const d=parseData(e.data);
    if(!d||d.getMonth()!==mesAtual||d.getFullYear()!==anoAtual)return;
    const key=d.getDate();
    if(!eventosPorDia[key])eventosPorDia[key]=[];
    eventosPorDia[key].push(e);
  });

  let html="";
  const diasAntes=new Date(anoAtual,mesAtual,0).getDate();
  for(let i=primeiroDia-1;i>=0;i--){
    html+=`<div class="cal-day outro-mes"><div class="cal-day-num">${diasAntes-i}</div></div>`;
  }
  for(let d=1;d<=diasNoMes;d++){
    const dataD=new Date(anoAtual,mesAtual,d);
    const eHoje=dataD.getTime()===hoje.getTime();
    const eSel=diaSelecionado===d;
    const evs=eventosPorDia[d]||[];
    const temEv=evs.length>0;
    let classes="cal-day"+(eHoje?" hoje":"")+(eSel?" selecionado":"")+(temEv?" tem-evento":"");
    let pilulas=evs.slice(0,2).map(e=>{
      const cor=corCat(e.categoria);
      return`<div class="cal-day-pill" style="background:${cor}">${e.evento}</div>`;
    }).join("");
    if(evs.length>2)pilulas+=`<div style="font-size:10px;color:var(--cinza1);padding-left:2px">+${evs.length-2} mais</div>`;
    html+=`<div class="${classes}" onclick="selecionarDia(${d})">
      <div class="cal-day-num">${d}</div>
      <div class="cal-day-eventos">${pilulas}</div>
    </div>`;
  }
  const total=primeiroDia+diasNoMes;
  const resto=total%7===0?0:7-(total%7);
  for(let i=1;i<=resto;i++){
    html+=`<div class="cal-day outro-mes"><div class="cal-day-num">${i}</div></div>`;
  }
  grid.innerHTML=html;
  if(diaSelecionado)renderizarPainel(diaSelecionado);
}

// ── SELECIONAR DIA ──
function selecionarDia(d){
  diaSelecionado=d;
  renderizarCalendario();
  renderizarPainel(d);
  if(window.innerWidth<=800){
    const evs=eventosFiltrados.filter(e=>{
      const dt=parseData(e.data);
      return dt&&dt.getDate()===d&&dt.getMonth()===mesAtual&&dt.getFullYear()===anoAtual;
    });
    if(evs.length===1)abrirModal(evs[0]);
  }
}

// ── PAINEL LATERAL ──
function renderizarPainel(d){
  const empty=document.getElementById("side-empty");
  const content=document.getElementById("side-content");
  const evs=eventosFiltrados.filter(e=>{
    const dt=parseData(e.data);
    return dt&&dt.getDate()===d&&dt.getMonth()===mesAtual&&dt.getFullYear()===anoAtual;
  });
  const dataStr=new Date(anoAtual,mesAtual,d).toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
  const dataCapit=dataStr.charAt(0).toUpperCase()+dataStr.slice(1);

  if(evs.length===0){
    empty.style.display=""; content.style.display="none";
    empty.innerHTML=`<div class="cal-side-empty-icon">📅</div><p>Nenhum evento em ${dataCapit}.</p>`;
    return;
  }
  empty.style.display="none"; content.style.display="";
  let html=`<div class="cal-side-date">🗓️ ${dataCapit}</div>`;
  evs.forEach(e=>{
    const cor=corCat(e.categoria); const bg=bgCat(e.categoria); const tc=tcCat(e.categoria); const em=emCat(e.categoria);
    const stClass=statusClass(e.status);
    html+=`<div class="cal-side-card" style="border-left-color:${cor}" onclick="abrirModal(eventosFiltrados.find(x=>x.evento==='${e.evento.replace(/'/g,"\\'")}'))">
      <div class="cal-side-tag" style="background:${bg};color:${tc}">${em} ${e.categoria||"Evento"}</div>
      <div class="cal-side-titulo">${e.evento}</div>
      <div class="cal-side-meta">
        ${e.horario?`<span>🕐 ${e.horario}</span>`:""}
        ${e.local?`<span>📍 ${e.local}</span>`:""}
      </div>
      ${e.organizacao?`<div class="cal-side-org">🏛️ ${e.organizacao}</div>`:""}
      ${e.status?`<span class="cal-side-status ${stClass}">${e.status}</span>`:""}
    </div>`;
  });
  content.innerHTML=html;
}

// ── LISTA ──
function renderizarLista(){
  const lista=document.getElementById("cal-lista");
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const futuros=eventosFiltrados
    .filter(e=>{ const d=parseData(e.data); return d&&d>=hoje; })
    .sort((a,b)=>parseData(a.data)-parseData(b.data));
  if(futuros.length===0){
    lista.innerHTML=`<div style="text-align:center;padding:60px;color:var(--cinza1)">Nenhum evento encontrado.</div>`;
    return;
  }
  lista.innerHTML=futuros.map(e=>{
    const d=parseData(e.data);
    const cor=corCat(e.categoria); const bg=bgCat(e.categoria); const tc=tcCat(e.categoria); const em=emCat(e.categoria);
    const stClass=statusClass(e.status);
    return`<div class="cal-lista-item" style="border-left-color:${cor}" onclick="abrirModal(eventosFiltrados.find(x=>x.evento==='${e.evento.replace(/'/g,"\\'")}'))">
      <div class="cal-lista-data">
        <div class="cal-lista-dia">${d.getDate()}</div>
        <div class="cal-lista-mes">${MESES_CURTO[d.getMonth()]}</div>
      </div>
      <div class="cal-lista-divider"></div>
      <div class="cal-lista-body">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:2px 8px;border-radius:20px;background:${bg};color:${tc}">${em} ${e.categoria||"Evento"}</span>
          ${e.status?`<span class="cal-side-status ${stClass}">${e.status}</span>`:""}
        </div>
        <div class="cal-lista-titulo">${e.evento}</div>
        <div class="cal-lista-meta">
          ${e.horario?`<span>🕐 ${e.horario}</span>`:""}
          ${e.local?`<span>📍 ${e.local}</span>`:""}
          ${e.organizacao?`<span>🏛️ ${e.organizacao}</span>`:""}
        </div>
      </div>
      <div class="cal-lista-right"><span class="cal-lista-arrow">›</span></div>
    </div>`;
  }).join("");
}

// ── MODAL ──
function abrirModal(e){
  if(!e)return;
  const cor=corCat(e.categoria); const bg=bgCat(e.categoria); const tc=tcCat(e.categoria); const em=emCat(e.categoria);
  const stClass=statusClass(e.status);
  document.getElementById("modal-content").innerHTML=`
    <div class="cal-modal-tag" style="background:${bg};color:${tc}">${em} ${e.categoria||"Evento"}</div>
    <h2 class="cal-modal-titulo">${e.evento}</h2>
    <div class="cal-modal-meta">
      <span>🗓️ ${fmtDataCurta(e.data)}</span>
      ${e.horario?`<span>🕐 ${e.horario}</span>`:""}
      ${e.local?`<span>📍 ${e.local}</span>`:""}
    </div>
    ${e.organizacao?`<div class="cal-modal-section"><div class="cal-modal-section-title">Organização</div><div class="cal-modal-section-text">🏛️ ${e.organizacao}</div></div>`:""}
    ${e.descricao?`<div class="cal-modal-section"><div class="cal-modal-section-title">Descrição</div><div class="cal-modal-section-text">${e.descricao}</div></div>`:""}
    ${e.status?`<div style="margin-bottom:12px"><span class="cal-side-status ${stClass}">${e.status}</span></div>`:""}
    ${e.imagem?`<div class="cal-modal-section"><img src="${e.imagem}" alt="Imagem do evento" style="width:100%;border-radius:8px;object-fit:cover;max-height:200px"></div>`:""}
    <div class="cal-modal-actions">
      ${e.link?`<a class="cal-btn-inscricao" href="${e.link}" target="_blank">Inscrever-se ↗</a>`:""}
      ${e.local?`<a class="cal-btn-local" href="https://maps.google.com/?q=${encodeURIComponent(e.local)}" target="_blank">Ver localização 📍</a>`:""}
    </div>`;
  document.getElementById("modal-overlay").classList.add("open");
}
function fecharModal(){ document.getElementById("modal-overlay").classList.remove("open"); }
document.addEventListener("keydown",e=>{ if(e.key==="Escape")fecharModal(); });

// ── IR PARA PRÓXIMO EVENTO ──
function irParaProximo(){
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const proximo=eventosFiltrados
    .filter(e=>{ const d=parseData(e.data); return d&&d>=hoje; })
    .sort((a,b)=>parseData(a.data)-parseData(b.data))[0];
  if(!proximo)return;
  const d=parseData(proximo.data);
  mesAtual=d.getMonth(); anoAtual=d.getFullYear();
  renderizarTudo();
  setTimeout(()=>selecionarDia(d.getDate()),100);
}

// ══════════════════════════════════════════════
//  PAINÉIS INFERIORES: MENSAL | SEMANAL | DIÁRIO
// ══════════════════════════════════════════════

function obterProximoEvento(){
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  return eventosFiltrados
    .filter(e=>{ const d=parseData(e.data); return d&&d>=hoje; })
    .sort((a,b)=>parseData(a.data)-parseData(b.data))[0]||null;
}

function inicializarPaineis(){
  const prox=obterProximoEvento();
  if(prox){
    const d=parseData(prox.data);
    mesMini=d.getMonth(); anoMini=d.getFullYear();
    diaDetalhes=d;
    // semana que contém o próximo evento
    semanaOffset=0;
  } else {
    const hoje=new Date();
    mesMini=hoje.getMonth(); anoMini=hoje.getFullYear();
    diaDetalhes=hoje;
  }
  renderizarPaineis();
}

function renderizarPaineis(){
  renderizarMiniCal();
  renderizarSemanal();
  renderizarDiario();
}

// ── MINI CALENDÁRIO MENSAL ──
function mudarMesMini(dir){
  mesMini+=dir;
  if(mesMini>11){mesMini=0;anoMini++;}
  if(mesMini<0){mesMini=11;anoMini--;}
  renderizarMiniCal();
}

function renderizarMiniCal(){
  const label=document.getElementById("mini-mes-label");
  label.textContent=`${MESES[mesMini]} de ${anoMini}`;
  const grid=document.getElementById("mini-cal-grid");
  const primeiroDia=new Date(anoMini,mesMini,1).getDay();
  const diasNoMes=new Date(anoMini,mesMini+1,0).getDate();
  const hoje=new Date(); hoje.setHours(0,0,0,0);

  const diasComEvento=new Set();
  const coresPorDia={};
  eventosFiltrados.forEach(e=>{
    const d=parseData(e.data);
    if(!d||d.getMonth()!==mesMini||d.getFullYear()!==anoMini)return;
    diasComEvento.add(d.getDate());
    if(!coresPorDia[d.getDate()])coresPorDia[d.getDate()]=[];
    coresPorDia[d.getDate()].push(corCat(e.categoria));
  });

  let html="";
  // Cabeçalho dias semana
  DIAS_SEMANA.forEach(d=>{ html+=`<div class="mini-weekday">${d}</div>`; });

  const diasAntes=new Date(anoMini,mesMini,0).getDate();
  for(let i=primeiroDia-1;i>=0;i--){
    html+=`<div class="mini-day outro-mes">${diasAntes-i}</div>`;
  }
  for(let d=1;d<=diasNoMes;d++){
    const dataD=new Date(anoMini,mesMini,d);
    const eHoje=dataD.getTime()===hoje.getTime();
    const temEv=diasComEvento.has(d);
    const isSel=diaDetalhes&&diaDetalhes.getDate()===d&&diaDetalhes.getMonth()===mesMini&&diaDetalhes.getFullYear()===anoMini;
    const cores=coresPorDia[d]||[];
    const dots=cores.slice(0,3).map(c=>`<span class="mini-dot" style="background:${c}"></span>`).join("");
    html+=`<div class="mini-day${eHoje?" hoje":""}${isSel?" selecionado":""}" onclick="selecionarDiaMini(${d})">
      <span class="mini-day-num">${d}</span>
      ${temEv?`<div class="mini-dots">${dots}</div>`:""}
    </div>`;
  }
  const total=primeiroDia+diasNoMes;
  const resto=total%7===0?0:7-(total%7);
  for(let i=1;i<=resto;i++){
    html+=`<div class="mini-day outro-mes">${i}</div>`;
  }
  grid.innerHTML=html;
}

function selecionarDiaMini(d){
  diaDetalhes=new Date(anoMini,mesMini,d);
  // atualizar semana para mostrar esse dia
  renderizarMiniCal();
  renderizarSemanal();
  renderizarDiario();
}

// ── VISUALIZAÇÃO SEMANAL ──
function obterInicioSemana(data){
  const d=new Date(data);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate()-d.getDay());
  return d;
}

function mudarSemana(dir){
  if(!diaDetalhes)diaDetalhes=new Date();
  diaDetalhes=new Date(diaDetalhes);
  diaDetalhes.setDate(diaDetalhes.getDate()+dir*7);
  mesMini=diaDetalhes.getMonth(); anoMini=diaDetalhes.getFullYear();
  renderizarMiniCal();
  renderizarSemanal();
  renderizarDiario();
}

function renderizarSemanal(){
  const base=diaDetalhes||new Date();
  const inicioSemana=obterInicioSemana(base);
  const fimSemana=new Date(inicioSemana); fimSemana.setDate(fimSemana.getDate()+6);

  const fmtDia=d=>d.toLocaleDateString("pt-BR",{day:"numeric",month:"short"}).replace(".","");
  document.getElementById("semana-label").textContent=`${fmtDia(inicioSemana)} – ${fmtDia(fimSemana)}`;

  const container=document.getElementById("semana-lista");
  const eventosSemana=[];
  for(let i=0;i<7;i++){
    const dia=new Date(inicioSemana); dia.setDate(dia.getDate()+i);
    const evs=eventosFiltrados.filter(e=>{
      const d=parseData(e.data);
      return d&&d.toDateString()===dia.toDateString();
    });
    evs.forEach(e=>eventosSemana.push({dia,ev:e}));
  }

  if(eventosSemana.length===0){
    container.innerHTML=`<div class="semana-vazio">Nenhum evento nesta semana.</div>`;
    return;
  }

  container.innerHTML=eventosSemana.map(({dia,ev})=>{
    const cor=corCat(ev.categoria);
    const nomeDia=dia.toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","").toUpperCase();
    const numDia=dia.getDate();
    const isSel=diaDetalhes&&dia.toDateString()===diaDetalhes.toDateString();
    return`<div class="semana-item${isSel?" semana-item-sel":""}" onclick="selecionarDiaMini(${numDia});mesMini=${dia.getMonth()};anoMini=${dia.getFullYear()};renderizarMiniCal();renderizarDiario()">
      <div class="semana-dia-info">
        <span class="semana-dia-nome">${nomeDia}</span>
        <span class="semana-dia-num">${numDia}</span>
      </div>
      <div class="semana-ev-dot" style="background:${cor}"></div>
      <div class="semana-ev-info">
        <div class="semana-ev-nome">${ev.evento}</div>
        <div class="semana-ev-meta">${ev.horario?`🕐 ${ev.horario} `:""}${ev.local?`• ${ev.local}`:""}</div>
      </div>
    </div>`;
  }).join("");
}

// ── DIÁRIO ──
function renderizarDiario(){
  const dia=diaDetalhes||new Date();
  const dataStr=dia.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const dataCapit=dataStr.charAt(0).toUpperCase()+dataStr.slice(1);
  document.getElementById("diario-label").textContent=dataCapit;

  const evs=eventosFiltrados.filter(e=>{
    const d=parseData(e.data);
    return d&&d.toDateString()===dia.toDateString();
  });

  const container=document.getElementById("diario-content");
  if(evs.length===0){
    container.innerHTML=`<div class="diario-vazio">📅 Nenhum evento neste dia.<br><small>Clique em outro dia no calendário.</small></div>`;
    return;
  }

  container.innerHTML=evs.map(e=>{
    const cor=corCat(e.categoria); const bg=bgCat(e.categoria); const tc=tcCat(e.categoria); const em=emCat(e.categoria);
    const stClass=statusClass(e.status);
    return`<div class="diario-card" style="border-top:3px solid ${cor}">
      <div class="diario-cat" style="background:${bg};color:${tc}">${em} ${e.categoria||"Evento"}</div>
      <div class="diario-titulo">${e.evento}</div>
      ${e.horario||e.local?`<div class="diario-meta">
        ${e.horario?`<span>🕐 ${e.horario}</span>`:""}
        ${e.local?`<span>📍 ${e.local}</span>`:""}
      </div>`:""}
      ${e.organizacao?`<div class="diario-row"><span class="diario-label-txt">Organização</span><span class="diario-value">🏛️ ${e.organizacao}</span></div>`:""}
      ${e.descricao?`<div class="diario-row"><span class="diario-label-txt">Descrição</span><span class="diario-value">${e.descricao}</span></div>`:""}
      ${e.status?`<div style="margin:8px 0"><span class="cal-side-status ${stClass}">${e.status}</span></div>`:""}
      <div class="diario-acoes">
        ${e.link?`<a class="cal-btn-inscricao" href="${e.link}" target="_blank" style="font-size:12px;padding:9px">Inscrever-se ↗</a>`:""}
        ${e.local?`<a class="cal-btn-local" href="https://maps.google.com/?q=${encodeURIComponent(e.local)}" target="_blank" style="font-size:12px;padding:8px">Ver localização 📍</a>`:""}
      </div>
    </div>`;
  }).join("");
}

// ── INICIALIZAÇÃO ──
(async()=>{
  try{
    todosEventos=await buscarEventos();
    eventosFiltrados=[...todosEventos];
    popularFiltroOrg(todosEventos);

    // Abrir no mês do próximo evento
    const hoje=new Date(); hoje.setHours(0,0,0,0);
    const prox=todosEventos
      .filter(e=>{ const d=parseData(e.data); return d&&d>=hoje; })
      .sort((a,b)=>parseData(a.data)-parseData(b.data))[0];
    if(prox){
      const d=parseData(prox.data);
      mesAtual=d.getMonth(); anoAtual=d.getFullYear();
    }

    renderizarTudo();
    inicializarPaineis();
  }catch(err){
    console.error(err);
    document.getElementById("cal-grid").innerHTML=`<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--cinza1)">⚠️ Não foi possível carregar os eventos.<br><small>Verifique o SHEET_ID e se a planilha está publicada.</small></div>`;
  }finally{
    document.getElementById("cal-loading").classList.add("hidden");
  }
})();
