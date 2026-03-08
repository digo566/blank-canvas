import { Bot, TrendingUp, DollarSign, Eye, Smartphone, ShieldCheck, Rocket, Users, BrainCircuit, BarChart3, HeartHandshake, Zap } from "lucide-react";

const differentials = [
  {
    icon: Bot,
    title: "Atendente Virtual com IA",
    desc: "Sua loja nunca fecha. A inteligência artificial atende seus clientes 24h, tira dúvidas sobre o cardápio, monta o pedido e finaliza — tudo sem você precisar intervir.",
    highlight: true,
  },
  {
    icon: BrainCircuit,
    title: "Analytics Inteligente com IA",
    desc: "Não são apenas gráficos bonitos. A Grape analisa padrões, detecta problemas automaticamente, prevê tendências e sugere ações concretas para aumentar seu faturamento.",
    highlight: true,
  },
  {
    icon: DollarSign,
    title: "Zero Taxa por Pedido",
    desc: "Enquanto outros sistemas cobram de R$1 a R$3 por pedido, na Grape você paga um valor fixo mensal. Quanto mais vende, mais economiza.",
  },
  {
    icon: Eye,
    title: "Rastreamento em Tempo Real",
    desc: "Seu cliente acompanha cada etapa do pedido com um código exclusivo — sem precisar ligar ou mandar mensagem perguntando.",
  },
  {
    icon: TrendingUp,
    title: "Gestão Financeira Completa",
    desc: "Controle contas a pagar, a receber, despesas por categoria, estoque com alertas automáticos e análise de margem de lucro por produto.",
  },
  {
    icon: Smartphone,
    title: "Cardápio Digital Profissional",
    desc: "Seu cardápio online com fotos, categorias, opções personalizáveis (tamanho, adicionais) — acessível por qualquer celular sem instalar nada.",
  },
  {
    icon: Users,
    title: "CRM de Clientes Integrado",
    desc: "Histórico completo de pedidos, tags, notas e dados de cada cliente. Saiba quem são seus melhores clientes e fidelize com inteligência.",
  },
  {
    icon: BarChart3,
    title: "Matriz BCG de Produtos",
    desc: "Descubra quais produtos são suas estrelas, quais estão em declínio e onde investir. Ferramenta estratégica que só grandes empresas usam — agora no seu delivery.",
  },
  {
    icon: ShieldCheck,
    title: "Recuperação de Carrinhos",
    desc: "Identifique automaticamente clientes que abandonaram o pedido e tenha a oportunidade de reconquistá-los antes que vão para o concorrente.",
  },
  {
    icon: Rocket,
    title: "Setup em 5 Minutos",
    desc: "Sem burocracia, sem contratos longos. Cadastre seus produtos, personalize sua loja e comece a vender no mesmo dia.",
  },
  {
    icon: HeartHandshake,
    title: "Suporte Humano Real",
    desc: "Nada de bots genéricos. Nosso time entende de delivery e está pronto para te ajudar a crescer de verdade.",
  },
  {
    icon: Zap,
    title: "Sistema Leve e Rápido",
    desc: "Interface moderna e intuitiva que carrega instantaneamente. Feito para donos de restaurante que não têm tempo a perder com sistemas lentos e complicados.",
  },
];

export function DifferentialsSection() {
  return (
    <section className="relative z-10 bg-gradient-to-b from-[hsl(270,65%,10%)] to-[hsl(270,65%,14%)] py-20 md:py-28 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="container relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-yellow-400/10 text-yellow-400 text-sm font-semibold mb-4 border border-yellow-400/20">
            Por que a Grape?
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-5">
            O sistema mais <span className="text-yellow-400">completo e inteligente</span> para delivery
          </h2>
          <p className="text-white/60 text-lg leading-relaxed">
            Enquanto outros oferecem apenas um cardápio online, a Grape entrega um ecossistema completo com inteligência artificial, analytics avançados e ferramentas que realmente fazem seu negócio crescer.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {differentials.map(({ icon: Icon, title, desc, highlight }, i) => (
            <div
              key={i}
              className={`group relative p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${
                highlight
                  ? "bg-gradient-to-br from-purple-600/20 to-purple-900/20 border-purple-500/30 hover:border-purple-400/50 shadow-lg shadow-purple-900/20"
                  : "bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20"
              }`}
            >
              {highlight && (
                <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-yellow-400 text-[11px] font-bold text-gray-900 uppercase tracking-wide">
                  Exclusivo
                </span>
              )}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                  highlight
                    ? "bg-purple-500/20 text-purple-300"
                    : "bg-white/10 text-yellow-400"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-white group-hover:text-yellow-300 transition-colors">
                {title}
              </h3>
              <p className="text-white/55 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-8 md:p-10 text-center">
            <h3 className="text-2xl md:text-3xl font-extrabold mb-3">
              Tudo isso por um <span className="text-yellow-400">valor fixo mensal</span>
            </h3>
            <p className="text-white/60 text-lg mb-6 max-w-2xl mx-auto">
              Sem surpresas na fatura, sem taxa por pedido, sem percentual sobre vendas. 
              Quanto mais você vende, mais a Grape vale a pena.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                Cancele quando quiser
              </span>
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-400" />
                Ativação instantânea
              </span>
              <span className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-green-400" />
                Suporte incluso
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
