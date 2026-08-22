"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import type { DecisionInsights } from "@/lib/types";

export default function DecisaoPage() {
  const [decision, setDecision] = useState<DecisionInsights | null>(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    api.get<DecisionInsights>(`/decision/insights?year=${year}`).then(setDecision);
  }, [year]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Decisão</h1>
        <p className="text-ink-soft mt-1">Respostas às perguntas que todo gestor rural deveria ter em mãos.</p>
      </div>

      {!decision ? (
        <p className="text-ink-faint">Carregando...</p>
      ) : (
        <div className="space-y-4">
          <QuestionCard
            question="Estou tendo lucro?"
            answer={decision.profitabilityMessage}
            tone={decision.isProfitable ? "ok" : "critico"}
          />
          <QuestionCard question="Qual é a atividade mais rentável?" answer={decision.mostProfitableActivityMessage} tone="neutro" />
          <QuestionCard question="Onde estou gastando mais?" answer={decision.biggestCostCategoryMessage} tone="neutro" />
          <QuestionCard question="Qual deve ser minha prioridade agora?" answer={decision.improvementPriorityMessage} tone="neutro" />

          {decision.activityProfitability.length > 0 && (
            <div className="card">
              <h3 className="font-medium mb-3">Rentabilidade por atividade</h3>
              <div className="space-y-2 text-sm">
                {decision.activityProfitability.map((a) => (
                  <div key={a.activityName} className="flex items-center justify-between">
                    <span>{a.activityName}</span>
                    <span className={`font-mono ${a.result >= 0 ? "text-pasto-dark" : "text-terra"}`}>
                      {formatBRL(a.result)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="font-medium mb-3">Plano de ação</h3>
            <ol className="space-y-2 text-sm text-ink-soft list-decimal list-inside">
              {decision.actionPlan.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  answer,
  tone,
}: {
  question: string;
  answer: string;
  tone: "ok" | "critico" | "neutro";
}) {
  const border = tone === "ok" ? "border-l-pasto" : tone === "critico" ? "border-l-terra" : "border-l-milho";
  return (
    <div className={`card border-l-4 ${border}`}>
      <p className="font-medium mb-1">{question}</p>
      <p className="text-sm text-ink-soft">{answer}</p>
    </div>
  );
}
