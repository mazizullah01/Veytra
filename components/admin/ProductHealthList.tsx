"use client";

import { useEffect, useState } from "react";
import AppLink from "@/components/AppLink";
import { adminFetch } from "@/lib/admin-client";
import { RETURN_REASON_LABELS, type HealthStatus, type ReturnReason } from "@/lib/product-health";

interface Row {
  productId: string;
  name: string;
  category: string;
  image: string | null;
  soldUnits: number;
  returnedUnits: number;
  returnRate: number | null;
  healthScore: number | null;
  healthStatus: HealthStatus;
  topIssue: string | null;
  openAlerts: number;
}

export default function ProductHealthList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("urgency");

  useEffect(() => {
    let active = true;
    setPending(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    if (sort) params.set("sort", sort);
    void adminFetch<{ products: Row[] }>(`/api/admin/product-health?${params}`)
      .then((data) => {
        if (!active) return;
        setRows(data.products);
        setError("");
        setPending(false);
      })
      .catch((err: Error) => {
        if (!active) return;
        setError(err.message);
        setPending(false);
      });
    return () => {
      active = false;
    };
  }, [q, category, status, sort]);

  return (
    <div className="container section admin-page">
      <header className="page-head">
        <span className="eyebrow">Operations</span>
        <h1>Product Health</h1>
        <p className="muted">Deterministic return rates and scores. AI suggests issues — never invents metrics.</p>
      </header>

      <div className="admin-filters">
        <label className="field">
          <span className="field__label">Search</span>
          <input className="field__input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or id" />
        </label>
        <label className="field">
          <span className="field__label">Category</span>
          <select className="field__input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All</option>
            <option value="women">Women</option>
            <option value="men">Men</option>
          </select>
        </label>
        <label className="field">
          <span className="field__label">Status</span>
          <select className="field__input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="Healthy">Healthy</option>
            <option value="Monitor">Monitor</option>
            <option value="Needs Attention">Needs Attention</option>
            <option value="Critical">Critical</option>
            <option value="Insufficient Data">Insufficient Data</option>
          </select>
        </label>
        <label className="field">
          <span className="field__label">Sort</span>
          <select className="field__input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="urgency">Urgency</option>
            <option value="rate">Return rate</option>
            <option value="returns">Returned units</option>
            <option value="score">Health score</option>
          </select>
        </label>
      </div>

      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
      {pending ? (
        <div className="loader" />
      ) : rows.length === 0 ? (
        <p className="muted">No product health rows yet. Paid orders and completed returns will appear here.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Sold</th>
                <th>Returned</th>
                <th>Rate</th>
                <th>Top issue</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.productId}>
                  <td>
                    <AppLink href={`/admin/product-health/${row.productId}`} className="admin-table__product">
                      {row.openAlerts > 0 && <span className="admin-alert-dot" title={`${row.openAlerts} open alert(s)`} />}
                      {row.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.image} alt="" width={40} height={48} />
                      )}
                      <span>
                        <strong>{row.name}</strong>
                        <span className="muted">{row.productId}</span>
                      </span>
                    </AppLink>
                  </td>
                  <td>{row.soldUnits}</td>
                  <td>{row.returnedUnits}</td>
                  <td>{row.returnRate == null ? "—" : `${row.returnRate.toFixed(1)}%`}</td>
                  <td>
                    {row.topIssue
                      ? (RETURN_REASON_LABELS[row.topIssue as ReturnReason] ?? row.topIssue)
                      : "—"}
                  </td>
                  <td>
                    <span className={`health-badge health-badge--${slug(row.healthStatus)}`}>
                      {row.healthScore == null ? row.healthStatus : `${row.healthScore} · ${row.healthStatus}`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function slug(status: string) {
  return status.toLowerCase().replace(/\s+/g, "-");
}
