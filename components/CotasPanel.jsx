// components/CotasPanel.jsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── Helpers ──────────────────────────────────────────────────

function moeda(v) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function pct(v) {
  if (v == null) return "—";
  return `${Number(v).toFixed(2)}%`;
}

function data(d) {
  if (!d) return "—";
  if (/\d{2}\/\d{2}\/\d{4}/.test(d)) return d;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("pt-BR");
}

function BadgeSituacao({ valor }) {
  if (!valor) return null;
  const v = valor.toLowerCase();
  const cor =
    v.includes("quit") ? "bg-emerald-100 text-emerald-800" :
    v.includes("ativ") || v.includes("normal") ? "bg-blue-100 text-blue-800" :
    v.includes("atraso") || v.includes("inadim") ? "bg-red-100 text-red-800" :
    v.includes("contempl") ? "bg-purple-100 text-purple-800" :
    "bg-zinc-100 text-zinc-700";
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cor}`}>{valor}</span>;
}

function Metrica({ label, valor, destaque, alerta }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`text-sm font-semibold ${alerta ? "text-red-600" : destaque ? "text-blue-700" : "text-zinc-800"}`}>
        {valor}
      </p>
    </div>
  );
}

function StatusCard({ label, data: d, ativo }) {
  return (
    <div className={`rounded-lg px-3 py-2.5 border text-center ${ativo ? "bg-emerald-50 border-emerald-200" : "bg-zinc-50 border-zinc-200"}`}>
      <div className="flex items-center justify-center gap-1.5 mb-0.5">
        <span className={`w-1.5 h-1.5 rounded-full inline-block ${ativo ? "bg-emerald-500" : "bg-zinc-300"}`} />
        <p className="text-xs font-medium text-zinc-500">{label}</p>
      </div>
      <p className={`text-sm font-semibold ${ativo ? "text-emerald-700" : "text-zinc-400"}`}>
        {ativo ? d : "Pendente"}
      </p>
    </div>
  );
}

function Histograma({ raw }) {
  if (!raw) return <span className="text-zinc-400 text-xs">Sem dados</span>;
  const chars = raw.replace(/[^PFIQSNpfiqs]/g, "").split("");
  const mapCor = (c) => {
    const u = c.toUpperCase();
    if (u === "P" || u === "S") return "bg-emerald-500";
    if (u === "F" || u === "N") return "bg-zinc-300";
    if (u === "I") return "bg-red-400";
    if (u === "Q") return "bg-blue-400";
    return "bg-zinc-200";
  };
  return (
    <div className="flex flex-wrap gap-0.5 mt-1">
      {chars.map((c, i) => (
        <span key={i} className={`w-3 h-3 rounded-sm inline-block ${mapCor(c)}`} title={`Parcela ${i + 1}: ${c}`} />
      ))}
    </div>
  );
}

// ── Grade de Parcelas 1-12 ───────────────────────────────────

function GridParcelas({ parcelas }) {
  // Monta mapa por número de parcela
  const mapa = {};
  parcelas.forEach(p => { mapa[p.numero_parcela] = p; });

  return (
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: 12 }, (_, i) => i + 1).map(n => {
        const p = mapa[n];
        const status = p ? (p.status || "pago") : "pendente";
        const corBarra =
          status === "pago"       ? "bg-emerald-500" :
          status === "em_atraso"  ? "bg-red-500"     :
          "bg-zinc-300";
        const corNum =
          status === "pago"       ? "text-emerald-600" :
          status === "em_atraso"  ? "text-red-600"     :
          "text-zinc-400";
        const label =
          status === "pago"       ? "✓ Pago" :
          status === "em_atraso"  ? "⚠ Atraso" :
          "Em Aberto";

        return (
          <div key={n} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] relative overflow-hidden text-center">
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${corBarra}`} />
            <div className={`text-lg font-extrabold ${corNum}`}>P{n}</div>
            <div className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded inline-block mt-0.5
              ${status === "pago" ? "bg-[rgba(52,211,153,0.12)] text-emerald-600" :
                status === "em_atraso" ? "bg-[rgba(248,113,113,0.12)] text-red-600" :
                "bg-[var(--bg-card)] text-[var(--text-muted)]"}`}>
              {label}
            </div>
            {p?.vencimento && (
              <div className="text-[9px] text-zinc-400 mt-0.5">{p.vencimento}</div>
            )}
            {p?.data_pagamento && status === "pago" && (
              <div className="text-[9px] text-emerald-500 mt-0.5">Pago {p.data_pagamento}</div>
            )}
            {p?.valor != null && (
              <div className="text-[10px] font-semibold text-zinc-600 mt-0.5">
                {moeda(p.valor)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────

export function CotasPanel({ clienteId }) {
  const [cotas, setCotas]         = useState([]);
  const [cotaAtiva, setCotaAtiva] = useState(null);
  const [parcelas, setParcelas]   = useState([]);
  const [carregando, setCarregando]             = useState(true);
  const [carregandoParcelas, setCarregandoParcelas] = useState(false);
  const [erro, setErro]           = useState(null);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro(null);
      const { data, error } = await supabase
        .from("v_cotas_cliente")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("grupo", { ascending: true })
        .order("cota",  { ascending: true });

      if (error) { setErro("Não foi possível carregar os dados do GMAC."); }
      else {
        setCotas(data ?? []);
        if (data?.length > 0) setCotaAtiva(data[0].id);
      }
      setCarregando(false);
    }
    carregar();
  }, [clienteId]);

  useEffect(() => {
    if (!cotaAtiva) return;
    const cota = cotas.find(c => c.id === cotaAtiva);
    if (!cota) return;

    async function carregarParcelas() {
      setCarregandoParcelas(true);
      const { data } = await supabase
        .from("parcelas_pendentes")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("grupo", cota.grupo)
        .eq("cota",  cota.cota)
        .order("numero_parcela", { ascending: true });
      setParcelas(data ?? []);
      setCarregandoParcelas(false);
    }
    carregarParcelas();
  }, [cotaAtiva, cotas, clienteId]);

  if (carregando) return (
    <div className="flex items-center gap-2 text-zinc-400 text-sm py-4">
      <span className="animate-spin inline-block">⟳</span> Carregando dados GMAC...
    </div>
  );

  if (erro) return (
    <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{erro}</div>
  );

  if (cotas.length === 0) return (
    <div className="text-zinc-400 text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-6 text-center">
      Nenhuma cota GMAC encontrada para este cliente.
    </div>
  );

  const c = cotas.find(x => x.id === cotaAtiva);

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
          📊 Consórcio GMAC
        </h3>
        {c?.ultima_sync_at && (
          <span className="text-xs text-zinc-400">
            Sincronizado em {data(c.ultima_sync_at)}
          </span>
        )}
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-zinc-200 overflow-x-auto">
        {cotas.map(x => (
          <button
            key={x.id}
            onClick={() => setCotaAtiva(x.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap border-b-2 transition-all
              ${cotaAtiva === x.id
                ? "border-blue-600 text-blue-700 bg-blue-50"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"}`}
          >
            <span>Grupo {x.grupo} / {x.cota}</span>
            {x.atrasos_qtd > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 leading-5">{x.atrasos_qtd}</span>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      {c && (
        <div className="bg-white border border-zinc-200 border-t-0 rounded-b-xl p-5 space-y-6">

          {/* Badges de situação */}
          <div className="flex flex-wrap gap-2">
            <BadgeSituacao valor={c.sit_cobranca} />
            <BadgeSituacao valor={c.situacao} />
            {c.contrato && <span className="text-xs text-zinc-500">Contrato {c.contrato}</span>}
          </div>

          {/* Dados principais */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <Metrica label="Valor do Bem" valor={moeda(c.credito_atualizado)} destaque />
            <Metrica label="Prazo do Plano" valor={c.prazo_plano ? `${c.prazo_plano} meses` : "—"} />
            <Metrica label="Data da Venda" valor={data(c.data_venda)} />
            <Metrica label="Valor da Parcela" valor={moeda(c.valor_parcela)} />
            <Metrica
              label="Valores Pagos"
              valor={`${moeda(c.valores_pagos)} (${pct(c.valores_pagos_pct)})`}
            />
            <Metrica
              label="Saldo Devedor"
              valor={`${moeda(c.saldo_devedor)}`}
            />
            <Metrica
              label="Atrasos"
              valor={c.atrasos_qtd ? `${c.atrasos_qtd}x — ${moeda(c.atrasos_valor)}` : "Nenhum"}
              alerta={c.atrasos_qtd > 0}
            />
            <Metrica label="Assembleia" valor={c.assembleia_atual ?? "—"} />
            <Metrica label="Vencimento" valor={data(c.vencimento_data)} />
          </div>

          {/* Contemplação / Entrega */}
          <div className="grid grid-cols-2 gap-3">
            <StatusCard
              label="Contemplação"
              data={data(c.contemplacao_data)}
              ativo={!!c.contemplacao_data}
            />
            <StatusCard
              label="Entrega"
              data={data(c.entrega_data)}
              ativo={!!c.entrega_data}
            />
          </div>

          {/* Histograma */}
          {c.histograma_raw && (
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">
                Histograma de Pagamentos
              </p>
              <Histograma raw={c.histograma_raw} />
              <p className="text-xs text-zinc-400 mt-1 flex gap-3">
                <span><span className="inline-block w-2 h-2 rounded-sm bg-emerald-500 mr-1"/>Pago</span>
                <span><span className="inline-block w-2 h-2 rounded-sm bg-red-400 mr-1"/>Atraso</span>
                <span><span className="inline-block w-2 h-2 rounded-sm bg-zinc-300 mr-1"/>Em aberto</span>
              </p>
            </div>
          )}

          {/* Parcelas 1-12 */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
              💳 Parcelas (1 a 12)
            </p>
            {carregandoParcelas ? (
              <p className="text-xs text-zinc-400">Carregando parcelas...</p>
            ) : (
              <GridParcelas parcelas={parcelas} />
            )}
          </div>

        </div>
      )}
    </div>
  );
}
