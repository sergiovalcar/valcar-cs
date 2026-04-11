// components/CotasPanel.jsx
// Painel de abas por cota GMAC — para a tela de detalhe do cliente
// Uso: <CotasPanel clienteId={cliente.id} />

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── Helpers ─────────────────────────────────────────────────────────────────

function moeda(valor) {
  if (valor == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function pct(valor) {
  if (valor == null) return "—";
  return `${Number(valor).toFixed(1)}%`;
}

function dataFormatada(data) {
  if (!data) return "—";
  if (data.includes("/")) return data;
  const d = new Date(data);
  return isNaN(d.getTime()) ? data : d.toLocaleDateString("pt-BR");
}

function Histograma({ raw }) {
  if (!raw) return <span className="text-zinc-400 text-xs">Sem dados</span>;
  return (
    <div className="flex flex-wrap gap-0.5 mt-1">
      {raw.split("").map((c, i) => (
        <span
          key={i}
          title={`Parcela ${i + 1}: ${c === "S" ? "Paga" : "Não paga"}`}
          className={`w-3 h-3 rounded-sm inline-block ${
            c === "S" ? "bg-emerald-500" : "bg-red-400"
          }`}
        />
      ))}
    </div>
  );
}

function BadgeSituacao({ valor }) {
  if (!valor) return null;
  const v = valor.toLowerCase();
  const cor =
    v.includes("ativo") || v.includes("normal")
      ? "bg-emerald-100 text-emerald-800"
      : v.includes("atraso") || v.includes("inadim")
      ? "bg-red-100 text-red-800"
      : v.includes("contempl")
      ? "bg-blue-100 text-blue-800"
      : "bg-zinc-100 text-zinc-700";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cor}`}>
      {valor}
    </span>
  );
}

function Metrica({ label, valor, destaque = false, alerta = false }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-zinc-400 uppercase tracking-wide">{label}</p>
      <p
        className={`text-sm font-semibold ${
          alerta ? "text-red-600" : destaque ? "text-blue-700" : "text-zinc-800"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}

function StatusCard({ label, data, ativo }) {
  return (
    <div
      className={`rounded-lg px-3 py-2.5 border text-center ${
        ativo ? "bg-emerald-50 border-emerald-200" : "bg-zinc-50 border-zinc-200"
      }`}
    >
      <div className="flex items-center justify-center gap-1.5 mb-0.5">
        <span
          className={`w-1.5 h-1.5 rounded-full inline-block ${
            ativo ? "bg-emerald-500" : "bg-zinc-300"
          }`}
        />
        <p className="text-xs font-medium text-zinc-500">{label}</p>
      </div>
      <p className={`text-sm font-semibold ${ativo ? "text-emerald-700" : "text-zinc-400"}`}>
        {ativo ? data : "Pendente"}
      </p>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export function CotasPanel({ clienteId }) {
  const [cotas, setCotas] = useState([]);
  const [cotaAtiva, setCotaAtiva] = useState(null);
  const [parcelas, setParcelas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoParcelas, setCarregandoParcelas] = useState(false);
  const [erro, setErro] = useState(null);

  // Carrega todas as cotas do cliente
  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro(null);

      const { data, error } = await supabase
        .from("v_cotas_cliente")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("grupo", { ascending: true })
        .order("cota", { ascending: true });

      if (error) {
        setErro("Não foi possível carregar os dados do GMAC.");
        console.error(error);
      } else {
        setCotas(data ?? []);
        if (data && data.length > 0) {
          setCotaAtiva(data[0].id);
        }
      }
      setCarregando(false);
    }
    carregar();
  }, [clienteId]);

  // Carrega parcelas quando muda de aba
  useEffect(() => {
    if (!cotaAtiva) return;
    const cota = cotas.find((c) => c.id === cotaAtiva);
    if (!cota) return;

    async function carregarParcelas() {
      setCarregandoParcelas(true);
      const { data } = await supabase
        .from("parcelas_pendentes")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("grupo", cota.grupo)
        .eq("cota", cota.cota)
        .order("numero_parcela", { ascending: true });
      setParcelas(data ?? []);
      setCarregandoParcelas(false);
    }
    carregarParcelas();
  }, [cotaAtiva, cotas, clienteId]);

  // ── Estados de carga ────────────────────────────────────────────────────
  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-zinc-400 text-sm py-6">
        <span className="animate-spin inline-block">⟳</span>
        Carregando dados GMAC...
      </div>
    );
  }

  if (erro) {
    return (
      <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
        {erro}
      </div>
    );
  }

  if (cotas.length === 0) {
    return (
      <div className="text-zinc-400 text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-6 text-center">
        Nenhuma cota encontrada para este cliente no GMAC.
      </div>
    );
  }

  const cotaSelecionada = cotas.find((c) => c.id === cotaAtiva);

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
          Consórcio GMAC
        </h3>
        {cotaSelecionada?.ultima_sync_at && (
          <span className="text-xs text-zinc-400">
            Sincronizado em {dataFormatada(cotaSelecionada.ultima_sync_at)}
          </span>
        )}
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-zinc-200 overflow-x-auto">
        {cotas.map((c) => (
          <button
            key={c.id}
            onClick={() => setCotaAtiva(c.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap border-b-2 transition-all ${
              cotaAtiva === c.id
                ? "border-blue-600 text-blue-700 bg-blue-50"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <span>Grupo {c.grupo} / {c.cota}</span>
            {c.atrasos_qtd > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {c.atrasos_qtd}
              </span>
            )}
            {c.parcelas_em_aberto > 0 && (
              <span className="bg-amber-400 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {c.parcelas_em_aberto}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      {cotaSelecionada && (
        <div className="bg-white border border-zinc-200 border-t-0 rounded-b-xl p-5 space-y-6">

          {/* Badges de situação */}
          <div className="flex flex-wrap gap-2 items-center">
            <BadgeSituacao valor={cotaSelecionada.situacao} />
            <BadgeSituacao valor={cotaSelecionada.sit_cobranca} />
            {cotaSelecionada.contrato && (
              <span className="text-xs text-zinc-500">
                Contrato {cotaSelecionada.contrato}
              </span>
            )}
          </div>

          {/* Métricas principais */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <Metrica
              label="Crédito atualizado"
              valor={moeda(cotaSelecionada.credito_atualizado)}
              destaque
            />
            <Metrica
              label="Valor da parcela"
              valor={moeda(cotaSelecionada.valor_parcela)}
            />
            <Metrica
              label="Saldo devedor"
              valor={moeda(cotaSelecionada.saldo_devedor)}
            />
            <Metrica
              label="Valores pagos"
              valor={`${moeda(cotaSelecionada.valores_pagos)} (${pct(cotaSelecionada.valores_pagos_pct)})`}
            />
            <Metrica
              label="Atrasos"
              valor={
                cotaSelecionada.atrasos_qtd
                  ? `${cotaSelecionada.atrasos_qtd}x — ${moeda(cotaSelecionada.atrasos_valor)}`
                  : "Nenhum"
              }
              alerta={cotaSelecionada.atrasos_qtd > 0}
            />
            <Metrica
              label="Prazo do plano"
              valor={cotaSelecionada.prazo_plano ? `${cotaSelecionada.prazo_plano} meses` : "—"}
            />
            <Metrica
              label="Assembleia atual"
              valor={cotaSelecionada.assembleia_atual ?? "—"}
            />
            <Metrica
              label="Vencimento"
              valor={dataFormatada(cotaSelecionada.vencimento_data)}
            />
          </div>

          {/* Contemplação / Faturamento / Entrega */}
          <div className="grid grid-cols-3 gap-3">
            <StatusCard
              label="Contemplação"
              data={dataFormatada(cotaSelecionada.contemplacao_data)}
              ativo={!!cotaSelecionada.contemplacao_data}
            />
            <StatusCard
              label="Faturamento"
              data="—"
              ativo={false}
            />
            <StatusCard
              label="Entrega"
              data={dataFormatada(cotaSelecionada.entrega_data)}
              ativo={!!cotaSelecionada.entrega_data}
            />
          </div>

          {/* Histograma */}
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">
              Histograma de pagamentos
            </p>
            <Histograma raw={cotaSelecionada.histograma_raw} />
            <p className="text-xs text-zinc-400 mt-1">
              <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500 mr-1" />
              Pago
              <span className="inline-block w-2 h-2 rounded-sm bg-red-400 ml-3 mr-1" />
              Não pago
            </p>
          </div>

          {/* Parcelas pendentes */}
          {(parcelas.length > 0 || carregandoParcelas) && (
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wide">
                Parcelas pendentes
              </p>
              {carregandoParcelas ? (
                <p className="text-xs text-zinc-400">Carregando...</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-zinc-200">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-3 py-2 text-left">Nº</th>
                        <th className="px-3 py-2 text-left">Vencimento</th>
                        <th className="px-3 py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {parcelas.map((p) => (
                        <tr key={p.id} className="hover:bg-zinc-50">
                          <td className="px-3 py-2 text-zinc-600">{p.numero_parcela ?? "—"}</td>
                          <td className="px-3 py-2 text-zinc-600">{dataFormatada(p.vencimento)}</td>
                          <td className="px-3 py-2 text-right font-medium text-zinc-800">
                            {moeda(p.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-zinc-50 border-t border-zinc-200">
                      <tr>
                        <td colSpan={2} className="px-3 py-2 text-xs text-zinc-500 font-medium">
                          Total
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-zinc-800">
                          {moeda(cotaSelecionada.valor_total_aberto)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
