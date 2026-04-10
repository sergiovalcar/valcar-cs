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

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [administradoras, setAdministradoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [form, setForm] = useState({
    nome: '', cpf: '', telefone: '', email: '', endereco: '',
    administradora_id: '', grupo: '', cota: '', credito_valor: '',
    tipo_bem: 'automovel', segundo_vencimento_dia: '', data_venda: '',
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
    const payload = {
      ...form,
      credito_valor: parseFloat(form.credito_valor) || 0,
      segundo_vencimento_dia: parseInt(form.segundo_vencimento_dia) || 15,
      origem_cadastro: 'manual',
      status: 'novo',
    };
    const { error } = await supabase.from('clientes').insert([payload]);
    if (error) { alert('Erro ao cadastrar: ' + error.message); return; }
    setShowForm(false);
    setForm({ nome: '', cpf: '', telefone: '', email: '', endereco: '', administradora_id: '', grupo: '', cota: '', credito_valor: '', tipo_bem: 'automovel', segundo_vencimento_dia: '', data_venda: '', doc_rg: false, doc_comprovante_endereco: false, doc_comprovante_pagamento: false });
    fetchData();
  }

  const filteredClientes = clientes.filter(c => {
    const matchSearch = c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || c.telefone?.includes(searchTerm) || c.grupo?.includes(searchTerm);
    const matchStatus = filterStatus === 'todos' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="flex justify-between items-start mb-7">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Carteira de Clientes</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">{clientes.length} clientes cadastrados</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--accent-light)] transition-all">+ Novo Cliente</button>
      </div>

      {/* FILTERS */}
      <div className="flex gap-4 mb-5 items-center flex-wrap">
        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2">
          <span className="text-[var(--text-muted)]">🔍</span>
          <input placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-sm text-[var(--text-primary)] w-52" />
        </div>
        <div className="flex gap-1.5">
          {['todos', 'novo', 'checagem', 'ativo', 'atrasado', 'contemplado', 'credito_disponivel'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterStatus === s ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-light)]'}`}>
              {s === 'todos' ? 'Todos' : STATUS_MAP[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Cliente', 'Administradora', 'Bem', 'Crédito', 'Parcela', 'Status', 'Docs', 'Comissão'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold border-b border-[var(--border)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-[var(--text-muted)]">Carregando...</td></tr>
              ) : filteredClientes.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-[var(--text-muted)]">
                  {clientes.length === 0 ? '🚀 Nenhum cliente cadastrado ainda. Clique em "+ Novo Cliente" para começar.' : 'Nenhum cliente encontrado com esses filtros.'}
                </td></tr>
              ) : filteredClientes.map(c => {
                const st = STATUS_MAP[c.status] || STATUS_MAP.novo;
                const docsOk = c.doc_rg && c.doc_comprovante_endereco && c.doc_comprovante_pagamento;
                const docsCount = [c.doc_rg, c.doc_comprovante_endereco, c.doc_comprovante_pagamento].filter(Boolean).length;
                return (
                  <tr key={c.id} className="hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer" onClick={() => setSelectedClient(c)}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm">{c.nome}</div>
                      <div className="text-xs text-[var(--text-muted)]">{c.telefone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{c.administradoras?.nome || '—'}</td>
                    <td className="px-4 py-3 text-sm">{BEM_LABELS[c.tipo_bem] || c.tipo_bem}</td>
                    <td className="px-4 py-3 text-sm font-semibold">R$ {(c.credito_valor || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${c.parcela_atual <= 3 ? 'text-[var(--danger)]' : ''}`}>P{c.parcela_atual}</span>
                      {c.parcela_atual <= 3 && <span className="ml-1.5 text-[10px] font-bold uppercase bg-[rgba(248,113,113,0.12)] text-[var(--danger)] px-1.5 py-0.5 rounded">Crítica</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold" style={{ background: st.bg, color: st.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-semibold ${docsOk ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{docsCount}/3</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${docsOk ? 'bg-[rgba(52,211,153,0.12)] text-[var(--success)]' : 'bg-[rgba(248,113,113,0.12)] text-[var(--danger)]'}`}>
                        {docsOk ? '✓ Liberada' : '⚠ Pendente'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Novo Cliente */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-[640px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-5 border-b border-[var(--border)]">
              <h2 className="font-display text-xl font-bold">Cadastro Manual de Cliente</h2>
              <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Nome Completo', key: 'nome', placeholder: 'Nome do cliente', required: true },
                  { label: 'CPF', key: 'cpf', placeholder: '000.000.000-00' },
                  { label: 'Telefone', key: 'telefone', placeholder: '(92) 90000-0000', required: true },
                  { label: 'Email', key: 'email', placeholder: 'email@email.com' },
                ].map(f => (
                  <div key={f.key} className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">{f.label}</label>
                    <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} required={f.required}
                      className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm px-3 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" />
                  </div>
                ))}
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">Endereço</label>
                  <input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} placeholder="Endereço completo"
                    className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm px-3 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">Administradora</label>
                  <select value={form.administradora_id} onChange={e => setForm({ ...form, administradora_id: e.target.value })} required
                    className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm px-3 py-2.5 text-[var(--text-primary)] outline-none">
                    <option value="">Selecione...</option>
                    {administradoras.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">Tipo de Bem</label>
                  <select value={form.tipo_bem} onChange={e => setForm({ ...form, tipo_bem: e.target.value })}
                    className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm px-3 py-2.5 text-[var(--text-primary)] outline-none">
                    {BENS.map(b => <option key={b} value={b}>{BEM_LABELS[b]}</option>)}
                  </select>
                </div>
                {[
                  { label: 'Valor do Crédito', key: 'credito_valor', placeholder: '100000', type: 'number' },
                  { label: 'Grupo', key: 'grupo', placeholder: 'G000' },
                  { label: 'Nº da Cota', key: 'cota', placeholder: '0000' },
                  { label: '2º Vencimento (dia)', key: 'segundo_vencimento_dia', placeholder: '1 a 28', type: 'number' },
                  { label: 'Data da Venda', key: 'data_venda', placeholder: '', type: 'date' },
                ].map(f => (
                  <div key={f.key} className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">{f.label}</label>
                    <input type={f.type || 'text'} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder}
                      className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm px-3 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" />
                  </div>
                ))}
              </div>

              <h4 className="text-sm font-semibold mt-5 mb-3">Documentos Obrigatórios</h4>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '🪪 RG (Cópia)', key: 'doc_rg' },
                  { label: '🏠 Comprov. Endereço', key: 'doc_comprovante_endereco' },
                  { label: '💳 Comprov. Pagamento', key: 'doc_comprovante_pagamento' },
                ].map(d => (
                  <label key={d.key} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${form[d.key] ? 'bg-[rgba(52,211,153,0.08)] border-[var(--success)]' : 'bg-[var(--bg-elevated)] border-[var(--border)]'}`}>
                    <input type="checkbox" checked={form[d.key]} onChange={e => setForm({ ...form, [d.key]: e.target.checked })} className="w-4 h-4 accent-[var(--success)]" />
                    <span className="text-sm">{d.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] rounded-lg text-sm font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--accent-light)]">Cadastrar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Detalhe do Cliente */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center" onClick={() => setSelectedClient(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-[680px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-5 border-b border-[var(--border)]">
              <h2 className="font-display text-xl font-bold">{selectedClient.nome}</h2>
              <button onClick={() => setSelectedClient(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">✕</button>
            </div>
            <div className="p-6">
              <div className="flex gap-2 mb-4 flex-wrap">
                {(() => { const st = STATUS_MAP[selectedClient.status]; return (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold" style={{ background: st?.bg, color: st?.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: st?.color }} />{st?.label}
                  </span>
                ); })()}
                {selectedClient.parcela_atual <= 3 && <span className="text-[10px] font-bold uppercase bg-[rgba(248,113,113,0.12)] text-[var(--danger)] px-2 py-1 rounded">Parcela Crítica</span>}
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${selectedClient.origem_cadastro === 'api' ? 'bg-[rgba(79,124,255,0.12)] text-[var(--accent)]' : 'bg-[rgba(251,146,60,0.1)] text-[var(--orange)]'}`}>
                  {selectedClient.origem_cadastro === 'api' ? '⚡ Profinanc' : '✏️ Manual'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                {[
                  { label: 'Telefone', value: selectedClient.telefone },
                  { label: 'Email', value: selectedClient.email },
                  { label: 'Administradora', value: selectedClient.administradoras?.nome },
                  { label: 'Tipo de Bem', value: BEM_LABELS[selectedClient.tipo_bem] },
                  { label: 'Crédito', value: `R$ ${(selectedClient.credito_valor || 0).toLocaleString('pt-BR')}` },
                  { label: 'Grupo / Cota', value: `${selectedClient.grupo || '—'} / ${selectedClient.cota || '—'}` },
                  { label: 'Parcela Atual', value: `P${selectedClient.parcela_atual} de 12` },
                  { label: '2º Vencimento', value: `Todo dia ${selectedClient.segundo_vencimento_dia}` },
                ].map((d, i) => (
                  <div key={i}>
                    <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">{d.label}</div>
                    <div className="text-sm font-medium">{d.value || '—'}</div>
                  </div>
                ))}
              </div>

              <h4 className="text-sm font-semibold mb-3">Documentação do Vendedor</h4>
              <div className="flex gap-2 mb-4">
                {[
                  { label: '🪪 RG', ok: selectedClient.doc_rg },
                  { label: '🏠 Endereço', ok: selectedClient.doc_comprovante_endereco },
                  { label: '💳 Pagamento', ok: selectedClient.doc_comprovante_pagamento },
                ].map((d, i) => (
                  <span key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${d.ok ? 'bg-[rgba(52,211,153,0.12)] text-[var(--success)]' : 'bg-[rgba(248,113,113,0.12)] text-[var(--danger)]'}`}>
                    {d.ok ? '✓' : '✕'} {d.label}
                  </span>
                ))}
              </div>

              {selectedClient.parcelas && selectedClient.parcelas.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold mb-3">Parcelas (1-12)</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedClient.parcelas.sort((a,b) => a.numero - b.numero).map(p => (
                      <div key={p.id} className={`p-3 rounded-lg border text-center relative overflow-hidden ${p.numero === selectedClient.parcela_atual ? 'border-[var(--accent)] shadow-[0_0_0_2px_rgba(79,124,255,0.12)]' : 'border-[var(--border)]'} bg-[var(--bg-elevated)]`}>
                        <div className={`absolute top-0 left-0 right-0 h-[3px] ${p.status === 'em_dia' ? 'bg-[var(--success)]' : p.status === 'em_atraso' ? 'bg-[var(--danger)]' : 'bg-[var(--border-light)]'}`} />
                        <div className={`text-lg font-extrabold ${p.status === 'em_dia' ? 'text-[var(--success)]' : p.status === 'em_atraso' ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>P{p.numero}</div>
                        <div className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded inline-block mt-1 ${p.status === 'em_dia' ? 'bg-[rgba(52,211,153,0.12)] text-[var(--success)]' : p.status === 'em_atraso' ? 'bg-[rgba(248,113,113,0.12)] text-[var(--danger)]' : 'bg-[var(--bg-card)] text-[var(--text-muted)]'}`}>
                          {p.status === 'em_dia' ? '✓ Em Dia' : p.status === 'em_atraso' ? '⚠ Atraso' : 'Em Aberto'}
                        </div>
                        {p.data_vencimento && <div className="text-[10px] text-[var(--text-muted)] mt-1">{new Date(p.data_vencimento).toLocaleDateString('pt-BR')}</div>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--border)]">
              <button className="flex items-center gap-2 px-4 py-2 bg-[rgba(37,211,102,0.12)] text-[#25D366] rounded-lg text-sm font-semibold">💬 WhatsApp</button>
              <button className="flex items-center gap-2 px-4 py-2 bg-[rgba(79,124,255,0.12)] text-[var(--accent)] rounded-lg text-sm font-semibold">📞 Ligar</button>
              <button onClick={() => setSelectedClient(null)} className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] rounded-lg text-sm font-semibold">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
