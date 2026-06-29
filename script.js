// ============================================
//  CALENDÁRIO DE EVENTOS – DAMAS/FAMENE
//  Edite apenas as variáveis abaixo
// ============================================

const CONFIG = {
  SHEET_ID:   "1PHAwOjY8rtbpuULZiMR9wJpVw9lWjjxfuW8gIWW6TK4",
  SHEET_NAME: "Eventos",
};

// Cores por categoria
const CAT_COR = {
  congresso: "#4F46E5", simposio: "#4F46E5", jornada: "#9333EA",
  workshop:  "#16A34A", curso:    "#EA580C", palestra: "#E11D48",
};
const CAT_BG = {
  congresso: "#EEF2FF", simposio: "#EEF2FF", jornada: "#F5F3FF",
  workshop:  "#F0FDF4", curso:    "#FFF7ED", palestra: "#FFF1F2",
};
const CAT_TEXT = {
  congresso: "#3730A3", simposio: "#3730A3", jornada: "#6B21A8",
  workshop:  "#14532D", curso:    "#9A3412",  palestra: "#9F1239",
};
const CAT_EMOJI = {
  congresso:"🏆", simposio:"👥", jornada:"🩺", workshop:"🪡", curso:"📖", palestra:"🎤",
};
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_CURTO = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function slug(str){ return (str||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z]/g,""); }
function parseData(s){ if(!s)return null; if(s.includes("/")){const[d,m,a]=s.split("/").map(Number);return new Date(a,m-1,d);}const[a,m,d]=s.split("-").map(Number);return new Date(a,m-1,d); }
function fmtData(s){ const d=parseData(s); if(!d)return s; return d.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}); }
function fmtDataCurta(s){ const d=parseData(s); if(!d)return s; return d.toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"}); }
function statusClass(s){ const sl=slug(s||""); if(sl.includes("aberta"))return"status-aberto"; if(sl.includes("vaga"))return"status-vagas"; if(sl.includes("gratu"))return"status-gratuito"; return"status-breve"; }

let todosEventos = [];
let eventosFiltrados = [];
let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let diaSelecionado = null;
let viewAtual = "calendario";

// ── BUSCA PLANILHA ──
async function buscarEventos(){
  const url=`https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.SHEET_NAME)}`;
  const res=await fetch(url);
  const text=await res.text();
  const json=JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)[1]);
  const cols=json.table.cols.map(c=>c.label.toLowerCase().trim());
  return (json.table.rows||[]).map(row=>{
    const obj={};
    cols.forEach((col,i)=>{ const cell=row.c[i]; obj[col]=cell?(cell.f||cell.v||""):""; });
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
}

function limparFiltros(){
  document.getElementById("busca").value="";
  document.getElementById("filtro-cat").value="";
  document.getElementById("filtro-org").value="";
  document.getElementById("filtro-status").value="";
  eventosFiltrados=[...todosEventos];
  renderizarTudo();
}

// ── MUDAR MÊS ──
function mudarMes(dir){
  mesAtual+=dir;
  if(mesAtual>11){mesAtual=0;anoAtual++;}
  if(mesAtual<0){mesAtual=11;anoAtual--;}
  diaSelecionado=null;
  renderizarCalendario();
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

  // Agrupar eventos do mês
  const eventosPorDia={};
  eventosFiltrados.forEach(e=>{
    const d=parseData(e.data);
    if(!d||d.getMonth()!==mesAtual||d.getFullYear()!==anoAtual)return;
    const key=d.getDate();
    if(!eventosPorDia[key])eventosPorDia[key]=[];
    eventosPorDia[key].push(e);
  });

  let html="";
  // Dias do mês anterior
  const diasAntes=new Date(anoAtual,mesAtual,0).getDate();
  for(let i=primeiroDia-1;i>=0;i--){
    html+=`<div class="cal-day outro-mes"><div class="cal-day-num">${diasAntes-i}</div></div>`;
  }
  // Dias do mês atual
  for(let d=1;d<=diasNoMes;d++){
    const dataD=new Date(anoAtual,mesAtual,d);
    const eHoje=dataD.getTime()===hoje.getTime();
    const eSel=diaSelecionado===d;
    const evs=eventosPorDia[d]||[];
    const temEv=evs.length>0;
    let classes="cal-day"+(eHoje?" hoje":"")+(eSel?" selecionado":"")+(temEv?" tem-evento":"");
    let pílulas=evs.slice(0,2).map(e=>{
      const s=slug(e.categoria||"");
      const cor=CAT_COR[s]||"#6B7280";
      return`<div class="cal-day-pill" style="background:${cor}">${e.evento}</div>`;
    }).join("");
    if(evs.length>2)pílulas+=`<div style="font-size:10px;color:var(--cinza1);padding-left:2px">+${evs.length-2} mais</div>`;
    html+=`<div class="${classes}" onclick="selecionarDia(${d})">
      <div class="cal-day-num">${d}</div>
      <div class="cal-day-eventos">${pílulas}</div>
    </div>`;
  }
  // Completar última semana
  const total=primeiroDia+diasNoMes;
  const resto=total%7===0?0:7-(total%7);
  for(let i=1;i<=resto;i++){
    html+=`<div class="cal-day outro-mes"><div class="cal-day-num">${i}</div></div>`;
  }
  grid.innerHTML=html;
  // Se tinha dia selecionado, atualizar painel
  if(diaSelecionado)renderizarPainel(diaSelecionado);
}

// ── SELECIONAR DIA ──
function selecionarDia(d){
  diaSelecionado=d;
  renderizarCalendario();
  renderizarPainel(d);
  // No mobile, abre modal com os eventos do dia
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
  const side=document.getElementById("cal-side");
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
    const s=slug(e.categoria||"");
    const cor=CAT_COR[s]||"#6B7280";
    const bg=CAT_BG[s]||"#F3F4F6";
    const tc=CAT_TEXT[s]||"#6B7280";
    const em=CAT_EMOJI[s]||"📅";
    const stClass=statusClass(e.status);
    html+=`<div class="cal-side-card" style="border-left-color:${cor};background:var(--fundo)" onclick="abrirModal(eventosFiltrados.find(x=>x.evento==='${e.evento.replace(/'/g,"\\'")}'))">
      <div class="cal-side-tag" style="background:${bg};color:${tc}">${em} ${e.categoria}</div>
      <div class="cal-side-titulo">${e.evento}</div>
      <div class="cal-side-meta">
        ${e.horario?`<span>🕐 ${e.horario}</span>`:""}
        ${e.local?`<span>📍 ${e.local}</span>`:""}
      </div>
      ${e.organizacao?`<div class="cal-side-org">🏛️ ${e.organizacao}</div>`:""}
      ${e.status?`<span class="cal-side-status ${stClass}">${e.status}</span>`:""}
    </div>`;
  });
  if(evs.length>1)html+=`<button class="cal-btn-ver-todos" onclick="">Ver todos os eventos do dia →</button>`;
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
    const s=slug(e.categoria||"");
    const cor=CAT_COR[s]||"#6B7280";
    const bg=CAT_BG[s]||"#F3F4F6";
    const tc=CAT_TEXT[s]||"#6B7280";
    const em=CAT_EMOJI[s]||"📅";
    const stClass=statusClass(e.status);
    return`<div class="cal-lista-item" style="border-left-color:${cor}" onclick="abrirModal(eventosFiltrados.find(x=>x.evento==='${e.evento.replace(/'/g,"\\'")}'))">
      <div class="cal-lista-data">
        <div class="cal-lista-dia">${d.getDate()}</div>
        <div class="cal-lista-mes">${MESES_CURTO[d.getMonth()]}</div>
      </div>
      <div class="cal-lista-divider"></div>
      <div class="cal-lista-body">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:2px 8px;border-radius:20px;background:${bg};color:${tc}">${em} ${e.categoria}</span>
          ${e.status?`<span class="cal-side-status ${stClass}">${e.status}</span>`:""}
        </div>
        <div class="cal-lista-titulo">${e.evento}</div>
        <div class="cal-lista-meta">
          ${e.horario?`<span>🕐 ${e.horario}</span>`:""}
          ${e.local?`<span>📍 ${e.local}</span>`:""}
          ${e.organizacao?`<span>🏛️ ${e.organizacao}</span>`:""}
        </div>
      </div>
      <div class="cal-lista-right">
        <span class="cal-lista-arrow">›</span>
      </div>
    </div>`;
  }).join("");
}

// ── MODAL ──
function abrirModal(e){
  if(!e)return;
  const s=slug(e.categoria||"");
  const bg=CAT_BG[s]||"#F3F4F6";
  const tc=CAT_TEXT[s]||"#6B7280";
  const em=CAT_EMOJI[s]||"📅";
  const stClass=statusClass(e.status);
  document.getElementById("modal-content").innerHTML=`
    <div class="cal-modal-tag" style="background:${bg};color:${tc}">${em} ${e.categoria}</div>
    <h2 class="cal-modal-titulo">${e.evento}</h2>
    <div class="cal-modal-meta">
      <span>🗓️ ${fmtDataCurta(e.data)}</span>
      ${e.horario?`<span>🕐 ${e.horario}</span>`:""}
      ${e.local?`<span>📍 ${e.local}</span>`:""}
    </div>
    ${e.organizacao?`<div class="cal-modal-section"><div class="cal-modal-section-title">Organização</div><div class="cal-modal-section-text">🏛️ ${e.organizacao}</div></div>`:""}
    ${e.descricao?`<div class="cal-modal-section"><div class="cal-modal-section-title">Descrição</div><div class="cal-modal-section-text">${e.descricao}</div></div>`:""}
    ${e.status?`<div style="margin-bottom:12px"><span class="cal-side-status ${stClass}">${e.status}</span></div>`:""}
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

// ── INICIALIZAÇÃO ──
(async()=>{
  try{
    todosEventos=await buscarEventos();
    eventosFiltrados=[...todosEventos];
    popularFiltroOrg(todosEventos);
    renderizarTudo();
  }catch(err){
    console.error(err);
    document.getElementById("cal-grid").innerHTML=`<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--cinza1)">⚠️ Não foi possível carregar os eventos.<br><small>Verifique o SHEET_ID e se a planilha está publicada.</small></div>`;
  }finally{
    document.getElementById("cal-loading").classList.add("hidden");
  }
})();
