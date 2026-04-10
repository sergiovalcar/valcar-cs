'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const STATUS_MAP = {
  novo: { label: 'Novo', color: '#2E7D32', bg: 'rgba(46,125,50,0.12)' },
  checagem: { label: 'Checagem', color: '#E65100', bg: 'rgba(230,81,0,0.12)' },
  ativo: { label: 'Ativo', color: '#1565C0', bg: 'rgba(21,101,192,0.12)' },
  atrasado: { label: 'Em Atraso', color: '#C62828', bg: 'rgba(198,40,40,0.12)' },
  contemplado: { label: 'Contemplado', color: '#6A1B9A', bg: 'rgba(106,27,154,0.12)' },
  credito_disponivel: { label: 'Crédito Disp.', color: '#00695C', bg: 'rgba(0,105,92,0.12)' },
  analise_recusada: { label: 'Recusada', color: '#BF360C', bg: 'rgba(191,54,12,0.12)' },
  cancelado: { label: 'Cancelado', color: '#616161', bg: 'rgba(97,97,97,0.12)' },
};
const BENS = ['automovel', 'imovel', 'moto', 'caminhao', 'servicos'];
const BEM_LABELS = { automovel: 'Automóvel', imovel: 'Imóvel', moto: 'Moto', caminhao: 'Caminhão', servicos: 'Serviços' };

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-2">
      <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">{children}</h3>
      <div className="flex-1 h-px bg-[var(--border)]" />
    </div>
  );
}

function DetailField({ label, value, highlight, mono }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">{label}</div>
      <div className={`text-[14px] font-medium ${highlight ? 'text-[var(--accent-light)] font-bold' : ''} ${mono ? 'font-mono text-[13px]' : ''}`}>{value || '—'}</div>
    </div>
  );
}

function EditField({ label, value, onChange, type, options }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">{label}</div>
      {options ? (
        <select value={value || ''} onChange={e => onChange(e.target.value)} className="w-full bg-[var(--bg-card)] border border-[var(--accent)] rounded text-sm px-2 py-1.5 text-[var(--text-primary)] outline-none">
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : type === 'checkbox' ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-[var(--success)]" />
          <span className="text-sm">{value ? 'Sim' : 'Não'}</span>
        </label>
      ) : (
        <input type={type || 'text'} value={value || ''} onChange={e => onChange(e.target.value)}
          className="w-full bg-[var(--bg-card)] border border-[var(--accent)] rounded text-sm px-2 py-1.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-light)]" />
      )}
    </div>
  );
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
  const [form, setForm] = useState({
    nome: '', cpf: '', telefone: '', email: '', endereco: '',
    administradora_id: '', grupo: '', cota: '', credito_valor: '',
    tipo_bem: 'automovel', segundo_vencimento_dia: '', data_venda: '',
    numero_contrato: '',
    doc_rg: false, doc_comprovante_endereco: false, doc_comprovante_pagamento: false,
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: cli } = await supabase.from('clientes').select('*, administradoras(nome), parcelas(*)').order('created_at', { ascending: false });
    const { data: adm } = await supabase.from('administradoras').select('*');
    if (cli) setClientes(cli);
    if (adm) setAdministradoras(adm);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, credito_valor: parseFloat(form.credito_valor) || 0, segundo_vencimento_dia: parseInt(form.segundo_vencimento_dia) || 15, origem_cadastro: 'manual', status: 'novo' };
    const { error } = await supabase.from('clientes').insert([payload]);
    if (error) { alert('Erro: ' + error.message); return; }
    setShowForm(false);
    setForm({ nome: '', cpf: '', telefone: '', email: '', endereco: '', administradora_id: '', grupo: '', cota: '', credito_valor: '', tipo_bem: 'automovel', segundo_vencimento_dia: '', data_venda: '', numero_contrato: '', doc_rg: false, doc_comprovante_endereco: false, doc_comprovante_pagamento: false });
    fetchData();
  }

  function startEdit() {
    const c = selectedClient;
    setEditForm({
      nome: c.nome, cpf: c.cpf, telefone: c.telefone, email: c.email, endereco: c.endereco,
      administradora_id: c.administradora_id, numero_contrato: c.numero_contrato, tipo_bem: c.tipo_bem,
      credito_valor: c.credito_valor, grupo: c.grupo, cota: c.cota, segundo_vencimento_dia: c.segundo_vencimento_dia,
      doc_rg: c.doc_rg, doc_comprovante_endereco: c.doc_comprovante_endereco, doc_comprovante_pagamento: c.doc_comprovante_pagamento,
    });
    setEditMode(true);
    setSuccessMsg('');
  }

  async function handleSolicitarEdicao() {
    const c = selectedClient;
    const camposAlterados = [];
    const dadosAnteriores = {};
    const dadosNovos = {};

    Object.keys(editForm).forEach(key => {
      const valorAntigo = c[key];
      const valorNovo = editForm[key];
      if (String(valorAntigo ?? '') !== String(valorNovo ?? '')) {
        camposAlterados.push(key);
        dadosAnteriores[key] = valorAntigo;
        dadosNovos[key] = valorNovo;
      }
    });

    if (camposAlterados.length === 0) { alert('Nenhum campo foi alterado.'); return; }

    const { error } = await supabase.from('solicitacoes_edicao').insert([{
      cliente_id: c.id,
      solicitante_nome: 'Operador',
      dados_anteriores: dadosAnteriores,
      dados_novos: dadosNovos,
      campos_alterados: camposAlterados,
      status: 'pendente',
    }]);

    if (error) { alert('Erro: ' + error.message); return; }
    setEditMode(false);
    setSuccessMsg('Solicitação de edição enviada para aprovação da Direção.');
  }

  const filteredClientes = clientes.filter(c => {
    const matchSearch = c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || c.telefone?.includes(searchTerm) || c.grupo?.includes(searchTerm);
    const matchStatus = filterStatus === 'todos' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const admOptions = administradoras.map(a => ({ value: a.id, label: a.nome }));

  return (
    <div>
      <div className="flex justify-between items-start mb-7">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Carteira de Clientes</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">{clientes.length} clientes cadastrados</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--accent-light)] transition-all">+ Novo Cliente</button>
      </div>

      <div className="flex gap-4 mb-5 items-center flex-wrap">
        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2">
          <span className="text-[var(--text-muted)]">🔍</span>
          <input placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-sm text-[var(--text-primary)] w-52" />
        </div>
        <div className="flex gap-1.5">
          {['todos', 'novo', 'checagem', 'ativo', 'atrasado', 'contemplado', 'credito_disponivel'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterStatus === s ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
              {s === 'todos' ? 'Todos' : STATUS_MAP[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              {['Cliente', 'Administradora', 'Bem', 'Crédito', 'Parcela', 'Status', 'Docs', 'Comissão'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold border-b border-[var(--border)]">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="text-center py-12 text-[var(--text-muted)]">Carregando...</td></tr>
              : filteredClientes.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-[var(--text-muted)]">{clientes.length === 0 ? '🚀 Clique em "+ Novo Cliente" para começar.' : 'Nenhum resultado.'}</td></tr>
              : filteredClientes.map(c => {
                const st = STATUS_MAP[c.status] || STATUS_MAP.novo;
                const docsOk = c.doc_rg && c.doc_comprovante_endereco && c.doc_comprovante_pagamento;
                const docsCount = [c.doc_rg, c.doc_comprovante_endereco, c.doc_comprovante_pagamento].filter(Boolean).length;
                return (
                  <tr key={c.id} className="hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer" onClick={() => { setSelectedClient(c); setEditMode(false); setSuccessMsg(''); }}>
                    <td className="px-4 py-3"><div className="font-semibold text-sm">{c.nome}</div><div className="text-xs text-[var(--text-muted)]">{c.telefone}</div></td>
                    <td className="px-4 py-3 text-sm">{c.administradoras?.nome || '—'}</td>
                    <td className="px-4 py-3 text-sm">{BEM_LABELS[c.tipo_bem] || c.tipo_bem}</td>
                    <td className="px-4 py-3 text-sm font-semibold">R$ {(c.credito_valor || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3"><span className={`font-bold ${c.parcela_atual <= 3 ? 'text-[var(--danger)]' : ''}`}>P{c.parcela_atual}</span>{c.parcela_atual <= 3 && <span className="ml-1.5 text-[10px] font-bold uppercase bg-[rgba(248,113,113,0.12)] text-[var(--danger)] px-1.5 py-0.5 rounded">Crítica</span>}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold" style={{ background: st.bg, color: st.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />{st.label}</span></td>
                    <td className="px-4 py-3 text-sm"><span className={`font-semibold ${docsOk ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{docsCount}/3</span></td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold uppercase px-2 py-1 rounded ${docsOk ? 'bg-[rgba(52,211,153,0.12)] text-[var(--success)]' : 'bg-[rgba(248,113,113,0.12)] text-[var(--danger)]'}`}>{docsOk ? '✓ Liberada' : '⚠ Pendente'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ MODAL: Novo Cliente ============ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-[640px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-5 border-b border-[var(--border)]">
              <h2 className="font-display text-xl font-bold">Cadastro Manual de Cliente</h2>
              <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <SectionTitle>👤 Dados do Cliente</SectionTitle>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[{l:'Nome Completo',k:'nome',p:'Nome do cliente',r:true},{l:'CPF',k:'cpf',p:'000.000.000-00'},{l:'Telefone',k:'telefone',p:'(92) 90000-0000',r:true},{l:'Email',k:'email',p:'email@email.com'}].map(f=>(
                  <div key={f.k} className="flex flex-col gap-1"><label className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">{f.l}</label><input value={form[f.k]} onChange={e=>setForm({...form,[f.k]:e.target.value})} placeholder={f.p} required={f.r} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm px-3 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"/></div>
                ))}
                <div className="col-span-2 flex flex-col gap-1"><label className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">Endereço</label><input value={form.endereco} onChange={e=>setForm({...form,endereco:e.target.value})} placeholder="Endereço completo" className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm px-3 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"/></div>
              </div>
              <SectionTitle>📋 Dados da Cota</SectionTitle>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="flex flex-col gap-1"><label className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">Administradora</label><select value={form.administradora_id} onChange={e=>setForm({...form,administradora_id:e.target.value})} required className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm px-3 py-2.5 text-[var(--text-primary)] outline-none"><option value="">Selecione...</option>{administradoras.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}</select></div>
                {[{l:'Nº do Contrato',k:'numero_contrato',p:'000000'},{l:'Valor do Crédito',k:'credito_valor',p:'100000',t:'number'},{l:'Grupo',k:'grupo',p:'G000'},{l:'Nº da Cota',k:'cota',p:'0000'},{l:'2º Vencimento (dia)',k:'segundo_vencimento_dia',p:'1 a 28',t:'number'},{l:'Data da Venda',k:'data_venda',t:'date'}].map(f=>(
                  <div key={f.k} className="flex flex-col gap-1"><label className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">{f.l}</label><input type={f.t||'text'} value={form[f.k]} onChange={e=>setForm({...form,[f.k]:e.target.value})} placeholder={f.p} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm px-3 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"/></div>
                ))}
                <div className="flex flex-col gap-1"><label className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">Tipo de Bem</label><select value={form.tipo_bem} onChange={e=>setForm({...form,tipo_bem:e.target.value})} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm px-3 py-2.5 text-[var(--text-primary)] outline-none">{BENS.map(b=><option key={b} value={b}>{BEM_LABELS[b]}</option>)}</select></div>
              </div>
              <SectionTitle>📎 Documentos Obrigatórios</SectionTitle>
              <div className="grid grid-cols-3 gap-3">
                {[{l:'🪪 RG (Cópia)',k:'doc_rg'},{l:'🏠 Comprov. Endereço',k:'doc_comprovante_endereco'},{l:'💳 Comprov. Pagamento',k:'doc_comprovante_pagamento'}].map(d=>(
                  <label key={d.k} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${form[d.k]?'bg-[rgba(52,211,153,0.08)] border-[var(--success)]':'bg-[var(--bg-elevated)] border-[var(--border)]'}`}><input type="checkbox" checked={form[d.k]} onChange={e=>setForm({...form,[d.k]:e.target.checked})} className="w-4 h-4 accent-[var(--success)]"/><span className="text-sm">{d.l}</span></label>
                ))}
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
                <button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] rounded-lg text-sm font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold">Cadastrar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ MODAL: Detalhe do Cliente ============ */}
      {selectedClient && (() => {
        const c = selectedClient;
        const st = STATUS_MAP[c.status] || STATUS_MAP.novo;
        const docsOk = c.doc_rg && c.doc_comprovante_endereco && c.doc_comprovante_pagamento;
        const parcelas = (c.parcelas || []).sort((a,b) => a.numero - b.numero);
        const ef = editForm;
        const setEf = (key, val) => setEditForm(prev => ({ ...prev, [key]: val }));

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center" onClick={() => { setSelectedClient(null); setEditMode(false); }}>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-[720px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center px-6 py-5 border-b border-[var(--border)]">
                <div>
                  <h2 className="font-display text-xl font-bold">{c.nome}</h2>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold" style={{ background: st.bg, color: st.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }}/>{st.label}</span>
                    {c.parcela_atual<=3&&<span className="text-[10px] font-bold uppercase bg-[rgba(248,113,113,0.12)] text-[var(--danger)] px-2 py-1 rounded">Parcela Crítica</span>}
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${c.origem_cadastro==='api'?'bg-[rgba(79,124,255,0.12)] text-[var(--accent)]':'bg-[rgba(251,146,60,0.1)] text-[var(--orange)]'}`}>{c.origem_cadastro==='api'?'⚡ Profinanc':'✏️ Manual'}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${docsOk?'bg-[rgba(52,211,153,0.12)] text-[var(--success)]':'bg-[rgba(248,113,113,0.12)] text-[var(--danger)]'}`}>{docsOk?'✓ Comissão Liberada':'⚠ Comissão Pendente'}</span>
                    {editMode && <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-[rgba(79,124,255,0.12)] text-[var(--accent)] animate-pulse">✏️ Modo Edição</span>}
                  </div>
                </div>
                <button onClick={() => { setSelectedClient(null); setEditMode(false); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">✕</button>
              </div>

              {/* SUCCESS MESSAGE */}
              {successMsg && (
                <div className="mx-6 mt-4 p-4 bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)] rounded-xl flex items-center gap-3">
                  <span className="text-xl">✅</span>
                  <div>
                    <div className="font-semibold text-sm text-[var(--success)]">{successMsg}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">Acesse o menu <strong>🔐 Aprovações</strong> para gerenciar.</div>
                  </div>
                </div>
              )}

              <div className="p-6">
                {/* SEÇÃO 1: DADOS DO CLIENTE */}
                <SectionTitle>👤 Dados do Cliente</SectionTitle>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6 p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)]">
                  {editMode ? (<>
                    <EditField label="Nome Completo" value={ef.nome} onChange={v => setEf('nome', v)} />
                    <EditField label="CPF" value={ef.cpf} onChange={v => setEf('cpf', v)} />
                    <EditField label="Endereço" value={ef.endereco} onChange={v => setEf('endereco', v)} />
                    <EditField label="Telefone" value={ef.telefone} onChange={v => setEf('telefone', v)} />
                    <EditField label="E-mail" value={ef.email} onChange={v => setEf('email', v)} />
                  </>) : (<>
                    <DetailField label="Nome Completo" value={c.nome} />
                    <DetailField label="CPF" value={c.cpf} mono />
                    <DetailField label="Endereço" value={c.endereco} />
                    <DetailField label="Telefone" value={c.telefone} mono />
                    <DetailField label="E-mail" value={c.email} />
                  </>)}
                </div>

                {/* SEÇÃO 2: DADOS DA COTA */}
                <SectionTitle>📋 Dados da Cota</SectionTitle>
                <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-6 p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)]">
                  {editMode ? (<>
                    <EditField label="Administradora" value={ef.administradora_id} onChange={v => setEf('administradora_id', v)} options={[{value:'',label:'Selecione...'}, ...admOptions]} />
                    <EditField label="Nº do Contrato" value={ef.numero_contrato} onChange={v => setEf('numero_contrato', v)} />
                    <EditField label="Tipo de Bem" value={ef.tipo_bem} onChange={v => setEf('tipo_bem', v)} options={BENS.map(b=>({value:b,label:BEM_LABELS[b]}))} />
                    <EditField label="Crédito" value={ef.credito_valor} onChange={v => setEf('credito_valor', v)} type="number" />
                    <EditField label="Grupo" value={ef.grupo} onChange={v => setEf('grupo', v)} />
                    <EditField label="Cota" value={ef.cota} onChange={v => setEf('cota', v)} />
                    <EditField label="2º Vencimento (dia)" value={ef.segundo_vencimento_dia} onChange={v => setEf('segundo_vencimento_dia', v)} type="number" />
                  </>) : (<>
                    <DetailField label="Administradora" value={c.administradoras?.nome} />
                    <DetailField label="Nº do Contrato" value={c.numero_contrato} mono />
                    <DetailField label="Tipo de Bem" value={BEM_LABELS[c.tipo_bem]||c.tipo_bem} />
                    <DetailField label="Crédito" value={`R$ ${(c.credito_valor||0).toLocaleString('pt-BR')}`} highlight />
                    <DetailField label="Grupo" value={c.grupo} />
                    <DetailField label="Cota" value={c.cota} />
                    <DetailField label="Parcela Atual" value={`P${c.parcela_atual} de 12`} />
                    <DetailField label="2º Vencimento" value={c.segundo_vencimento_dia?`Todo dia ${c.segundo_vencimento_dia}`:'—'} />
                    <DetailField label="Data da Venda" value={c.data_venda?new Date(c.data_venda).toLocaleDateString('pt-BR'):'—'} />
                    <DetailField label="Origem" value={c.origem_cadastro==='api'?'⚡ API Profinanc':'✏️ Manual'} />
                    {c.profinanc_id&&<DetailField label="ID Profinanc" value={c.profinanc_id} mono />}
                  </>)}
                </div>

                {/* DOCUMENTAÇÃO */}
                <SectionTitle>📎 Documentação do Vendedor</SectionTitle>
                <div className="flex gap-3 mb-6">
                  {editMode ? (<>
                    {[{l:'🪪 RG',k:'doc_rg'},{l:'🏠 Endereço',k:'doc_comprovante_endereco'},{l:'💳 Pagamento',k:'doc_comprovante_pagamento'}].map(d=>(
                      <label key={d.k} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer border ${ef[d.k]?'bg-[rgba(52,211,153,0.08)] text-[var(--success)] border-[rgba(52,211,153,0.2)]':'bg-[rgba(248,113,113,0.08)] text-[var(--danger)] border-[rgba(248,113,113,0.2)]'}`}>
                        <input type="checkbox" checked={!!ef[d.k]} onChange={e=>setEf(d.k,e.target.checked)} className="w-3.5 h-3.5 accent-[var(--success)]"/>
                        {d.l}
                      </label>
                    ))}
                  </>) : (<>
                    {[{l:'🪪 RG',ok:c.doc_rg},{l:'🏠 Comprov. Endereço',ok:c.doc_comprovante_endereco},{l:'💳 Comprov. Pagamento',ok:c.doc_comprovante_pagamento}].map((d,i)=>(
                      <span key={i} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${d.ok?'bg-[rgba(52,211,153,0.08)] text-[var(--success)] border border-[rgba(52,211,153,0.2)]':'bg-[rgba(248,113,113,0.08)] text-[var(--danger)] border border-[rgba(248,113,113,0.2)]'}`}>
                        {d.ok?'✓':'✕'} {d.l}
                      </span>
                    ))}
                  </>)}
                </div>

                {/* PARCELAS */}
                {!editMode && parcelas.length > 0 && (<>
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

              {/* FOOTER */}
              <div className="flex justify-between gap-3 px-6 py-4 border-t border-[var(--border)]">
                <div>
                  {!editMode && <button onClick={startEdit} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] text-[var(--warning)] border border-[rgba(251,191,36,0.3)] rounded-lg text-sm font-semibold hover:bg-[rgba(251,191,36,0.08)] transition-all">✏️ Editar Dados</button>}
                  {editMode && <button onClick={() => setEditMode(false)} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] rounded-lg text-sm font-semibold">Cancelar Edição</button>}
                </div>
                <div className="flex gap-3">
                  {editMode ? (
                    <button onClick={handleSolicitarEdicao} className="flex items-center gap-2 px-4 py-2 bg-[var(--warning)] text-black rounded-lg text-sm font-bold hover:brightness-110 transition-all">🔐 Solicitar Aprovação da Edição</button>
                  ) : (<>
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
