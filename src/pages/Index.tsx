import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Zap, Shield, BarChart3, Smartphone, Clock } from "lucide-react";
import { DifferentialsSection } from "@/components/landing/DifferentialsSection";
import grapeLogo from "@/assets/grape-logo.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsapp: "",
    restaurantName: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.whatsapp || !formData.restaurantName) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    try {
      await supabase.from("leads").insert({
        name: formData.name,
        email: formData.email,
        whatsapp: formData.whatsapp,
        restaurant_name: formData.restaurantName,
      });
    } catch (error) {
      console.error("Lead save error:", error);
    }
    const params = new URLSearchParams({
      name: formData.name,
      email: formData.email,
      phone: formData.whatsapp,
      restaurant: formData.restaurantName,
    });
    navigate(`/subscription?${params.toString()}`);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[hsl(270,65%,12%)] text-white flex flex-col">
      <nav className="relative z-20 bg-[hsl(270,65%,8%)] border-b border-white/10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-1">
            <img src={grapeLogo} alt="grape" className="w-[100px] h-[100px] object-contain -mr-2" />
            <span className="font-bold text-3xl tracking-tight">grape</span>
          </div>
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 bg-transparent"
            onClick={() => navigate("/auth")}
          >
            Já sou cliente
          </Button>
        </div>
      </nav>

      <div className="relative z-10 bg-[hsl(270,65%,18%)] py-2.5 overflow-hidden">
        <div className="flex animate-[scroll_20s_linear_infinite] whitespace-nowrap gap-12">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="flex items-center gap-2 text-sm font-medium text-purple-200">
              <Zap className="w-4 h-4 text-yellow-400" />
              Sistema completo para delivery
            </span>
          ))}
        </div>
      </div>

      <section className="relative z-10 flex-1 flex items-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.06]">
          {[...Array(8)].map((_, i) => (
            <img
              key={i}
              src={grapeLogo}
              alt=""
              className="absolute w-64 h-64 md:w-96 md:h-96"
              style={{
                top: `${(i % 3) * 35 + 5}%`,
                left: `${(i % 4) * 30 - 5}%`,
                transform: `rotate(${i * 45}deg) scale(${0.8 + (i % 3) * 0.6})`,
              }}
            />
          ))}
        </div>

        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="container relative py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight">
                Gerencie seu delivery{" "}
                <span className="text-yellow-400 italic">
                  de forma profissional
                </span>
              </h1>

              <p className="text-lg md:text-xl text-white/70 max-w-lg leading-relaxed">
                Conte com cardápio digital, gestão de pedidos e todas as ferramentas
                que fazem da Grape o sistema mais completo para seu negócio.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Shield, text: "Sem taxa por pedido" },
                  { icon: Smartphone, text: "Cardápio digital" },
                  { icon: BarChart3, text: "Relatórios completos" },
                  { icon: Clock, text: "Setup em 5 minutos" },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-white/80">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-yellow-400" />
                    </div>
                    <span className="text-sm font-medium">{text}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <Button
                  size="lg"
                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold text-base px-8"
                  onClick={() => document.getElementById('lead-name')?.focus()}
                >
                  Contratar agora
                </Button>
                <span className="text-white/50 text-sm">Sem compromisso</span>
              </div>
            </div>

            <div className="relative">
              <div className="relative bg-white rounded-2xl p-8 shadow-2xl shadow-black/30">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Teste a Grape{" "}
                    <span className="text-[hsl(270,65%,45%)] font-extrabold">sem pagar nada</span>
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Preencha seus dados e entraremos em contato
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-name" className="text-gray-700 text-sm">Seu nome</Label>
                    <Input
                      id="lead-name"
                      placeholder="Nome completo"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[hsl(270,65%,45%)] h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lead-email" className="text-gray-700 text-sm">Seu email pessoal</Label>
                    <Input
                      id="lead-email"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[hsl(270,65%,45%)] h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lead-whatsapp" className="text-gray-700 text-sm">Seu WhatsApp</Label>
                    <Input
                      id="lead-whatsapp"
                      type="tel"
                      placeholder="(85) 99999-8888"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      className="border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[hsl(270,65%,45%)] h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lead-restaurant" className="text-gray-700 text-sm">Nome do seu restaurante</Label>
                    <Input
                      id="lead-restaurant"
                      placeholder="Meu Restaurante"
                      value={formData.restaurantName}
                      onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                      className="border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[hsl(270,65%,45%)] h-12 rounded-xl"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-[hsl(270,65%,45%)] hover:bg-[hsl(270,65%,38%)] text-white font-bold text-base mt-2 h-12 rounded-xl"
                    disabled={loading}
                  >
                    {loading ? "Enviando..." : "Testar grátis"}
                  </Button>

                  <p className="text-xs text-center text-gray-400">
                    Sem compromisso. Sem cartão de crédito.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 bg-[hsl(270,65%,8%)] py-20">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold mb-12 text-center">
            Tudo que você precisa em um só lugar
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { title: "Cardápio Digital", desc: "Seus clientes fazem pedidos direto pelo celular, sem precisar de app." },
              { title: "Gestão de Pedidos", desc: "Acompanhe todos os pedidos em tempo real com notificações." },
              { title: "CRM de Clientes", desc: "Histórico completo de cada cliente para fidelizar mais." },
              { title: "Relatórios Detalhados", desc: "Entenda suas vendas com gráficos e métricas inteligentes." },
              { title: "Sem Taxa por Pedido", desc: "Pague um valor fixo e receba quantos pedidos quiser." },
              { title: "Suporte Dedicado", desc: "Time pronto para te ajudar quando você precisar." },
            ].map((item, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm text-left hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                </div>
                <p className="text-white/60 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DifferentialsSection />

      <section className="relative z-10 bg-gradient-to-b from-[hsl(270,65%,12%)] to-[hsl(270,65%,18%)] py-16 md:py-24">
        <div className="container">
          <h2 className="text-2xl md:text-4xl font-extrabold mb-12 text-center leading-tight">
            Transforme a experiência dos seus pedidos com a{" "}
            <span className="text-yellow-400">Grape</span>
          </h2>
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-6xl mx-auto">
            <div className="aspect-square flex items-center justify-center">
              <img
                src="/images/comparison-table.png"
                alt="Comparação Com Grape vs Sem Grape"
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="aspect-square flex items-center justify-center">
              <img
                src="/images/devices-showcase.png"
                alt="Grape em todos os dispositivos"
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 bg-[hsl(270,65%,6%)]">
        <div className="container py-8 text-center text-white/40 text-sm">
          © 2025 grape. Todos os direitos reservados.
        </div>
      </footer>

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default Index;
