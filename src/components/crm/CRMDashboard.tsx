import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, PlayCircle, TrendingUp } from "lucide-react";
import type { CRMLead } from "./CRMKanban";

interface CRMDashboardProps {
  leads: CRMLead[];
}

const CRMDashboard = ({ leads }: CRMDashboardProps) => {
  const total = leads.length;
  const trials = leads.filter(l => l.stage === "trial_active").length;
  const won = leads.filter(l => l.stage === "closed_won").length;
  const lost = leads.filter(l => l.stage === "closed_lost").length;
  const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : "0";
  const overdueFollowUps = leads.filter(l => l.next_follow_up && new Date(l.next_follow_up) < new Date() && l.stage !== "closed_won" && l.stage !== "closed_lost").length;

  const stats = [
    { label: "Total de Leads", value: total, icon: Users, color: "text-blue-600" },
    { label: "Em Teste", value: trials, icon: PlayCircle, color: "text-amber-600" },
    { label: "Clientes Fechados", value: won, icon: UserCheck, color: "text-emerald-600" },
    { label: "Taxa de Conversão", value: `${conversionRate}%`, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <s.icon className={`h-8 w-8 ${s.color} shrink-0`} />
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
      {overdueFollowUps > 0 && (
        <Card className="col-span-2 md:col-span-4 border-destructive/50 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive font-medium">
            ⚠️ Você tem {overdueFollowUps} follow-up{overdueFollowUps > 1 ? "s" : ""} atrasado{overdueFollowUps > 1 ? "s" : ""}!
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CRMDashboard;
