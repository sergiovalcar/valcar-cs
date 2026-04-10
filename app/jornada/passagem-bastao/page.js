'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const BEM_LABELS = { automovel: 'Automóvel', imovel: 'Imóvel', moto: 'Moto', caminhao: 'Caminhão', servicos: 'Serviços' };
const BENS = ['automovel', 'imovel', 'moto', 'caminhao', 'servicos'];

function formatPhone(value) {
  const d = (value || '').replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return '(' + d;
  if (d.length <= 6) return '(' + d.slice(0,2) + ') ' + d.slice(2);
  if (d.length <= 10) return '(' + d.slice(0,2) + ') ' + d.slice(2,6) + '-' + d.slice(6);
  return '(' + d.slice(0,2) + ') ' + d.slice(2,3) + ' ' + d.slice(3,7) + '-' + d.slice(7);
}
function phoneRaw(v) { return (v||'').replace(/\D/g,''); }
function formatCEP(v) { const d=(v||'').replace(/\D/g,'').slice(0,8); return d.length<=5?d:d.slice(0,5)+'-'+d.slice(5); }
function noNeg(e) { if(e.target.value<0) e.target.value=0; }
function SectionTitle({ children }) { return (<div className="flex items-center gap-3 mb-4 mt-2"><h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">{children}</h3><div className="flex-1 h-px bg-[var(--border)]"/></div>); }
function InputField({ label, value, onChange, placeholder, required, type, className: cls }) {
  return (<div className={cls||''}><label className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold block mb-1">{label}</label><input type={type||'text'} value={value} onChange={onChange} placeholder={placeholder} required={required} min={type==='number'?'0':undefined} onInput={type==='number'?noNeg:undefined} className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm px-3 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"/></div>);
}

export default function PassagemBastaoPage() {
  const [clientes, setClientes] = useState([]);
  const [administradoras, setAdministradoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [filterOrigem, setFilterOrigem] = useState('todos');
  const [filterDocs, setFilterDocs] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmTransfer, setConfirmTransfer] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const fileInputRef = useRef(null);
  const emptyForm = {
    nome:'', cpf:'', telefone:'', telefone_adicional:'', email:'',
    logradouro:'', numero_endereco:'', bairro:'', cidade_estado:'', cep:'',
    administradora_id:'', numero_contrato:'', tipo_bem:'automovel', credito_valor:'',
    grupo:'', cota:'', prazo:'', segundo_vencimento_dia:'', data_venda: new Date().toISOString().split('T')[0],
    doc_rg:false, doc_comprovante_endereco:false, doc_comprovante_pagamento:false,
    doc_rg_url:null, doc_comprovante_endereco_url:null, doc_comprovante_pagamento_url:null,
  };
  const [form, setForm] = useState({...emptyForm});

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: cli } = await supabase.from('clientes').select('*, administradoras(nome), parcelas(*)').eq('status', 'novo').order('created_at', { ascending: false });
    const { data: adm } = await supabase.from('administradoras').select('*');
    if (cli) setClientes(cli);
    if (adm) setAdministradoras(adm);
    setLoading(false);
  }

  async function uploadDoc(file, clienteId, docType) {
    const ext = file.name.split('.').pop();
    const path = `${clienteId||'novo'}/${docType}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('documentos').upload(path, file);
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

  function handleDocCheckDetail(docKey, urlKey) {
    setUploadingDoc({ docKey, urlKey, context: 'detail' });
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) { setUploadingDoc(null); return; }
    if (uploadingDoc?.context === 'form') {
      const url = await uploadDoc(file, 'temp', uploadingDoc.docKey);
      if (url) { setForm(f => ({ ...f, [uploadingDoc.docKey]: true, [uploadingDoc.urlKey]: url })); }
      else { alert('É obrigatório anexar o documento.'); }
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
    setShowForm(false); setForm({...emptyForm}); fetchData();
  }

  async function handlePassarBastao(cliente) {
    const { error } = await supabase.from('clientes').update({ status: 'checagem' }).eq('id', cliente.id);
    if (error) { alert('Erro: ' + error.message); return; }
    setConfirmTransfer(null); setSelectedClient(null); fetchData();
  }

  const docsOk = (c) => c.doc_rg && c.doc_comprovante_endereco && c.doc_comprovante_pagamento;
  const docsCount = (c) => [c.doc_rg, c.doc_comprovante_endereco, c.doc_comprovante_pagamento].filter(Boolean).length;

  const filtered = clientes.filter(c => {
    const s = searchTerm.toLowerCase();
    const matchSearch = !s || c.nome?.toLowerCase().includes(s) || c.telefone?.includes(s) || c.grupo?.includes(s);
    const matchOrigem = filterOrigem === 'todos' || c.origem_cadastro === filterOrigem;
    const matchDocs = filterDocs === 'todos' || (filterDocs === 'completos' && docsOk(c)) || (filterDocs === 'pendentes' && !docsOk(c));
    return matchSearch && matchOrigem && matchDocs;
  });

  const totalNovos = clientes.length;
  const totalAPI = clientes.filter(c => c.origem_cadastro === 'api').length;
  const totalManual = clientes.filter(c => c.origem_cadastro === 'manual').length;
  const totalDocsOk = clientes.filter(docsOk).length;
  const totalDocsPend = totalNovos - totalDocsOk;

  return (
    <div>
      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileSelected} />

      <div className="flex justify-between items-start mb-7">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Passagem de Bastão</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Entrada de vendas do time comercial para o CS · {totalNovos} clientes aguardando</p>
        </div>
        <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--accent-light)] transition-all">✏️ Cadastro Manual</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label:'Aguardando Bastão', value:totalNovos, color:'var(--accent)', sub:'Total na fila' },
          { label:'Via API (Profinanc)', value:totalAPI, color:'var(--purple)', sub:'Chevrolet automático' },
          { label:'Cadastro Manual', value:totalManual, color:'var(--orange)', sub:'Demais administradoras' },
          { label:'Docs Completos', value:totalDocsOk, color:'var(--success)', sub:'Comissão liberada' },
          { label:'Docs Pendentes', value:totalDocsPend, color:'var(--danger)', sub:'Comissão pendente' },
        ].map((k,i)=>(
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{background:k.color}}/>
            <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">{k.label}</div>
            <div className="text-2xl font-bold" style={{color:k.color}}>{k.value}</div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div className="flex gap-4 mb-5 items-center flex-wrap">
        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2">
          <span className="text-[var(--text-muted)]">🔍</span>
          <input placeholder="Buscar..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-sm text-[var(--text-primary)] w-44"/>
        </div>
        <div className="flex gap-1.5">
          <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase self-center mr-1">Origem:</span>
          {[{v:'todos',l:'Todos'},{v:'api',l:'⚡ API'},{v:'manual',l:'✏️ Manual'}].map(f=>(
            <button key={f.v} onClick={()=>setFilterOrigem(f.v)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterOrigem===f.v?'bg-[var(--accent)] text-white border-[var(--accent)]':'border-[var(--border)] text-[var(--text-secondary)]'}`}>{f.l}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase self-center mr-1">Docs:</span>
          {[{v:'todos',l:'Todos'},{v:'completos',l:'✅ Completos'},{v:'pendentes',l:'⚠ Pendentes'}].map(f=>(
            <button key={f.v} onClick={()=>setFilterDocs(f.v)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterDocs===f.v?'bg-[var(--accent)] text-white border-[var(--accent)]':'border-[var(--border)] text-[var(--text-secondary)]'}`}>{f.l}</button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full"><thead><tr>
          {['Cliente','Telefone','Administradora','Crédito','Bem','Venda','Docs','Origem','Ação'].map(h=>(
            <th key={h} className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold border-b border-[var(--border)]">{h}</th>
          ))}
        </tr></thead><tbody>
          {loading?<tr><td colSpan={9} className="text-center py-12 text-[var(--text-muted)]">Carregando...</td></tr>
          :filtered.length===0?<tr><td colSpan={9} className="text-center py-12 text-[var(--text-muted)]">{totalNovos===0?'✅ Nenhum cliente aguardando passagem de bastão. Todas as vendas já foram encaminhadas!':'Nenhum resultado com esses filtros.'}</td></tr>
          :filtered.map(c=>{
            const dok = docsOk(c);
            const dc = docsCount(c);
            return (
              <tr key={c.id} className="hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer" onClick={()=>setSelectedClient(c)}>
                <td className="px-4 py-3"><div className="font-semibold text-sm">{c.nome}</div><div className="text-xs text-[var(--text-muted)]">{c.cpf||'—'}</div></td>
                <td className="px-4 py-3 text-sm font-mono">{formatPhone(c.telefone)}</td>
                <td className="px-4 py-3 text-sm">{c.administradoras?.nome||'—'}</td>
                <td className="px-4 py-3 text-sm font-semibold">R$ {(c.credito_valor||0).toLocaleString('pt-BR')}</td>
                <td className="px-4 py-3 text-sm">{BEM_LABELS[c.tipo_bem]||c.tipo_bem}</td>
                <td className="px-4 py-3 text-sm">{c.data_venda?new Date(c.data_venda).toLocaleDateString('pt-BR'):'—'}</td>
                <td className="px-4 py-3"><span className={`font-semibold text-sm ${dok?'text-[var(--success)]':'text-[var(--danger)]'}`}>{dc}/3</span></td>
                <td className="px-4 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${c.origem_cadastro==='api'?'bg-[rgba(79,124,255,0.12)] text-[var(--accent)]':'bg-[rgba(251,146,60,0.1)] text-[var(--orange)]'}`}>{c.origem_cadastro==='api'?'⚡ API':'✏️ Manual'}</span></td>
                <td className="px-4 py-3" onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>setConfirmTransfer(c)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--success)] text-white rounded-lg text-xs font-bold hover:brightness-110 transition-all">✅ Passar Bastão</button>
                </td>
              </tr>
            );
          })}
        </tbody></table></div>
      </div>

      {/* CONFIRM TRANSFER MODAL */}
      {confirmTransfer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center" onClick={()=>setConfirmTransfer(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-[480px] p-6" onClick={e=>e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">✅</div>
              <h2 className="font-display text-xl font-bold mb-2">Confirmar Passagem de Bastão</h2>
              <p className="text-[var(--text-muted)] text-sm">O cliente <strong>{confirmTransfer.nome}</strong> será encaminhado para a etapa de <strong>Checagem & Boas-Vindas</strong>.</p>
            </div>
            {!docsOk(confirmTransfer) && (
              <div className="p-3 mb-4 bg-[rgba(251,191,36,0.08)] border border-[rgba(251,191,36,0.2)] rounded-lg">
                <div className="text-xs font-bold text-[var(--warning)] mb-1">⚠️ Atenção: Documentação incompleta</div>
                <div className="text-xs text-[var(--text-muted)]">A comissão do vendedor ficará como <strong>pendente</strong> até a documentação ser completada. O fluxo do cliente segue normalmente.</div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 mb-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)]">
              <div className="flex-1">
                <div className="text-xs text-[var(--text-muted)]">Administradora</div>
                <div className="text-sm font-semibold">{confirmTransfer.administradoras?.nome}</div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-[var(--text-muted)]">Crédito</div>
                <div className="text-sm font-semibold">R$ {(confirmTransfer.credito_valor||0).toLocaleString('pt-BR')}</div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-[var(--text-muted)]">Docs</div>
                <div className={`text-sm font-bold ${docsOk(confirmTransfer)?'text-[var(--success)]':'text-[var(--danger)]'}`}>{docsCount(confirmTransfer)}/3</div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setConfirmTransfer(null)} className="flex-1 px-4 py-2.5 bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] rounded-lg text-sm font-semibold">Cancelar</button>
              <button onClick={()=>handlePassarBastao(confirmTransfer)} className="flex-1 px-4 py-2.5 bg-[var(--success)] text-white rounded-lg text-sm font-bold hover:brightness-110 transition-all">✅ Confirmar Passagem</button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedClient && (()=>{
        const c = selectedClient;
        const dok = docsOk(c);
        const parcelas = (c.parcelas||[]).sort((a,b)=>a.numero-b.numero);
        const docs = [
          { label:'🪪 RG', dk:'doc_rg', uk:'doc_rg_url' },
          { label:'🏠 Comprov. Endereço', dk:'doc_comprovante_endereco', uk:'doc_comprovante_endereco_url' },
          { label:'💳 Comprov. Pagamento', dk:'doc_comprovante_pagamento', uk:'doc_comprovante_pagamento_url' },
        ];
        const endereco = [c.logradouro, c.numero_endereco?'Nº '+c.numero_endereco:'', c.bairro, c.cidade_estado, c.cep?'CEP '+c.cep:''].filter(Boolean).join(', ') || c.endereco || '—';

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center" onClick={()=>setSelectedClient(null)}>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-[720px] max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
              <div className="flex justify-between items-center px-6 py-5 border-b border-[var(--border)]">
                <div>
                  <h2 className="font-display text-xl font-bold">{c.nome}</h2>
                  <div className="flex gap-2 mt-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-[rgba(46,125,50,0.12)] text-[#2E7D32]"><span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]"/>Passagem de Bastão</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${c.origem_cadastro==='api'?'bg-[rgba(79,124,255,0.12)] text-[var(--accent)]':'bg-[rgba(251,146,60,0.1)] text-[var(--orange)]'}`}>{c.origem_cadastro==='api'?'⚡ Profinanc':'✏️ Manual'}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${dok?'bg-[rgba(52,211,153,0.12)] text-[var(--success)]':'bg-[rgba(248,113,113,0.12)] text-[var(--danger)]'}`}>{dok?'✓ Comissão Liberada':'⚠ Comissão Pendente'}</span>
                  </div>
                </div>
                <button onClick={()=>setSelectedClient(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">✕</button>
              </div>
              <div className="p-6">
                <SectionTitle>👤 Dados do Cliente</SectionTitle>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6 p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)]">
                  <div><div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">Nome Completo</div><div className="text-sm font-medium">{c.nome}</div></div>
                  <div><div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">CPF</div><div className="text-sm font-medium font-mono">{c.cpf||'—'}</div></div>
                  <div><div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">Telefone Principal</div><div className="text-sm font-medium font-mono">{formatPhone(c.telefone)}</div></div>
                  <div><div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">Telefone Adicional</div><div className="text-sm font-medium font-mono">{c.telefone_adicional?formatPhone(c.telefone_adicional):'—'}</div></div>
                  <div><div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">E-mail</div><div className="text-sm font-medium">{c.email||'—'}</div></div>
                  <div><div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">Endereço</div><div className="text-sm font-medium">{endereco}</div></div>
                </div>

                <SectionTitle>📋 Dados da Cota</SectionTitle>
                <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-6 p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)]">
                  <div><div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">Administradora</div><div className="text-sm font-medium">{c.administradoras?.nome||'—'}</div></div>
                  <div><div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">Nº do Contrato</div><div className="text-sm font-medium font-mono">{c.numero_contrato||'—'}</div></div>
                  <div><div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">Tipo de Bem</div><div className="text-sm font-medium">{BEM_LABELS[c.tipo_bem]||c.tipo_bem}</div></div>
                  <div><div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">Crédito</div><div className="text-sm font-bold text-[var(--accent-light)]">R$ {(c.credito_valor||0).toLocaleString('pt-BR')}</div></div>
                  <div><div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">Grupo</div><div className="text-sm font-medium">{c.grupo||'—'}</div></div>
                  <div><div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">Cota</div><div className="text-sm font-medium">{c.cota||'—'}</div></div>
                  <div><div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">Prazo</div><div className="text-sm font-medium">{c.prazo||'—'}</div></div>
                  <div><div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">Vencimento</div><div className="text-sm font-medium">{c.segundo_vencimento_dia?`Todo dia ${c.segundo_vencimento_dia}`:'—'}</div></div>
                  <div><div className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-muted)] font-semibold mb-1">Data da Venda</div><div className="text-sm font-medium">{c.data_venda?new Date(c.data_venda).toLocaleDateString('pt-BR'):'—'}</div></div>
                </div>

                <SectionTitle>📎 Documentação do Vendedor</SectionTitle>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {docs.map(d=>{
                    const ok = c[d.dk]; const url = c[d.uk];
                    return (
                      <div key={d.dk} className={`flex flex-col items-center gap-2 p-4 rounded-lg border ${ok?'bg-[rgba(52,211,153,0.06)] border-[rgba(52,211,153,0.2)]':'bg-[rgba(248,113,113,0.06)] border-[rgba(248,113,113,0.2)]'}`}>
                        <span className="text-sm font-semibold">{d.label}</span>
                        {ok && url ? (<a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[var(--accent)] hover:underline">📄 Ver Documento</a>)
                        : ok && !url ? (<span className="text-xs text-[var(--success)] font-semibold">✓ Recebido</span>)
                        : (<button onClick={()=>handleDocCheckDetail(d.dk,d.uk)} className="text-xs font-bold text-[var(--warning)] hover:text-[var(--orange)] transition-colors">📤 Anexar Documento</button>)}
                      </div>
                    );
                  })}
                </div>

                {parcelas.length>0&&(<>
                  <SectionTitle>💳 Parcelas (1 a 12)</SectionTitle>
                  <div className="grid grid-cols-6 gap-2">
                    {parcelas.map(p=>(
                      <div key={p.id} className={`p-2 rounded-lg border text-center relative overflow-hidden border-[var(--border)] bg-[var(--bg-elevated)]`}>
                        <div className={`absolute top-0 left-0 right-0 h-[2px] ${p.status==='em_dia'?'bg-[var(--success)]':'bg-[var(--border-light)]'}`}/>
                        <div className={`text-base font-extrabold ${p.status==='em_dia'?'text-[var(--success)]':'text-[var(--text-muted)]'}`}>P{p.numero}</div>
                        <div className="text-[9px] text-[var(--text-muted)]">{p.data_vencimento?new Date(p.data_vencimento).toLocaleDateString('pt-BR'):''}</div>
                      </div>
                    ))}
                  </div>
                </>)}
              </div>

              <div className="flex justify-between gap-3 px-6 py-4 border-t border-[var(--border)]">
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-[rgba(37,211,102,0.12)] text-[#25D366] rounded-lg text-sm font-semibold">💬 WhatsApp</button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[rgba(79,124,255,0.12)] text-[var(--accent)] rounded-lg text-sm font-semibold">📞 Ligar</button>
                </div>
                <div className="flex gap-3">
                  <button onClick={()=>setSelectedClient(null)} className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] rounded-lg text-sm font-semibold">Fechar</button>
                  <button onClick={()=>{setSelectedClient(null);setConfirmTransfer(c);}} className="flex items-center gap-2 px-4 py-2 bg-[var(--success)] text-white rounded-lg text-sm font-bold hover:brightness-110 transition-all">✅ Passar Bastão → Checagem</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center" onClick={()=>setShowForm(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-[680px] max-h-[85vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-5 border-b border-[var(--border)]">
              <h2 className="font-display text-xl font-bold">Cadastro Manual — Passagem de Bastão</h2>
              <button onClick={()=>setShowForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <SectionTitle>👤 Dados do Cliente</SectionTitle>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <InputField label="Nome Completo" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Nome do cliente" required />
                <InputField label="CPF" value={form.cpf} onChange={e=>setForm({...form,cpf:e.target.value})} placeholder="000.000.000-00" />
                <InputField label="Telefone Principal" value={form.telefone} onChange={e=>setForm({...form,telefone:formatPhone(e.target.value)})} placeholder="(92) 9 0000-0000" required />
                <InputField label="Telefone Adicional" value={form.telefone_adicional} onChange={e=>setForm({...form,telefone_adicional:formatPhone(e.target.value)})} placeholder="(92) 0000-0000" />
                <InputField label="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@email.com" className="col-span-2" />
              </div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mt-3 mb-2">Endereço</div>
              <div className="grid grid-cols-4 gap-3 mb-6">
                <InputField label="Logradouro" value={form.logradouro} onChange={e=>setForm({...form,logradouro:e.target.value})} placeholder="Rua, Av..." className="col-span-2" />
                <InputField label="Número" value={form.numero_endereco} onChange={e=>setForm({...form,numero_endereco:e.target.value})} placeholder="000" />
                <InputField label="Bairro" value={form.bairro} onChange={e=>setForm({...form,bairro:e.target.value})} placeholder="Bairro" />
                <InputField label="Cidade / Estado" value={form.cidade_estado} onChange={e=>setForm({...form,cidade_estado:e.target.value})} placeholder="Manaus/AM" className="col-span-2" />
                <InputField label="CEP" value={form.cep} onChange={e=>setForm({...form,cep:formatCEP(e.target.value)})} placeholder="00000-000" className="col-span-2" />
              </div>

              <SectionTitle>📋 Dados da Cota</SectionTitle>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div><label className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold block mb-1">Administradora</label><select value={form.administradora_id} onChange={e=>setForm({...form,administradora_id:e.target.value})} required className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm px-3 py-2.5 text-[var(--text-primary)] outline-none"><option value="">Selecione...</option>{administradoras.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}</select></div>
                <InputField label="Nº do Contrato" value={form.numero_contrato} onChange={e=>setForm({...form,numero_contrato:e.target.value})} placeholder="000000" />
                <div><label className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold block mb-1">Tipo de Bem</label><select value={form.tipo_bem} onChange={e=>setForm({...form,tipo_bem:e.target.value})} className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm px-3 py-2.5 text-[var(--text-primary)] outline-none">{BENS.map(b=><option key={b} value={b}>{BEM_LABELS[b]}</option>)}</select></div>
                <InputField label="Valor do Crédito" value={form.credito_valor} onChange={e=>setForm({...form,credito_valor:e.target.value})} placeholder="100000" type="number" />
                <InputField label="Grupo" value={form.grupo} onChange={e=>setForm({...form,grupo:e.target.value})} placeholder="G000" />
                <InputField label="Nº da Cota" value={form.cota} onChange={e=>setForm({...form,cota:e.target.value})} placeholder="0000" />
                <InputField label="Prazo" value={form.prazo} onChange={e=>setForm({...form,prazo:e.target.value})} placeholder="Ex: 60 meses" />
                <InputField label="2º Vencimento (dia)" value={form.segundo_vencimento_dia} onChange={e=>setForm({...form,segundo_vencimento_dia:e.target.value})} placeholder="1 a 28" type="number" />
                <InputField label="Data da Venda" value={form.data_venda} onChange={e=>setForm({...form,data_venda:e.target.value})} type="date" />
              </div>

              <SectionTitle>📎 Documentos Obrigatórios</SectionTitle>
              <div className="grid grid-cols-3 gap-3">
                {[{l:'🪪 RG (Cópia)',dk:'doc_rg',uk:'doc_rg_url'},{l:'🏠 Comprov. Endereço',dk:'doc_comprovante_endereco',uk:'doc_comprovante_endereco_url'},{l:'💳 Comprov. Pagamento',dk:'doc_comprovante_pagamento',uk:'doc_comprovante_pagamento_url'}].map(d=>(
                  <div key={d.dk} className={`flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${form[d.dk]?'bg-[rgba(52,211,153,0.08)] border-[var(--success)]':'bg-[var(--bg-elevated)] border-[var(--border)]'}`} onClick={()=>handleDocCheck(d.dk,d.uk)}>
                    <span className="text-sm font-medium">{d.l}</span>
                    {form[d.dk]?(<span className="text-xs text-[var(--success)] font-semibold">✓ Anexado</span>):(<span className="text-xs text-[var(--text-muted)]">Clique para anexar</span>)}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
                <button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] rounded-lg text-sm font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold">Cadastrar e Aguardar Bastão</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
