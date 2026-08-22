"use client";

import { useEffect, useState } from "react";

import { api, downloadFile, ApiError } from "@/lib/api";

interface Report {
  id: string;
  generatedAt: string;
  fileUrl: string | null;
}

export default function RelatoriosPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setReports(await api.get<Report[]>("/reports"));
  }

  useEffect(() => {
    load();
  }, []);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      await api.post("/reports/generate");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível gerar o relatório.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(report: Report) {
    setDownloadingId(report.id);
    setError(null);
    try {
      await downloadFile(`/reports/${report.id}/download`, `mga360-relatorio-${report.id}.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível baixar o relatório.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Relatórios</h1>
          <p className="text-ink-soft mt-1">Gere um PDF com diagnóstico, radar, gráficos e plano de ação.</p>
        </div>
        <button onClick={generate} disabled={generating} className="btn-primary">
          {generating ? "Gerando..." : "Gerar novo relatório"}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-terra bg-terra/10 border border-terra/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-soft">
              <th className="px-4 py-3 font-medium">Gerado em</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-ink-faint">
                  Nenhum relatório gerado ainda.
                </td>
              </tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono">{new Date(r.generatedAt).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-right">
                    {r.fileUrl && (
                      <button
                        onClick={() => handleDownload(r)}
                        disabled={downloadingId === r.id}
                        className="text-pasto hover:underline text-sm disabled:opacity-50"
                      >
                        {downloadingId === r.id ? "Baixando..." : "Baixar PDF"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}