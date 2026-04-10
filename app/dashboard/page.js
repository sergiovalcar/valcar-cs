'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function KpiCard({ label, value, change, color, children }) {
  const colors = { blue: 'var(--accent)', green: 'var(--success)', red: 'var(--danger)', purple: 'var(--purple)', orange: 'var(--orange)', teal: 'var(--teal)' };
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 relative overflow-hidden hover:border-[var(--border-light)] hover:-translate-y-0.5 transition-all">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: colors[color] || colors.blue }} />
      <div className="text-[12px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-2">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
      {change && <div className={`inline-flex items-center gap-1 text-xs font-semibold mt-2 px-2 py-0.5 rounded ${change.up ? 'bg-[rgba(52,211,153,0.12)] text-[var(--success)]' : 'bg-[rgba(248,113,113,0.12)] text-[var(--danger)]'}`}>{change.text}</div>}
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, novos: 0, checagem: 0, ativos: 0, atrasados: 0, contemplados: 0, creditoDisp: 0, recusados: 0 });
  const [operadores, setOperadores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: clientes } = await supabase.from('clientes').select('status, parcela_atual');
      const { data: ops } = await supabase.from('operadores').select('*');
      
      if (clientes) {
        setStats({
          total: clientes.length,
          novos: clientes.filter(c => c.status === 'novo').length,
          checagem: clientes.filter(c => c.status === 'checagem').length,
          ativos: clientes.filter(c => c.status === 'ativo').length,
          atrasados: clientes.filter(c => c.status === 'atrasado').length,
          contemplados: clientes.filter(c => c.status === 'contemplado').length,
          creditoDisp: clientes.filter(c => c.status === 'credito_disponivel').length,
          recusados: clientes.filter(c => c.status === 'analise_recusada').length,
          criticos: clientes.filter(c => c.parcela_atual <= 3 && c.status === 'atrasado').length,
        });
      }
      if (ops) setOperadores(ops);
      setLoading(false);
    }
    fetchData();
  }, []);

  const pipeline = [
    { label: 'Passagem de Bastão', count: stats.novos, color: 'var(--accent)' },
    { label: 'Checagem', count: stats.checagem, color: 'var(--orange)' },
    { label: 'Ativos', count: stats.ativos, color: 'var(--success)' },
    { label: 'Em Atraso', count: stats.atrasados, color: 'var(--danger)' },
    { label: 'Contemplados', count: stats.contemplados, color: 'var(--purple)' },
    { label: 'Crédito Disponível', count: stats.creditoDisp, color: 'var(--teal)' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🚀</div>
          <div className="text-[var(--text-muted)] text-lg">Carregando dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-7">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Visão geral da carteira · {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-6 gap-4 mb-7">
        <KpiCard label="Carteira Total" value={stats.total} change={{ up: true, text: 'Clientes ativos' }} color="blue" />
        <KpiCard label="Clientes Ativos" value={stats.ativos} change={{ up: true, text: 'Em dia' }} color="green" />
        <KpiCard label="Em Atraso" value={stats.atrasados} change={stats.atrasados > 0 ? { up: false, text: 'Atenção requerida' } : null} color="red" />
        <KpiCard label="Contemplados" value={stats.contemplados} change={{ up: true, text: 'Este mês' }} color="purple" />
        <KpiCard label="P2-P3 Críticas" value={stats.criticos || 0} change={stats.criticos > 0 ? { up: false, text: 'Prioridade máxima' } : null} color="orange" />
        <KpiCard label="Crédito Disponível" value={stats.creditoDisp} change={{ up: true, text: 'Aguardando utilização' }} color="teal" />
      </div>

      {/* PIPELINE */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl mb-5 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5 text-base font-semibold">➡️ Pipeline da Jornada do Cliente</div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-6 gap-3">
            {pipeline.map((s, i) => (
              <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 text-center relative overflow-hidden hover:-translate-y-0.5 hover:border-[var(--border-light)] transition-all cursor-pointer">
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: s.color }} />
                <div className="text-3xl font-bold my-2" style={{ color: s.color }}>{s.count}</div>
                <div className="text-[11px] text-[var(--text-muted)] font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* EQUIPE + ALERTAS */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <div className="text-base font-semibold">👥 Equipe de Pós-Vendas</div>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {operadores.map(op => (
                <div key={op.id} className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)]">
                  <div className="text-lg">
                    {op.setor === 'supervisao' ? '👩‍💼' : op.setor === 'checagem' ? '🎯' : op.setor === 'prevencao' ? '🛡️' : op.setor === 'cobranca' ? '📞' : op.setor === 'contemplados' ? '📋' : '🤝'}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{op.nome}</div>
                    <div className="text-xs text-[var(--text-muted)]">{op.cargo}</div>
                  </div>
                  <span className="text-xs font-semibold text-[var(--success)] bg-[rgba(52,211,153,0.12)] px-2 py-1 rounded">Online</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <div className="text-base font-semibold text-[var(--purple)]">🤖 Insights da IA Claude</div>
          </div>
          <div className="p-4 space-y-3">
            {[
              { icon: '🔍', title: 'Análise de Risco', text: `${stats.criticos || 0} clientes nas parcelas 2-3 precisam de atenção imediata.` },
              { icon: '📞', title: 'Qualidade das Ligações', text: 'Ligações de boas-vindas pendentes de análise de qualidade.' },
              { icon: '📊', title: 'Tendência', text: `${stats.total} clientes na carteira. Monitorando tendência de retenção.` },
            ].map((insight, i) => (
              <div key={i} className="flex gap-3 p-3 bg-[rgba(167,139,250,0.06)] rounded-lg">
                <span className="text-lg">{insight.icon}</span>
                <div>
                  <div className="font-semibold text-sm mb-0.5">{insight.title}</div>
                  <div className="text-xs text-[var(--text-secondary)] leading-relaxed">{insight.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {stats.total === 0 && (
        <div className="mt-6 p-6 bg-[rgba(79,124,255,0.06)] border border-[rgba(79,124,255,0.15)] rounded-xl text-center">
          <div className="text-3xl mb-3">🚀</div>
          <div className="font-semibold text-lg mb-2">Sistema pronto!</div>
          <div className="text-[var(--text-muted)] text-sm">O banco de dados está conectado. Comece cadastrando clientes em <strong>Carteira de Clientes</strong> ou em <strong>Passagem de Bastão</strong>.</div>
        </div>
      )}
    </div>
  );
}
