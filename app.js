const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const STORE = {
  get(key, fallback){try{return JSON.parse(localStorage.getItem('minhaEscola_'+key)) ?? fallback}catch{return fallback}},
  set(key, value){try{localStorage.setItem('minhaEscola_'+key,JSON.stringify(value))}catch{}}
};

const supabaseConfig = window.SUPABASE_CONFIG || {};
const supabaseClient = window.supabase && supabaseConfig.url && supabaseConfig.publishableKey
  ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.publishableKey)
  : null;
let currentUser = null;
let currentProfile = null;
let signupMode = false;
let databaseReports = null;
let databaseProjects = null;
let databaseAppointments = null;
let databaseAnnouncements = null;
function requireLogin(){
  if(currentUser && supabaseClient) return true;
  toast('Entre ou crie uma conta em “Meu perfil” para salvar dados no banco.');
  go('perfil');
  return false;
}
function friendlyRole(role){
  return ({student:'Aluno',teacher:'Professor',staff:'Equipe escolar',psychologist:'Psicólogo(a)',director:'Direção',admin:'Administrador'})[role] || 'Aluno';
}
function formatDbDate(value){
  if(!value) return 'Data não informada';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('pt-BR');
}
async function loadProfile(){
  if(!currentUser || !supabaseClient) return;
  const {data,error} = await supabaseClient.from('profiles')
    .select('id,full_name,role,school_name').eq('id',currentUser.id).single();
  if(error) throw error;
  currentProfile = data;
  applyProfile();
}
async function enterAccount(user){
  if(!supabaseClient || !user) return;
  currentUser = user;
  try {
    await loadProfile();
    $('#authStatus').textContent = `Conectado como ${currentUser.email}. Os formulários compatíveis salvam no Supabase.`;
    $('#authSubmit').classList.add('hidden');
    $('#authToggle').classList.add('hidden');
    $('#authSignOut').classList.remove('hidden');
    $('#authEmail').disabled = true;
    $('#authPassword').classList.add('hidden');
    $('#authNameWrap').classList.add('hidden');
    await Promise.all([loadReportsFromDb(), loadProjectsFromDb(), loadAppointmentsFromDb(), loadAnnouncementsFromDb()]);
    toast('Conexão autenticada com o Supabase.');
  } catch (error) {
    console.error(error);
    toast('Não foi possível carregar a conta ou os dados. Confira o SQL e as políticas do Supabase.');
  }
}
function setSignupMode(value){
  signupMode = value;
  $('#authNameWrap').classList.toggle('hidden', !signupMode);
  $('#authName').required = signupMode;
  $('#authSubmit').textContent = signupMode ? 'Criar conta' : 'Entrar';
  $('#authToggle').textContent = signupMode ? 'Já tenho conta' : 'Criar conta';
}
function initializeAuth(){
  if(!supabaseClient){
    $('#authStatus').textContent = 'Não foi possível iniciar o cliente Supabase. Confira config.js e a conexão com a internet.';
    return;
  }
  setSignupMode(false);
  $('#authToggle').addEventListener('click', () => setSignupMode(!signupMode));
  $('#authForm').addEventListener('submit', async e => {
    e.preventDefault();
    const button = $('#authSubmit');
    button.disabled = true;
    try {
      const email = $('#authEmail').value.trim();
      const password = $('#authPassword').value;
      if(signupMode){
        const {data,error} = await supabaseClient.auth.signUp({
          email, password,
          options:{data:{full_name:$('#authName').value.trim()}}
        });
        if(error) throw error;
        if(data.session && data.user) await enterAccount(data.user);
        else toast('Cadastro iniciado. Confira seu e-mail para confirmar a conta antes de entrar.');
      } else {
        const {data,error} = await supabaseClient.auth.signInWithPassword({email,password});
        if(error) throw error;
        await enterAccount(data.user);
      }
    } catch(error) {
      console.error(error);
      toast(error.message || 'Não foi possível autenticar. Confira e-mail e senha.');
    } finally {
      button.disabled = false;
    }
  });
  $('#authSignOut').addEventListener('click', async () => {
    const {error} = await supabaseClient.auth.signOut();
    if(error){toast('Não foi possível sair da conta.');return;}
    currentUser = null; currentProfile = null;
    databaseReports = null; databaseProjects = null; databaseAppointments = null; databaseAnnouncements = null;
    $('#authStatus').textContent = 'Você saiu da conta. Entre para salvar dados no Supabase.';
    $('#authSubmit').classList.remove('hidden');
    $('#authToggle').classList.remove('hidden');
    $('#authSignOut').classList.add('hidden');
    $('#authEmail').disabled = false;
    $('#authPassword').classList.remove('hidden');
    setSignupMode(false);
    renderReports(); renderProjects(); renderAppointments(); renderAnnouncements(); applyProfile();
    toast('Você saiu da conta.');
  });
  supabaseClient.auth.getSession().then(({data,error}) => {
    if(error) throw error;
    if(data.session) enterAccount(data.session.user);
  }).catch(error => { console.error(error); });
  supabaseClient.auth.onAuthStateChange((event,session) => {
    if(event === 'SIGNED_IN' && session?.user && currentUser?.id !== session.user.id) {
      setTimeout(() => enterAccount(session.user), 0);
    }
  });
}
async function loadReportsFromDb(){
  if(!currentUser) return;
  const {data,error} = await supabaseClient.from('infrastructure_reports')
    .select('id,title,category,location,description,status,created_at')
    .order('created_at',{ascending:false}).limit(50);
  if(error) throw error;
  databaseReports = (data || []).map(r => ({
    id:r.id,title:r.title,category:r.category,place:r.location,
    description:r.description,status:r.status,date:formatDbDate(r.created_at)
  }));
  renderReports();
}
async function loadProjectsFromDb(){
  if(!currentUser) return;
  const {data,error} = await supabaseClient.from('student_projects')
    .select('id,title,category,description,members,status,created_at')
    .order('created_at',{ascending:false}).limit(100);
  if(error) throw error;
  databaseProjects = (data || []).map(p => ({
    id:p.id,title:p.title,area:p.category,description:p.description,
    members:p.members || '',status:p.status,date:formatDbDate(p.created_at)
  }));
  renderProjects();
}
async function loadAppointmentsFromDb(){
  if(!currentUser) return;
  const {data,error} = await supabaseClient.from('appointments')
    .select('id,appointment_type,reason,preferred_date,preferred_time,note,status,created_at')
    .order('created_at',{ascending:false}).limit(50);
  if(error) throw error;
  databaseAppointments = (data || []).map(a => ({
    id:a.id,
    type:({'Direção':'Direção escolar','Psicologia':'Psicólogo(a) escolar','Coordenação':'Coordenação pedagógica'})[a.appointment_type] || a.appointment_type,
    reason:a.reason || 'Assunto não informado',date:formatDbDate(a.preferred_date),
    time:a.preferred_time,note:a.note || '',status:a.status
  }));
  renderAppointments();
}

async function loadAnnouncementsFromDb(){
  if(!currentUser || !supabaseClient) {
    databaseAnnouncements = null;
    renderAnnouncements();
    return;
  }
  const {data,error} = await supabaseClient.from('school_announcements')
    .select('id,title,body,audience,created_at,author_id')
    .order('created_at',{ascending:false}).limit(100);
  if(error) throw error;
  databaseAnnouncements = data || [];
  renderAnnouncements();
}
function renderAnnouncements(){
  const form = $('#announcementForm');
  const permission = $('#announcementPermission');
  const canPublish = !!currentProfile && ['teacher','staff','director','admin','psychologist'].includes(currentProfile.role);
  if(form) form.classList.toggle('hidden', !canPublish);
  if(permission) {
    permission.textContent = !currentUser
      ? 'Entre com uma conta para visualizar os avisos. A publicação é restrita à equipe escolar autorizada.'
      : canPublish
        ? 'Sua conta pode publicar avisos. Eles serão compartilhados com os usuários autenticados conforme o público escolhido.'
        : 'Você pode visualizar os avisos. Somente professores e equipe escolar autorizada podem publicar.';
  }
  const list = $('#announcementsList');
  if(!list) return;
  if(!currentUser) {
    list.innerHTML = '<div class="empty-state">Entre na sua conta para carregar os avisos compartilhados.</div>';
    return;
  }
  const audience = currentProfile?.role === 'student' ? ['all','students'] :
    ['all','students','teachers'];
  const rows = (databaseAnnouncements || []).filter(a => audience.includes(a.audience));
  list.innerHTML = rows.map(a => `<article class="event-row searchable"><div class="event-date"><strong>📢</strong><small>${escapeHTML(formatDbDate(a.created_at))}</small></div><div><strong>${escapeHTML(a.title)}</strong><p>${escapeHTML(a.body).replace(/\\n/g,'<br>')}</p><p class="item-meta">Publicado em ${escapeHTML(formatDbDate(a.created_at))}</p></div></article>`).join('')
    || '<div class="empty-state">Ainda não há avisos publicados para sua conta.</div>';
}
$('#refreshAnnouncements')?.addEventListener('click', async () => {
  try { await loadAnnouncementsFromDb(); toast('Avisos atualizados.'); }
  catch(error) { console.error(error); toast(error.message || 'Não foi possível carregar os avisos.'); }
});
$('#announcementForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  if(!requireLogin()) return;
  if(!currentProfile || !['teacher','staff','director','admin','psychologist'].includes(currentProfile.role)) {
    toast('Sua conta não tem permissão para publicar avisos.');
    return;
  }
  const title = $('#announcementTitle').value.trim();
  const body = $('#announcementBody').value.trim();
  const audience = $('#announcementAudience').value;
  try {
    const {error} = await supabaseClient.from('school_announcements').insert({
      author_id: currentUser.id, title, body, audience
    });
    if(error) throw error;
    e.target.reset();
    await loadAnnouncementsFromDb();
    toast('Aviso publicado e salvo no Supabase.');
  } catch(error) {
    console.error(error);
    toast(error.message || 'Não foi possível publicar. Confira a função da conta e as políticas do Supabase.');
  }
});
const initialReports=[
 {id:1,title:'Vazamento de água no banheiro',category:'Água e encanamento',place:'Banheiro do bloco A',description:'Há um vazamento próximo a uma das torneiras.',status:'Em análise',date:'Exemplo'},
 {id:2,title:'Carteira quebrada na sala',category:'Carteiras e mobiliário',place:'Sala 12',description:'Uma carteira precisa de reparo para uso seguro.',status:'Pendente',date:'Exemplo'}
];
const events=[
 {day:'25',month:'OUT',title:'Feira de Ciências e Tecnologia',place:'Evento ilustrativo · confirme com a escola',time:'Data de exemplo'},
 {day:'28',month:'OUT',title:'Mostra de Projetos Estudantis',place:'Evento ilustrativo · confirme com o organizador',time:'Data de exemplo'},
 {day:'05',month:'NOV',title:'Encontro de Grupos Culturais',place:'Evento ilustrativo · confirme com a organização',time:'Data de exemplo'}
];
const recommendations={
 musica:{title:'Música',subjects:['Artes: expressão, composição e prática musical.','Matemática: frações, ritmo, compassos e padrões.','Português: interpretação, escrita e composição de letras.','Física: som, frequência, acústica e instrumentos.','História: gêneros musicais e contextos culturais.'],activities:['Pratique um instrumento ou canto em sessões curtas e regulares.','Registre seu progresso e escolha uma música para aprender por etapas.','Explore ferramentas de gravação e participe de projetos culturais.'],goal:'Escolha uma música, divida-a em pequenas partes e pratique uma delas nesta semana.'},
 tecnologia:{title:'Tecnologia',subjects:['Matemática: lógica, álgebra e resolução de problemas.','Ciências: investigação e pensamento experimental.','Português: leitura técnica e documentação.','Inglês: vocabulário e leitura de materiais tecnológicos.'],activities:['Crie um projeto pequeno, como uma página ou protótipo.','Estude com desafios práticos e registre o que aprendeu.','Revise erros como parte do processo de aprendizagem.'],goal:'Planeje um projeto simples e liste três passos para construir uma primeira versão.'},
 saude:{title:'Saúde',subjects:['Biologia: corpo humano, células e ecossistemas.','Química: substâncias e processos biológicos.','Matemática: leitura de dados e estatística.','Português: comunicação, interpretação e escrita.'],activities:['Use mapas conceituais para conectar sistemas do corpo.','Pratique explicar conceitos com suas próprias palavras.','Explore projetos de promoção de saúde com supervisão docente.'],goal:'Escolha um tema de saúde e crie um resumo com fontes confiáveis.'},
 educacao:{title:'Educação',subjects:['Português: leitura, escrita e comunicação.','História e Sociologia: sociedade e cultura.','Psicologia e Ciências: desenvolvimento e aprendizagem.','Matemática: planejamento e interpretação de dados.'],activities:['Explique um conteúdo a um colega para testar sua compreensão.','Crie um pequeno guia ou atividade educativa.','Observe quais estratégias ajudam diferentes pessoas a aprender.'],goal:'Prepare uma explicação curta sobre um tema que você domina.'},
 artes:{title:'Artes e design',subjects:['Artes: linguagem visual e experimentação.','Matemática: proporção, geometria e escala.','História: movimentos e referências culturais.','Português: narrativa, apresentação e argumentação.'],activities:['Monte um portfólio com trabalhos e rascunhos.','Analise referências e experimente diferentes técnicas.','Peça feedback e revise seu projeto.'],goal:'Crie um estudo visual sobre um tema que seja importante para você.'},
 exatas:{title:'Ciências e matemática',subjects:['Matemática: álgebra, geometria e estatística.','Física: modelos, medidas e fenômenos.','Química: matéria e transformações.','Português: leitura de enunciados e explicação de resultados.'],activities:['Resolva problemas em etapas e explique cada decisão.','Faça experiências seguras com orientação de um professor.','Use gráficos e tabelas para interpretar resultados.'],goal:'Escolha um problema, registre as etapas da solução e confira o resultado.'},
 comunicacao:{title:'Comunicação',subjects:['Português: escrita, leitura crítica e argumentação.','História: contexto e análise de fontes.','Artes: imagem, som e linguagem audiovisual.','Tecnologia: ferramentas de edição e publicação.'],activities:['Produza uma notícia, podcast ou vídeo curto.','Compare fontes e confira informações antes de compartilhar.','Peça feedback sobre clareza e acessibilidade.'],goal:'Crie uma peça de comunicação curta sobre uma iniciativa positiva da escola.'},
 esportes:{title:'Esportes',subjects:['Educação Física: movimento, regras e trabalho em equipe.','Biologia: corpo humano e saúde.','Matemática: estatísticas e desempenho.','Português: comunicação e análise de estratégias.'],activities:['Estude regras, táticas e história da modalidade.','Registre metas de habilidade e bem-estar, sem comparações nocivas.','Explore organização de eventos esportivos inclusivos.'],goal:'Pesquise uma modalidade e apresente suas regras e valores de cooperação.'},
 'meio-ambiente':{title:'Meio ambiente',subjects:['Biologia: ecossistemas e biodiversidade.','Química: água, solo e materiais.','Matemática: medições, gráficos e estatística.','Geografia: território, clima e uso de recursos.'],activities:['Observe um desafio ambiental local com autorização da escola.','Colete dados simples sem expor pessoas ou áreas restritas.','Desenvolva uma proposta sustentável em equipe.'],goal:'Identifique um problema ambiental da escola e sugira uma ação possível.'}
};
function escapeHTML(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3000);}
function go(page){$$('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${page}`));$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));const names={inicio:'Início',infraestrutura:'Infraestrutura',futuro:'Meu Futuro',apoio:'Direção e Psicólogo',projetos:'Projetos e eventos',professores:'Professores',perfil:'Meu perfil'};$('#breadcrumb').innerHTML=`${escapeHTML(names[page]||'Início')} <span>/</span> EducTech`;$('#sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'});$('#globalSearch').value='';filterVisible('');}
document.addEventListener('click',e=>{const nav=e.target.closest('[data-page]');if(nav){e.preventDefault();go(nav.dataset.page);return}const goto=e.target.closest('[data-goto]');if(goto){go(goto.dataset.goto);}});
$('#mobileMenu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
$('#profileQuick').addEventListener('click',()=>go('perfil'));
function getReports(){return databaseReports ?? STORE.get('reports',initialReports)}
function renderReports(){
 const reports=getReports();$('#reportCount').textContent=`${reports.length} ${reports.length===1?'relato':'relatos'}`;
 const html=reports.map(r=>`<article class="mini-item searchable"><span class="item-symbol">⚠️</span><div style="flex:1"><strong>${escapeHTML(r.title)}</strong><p>${escapeHTML(r.description)}</p><div class="item-meta">${escapeHTML(r.place)} · ${escapeHTML(r.category)} · ${escapeHTML(r.date)}</div><p><span class="status ${r.status==='Resolvido'?'resolvido':r.status==='Pendente'?'pendente':''}">${escapeHTML(r.status)}</span></p></div></article>`).join('')||'<div class="empty-state">Nenhum relato ainda. Seja a primeira pessoa a registrar um problema.</div>';
 $('#reportsList').innerHTML=html;$('#homeReports').innerHTML=reports.slice(0,2).map(r=>`<article class="mini-item searchable"><span class="item-symbol">🔧</span><div><strong>${escapeHTML(r.title)}</strong><p>${escapeHTML(r.place)}</p><span class="status ${r.status==='Resolvido'?'resolvido':''}">${escapeHTML(r.status)}</span></div></article>`).join('');
}
$('#reportForm').addEventListener('submit',async e=>{e.preventDefault();if(!requireLogin())return;const files=[...$('#reportFiles').files];if(files.length)toast('Aviso: os arquivos não serão enviados nesta versão; será salvo apenas o texto.');try{const {error}=await supabaseClient.from('infrastructure_reports').insert({user_id:currentUser.id,title:$('#reportTitle').value.trim(),category:$('#reportCategory').value,location:$('#reportPlace').value.trim(),description:$('#reportDescription').value.trim()});if(error)throw error;e.target.reset();await loadReportsFromDb();toast('Relato salvo no banco de dados.');}catch(error){console.error(error);toast(error.message||'Não foi possível salvar o relato no Supabase.');}});
function renderEvents(){const html=events.map(ev=>`<article class="event-row searchable"><div class="event-date"><strong>${ev.day}</strong><small>${ev.month}</small></div><div><strong>${escapeHTML(ev.title)}</strong><p>📍 ${escapeHTML(ev.place)}</p><p>◷ ${escapeHTML(ev.time)}</p></div></article>`).join('');$('#homeEvents').innerHTML=html;$('#eventsList').innerHTML=html;}
function renderProjects(){const projects=databaseProjects ?? STORE.get('projects',[]);$('#projectCount').textContent=`${projects.length} ${projects.length===1?'projeto':'projetos'}`;$('#projectsList').innerHTML=projects.map(p=>`<article class="mini-item searchable"><span class="item-symbol">💡</span><div><strong>${escapeHTML(p.title)}</strong><p>${escapeHTML(p.description)}</p><div class="item-meta">${escapeHTML(p.area)} · ${escapeHTML(p.members||'Integrantes não informados')} · ${escapeHTML(p.date)}</div><span class="status pendente">Ideia cadastrada</span></div></article>`).join('')||'<div class="empty-state">Seus projetos aparecerão aqui depois do cadastro.</div>';}
$('#projectForm').addEventListener('submit',async e=>{e.preventDefault();if(!requireLogin())return;try{const members=$('#projectMembers').value.trim();const {error}=await supabaseClient.from('student_projects').insert({user_id:currentUser.id,title:$('#projectTitle').value.trim(),category:$('#projectArea').value,description:$('#projectDescription').value.trim(),members,team_type:members?'Grupo':'Individual'});if(error)throw error;e.target.reset();await loadProjectsFromDb();toast('Projeto salvo no banco de dados.');}catch(error){console.error(error);toast(error.message||'Não foi possível salvar o projeto no Supabase.');}});
function renderAppointments(){const a=databaseAppointments ?? STORE.get('appointments',[]);$('#appointmentsList').innerHTML=a.map(x=>`<article class="mini-item searchable"><span class="item-symbol">📅</span><div><strong>${escapeHTML(x.type)}</strong><p>${escapeHTML(x.reason)} · ${escapeHTML(x.date)} · ${escapeHTML(x.time)}</p>${x.note?`<p>${escapeHTML(x.note)}</p>`:''}<span class="status pendente">Solicitação local</span></div></article>`).join('')||'<div class="empty-state">Você ainda não registrou solicitações neste navegador.</div>';}
$('#appointmentDate').min=new Date().toISOString().slice(0,10);
$('#appointmentForm').addEventListener('submit',async e=>{e.preventDefault();if(!requireLogin())return;const typeMap={'Direção escolar':'Direção','Psicólogo(a) escolar':'Psicologia','Coordenação pedagógica':'Coordenação','Não sei / preciso de orientação':'Coordenação'};try{const {error}=await supabaseClient.from('appointments').insert({user_id:currentUser.id,appointment_type:typeMap[$('#appointmentType').value]||'Coordenação',reason:$('#appointmentReason').value,preferred_date:$('#appointmentDate').value,preferred_time:$('#appointmentTime').value,note:$('#appointmentNote').value.trim()});if(error)throw error;e.target.reset();await loadAppointmentsFromDb();toast('Solicitação salva no banco. O profissional ainda precisa confirmar o atendimento.');}catch(error){console.error(error);toast(error.message||'Não foi possível salvar a solicitação.');}});
$('#careerForm').addEventListener('submit',e=>{e.preventDefault();const key=$('#careerArea').value;const plan=recommendations[key];if(!plan)return;const style=$('#careerStyle').value;const styles={pratica:'Aprendizagem prática: transforme o conteúdo em pequenas tarefas e projetos.',visual:'Aprendizagem visual: use esquemas, vídeos educativos e mapas conceituais.',leitura:'Leitura e anotações: leia trechos curtos, resuma com suas palavras e revise depois.',grupo:'Aprendizagem colaborativa: explique ideias, compare estratégias e desenvolva algo em grupo.'};$('#planTitle').textContent=`Seu caminho em ${plan.title}`;$('#planOutput').innerHTML=`${$('#careerGoal').value.trim()?`<p><b>Objetivo informado:</b> ${escapeHTML($('#careerGoal').value.trim())}</p>`:''}<h3>Disciplinas para explorar</h3><ul>${plan.subjects.map(s=>`<li>${escapeHTML(s)}</li>`).join('')}</ul><h3>Metodologias que podem ajudar</h3><p>${escapeHTML(styles[style])}</p><ul>${plan.activities.map(s=>`<li>${escapeHTML(s)}</li>`).join('')}</ul><h3>Sua primeira meta</h3><p>${escapeHTML(plan.goal)}</p>`;STORE.set('careerPlan',{key,goal:$('#careerGoal').value.trim(),style});toast('Seu plano de aprendizagem foi criado.');});
$('#profileForm').addEventListener('submit',async e=>{e.preventDefault();if(!requireLogin())return;const name=$('#profileName').value.trim();try{const {data,error}=await supabaseClient.from('profiles').update({full_name:name,updated_at:new Date().toISOString()}).eq('id',currentUser.id).select('id,full_name,role,school_name').single();if(error)throw error;currentProfile=data;applyProfile();toast('Nome atualizado no Supabase.');}catch(error){console.error(error);toast(error.message||'Não foi possível atualizar o perfil.');}});
function applyProfile(){const local=STORE.get('profile',{name:'Aluno visitante',role:'Aluno'});const p={name:currentProfile?.full_name||local.name,role:currentProfile?friendlyRole(currentProfile.role):local.role};$('#profileName').value=p.name;$('#profileRole').value=p.role;$('#headerName').textContent=p.name||'Aluno visitante';$('#headerRole').textContent=p.role;$('#avatarInitial').textContent=(p.name||'A').trim().charAt(0).toUpperCase();$('#welcomeTitle').textContent=`Olá, ${(p.name||'estudante').split(' ')[0]}!`;}
function filterVisible(q){const active=$('.page.active');if(!active)return;const items=$$('.searchable',active);let shown=0;items.forEach(item=>{const match=!q||item.textContent.toLocaleLowerCase('pt-BR').includes(q.toLocaleLowerCase('pt-BR'));item.classList.toggle('hidden',!match);if(match)shown++;});}
$('#globalSearch').addEventListener('input',e=>filterVisible(e.target.value.trim()));
renderReports();renderEvents();renderProjects();renderAppointments();renderAnnouncements();applyProfile();initializeAuth();
