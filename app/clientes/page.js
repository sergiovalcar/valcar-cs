'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { CotasPanel } from '@/components/CotasPanel';

const STATUS_MAP = {
  novo: { label: 'Passagem de Bastão', color: '#2E7D32', bg: 'rgba(46,125,50,0.12)' },
  checagem: { label: 'Checagem', color: '#E65100', bg: 'rgba(230,81,0,0.12)' },
  ativo: { label: 'Ativo em Dia', color: '#1565C0', bg: 'rgba(21,101,192,0.12)' },
  atrasado: { label: 'Ativo em Atraso', color: '#C62828', bg: 'rgba(198,40,40,0.12)' },
  cancelado: { label: 'Cancelado', color: '#616161', bg: 'rgba(97,97,97,0.12)' },
  contemplado: { label: 'Contemplado', color: '#6A1B9A', bg: 'rgba(106,27,154,0.12)' },
  faturado: { label: 'Faturado', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  credito_disponivel: { label: 'Crédito Disp.', color: '#00695C', bg: 'rgba(0,105,92,0.12)' },
};
const BENS = ['automovel', 'imovel', 'moto', 'caminhao', 'servicos'];
const BEM_LABELS = { automovel: 'Automóvel', imovel: 'Imóvel', moto: 'Moto', caminhao: 'Caminhão', servicos: 'Serviços' };

// ===== HELPERS =====
function formatPhone(value) {
  const d = (value || '').replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return '(' + d;
  if (d.length <= 6) return '(' + d.slice(0,2) + ') ' + d.slice(2);
  if (d.length <= 10) return '(' + d.slice(0,2) + ') ' + d.slice(2,6) + '-' + d.slice(6);
  return '(' + d.slice(0,2) + ') ' + d.slice(2,3) + ' ' + d.slice(3,7) + '-' + d.slice(7);
}
function phoneRaw(value) { return (value || '').replace(/\D/g, ''); }
function formatCEP(value) {
  const d = (value || '').replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return d.slice(0,5) + '-' + d.slice(5);
}
function buildEndereco(c) {
  const parts = [c.logradouro, c.numero_endereco ? 'Nº ' + c.numero_endereco : '', c.bairro, c.cidade_estado, c.cep ? 'CEP ' + c.cep : ''].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : c.endereco || '—';
}
function noNeg(e) { if (e.target.value < 0) e.target.value = 0; }

function SectionTitle({ children }) {
  return (<div className="flex items-center gap-3 mb-4 mt-2"><h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">{children}</h3><div className="flex-1 h-px bg-[var(--border)]" /></div>);
}
function DetailField({ label, value, highlight, mono }) {
  return (<div><div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">{label}</div><div className={`text-[14px] font-medium ${highlight ? 'text-[var(--accent-light)] font-bold' : ''} ${mono ? 'font-mono text-[13px]' : ''}`}>{value || '—'}</div></div>);
}
function EditField({ label, value, onChange, type, options }) {
  return (<div><div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">{label}</div>
    {options ? (<select value={value||''} onChange={e=>onChange(e.target.value)} className="w-full bg-[var(--bg-card)] border border-[var(--accent)] rounded text-sm px-2 py-1.5 text-[var(--text-primary)] outline-none">{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>)
    : type === 'checkbox' ? (<label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!value} onChange={e=>onChange(e.target.checked)} className="w-4 h-4 accent-[var(--success)]"/><span className="text-sm">{value?'Sim':'Não'}</span></label>)
    : (<input type={type||'text'} value={value||''} onChange={e=>onChange(e.target.value)} min={type==='number'?'0':undefined} onInput={type==='number'?noNeg:undefined} className="w-full bg-[var(--bg-card)] border border-[var(--accent)] rounded text-sm px-2 py-1.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-light)]" />)}
  </div>);
}
function InputField({ label, value, onChange, placeholder, required, type, className: cls }) {
  return (<div className={cls||''}><label className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold block mb-1">{label}</label><input type={type||'text'} value={value} onChange={onChange} placeholder={placeholder} required={required} min={type==='number'?'0':undefined} onInput={type==='number'?noNeg:undefined} className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm px-3 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"/></div>);
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [administradoras, setAdministradoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const fileInputRef = useRef(null);
  const emptyForm = {
    nome:'', cpf:'', telefone:'', telefone_adicional:'', email:'',
    logradouro:'', numero_endereco:'', bairro:'', cidade_estado:'', cep:'',
    administradora_id:'', numero_contrato:'', tipo_bem:'automovel', credito_valor:'',
    grupo:'', cota:'', prazo:'', segundo_vencimento_dia:'', data_venda:'',
    doc_rg:false, doc_comprovante_endereco:false, doc_comprovante_pagamento:false,
    doc_rg_url:null, doc_comprovante_endereco_url:null, doc_comprovante_pagamento_url:null,
  };
  const [form, setForm] = useState({...emptyForm});

  useEffect(() => { fetchData(); }, []);
  async function fetchData() {
    setLoading(true);
    const { data: cli } = await supabase.from('clientes').select('*, administradoras(nome), parcelas(*)').order('created_at', { ascending: false });
    const { data: adm } = await supabase.from('administradoras').select('*');
    if (cli) setClientes(cli);
    if (adm) setAdministradoras(adm);
    setLoading(false);
  }

  async function uploadDoc(file, clienteId, docType) {
    const ext = file.name.split('.').pop();
    const path = `${clienteId || 'novo'}/${docType}_${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('documentos').upload(path, file);
    if (error) { alert('Erro no upload: ' + error.message); return null; }
    const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path);
    return urlData.publicUrl;
  }

  function handleDocCheck(docKey, urlKey) {
    if (!form[docKey]) {
      setUploadingDoc({ docKey, urlKey, context: 'form' });
      fileInputRef.current?.click();
    } else {
      setForm(f => ({ ...f, [docKey]: false, [urlKey]: null }));
    }
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      if (uploadingDoc) setUploadingDoc(null);
      return;
    }
    if (uploadingDoc?.context === 'form') {
      const url = await uploadDoc(file, 'temp', uploadingDoc.docKey);
      if (url) {
        setForm(f => ({ ...f, [uploadingDoc.docKey]: true, [uploadingDoc.urlKey]: url }));
      } else {
        alert('É obrigatório anexar o documento para marcar como recebido.');
      }
      setUploadingDoc(null);
    } else if (uploadingDoc?.context === 'detail') {
      const c = selectedClient;
      const url = await uploadDoc(file, c.id, uploadingDoc.docKey);
      if (url) {
        await supabase.from('clientes').update({ [uploadingDoc.docKey]: true, [uploadingDoc.urlKey]: url }).eq('id', c.id);
        setSelectedClient({ ...c, [uploadingDoc.docKey]: true, [uploadingDoc.urlKey]: url });
        fetchData();
      }
      setUploadingDoc(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      telefone: phoneRaw(form.telefone),
      telefone_adicional: phoneRaw(form.telefone_adicional) || null,
      credito_valor: parseFloat(form.credito_valor) || 0,
      segundo_vencimento_dia: parseInt(form.segundo_vencimento_dia) || 15,
      origem_cadastro: 'manual', status: 'novo',
    };
    const { error } = await supabase.from('clientes').insert([payload]);
    if (error) { alert('Erro: ' + error.message); return; }
    setShowForm(false);
    setForm({...emptyForm});
    fetchData();
  }

  function startEdit() {
    const c = selectedClient;
    setEditForm({
      nome:c.nome, cpf:c.cpf, telefone:c.telefone, telefone_adicional:c.telefone_adicional, email:c.email,
      logradouro:c.logradouro, numero_endereco:c.numero_endereco, bairro:c.bairro, cidade_estado:c.cidade_estado, cep:c.cep,
      administradora_id:c.administradora_id, numero_contrato:c.numero_contrato, tipo_bem:c.tipo_bem,
      credito_valor:c.credito_valor, grupo:c.grupo, cota:c.cota, prazo:c.prazo, segundo_vencimento_dia:c.segundo_vencimento_dia,
      doc_rg:c.doc_rg, doc_comprovante_endereco:c.doc_comprovante_endereco, doc_comprovante_pagamento:c.doc_comprovante_pagamento,
    });
    setEditMode(true); setSuccessMsg('');
  }

  async function handleSolicitarEdicao() {
    const c = selectedClient;
    const camposAlterados = []; const dadosAnteriores = {}; const dadosNovos = {};
    Object.keys(editForm).forEach(key => {
      if (String(c[key]??'') !== String(editForm[key]??'')) {
        camposAlterados.push(key); dadosAnteriores[key] = c[key]; dadosNovos[key] = editForm[key];
      }
    });
    if (camposAlterados.length === 0) { alert('Nenhum campo alterado.'); return; }
    const { error } = await supabase.from('solicitacoes_edicao').insert([{
      cliente_id:c.id, solicitante_nome:'Operador', dados_anteriores:dadosAnteriores, dados_novos:dadosNovos, campos_alterados:camposAlterados, status:'pendente'
    }]);
    if (error) { alert('Erro: ' + error.message); return; }
    setEditMode(false);
    setSuccessMsg('Solicitação de edição enviada para aprovação da Direção.');
  }

  const filtered = clientes.filter(c => {
    const s = searchTerm.toLowerCase();
    const matchSearch = c.nome?.toLowerCase().includes(s) || c.telefone?.includes(s) || c.grupo?.includes(s);
    return matchSearch && (filterStatus === 'todos' || c.status === filterStatus);
  });
  const admOptions = administradoras.map(a => ({ value: a.id, label: a.nome }));

  return (
    <div>
      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileSelected} />

      <div className="flex justify-between items-start mb-7">
        <div><h1 className="font-display text-3xl font-bold tracking-tight">Carteira de Clientes</h1><p className="text-[var(--text-muted)] text-sm mt-1">{clientes.length} clientes cadastrados</p></div>
        <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--accent-light)] transition-all">+ Novo Cliente</button>
      </div>

      <div className="flex gap-4 mb-5 items-center flex-wrap">
        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2">
          <span className="text-[var(--text-muted)]">🔍</span>
          <input placeholder="Buscar cliente..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-sm text-[var(--text-primary)] w-52"/>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['todos','novo','checagem','ativo','atrasado','cancelado','contemplado','faturado','credito_disponivel'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterStatus===s?'bg-[var(--accent)] text-white border-[var(--accent)]':'border-[var(--border)] text-[var(--text-secondary)]'}`}>
              {s === 'todos' ? 'Todos' : STATUS_MAP[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full"><thead><tr>
          {['Cliente','Administradora','Bem','Crédito','Parcela','Status','Docs','Comissão'].map(h=>(<th key={h} className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold border-b border-[var(--border)]">{h}</th>))}
        </tr></thead><tbody>
          {loading?<tr><td colSpan={8} className="text-center py-12 text-[var(--text-muted)]">Carregando...</td></tr>
          :filtered.length===0?<tr><td colSpan={8} className="text-center py-12 text-[var(--text-muted)]">{clientes.length===0?'🚀 Clique em "+ Novo Cliente".':'Nenhum resultado.'}</td></tr>
          :filtered.map(c=>{const st=STATUS_MAP[c.status]||STATUS_MAP.novo;const docsOk=c.doc_rg&&c.doc_comprovante_endereco&&c.doc_comprovante_pagamento;const docsCount=[c.doc_rg,c.doc_comprovante_endereco,c.doc_comprovante_pagamento].filter(Boolean).length;
          return(<tr key={c.id} className="hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer" onClick={()=>{setSelectedClient(c);setEditMode(false);setSuccessMsg('');}}>
            <td className="px-4 py-3"><div className="font-semibold text-sm">{c.nome}</div><div className="text-xs text-[var(--text-muted)]">{formatPhone(c.telefone)}</div></td>
            <td className="px-4 py-3 text-sm">{c.administradoras?.nome||'—'}</td>
            <td className="px-4 py-3 text-sm">{BEM_LABELS[c.tipo_bem]||c.tipo_bem}</td>
            <td className="px-4 py-3 text-sm font-semibold">R$ {(c.credito_valor||0).toLocaleString('pt-BR')}</td>
            <td className="px-4 py-3"><span className={`font-bold ${c.parcela_atual<=3?'text-[var(--danger)]':''}`}>P{c.parcela_atual}</span>{c.parcela_atual<=3&&<span className="ml-1.5 text-[10px] font-bold uppercase bg-[rgba(248,113,113,0.12)] text-[var(--danger)] px-1.5 py-0.5 rounded">Crítica</span>}</td>
            <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold" style={{background:st.bg,color:st.color}}><span className="w-1.5 h-1.5 rounded-full" style={{background:st.color}}/>{st.label}</span></td>
            <td className="px-4 py-3 text-sm"><span className={`font-semibold ${docsOk?'text-[var(--success)]':'text-[var(--danger)]'}`}>{docsCount}/3</span></td>
            <td className="px-4 py-3"><span className={`text-xs font-bold uppercase px-2 py-1 rounded ${docsOk?'bg-[rgba(52,211,153,0.12)] text-[var(--success)]':'bg-[rgba(248,113,113,0.12)] text-[var(--danger)]'}`}>{docsOk?'✓ Liberada':'⚠ Pendente'}</span></td>
          </tr>);})}
        </tbody></table></div>
      </div>

      {/* ============ MODAL: Novo Cliente ============ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center" onClick={()=>setShowForm(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-[680px] max-h-[85vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-5 border-b border-[var(--border)]">
              <h2 className="font-display text-xl font-bold">Cadastro Manual de Cliente</h2>
              <button onClick={()=>setShowForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <SectionTitle>👤 Dados do Cliente</SectionTitle>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <InputField label="Nome Completo" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Nome do cliente" required />
                <InputField label="CPF" value={form.cpf} onChange={e=>setForm({...form,cpf:e.target.value})} placeholder="000.000.000-00" />
                <InputField label="Telefone Principal" value={form.telefone} onChange={e=>setForm({...form,telefone:formatPhone(e.target.value)})} placeholder="(92) 9 0000-0000" required />
                <InputField label="Telefone Adicional" value={form.telefone_adicional} onChange={e=>setForm({...form,telefone_adicional:formatPhone(e.target.value)})} placeholder="(92) 9 0000-0000" />
                <InputField label="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@email.com" cls="col-span-2" />
              </div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mt-3 mb-2">Endereço</div>
              <div className="grid grid-cols-4 gap-3 mb-6">
                <InputField label="Logradouro" value={form.logradouro} onChange={e=>setForm({...form,logradouro:e.target.value})} placeholder="Rua, Av..." className="col-span-2" />
                <InputField label="Número" value={form.numero_endereco} onChange={e=>setForm({...form,numero_endereco:e.target.value})} placeholder="000" />
                <InputField label="Bairro" value={form.bairro} onChange={e=>setForm({...form,bairro:e.target.value})} placeholder="Bairro" />
                <InputField label="Cidade / Estado" value={form.cidade_estado} onChange={e=>setForm({...form,cidade_estado:e.target.value})} placeholder="Manaus/AM" className="col-span-2" />
                <InputField label="CEP" value={form.cep} onChange={e=>setForm({...form,cep:formatCEP(e.target.value)})} placeholder="00000-000" className="col-span-2" />
              </div>

              {/* ── GMAC: Painel de cotas ── */}
                {!editMode && (
                  <div className="mb-6">
                    <CotasPanel clienteId={c.id} />
                  </div>
                )}

                {/* DOCUMENTAÇÃO */}
                <SectionTitle>📎 Documentação do Vendedor</SectionTitle>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {docs.map(d=>{
                    const ok = c[d.dk];
                    const url = c[d.uk];
                    return (
                      <div key={d.dk} className={`flex flex-col items-center gap-2 p-4 rounded-lg border ${ok?'bg-[rgba(52,211,153,0.06)] border-[rgba(52,211,153,0.2)]':'bg-[rgba(248,113,113,0.06)] border-[rgba(248,113,113,0.2)]'}`}>
                        <span className="text-sm font-semibold">{d.label}</span>
                        {ok && url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[var(--accent)] hover:underline">📄 Ver Documento</a>
                        ) : ok && !url ? (
                          <span className="text-xs text-[var(--success)] font-semibold">✓ Recebido</span>
                        ) : (
                          <button onClick={()=>{setUploadingDoc({docKey:d.dk,urlKey:d.uk,context:'detail'});fileInputRef.current?.click();}} className="text-xs font-bold text-[var(--warning)] hover:text-[var(--orange)] transition-colors">📤 Anexar Documento</button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* PARCELAS */}
                {!editMode&&parcelas.length>0&&(<>
                  <SectionTitle>💳 Parcelas (1 a 12)</SectionTitle>
                  <div className="grid grid-cols-4 gap-2">
                    {parcelas.map(p=>(
                      <div key={p.id} className={`p-3 rounded-lg border text-center relative overflow-hidden ${p.numero===c.parcela_atual?'border-[var(--accent)] shadow-[0_0_0_2px_rgba(79,124,255,0.12)]':'border-[var(--border)]'} bg-[var(--bg-elevated)]`}>
                        <div className={`absolute top-0 left-0 right-0 h-[3px] ${p.status==='em_dia'?'bg-[var(--success)]':p.status==='em_atraso'?'bg-[var(--danger)]':'bg-[var(--border-light)]'}`}/>
                        {p.numero===c.parcela_atual&&<div className="absolute top-1.5 right-1.5 text-[8px] font-extrabold text-[var(--accent)] bg-[rgba(79,124,255,0.12)] px-1.5 py-0.5 rounded uppercase">Atual</div>}
                        <div className={`text-lg font-extrabold ${p.status==='em_dia'?'text-[var(--success)]':p.status==='em_atraso'?'text-[var(--danger)]':'text-[var(--text-muted)]'}`}>P{p.numero}</div>
                        <div className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded inline-block mt-1 ${p.status==='em_dia'?'bg-[rgba(52,211,153,0.12)] text-[var(--success)]':p.status==='em_atraso'?'bg-[rgba(248,113,113,0.12)] text-[var(--danger)]':'bg-[var(--bg-card)] text-[var(--text-muted)]'}`}>
                          {p.status==='em_dia'?'✓ Em Dia':p.status==='em_atraso'?'⚠ Atraso':'Em Aberto'}
                        </div>
                        {p.data_vencimento&&<div className="text-[10px] text-[var(--text-muted)] mt-1">{new Date(p.data_vencimento).toLocaleDateString('pt-BR')}</div>}
                      </div>
                    ))}
                  </div>
                </>)}
              </div>

              <div className="flex justify-between gap-3 px-6 py-4 border-t border-[var(--border)]">
                <div>
                  {!editMode&&<button onClick={startEdit} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] text-[var(--warning)] border border-[rgba(251,191,36,0.3)] rounded-lg text-sm font-semibold hover:bg-[rgba(251,191,36,0.08)] transition-all">✏️ Editar Dados</button>}
                  {editMode&&<button onClick={()=>setEditMode(false)} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] rounded-lg text-sm font-semibold">Cancelar Edição</button>}
                </div>
                <div className="flex gap-3">
                  {editMode?(<button onClick={handleSolicitarEdicao} className="flex items-center gap-2 px-4 py-2 bg-[var(--warning)] text-black rounded-lg text-sm font-bold hover:brightness-110 transition-all">🔐 Solicitar Aprovação da Edição</button>):(<>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[rgba(37,211,102,0.12)] text-[#25D366] rounded-lg text-sm font-semibold">💬 WhatsApp</button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[rgba(79,124,255,0.12)] text-[var(--accent)] rounded-lg text-sm font-semibold">📞 Ligar</button>
                    <button onClick={()=>{setSelectedClient(null);setEditMode(false);}} className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] rounded-lg text-sm font-semibold">Fechar</button>
                  </>)}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
