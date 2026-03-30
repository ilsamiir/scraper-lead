"use client";

import { BarChart3, CalendarDays, Clock, TrendingUp, Users, DollarSign } from "lucide-react";

type Props = {
  totalClients: number;
  totalActivities: number;
  overdue: number;
  conversionRate: number;
  avgConversionDays: number | null;
  totalConvertedValue: number;
};

function Card({
  label,
  value,
  icon: Icon,
  iconColor = "text-brand-accent",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
}) {
  return (
    <div className="glass-panel p-4">
      <div className="text-white/50 text-xs">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      <Icon className={`w-4 h-4 mt-2 ${iconColor}`} />
    </div>
  );
}

export function KPICards(props: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      <Card label="Clienti segmento" value={props.totalClients} icon={Users} />
      <Card label="Attività periodo" value={props.totalActivities} icon={BarChart3} />
      <Card label="Follow-up in ritardo" value={props.overdue} icon={CalendarDays} iconColor="text-amber-300" />
      <Card label="Conversione" value={`${props.conversionRate}%`} icon={TrendingUp} iconColor="text-emerald-300" />
      <Card
        label="Tempo medio conv."
        value={props.avgConversionDays !== null ? `${props.avgConversionDays}g` : "-"}
        icon={Clock}
        iconColor="text-blue-300"
      />
      <Card
        label="Valore conversioni"
        value={props.totalConvertedValue > 0 ? `€${props.totalConvertedValue.toLocaleString("it-IT")}` : "-"}
        icon={DollarSign}
        iconColor="text-emerald-300"
      />
    </div>
  );
}
