"use client";

import { useState } from "react";
import type { SavedClient } from "@/lib/types";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { FilterBar } from "./analytics/FilterBar";
import { KPICards } from "./analytics/KPICards";
import { TrendChart } from "./analytics/TrendChart";
import { PipelinePanel } from "./analytics/PipelinePanel";
import { AlertsPanel } from "./analytics/AlertsPanel";
import { ScoringPanel } from "./analytics/ScoringPanel";
import { OperatorDashboard } from "./analytics/OperatorDashboard";
import { BatchContactTool } from "./analytics/BatchContactTool";
import { ClientDetail } from "./analytics/ClientDetail";

export function AnalyticsDashboard() {
  const data = useAnalyticsData();
  const [selectedClient, setSelectedClient] = useState<SavedClient | null>(null);

  if (data.loading) {
    return (
      <div className="text-center p-8 text-white/50">Caricamento analytics...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trend chart */}
      <TrendChart
        points={data.cartesianSeries.points}
        totals={data.cartesianSeries.totals}
      />

      {/* Filtri */}
      <FilterBar
        preset={data.preset}
        setPreset={data.setPreset}
        startDate={data.startDate}
        setStartDate={data.setStartDate}
        endDate={data.endDate}
        setEndDate={data.setEndDate}
        statusFilter={data.statusFilter}
        setStatusFilter={data.setStatusFilter}
        keywordFilter={data.keywordFilter}
        setKeywordFilter={data.setKeywordFilter}
        provinceFilter={data.provinceFilter}
        setProvinceFilter={data.setProvinceFilter}
        cityFilter={data.cityFilter}
        setCityFilter={data.setCityFilter}
        methodFilter={data.methodFilter}
        setMethodFilter={data.setMethodFilter}
        operatorFilter={data.operatorFilter}
        setOperatorFilter={data.setOperatorFilter}
        statuses={data.statuses}
        keywords={data.keywords}
        provinces={data.provinces}
        cities={data.cities}
        operators={data.operators}
        activeFilterChips={data.activeFilterChips}
        resetSingleFilter={data.resetSingleFilter}
        resetAllFilters={data.resetAllFilters}
      />

      {/* KPI */}
      <KPICards
        totalClients={data.kpis.totalClients}
        totalActivities={data.kpis.totalActivities}
        overdue={data.kpis.overdue}
        conversionRate={data.kpis.conversionRate}
        avgConversionDays={data.kpis.avgConversionDays}
        totalConvertedValue={data.kpis.totalConvertedValue}
      />

      {/* Pipeline + Funnel */}
      <PipelinePanel
        byStatus={data.byStatus}
        byMethod={data.byMethod}
        funnelData={data.funnelData}
      />

      {/* Alerts + Scoring */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AlertsPanel
          noRecentContact={data.slaAlerts.noRecentContact}
          overdueFollowUp={data.slaAlerts.overdueFollowUp}
        />
        <ScoringPanel
          topPriority={data.topPriority}
          onSelectClient={setSelectedClient}
          selectedClientId={selectedClient?.id ?? null}
        />
      </div>

      {/* Dashboard operatori */}
      <OperatorDashboard operatorStats={data.operatorStats} />

      {/* Batch contact */}
      <BatchContactTool
        filteredClients={data.filteredClients}
        statuses={data.statuses}
        operators={data.operators}
        supabase={data.supabase}
        onRefresh={data.fetchData}
        onSelectClient={setSelectedClient}
        selectedClientId={selectedClient?.id ?? null}
      />

      {/* Dettaglio cliente */}
      {selectedClient && (
        <ClientDetail
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
}
