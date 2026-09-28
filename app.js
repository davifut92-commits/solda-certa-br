import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.102.0/+esm';

const SUPABASE_URL = 'https://c--b60dd3f3-5b08-4999-8f1a-add365adbdbb-prod.lovable.cloud';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_r-eVmUf9hSbECihfXu3zww_x70dbA0r';
const TZ = 'America/Sao_Paulo';

function createSupabaseFetch(key){
  return (input, init={}) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    if(init.headers) new Headers(init.headers).forEach((v,k)=>headers.set(k,v));
    if(key.startsWith('sb_publishable_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
    headers.set('apikey', key);
    return fetch(input,{...init,headers});
  };
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global:{fetch:createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY)},
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});

const app = document.getElementById('app');
const state = { session:null, profile:null, services:[], settings:{}, gallery:[], loading:true, lastError:null };

const esc = (v='') => String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const brl = cents => cents == null ? 'Sob avaliação' : new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
const dt = iso => new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:TZ}).format(new Date(iso));
const dOnly = iso => new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeZone:TZ}).format(new Date(iso));
const tOnly = iso => new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:TZ}).format(new Date(iso));
const todayISO = () => new Intl.DateTimeFormat('en-CA',{timeZone:TZ}).format(new Date());
const uuidShort = () => crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase();
const protocol = prefix => `${prefix}-${todayISO().replaceAll('-','').slice(2)}-${uuidShort().slice(0,6)}`;
const path = () => location.pathname || '/';
const params = () => new URLSearchParams(location.search);

function go(to){ history.pushState({},'',to); render(); window.scrollTo({top:0,behavior:'smooth'}); }
window.addEventListener('popstate',render);

function statusLabel(s){
  return ({received:'Recebido',analyzing:'Em análise',awaiting_info:'Aguardando informações',quoted:'Orçamento enviado',approved:'Aprovado',declined:'Recusado',scheduled:'Agendado',closed:'Encerrado',pending:'Pendente',confirmed:'Confirmado',in_progress:'Em andamento',completed:'Concluído',cancelled:'Cancelado',reschedule_requested:'Reagendamento solicitado',draft:'Rascunho',sent:'Enviado',expired:'Expirado'})[s] || s;
}
function statusClass(s){ if(['approved','completed','confirmed','sent'].includes(s))return 'status good'; if(['declined','cancelled','expired'].includes(s))return 'status bad'; if(['quoted','awaiting_info','reschedule_requested'].includes(s))return 'status warn'; if(['analyzing','in_progress'].includes(s))return 'status info'; return 'status'; }

async function loadPublic(){
  const [s,b,g] = await Promise.all([
    supabase.from('services').select('*').eq('active',true).order('name'),
    supabase.from('business_settings').select('key,value').eq('is_public',true),
    supabase.from('gallery_items').select('*').eq('published',true).order('created_at',{ascending:false})
  ]);
  if(s.error) throw s.error;
  state.services=s.data||[];
  state.settings=Object.fromEntries((b.data||[]).map(x=>[x.key,x.value]));
  state.gallery=g.data||[];
}

async function loadProfile(){
  if(!state.session?.user){state.profile=null;return;}
  const {data,error}=await supabase.from('profiles').select('*').eq('id',state.session.user.id).maybeSingle();
  if(error) throw error;
  state.profile=data;
}

async function bootstrap(){
  try{
    const {data:{session}}=await supabase.auth.getSession();
    state.session=session;
    await Promise.all([loadPublic(), session?loadProfile():Promise.resolve()]);
  }catch(e){state.lastError=e.message||String(e)}
  state.loading=false; render();
}

supabase.auth.onAuthStateChange(async(_event,session)=>{
  state.session=session;
  try{await loadProfile()}catch(e){state.lastError=e.message}
  render();
});

function header(){
  const admin=state.profile?.role==='admin';
  return `<header class="site-header"><div class="container header-inner">
    <button class="brand" data-go="/"><span class="brand-mark">⚡</span>Solda Certa</button>
    <nav class="nav"><button data-go="/servicos">Serviços</button><button data-go="/orcamento">Orçamento</button><button data-go="/agendar">Agendar</button><button data-go="/minha-conta">Minha conta</button>${admin?'<button data-go="/admin">Painel</button>':''}</nav>
    <div class="header-actions">${state.session?`<button class="btn ghost small" data-go="/minha-conta">${esc(state.profile?.full_name||state.session.user.email)}</button><button class="btn dark small" id="logoutBtn">Sair</button>`:`<button class="btn ghost small" data-go="/entrar">Entrar</button><button class="btn primary small" data-go="/cadastro">Criar conta</button>`}</div>
    <button class="mobile-menu" id="menuBtn" aria-label="Abrir menu">☰</button>
  </div><div class="mobile-nav" id="mobileNav"><button data-go="/servicos">Serviços</button><button data-go="/orcamento">Orçamento</button><button data-go="/agendar">Agendar</button><button data-go="/minha-conta">Minha conta</button>${admin?'<button data-go="/admin">Painel</button>':''}${state.session?'<button id="logoutMobile">Sair</button>':'<button data-go="/entrar">Entrar</button>'}</div></header>`;
}
function footer(){return `<footer class="footer"><div class="container footer-grid"><div><div class="brand"><span class="brand-mark">⚡</span>Solda Certa</div><p class="small">Serviços de solda com Aldemir. Orçamento e agendamento organizados em um só lugar.</p></div><div><h4>Navegação</h4><button data-go="/servicos">Serviços</button><button data-go="/orcamento">Orçamento</button><button data-go="/agendar">Agendar</button></div><div><h4>Importante</h4><p class="small">Serviços, valores, prazos e disponibilidade dependem de avaliação. Não há cobrança Pix real configurada neste momento.</p></div></div></footer>`;}
function layout(body){return header()+body+footer();}
function pageHead(title,subtitle=''){return `<section class="page-head"><div class="container"><span class="eyebrow">Solda Certa</span><h1>${title}</h1>${subtitle?`<p>${subtitle}</p>`:''}</div></section>`;}
function loading(){return layout(`<div class="loading"><span class="spinner"></span><p>Carregando...</p></div>`);}
function authRequired(next){return `<div class="card auth-card"><h2>Entre para continuar</h2><p class="muted">Sua conta protege seus orçamentos, anexos e agendamentos.</p><div class="row"><button class="btn primary" data-go="/entrar?next=${encodeURIComponent(next)}">Entrar</button><button class="btn ghost" data-go="/cadastro?next=${encodeURIComponent(next)}">Criar conta</button></div></div>`;}

function home(){
  const serviceCards=state.services.slice(0,6).map(s=>`<article class="service-card"><div class="service-icon">⚙</div><h3>${esc(s.name)}</h3><p>${esc(s.short_description||s.description||'Serviço sujeito à avaliação técnica.')}</p><strong>${brl(s.price_from_cents)}</strong><button class="btn ghost small" data-quote-service="${s.id}">Solicitar orçamento</button></article>`).join('');
  return layout(`<section class="hero"><div class="container hero-grid"><div><span class="eyebrow">Soldagem • reparo • fabricação</span><h1>Serviço de solda, do <em>orçamento à execução</em>.</h1><p>Envie fotos, receba a avaliação do Aldemir, escolha um horário disponível e acompanhe tudo pela sua conta.</p><div class="hero-actions"><button class="btn primary" data-go="/orcamento">Solicitar orçamento</button><button class="btn ghost" data-go="/agendar">Agendar serviço</button></div><p class="small muted" style="margin-top:20px">Atendimento inicial em Votorantim/SP. Outras regiões precisam de confirmação.</p></div><div class="hero-art"><div class="metal-card"><div class="weld-mark">✦</div><strong>SOLDA CERTA</strong><small>ALDEMIR • SERVIÇOS DE SOLDA</small></div><div class="float-card"><strong class="success-text">✓ Orçamento organizado</strong><div class="small muted">Fotos, histórico e agenda na mesma plataforma</div></div></div></div></section>
  <section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Serviços</span><h2>O que a Solda Certa faz</h2></div><button class="btn ghost" data-go="/servicos">Ver todos</button></div><div class="services-grid">${serviceCards||'<p>Nenhum serviço disponível.</p>'}</div></div></section>
  <section class="section dark"><div class="container"><div class="section-head"><div><span class="eyebrow">Como funciona</span><h2>Quatro passos simples</h2></div></div><div class="steps"><div class="step"><span>01</span><h3>Envie detalhes</h3><p>Conte o problema e envie fotos ou PDF.</p></div><div class="step"><span>02</span><h3>Receba a avaliação</h3><p>O Aldemir analisa e envia valor e condições quando aplicável.</p></div><div class="step"><span>03</span><h3>Escolha o horário</h3><p>A agenda mostra somente os horários livres.</p></div><div class="step"><span>04</span><h3>Acompanhe</h3><p>Veja status, mensagens e histórico na sua conta.</p></div></div></div></section>
  <section class="section alt"><div class="container"><div class="section-head"><div><span class="eyebrow">Dúvidas</span><h2>Perguntas frequentes</h2></div></div><div class="faq-list"><details class="faq-item" open><summary>O preço aparece na hora?</summary><p>Nem sempre. Quando material, medidas, acesso ou complexidade precisam ser avaliados, o sistema mostra “Sob avaliação”.</p></details><details class="faq-item"><summary>Posso enviar fotos?</summary><p>Sim. O formulário aceita imagens e PDF em bucket privado. Apenas você e o administrador podem acessar os anexos do seu orçamento.</p></details><details class="faq-item"><summary>O pagamento Pix já está ativo?</summary><p>Não. A estrutura de pagamentos existe, mas a cobrança Pix real ficará desativada até a configuração de um provedor.</p></details></div></div></section>
  <section class="section"><div class="container"><div class="cta"><div><h2>Tem um serviço para avaliar?</h2><p>Crie sua conta e envie os detalhes. O protocolo é gerado na hora.</p></div><button class="btn primary" data-go="/orcamento">Começar orçamento</button></div></div></section>`);
}

function servicesPage(){return layout(pageHead('Serviços','Catálogo real carregado do banco da Solda Certa.')+`<section class="content"><div class="container"><div class="services-grid">${state.services.map(s=>`<article class="service-card"><div class="service-icon">⚙</div><h3>${esc(s.name)}</h3><p>${esc(s.description||s.short_description||'')}</p><strong>${brl(s.price_from_cents)}</strong><p class="small muted">${s.price_mode==='evaluation'?'Valor final sob avaliação técnica.':''}</p><button class="btn primary small" data-quote-service="${s.id}">Solicitar orçamento</button></article>`).join('')}</div></div></section>`);}

function authPage(mode='login'){
  const next=params().get('next')||'/minha-conta';
  const signup=mode==='signup';
  return layout(pageHead(signup?'Criar conta':'Entrar',signup?'Cadastre-se para acompanhar orçamentos e agendamentos.':'Acesse seus pedidos com e-mail e senha.')+`<section class="content"><div class="container"><div class="card auth-card"><form id="authForm" class="stack" data-mode="${mode}" data-next="${esc(next)}">
    ${signup?`<div class="field"><label>Nome</label><input name="full_name" required minlength="2" autocomplete="name"></div><div class="field"><label>Telefone</label><input name="phone" required autocomplete="tel"></div>`:''}
    <div class="field"><label>E-mail</label><input name="email" type="email" required autocomplete="email"></div><div class="field"><label>Senha</label><input name="password" type="password" required minlength="8" autocomplete="${signup?'new-password':'current-password'}"></div><div id="authMsg"></div><button class="btn primary full" type="submit">${signup?'Criar conta':'Entrar'}</button></form>
    <div class="row space" style="margin-top:14px"><button class="btn ghost small" data-go="${signup?'/entrar':'/cadastro'}?next=${encodeURIComponent(next)}">${signup?'Já tenho conta':'Criar conta'}</button>${!signup?'<button class="btn ghost small" id="forgotBtn">Esqueci a senha</button>':''}</div></div></div></section>`);
}
function resetPage(){return layout(pageHead('Redefinir senha','Escolha uma nova senha para sua conta.')+`<section class="content"><div class="container"><div class="card auth-card"><form id="resetForm" class="stack"><div class="field"><label>Nova senha</label><input name="password" type="password" required minlength="8"></div><div id="resetMsg"></div><button class="btn primary" type="submit">Salvar nova senha</button></form></div></div></section>`);}

function quotePage(){
  if(!state.session)return layout(pageHead('Solicitar orçamento','Envie detalhes e fotos para avaliação.')+`<section class="content"><div class="container">${authRequired('/orcamento')}</div></section>`);
  const pre=params().get('service')||'';
  return layout(pageHead('Solicitar orçamento','O valor final depende de material, medidas, acesso e complexidade. Quanto mais detalhes você enviar, melhor.')+`<section class="content"><div class="container"><form id="quoteForm" class="card form-grid">
    <div class="field full"><label>Serviço</label><select name="service_id" required><option value="">Selecione</option>${state.services.map(s=>`<option value="${s.id}" ${s.id===pre?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
    <div class="field full"><label>Descreva o serviço</label><textarea name="description" rows="4" minlength="10" maxlength="1500" required placeholder="Explique o problema, o que precisa ser reparado ou fabricado..."></textarea></div>
    <div class="field"><label>Medidas aproximadas</label><input name="approximate_measures" placeholder="Ex.: 2,00 m x 1,20 m"></div><div class="field"><label>Material</label><input name="material" placeholder="Ferro, aço, alumínio..."></div>
    <div class="field"><label>Quantidade</label><input name="quantity" placeholder="Ex.: 1 peça"></div><div class="field"><label>Urgência</label><select name="urgency"><option value="low">Sem pressa</option><option value="normal" selected>Nos próximos dias</option><option value="high">Urgente</option></select></div>
    <div class="field full"><label>Endereço / bairro</label><input name="address" required placeholder="Informe onde o serviço será realizado"></div><div class="field"><label>Tipo de atendimento</label><select name="attendance_type"><option value="residential">Residencial</option><option value="commercial">Comercial</option><option value="workshop">Oficina/empresa</option><option value="other">Outro</option></select></div>
    <div class="field"><label>Nome</label><input name="customer_name" required value="${esc(state.profile?.full_name||'')}"></div><div class="field"><label>Telefone</label><input name="phone" required value="${esc(state.profile?.phone||'')}"></div><div class="field"><label>E-mail</label><input name="email" type="email" required value="${esc(state.session.user.email||'')}"></div>
    <div class="field full upload-box"><label>Fotos ou documentos (até 5 arquivos, 10 MB cada)</label><input id="quoteFiles" name="files" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf"><div class="small muted">JPEG, PNG, WebP ou PDF. Os arquivos ficam privados.</div><div id="filePreview" class="file-list"></div></div>
    <label class="row full small"><input type="checkbox" name="consent" required> Li e concordo com o uso destes dados para analisar e atender minha solicitação.</label>
    <div class="full"><div id="quoteMsg"></div><button class="btn primary" type="submit">Enviar orçamento</button></div>
  </form></div></section>`);
}

function quoteSuccess(p){return layout(pageHead('Solicitação recebida','Seu orçamento foi salvo no banco da Solda Certa.')+`<section class="content"><div class="container"><div class="card auth-card" style="text-align:center"><div style="font-size:58px;color:var(--good)">✓</div><p>Protocolo</p><div class="protocol">${esc(p)}</div><p class="muted">Você pode acompanhar mudanças de status e a proposta na área do cliente.</p><div class="row" style="justify-content:center"><button class="btn primary" data-go="/minha-conta">Minha conta</button><button class="btn ghost" data-go="/agendar">Agendar</button></div></div></div></section>`);}

function schedulePage(){
  if(!state.session)return layout(pageHead('Agendar','Escolha um horário realmente disponível.')+`<section class="content"><div class="container">${authRequired('/agendar')}</div></section>`);
  const quoteId=params().get('quote')||'';
  return layout(pageHead('Agendar serviço','A disponibilidade é validada no servidor. Ao escolher um horário, ele fica reservado por 15 minutos.')+`<section class="content"><div class="container"><div class="grid-2"><div class="card"><form id="scheduleSearch" class="stack"><div class="field"><label>Serviço</label><select name="service_id" required><option value="">Selecione</option>${state.services.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>Data</label><input type="date" name="date" min="${todayISO()}" required></div><button class="btn dark" type="submit">Ver horários livres</button></form><div id="slotArea" style="margin-top:20px"></div></div><div class="card"><h2>Dados do atendimento</h2><form id="scheduleConfirm" class="stack"><input type="hidden" name="hold_id"><input type="hidden" name="quote_request_id" value="${esc(quoteId)}"><div id="holdInfo" class="notice info">Escolha serviço, data e horário primeiro.</div><div class="field"><label>Modalidade</label><select name="modality"><option value="visit">Visita técnica</option><option value="execution">Execução do serviço</option><option value="pickup_delivery">Retirada/entrega (se aplicável)</option><option value="defined_location">Local combinado</option></select></div><div class="field"><label>Nome</label><input name="customer_name" required value="${esc(state.profile?.full_name||'')}"></div><div class="field"><label>Telefone</label><input name="phone" required value="${esc(state.profile?.phone||'')}"></div><div class="field"><label>E-mail</label><input name="email" type="email" required value="${esc(state.session.user.email||'')}"></div><div class="field"><label>Endereço</label><input name="address" required></div><div class="field"><label>Observações</label><textarea name="notes" rows="3"></textarea></div><div class="notice">Pagamento Pix real está desativado. O agendamento não gera cobrança nesta fase.</div><div id="scheduleMsg"></div><button class="btn primary" type="submit" disabled id="confirmScheduleBtn">Confirmar agendamento</button></form></div></div></div></section>`);
}
function scheduleSuccess(p){return layout(pageHead('Agendamento confirmado','Seu horário foi reservado no banco sem gerar cobrança.')+`<section class="content"><div class="container"><div class="card auth-card" style="text-align:center"><div style="font-size:58px;color:var(--good)">✓</div><p>Protocolo</p><div class="protocol">${esc(p)}</div><p class="muted">O horário está protegido contra reservas duplicadas. Consulte os detalhes em Minha conta.</p><button class="btn primary" data-go="/minha-conta">Ver meus agendamentos</button></div></div></section>`);}

async function accountPage(){
  if(!state.session)return layout(pageHead('Minha conta','Acompanhe seus pedidos e horários.')+`<section class="content"><div class="container">${authRequired('/minha-conta')}</div></section>`);
  const uid=state.session.user.id;
  const [qr,qts,apps,notifs]=await Promise.all([
    supabase.from('quote_requests').select('*').eq('user_id',uid).order('created_at',{ascending:false}),
    supabase.from('quotes').select('*').order('created_at',{ascending:false}),
    supabase.from('appointments').select('*').eq('user_id',uid).order('starts_at',{ascending:false}),
    supabase.from('notifications').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(20)
  ]);
  const quoteByReq=Object.fromEntries((qts.data||[]).map(q=>[q.quote_request_id,q]));
  return layout(pageHead(`Olá, ${esc(state.profile?.full_name||'cliente')}`,'Seus dados são protegidos por autenticação e RLS.')+`<section class="content"><div class="container grid-2"><div class="stack"><div class="card"><div class="row space"><h2>Meus orçamentos</h2><button class="btn primary small" data-go="/orcamento">Novo</button></div><div class="list">${(qr.data||[]).map(q=>{const proposal=quoteByReq[q.id];return `<div class="list-item"><div><strong>${esc(q.protocol)}</strong><small>${esc(q.description.slice(0,90))} · ${dOnly(q.created_at)}</small>${proposal?.amount_cents!=null?`<small>Proposta: <b>${brl(proposal.amount_cents)}</b></small>`:''}</div><div class="row"><span class="${statusClass(q.status)}">${statusLabel(q.status)}</span>${q.status==='approved'?`<button class="btn primary small" data-go="/agendar?quote=${q.id}">Agendar</button>`:''}</div></div>`}).join('')||'<p class="muted">Nenhum orçamento ainda.</p>'}</div></div>
  <div class="card"><div class="row space"><h2>Meus agendamentos</h2><button class="btn ghost small" data-go="/agendar">Agendar</button></div><div class="list">${(apps.data||[]).map(a=>`<div class="list-item"><div><strong>${esc(a.protocol)}</strong><small>${dt(a.starts_at)} · ${esc(a.address||'Endereço a confirmar')}</small></div><span class="${statusClass(a.status)}">${statusLabel(a.status)}</span></div>`).join('')||'<p class="muted">Nenhum agendamento.</p>'}</div></div></div>
  <aside class="stack"><div class="card"><h2>Perfil</h2><p><b>${esc(state.profile?.full_name||'')}</b><br>${esc(state.session.user.email||'')}<br>${esc(state.profile?.phone||'')}</p><button class="btn ghost small" id="logoutAccount">Sair</button></div><div class="card"><h2>Notificações</h2><div class="list">${(notifs.data||[]).map(n=>`<div><b>${esc(n.title)}</b><p class="small muted">${esc(n.body)}</p></div>`).join('')||'<p class="muted small">Nenhuma notificação.</p>'}</div></div></aside></div></section>`);
}

async function adminPage(){
  if(!state.session)return layout(pageHead('Painel administrativo','Acesso restrito ao responsável pela Solda Certa.')+`<section class="content"><div class="container">${authRequired('/admin')}</div></section>`);
  if(state.profile?.role!=='admin') return layout(pageHead('Ativar administração','A conta está autenticada, mas ainda não possui função administrativa.')+`<section class="content"><div class="container"><div class="card auth-card"><h2>Ativação inicial do Aldemir</h2><p class="muted">Na primeira configuração, informe o código de ativação entregue fora do site. Ele funciona apenas uma vez.</p><form id="claimAdminForm" class="stack"><div class="field"><label>Código de ativação</label><input name="token" type="password" required></div><div id="claimMsg"></div><button class="btn dark" type="submit">Ativar painel nesta conta</button></form></div></div></section>`);
  const [q,quotes,apps,blocks,services]=await Promise.all([
    supabase.from('quote_requests').select('*').order('created_at',{ascending:false}),
    supabase.from('quotes').select('*').order('created_at',{ascending:false}),
    supabase.from('appointments').select('*').order('starts_at',{ascending:true}),
    supabase.from('blocked_times').select('*').order('starts_at',{ascending:true}),
    supabase.from('services').select('*').order('name')
  ]);
  const proposalByReq=Object.fromEntries((quotes.data||[]).map(x=>[x.quote_request_id,x]));
  const kpis=[['Orçamentos novos',(q.data||[]).filter(x=>x.status==='received').length],['Em análise',(q.data||[]).filter(x=>x.status==='analyzing').length],['Próximos agendamentos',(apps.data||[]).filter(x=>['pending','confirmed'].includes(x.status)&&new Date(x.starts_at)>new Date()).length],['Serviços ativos',(services.data||[]).filter(x=>x.active).length]];
  return `${header()}<div class="admin-layout"><aside class="admin-side" id="adminSide"><button class="active" data-admin="overview">Visão geral</button><button data-admin="quotes">Orçamentos</button><button data-admin="appointments">Agenda</button><button data-admin="blocks">Bloqueios</button><button data-admin="services">Serviços</button></aside><main class="admin-main"><section class="admin-panel active" data-panel="overview"><div class="row space"><div><h1>Painel do Aldemir</h1><p class="muted">Dados reais do Supabase.</p></div><button class="btn ghost small" id="adminLogout">Sair</button></div><div class="kpis">${kpis.map(([l,v])=>`<div class="kpi"><span>${l}</span><strong>${v}</strong></div>`).join('')}</div><div class="card" style="margin-top:18px"><h2>Últimos orçamentos</h2><div class="table">${(q.data||[]).slice(0,5).map(x=>adminQuoteRow(x,proposalByReq[x.id])).join('')||'<p>Nenhum orçamento.</p>'}</div></div></section>
  <section class="admin-panel" data-panel="quotes"><div class="row space"><h1>Orçamentos</h1><button class="btn ghost small" data-admin="overview">Voltar</button></div><div class="table">${(q.data||[]).map(x=>adminQuoteRow(x,proposalByReq[x.id])).join('')}</div></section>
  <section class="admin-panel" data-panel="appointments"><h1>Agenda</h1><div class="table">${(apps.data||[]).map(a=>`<div class="table-row"><div><b>${esc(a.protocol)}</b><small>${esc(a.customer_name)} · ${esc(a.address||'')}</small></div><div>${dt(a.starts_at)}<br><span class="${statusClass(a.status)}">${statusLabel(a.status)}</span></div><select class="appointment-status" data-id="${a.id}"><option value="confirmed" ${a.status==='confirmed'?'selected':''}>Confirmado</option><option value="in_progress" ${a.status==='in_progress'?'selected':''}>Em andamento</option><option value="completed" ${a.status==='completed'?'selected':''}>Concluído</option><option value="cancelled" ${a.status==='cancelled'?'selected':''}>Cancelado</option></select></div>`).join('')||'<p>Nenhum agendamento.</p>'}</div></section>
  <section class="admin-panel" data-panel="blocks"><h1>Bloqueios de agenda</h1><div class="card"><form id="blockForm" class="form-grid"><div class="field"><label>Data</label><input name="date" type="date" min="${todayISO()}" required></div><div class="field"><label>Início</label><input name="start" type="time" required></div><div class="field"><label>Fim</label><input name="end" type="time" required></div><div class="field"><label>Motivo</label><input name="reason" required></div><div class="full"><button class="btn dark" type="submit">Bloquear período</button></div></form></div><div class="table" style="margin-top:15px">${(blocks.data||[]).map(b=>`<div class="table-row"><div><b>${dt(b.starts_at)} → ${tOnly(b.ends_at)}</b><small>${esc(b.reason||'Indisponível')}</small></div><span></span><button class="btn danger small delete-block" data-id="${b.id}">Remover</button></div>`).join('')}</div></section>
  <section class="admin-panel" data-panel="services"><h1>Serviços</h1><div class="services-grid">${(services.data||[]).map(s=>`<article class="service-card"><h3>${esc(s.name)}</h3><p>${esc(s.short_description||'')}</p><label class="row small"><input class="service-toggle" data-id="${s.id}" type="checkbox" ${s.active?'checked':''}> Ativo no site</label><strong>${brl(s.price_from_cents)}</strong></article>`).join('')}</div></section></main></div>`;
}
function adminQuoteRow(q,p){return `<div class="table-row"><div><b>${esc(q.protocol)} · ${esc(q.customer_name)}</b><small>${esc(q.description.slice(0,85))}<br>${esc(q.phone)} · ${esc(q.email)}</small></div><div><span class="${statusClass(q.status)}">${statusLabel(q.status)}</span>${p?`<br><small>${brl(p.amount_cents)}</small>`:''}</div><button class="btn ghost small quote-detail" data-id="${q.id}">Abrir</button></div>`;}

async function render(){
  if(state.loading){app.innerHTML=loading();bindCommon();return;}
  try{
    const p=path(); let html='';
    if(p==='/')html=home();
    else if(p==='/servicos')html=servicesPage();
    else if(p==='/entrar')html=authPage('login');
    else if(p==='/cadastro')html=authPage('signup');
    else if(p==='/redefinir-senha')html=resetPage();
    else if(p==='/orcamento')html=quotePage();
    else if(p==='/agendar')html=schedulePage();
    else if(p==='/minha-conta')html=await accountPage();
    else if(p==='/admin')html=await adminPage();
    else html=layout(pageHead('Página não encontrada')+`<section class="content"><div class="container"><div class="card"><p>Esta página não existe.</p><button class="btn primary" data-go="/">Voltar ao início</button></div></div></section>`);
    app.innerHTML=html; bindCommon(); bindPage();
  }catch(e){console.error(e);app.innerHTML=layout(`<section class="content"><div class="container"><div class="notice bad"><b>Não foi possível carregar esta tela.</b><br>${esc(e.message||String(e))}</div></div></section>`);bindCommon();}
}

function bindCommon(){
  document.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>go(el.dataset.go)));
  document.querySelectorAll('[data-quote-service]').forEach(el=>el.addEventListener('click',()=>go(`/orcamento?service=${encodeURIComponent(el.dataset.quoteService)}`)));
  const mb=document.getElementById('menuBtn'); if(mb)mb.onclick=()=>document.getElementById('mobileNav')?.classList.toggle('open');
  ['logoutBtn','logoutMobile','logoutAccount','adminLogout'].forEach(id=>{const e=document.getElementById(id);if(e)e.onclick=async()=>{await supabase.auth.signOut();go('/');};});
}

function bindPage(){
  const auth=document.getElementById('authForm'); if(auth)auth.addEventListener('submit',handleAuth);
  const forgot=document.getElementById('forgotBtn'); if(forgot)forgot.onclick=handleForgot;
  const reset=document.getElementById('resetForm'); if(reset)reset.addEventListener('submit',handleReset);
  const qf=document.getElementById('quoteForm'); if(qf)qf.addEventListener('submit',handleQuote);
  const files=document.getElementById('quoteFiles'); if(files)files.addEventListener('change',previewFiles);
  const ss=document.getElementById('scheduleSearch'); if(ss)ss.addEventListener('submit',loadSlots);
  const sc=document.getElementById('scheduleConfirm'); if(sc)sc.addEventListener('submit',confirmSchedule);
  const claim=document.getElementById('claimAdminForm'); if(claim)claim.addEventListener('submit',claimAdmin);
  document.querySelectorAll('[data-admin]').forEach(b=>b.addEventListener('click',()=>switchAdmin(b.dataset.admin)));
  document.querySelectorAll('.quote-detail').forEach(b=>b.addEventListener('click',()=>openQuoteAdmin(b.dataset.id)));
  document.querySelectorAll('.appointment-status').forEach(s=>s.addEventListener('change',()=>updateAppointmentStatus(s.dataset.id,s.value)));
  document.querySelectorAll('.service-toggle').forEach(s=>s.addEventListener('change',()=>toggleService(s.dataset.id,s.checked)));
  document.querySelectorAll('.delete-block').forEach(b=>b.addEventListener('click',()=>deleteBlock(b.dataset.id)));
  const bf=document.getElementById('blockForm'); if(bf)bf.addEventListener('submit',addBlock);
}

async function handleAuth(e){
  e.preventDefault(); const f=new FormData(e.currentTarget); const msg=document.getElementById('authMsg'); msg.innerHTML='<span class="spinner"></span>';
  try{
    const email=String(f.get('email')).trim(),password=String(f.get('password'));
    if(e.currentTarget.dataset.mode==='signup'){
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:String(f.get('full_name')).trim(),phone:String(f.get('phone')).trim()}}}); if(error)throw error;
      if(!data.session){msg.innerHTML='<div class="notice good">Conta criada. Verifique seu e-mail para confirmar o cadastro e depois faça login.</div>';return;}
    }else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;}
    const next=e.currentTarget.dataset.next||'/minha-conta'; go(next);
  }catch(err){msg.innerHTML=`<div class="notice bad">${esc(err.message)}</div>`;}
}
async function handleForgot(){const email=prompt('Digite o e-mail da sua conta:');if(!email)return;const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/redefinir-senha`});alert(error?error.message:'Se o e-mail estiver cadastrado, você receberá as instruções de redefinição.');}
async function handleReset(e){e.preventDefault();const p=String(new FormData(e.currentTarget).get('password'));const msg=document.getElementById('resetMsg');const {error}=await supabase.auth.updateUser({password:p});msg.innerHTML=error?`<div class="notice bad">${esc(error.message)}</div>`:'<div class="notice good">Senha atualizada. Você já pode continuar usando sua conta.</div>';}

function previewFiles(e){const box=document.getElementById('filePreview');const files=[...e.target.files];box.innerHTML=files.map(f=>`<div class="file-pill"><span>${esc(f.name)}</span><span>${(f.size/1024/1024).toFixed(1)} MB</span></div>`).join('');}
async function handleQuote(e){
  e.preventDefault();const form=e.currentTarget,msg=document.getElementById('quoteMsg');msg.innerHTML='<span class="spinner"></span>';
  try{
    const f=new FormData(form);const files=[...document.getElementById('quoteFiles').files];
    if(files.length>5)throw new Error('Envie no máximo 5 arquivos.');
    for(const file of files)if(file.size>10*1024*1024)throw new Error(`${file.name} ultrapassa 10 MB.`);
    const proto=protocol('ORC');
    const payload={protocol:proto,user_id:state.session.user.id,service_id:f.get('service_id'),description:String(f.get('description')).trim(),approximate_measures:String(f.get('approximate_measures')||'').trim()||null,material:String(f.get('material')||'').trim()||null,quantity:String(f.get('quantity')||'').trim()||null,urgency:f.get('urgency'),address:String(f.get('address')).trim(),attendance_type:f.get('attendance_type'),customer_name:String(f.get('customer_name')).trim(),phone:String(f.get('phone')).trim(),email:String(f.get('email')).trim(),status:'received'};
    const {data:q,error}=await supabase.from('quote_requests').insert(payload).select().single();if(error)throw error;
    for(const file of files){
      const ext=(file.name.split('.').pop()||'bin').toLowerCase();const storagePath=`${state.session.user.id}/${q.id}/${crypto.randomUUID()}.${ext}`;
      const up=await supabase.storage.from('quote-attachments').upload(storagePath,file,{contentType:file.type,upsert:false});if(up.error)throw up.error;
      const ins=await supabase.from('quote_attachments').insert({quote_request_id:q.id,user_id:state.session.user.id,storage_path:storagePath,file_name:file.name,mime_type:file.type,size_bytes:file.size});if(ins.error)throw ins.error;
    }
    await supabase.from('consent_records').insert({user_id:state.session.user.id,quote_request_id:q.id,consent_type:'privacy_quote_submission',version:'1.0'});
    app.innerHTML=quoteSuccess(proto);bindCommon();
  }catch(err){msg.innerHTML=`<div class="notice bad">${esc(err.message)}</div>`;}
}

async function loadSlots(e){
  e.preventDefault();const f=new FormData(e.currentTarget);const service=f.get('service_id'),date=f.get('date');const area=document.getElementById('slotArea');area.innerHTML='<span class="spinner"></span>';
  try{
    const {data,error}=await supabase.rpc('available_slots',{p_date:date,p_duration_minutes:60});if(error)throw error;
    if(!data?.length){area.innerHTML='<div class="notice">Não há horários livres nesta data. Escolha outro dia.</div>';return;}
    area.innerHTML=`<p><b>Horários disponíveis</b></p><div class="slots">${data.map(x=>`<button class="slot" data-start="${x.starts_at}" data-end="${x.ends_at}" data-service="${service}">${tOnly(x.starts_at)}</button>`).join('')}</div>`;
    area.querySelectorAll('.slot').forEach(btn=>btn.addEventListener('click',()=>holdSlot(btn)));
  }catch(err){area.innerHTML=`<div class="notice bad">${esc(err.message)}</div>`;}
}
async function holdSlot(btn){
  const area=document.getElementById('slotArea');area.querySelectorAll('.slot').forEach(x=>x.disabled=true);btn.textContent='Reservando...';
  const {data,error}=await supabase.rpc('hold_slot',{p_service_id:btn.dataset.service,p_starts_at:btn.dataset.start,p_duration_minutes:60});
  area.querySelectorAll('.slot').forEach(x=>x.disabled=false);
  if(error){area.insertAdjacentHTML('beforeend',`<div class="notice bad" style="margin-top:10px">${esc(error.message)}</div>`);return;}
  area.querySelectorAll('.slot').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');btn.textContent=tOnly(btn.dataset.start);
  const hold=Array.isArray(data)?data[0]:data;const form=document.getElementById('scheduleConfirm');form.elements.hold_id.value=hold.id;document.getElementById('confirmScheduleBtn').disabled=false;document.getElementById('holdInfo').className='notice good';document.getElementById('holdInfo').innerHTML=`Horário reservado até <b>${tOnly(hold.expires_at)}</b>: ${dt(hold.starts_at)}.`;
}
async function confirmSchedule(e){
  e.preventDefault();const f=new FormData(e.currentTarget),msg=document.getElementById('scheduleMsg');msg.innerHTML='<span class="spinner"></span>';
  try{
    const args={p_hold_id:f.get('hold_id'),p_quote_request_id:f.get('quote_request_id')||null,p_customer_name:String(f.get('customer_name')).trim(),p_phone:String(f.get('phone')).trim(),p_email:String(f.get('email')).trim(),p_address:String(f.get('address')).trim(),p_modality:f.get('modality'),p_notes:String(f.get('notes')||'').trim()||null};
    const {data,error}=await supabase.rpc('confirm_appointment_from_hold',args);if(error)throw error;const ap=Array.isArray(data)?data[0]:data;app.innerHTML=scheduleSuccess(ap.protocol);bindCommon();
  }catch(err){msg.innerHTML=`<div class="notice bad">${esc(err.message)}</div>`;}
}

async function claimAdmin(e){e.preventDefault();const msg=document.getElementById('claimMsg'),token=String(new FormData(e.currentTarget).get('token'));const {error}=await supabase.rpc('claim_admin',{bootstrap_token:token});if(error){msg.innerHTML=`<div class="notice bad">${esc(error.message)}</div>`;return;}await loadProfile();render();}
function switchAdmin(name){document.querySelectorAll('.admin-panel').forEach(x=>x.classList.toggle('active',x.dataset.panel===name));document.querySelectorAll('[data-admin]').forEach(x=>x.classList.toggle('active',x.dataset.admin===name));}
async function openQuoteAdmin(id){
  const [q,p,a,m]=await Promise.all([supabase.from('quote_requests').select('*').eq('id',id).single(),supabase.from('quotes').select('*').eq('quote_request_id',id).maybeSingle(),supabase.from('quote_attachments').select('*').eq('quote_request_id',id),supabase.from('quote_messages').select('*').eq('quote_request_id',id).order('created_at')]);
  if(q.error)return alert(q.error.message);
  const links=[];for(const att of a.data||[]){const s=await supabase.storage.from('quote-attachments').createSignedUrl(att.storage_path,600);if(!s.error)links.push({name:att.file_name,url:s.data.signedUrl});}
  const current=p.data||{};const wrap=document.createElement('div');wrap.className='dialog-backdrop';wrap.innerHTML=`<div class="dialog"><div class="row space"><h3>${esc(q.data.protocol)} · ${esc(q.data.customer_name)}</h3><button class="btn ghost small" id="closeDialog">Fechar</button></div><p>${esc(q.data.description)}</p><p class="small muted">${esc(q.data.phone)} · ${esc(q.data.email)} · ${esc(q.data.address||'')}</p>${links.length?`<h4>Anexos privados</h4><div class="attachment-grid">${links.map(l=>`<a href="${l.url}" target="_blank" rel="noopener">📎 ${esc(l.name)}</a>`).join('')}</div>`:''}<hr style="border:0;border-top:1px solid var(--border);margin:20px 0"><form id="adminQuoteForm" class="form-grid"><input type="hidden" name="id" value="${id}"><div class="field"><label>Status</label><select name="status"><option value="received" ${q.data.status==='received'?'selected':''}>Recebido</option><option value="analyzing" ${q.data.status==='analyzing'?'selected':''}>Em análise</option><option value="awaiting_info" ${q.data.status==='awaiting_info'?'selected':''}>Aguardando informações</option><option value="quoted" ${q.data.status==='quoted'?'selected':''}>Orçamento enviado</option><option value="approved" ${q.data.status==='approved'?'selected':''}>Aprovado</option><option value="declined" ${q.data.status==='declined'?'selected':''}>Recusado</option><option value="closed" ${q.data.status==='closed'?'selected':''}>Encerrado</option></select></div><div class="field"><label>Valor da proposta (R$)</label><input name="amount" type="number" step="0.01" value="${current.amount_cents!=null?(current.amount_cents/100).toFixed(2):''}"></div><div class="field full"><label>Condições / recado</label><textarea name="conditions" rows="3">${esc(current.conditions||'')}</textarea></div><div class="full"><button class="btn primary" type="submit">Salvar proposta</button></div></form><h4>Mensagens</h4><div class="list">${(m.data||[]).map(x=>`<div class="small"><b>${esc(x.sender_role)}</b> · ${dt(x.created_at)}<br>${esc(x.body)}</div>`).join('')||'<p class="muted small">Sem mensagens.</p>'}</div></div>`;document.body.appendChild(wrap);wrap.querySelector('#closeDialog').onclick=()=>wrap.remove();wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove()});wrap.querySelector('#adminQuoteForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),amount=String(f.get('amount')).trim();const status=f.get('status');const cents=amount?Math.round(Number(amount.replace(',','.'))*100):null;let proposal=current.id?await supabase.from('quotes').update({amount_cents:cents,conditions:String(f.get('conditions')||''),status:status==='quoted'?'sent':status==='approved'?'approved':status==='declined'?'declined':'draft',sent_at:status==='quoted'?new Date().toISOString():current.sent_at}).eq('id',current.id):await supabase.from('quotes').insert({quote_request_id:id,amount_cents:cents,conditions:String(f.get('conditions')||''),status:status==='quoted'?'sent':'draft',sent_at:status==='quoted'?new Date().toISOString():null,created_by:state.session.user.id});if(proposal.error)return alert(proposal.error.message);const up=await supabase.from('quote_requests').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(up.error)return alert(up.error.message);await supabase.from('quote_messages').insert({quote_request_id:id,sender_user_id:state.session.user.id,sender_role:'admin',body:amount?`Proposta atualizada: ${brl(cents)}. ${String(f.get('conditions')||'')}`:`Status atualizado para ${statusLabel(status)}.`});wrap.remove();render();});
}
async function updateAppointmentStatus(id,status){const {error}=await supabase.from('appointments').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)alert(error.message);else render();}
async function toggleService(id,active){const {error}=await supabase.from('services').update({active,updated_at:new Date().toISOString()}).eq('id',id);if(error)alert(error.message);else{await loadPublic();render();}}
function spIso(date,time){return new Date(`${date}T${time}:00-03:00`).toISOString();}
async function addBlock(e){e.preventDefault();const f=new FormData(e.currentTarget);const starts=spIso(f.get('date'),f.get('start')),ends=spIso(f.get('date'),f.get('end'));if(new Date(ends)<=new Date(starts))return alert('O fim precisa ser depois do início.');const {error}=await supabase.from('blocked_times').insert({starts_at:starts,ends_at:ends,reason:String(f.get('reason')),created_by:state.session.user.id});if(error)alert(error.message);else render();}
async function deleteBlock(id){if(!confirm('Remover este bloqueio?'))return;const {error}=await supabase.from('blocked_times').delete().eq('id',id);if(error)alert(error.message);else render();}

bootstrap();
