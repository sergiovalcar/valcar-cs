'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { section: 'Principal' },
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/clientes', label: 'Carteira de Clientes', icon: '👥' },
  { section: 'Jornada' },
  { href: '/jornada/passagem-bastao', label: 'Passagem de Bastão', icon: '➡️' },
  { href: '/jornada/checagem', label: 'Checagem & Boas-Vindas', icon: '✅' },
  { href: '/jornada/preventivo', label: 'Preventivo', icon: '🔔' },
  { href: '/jornada/cobranca', label: 'Cobrança', icon: '⚠️' },
  { href: '/jornada/contemplados', label: 'Contemplados', icon: '🏆' },
  { section: 'Integrações' },
  { href: '/integracoes/whatsapp', label: 'RD Conversas', icon: '💬' },
  { href: '/integracoes/telefone', label: 'Sonavoip (Sonax)', icon: '📞' },
  { href: '/integracoes/ia', label: 'IA Claude', icon: '🤖' },
  { section: 'Gestão' },
  { href: '/equipe', label: 'Equipe CS', icon: '👥' },
  { href: '/metas', label: 'Metas', icon: '⭐' },
  { href: '/cadastros', label: 'Cadastros', icon: '⚙️' },
  { href: '/financeiro', label: 'Financeiro', icon: '💰' },
  { href: '/relatorios', label: 'Relatórios', icon: '📈' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-[260px] bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col z-50 overflow-y-auto">
      <div className="p-5 border-b border-[var(--border)]">
        <h1 className="font-display text-2xl font-bold bg-gradient-to-r from-[var(--accent-light)] to-[var(--purple)] bg-clip-text text-transparent">Valcar</h1>
        <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-[2px]">Customer Success</span>
      </div>
      <nav className="p-3 flex-1">
        {nav.map((item, i) => {
          if (item.section) {
            return <div key={i} className="text-[10px] uppercase tracking-[1.5px] text-[var(--text-muted)] font-semibold px-3 pt-4 pb-2">{item.section}</div>;
          }
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link key={i} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium mb-0.5 transition-all relative
                ${isActive ? 'bg-[rgba(79,124,255,0.12)] text-[var(--accent-light)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'}`}>
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--accent)] rounded-r" />}
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
