"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/format";

interface RevenueData {
  totalRevenue: number;
  totalBookings: number;
  avgBookingValue: number;
  cancellationRate: number;
  noShowRate: number;
  bySpecialist: {
    specialist_name: string;
    booking_count: number;
    revenue_cents: number;
    avg_value_cents: number;
  }[];
  byService: {
    service_name: string;
    duration_min: number;
    booking_count: number;
    revenue_cents: number;
  }[];
  daily: {
    day: string;
    revenue_cents: number;
    booking_count: number;
  }[];
}

type Period = "today" | "week" | "month" | "last_month";

interface Props {
  data: RevenueData;
  currency: string;
  tenantId: string;
}

export function Revenuedashboard({ data: initialData, currency, tenantId }: Props) {
  const [data, setData] = useState<RevenueData>(initialData);
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(false);

  const fetchData = async (newPeriod: Period) => {
    setPeriod(newPeriod);
    setLoading(true);

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (newPeriod) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case "week": {
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59);
        break;
      }
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
    }

    const supabase = createClient();

    // Fetch bookings
    const { data: bookings } = await supabase
      .from("bookings")
      .select("price_cents, status, payment_status, starts_at")
      .eq("tenant_id", tenantId)
      .gte("starts_at", startDate.toISOString())
      .lte("starts_at", endDate.toISOString());

    const allBookings = bookings || [];
    const paidBookings = allBookings.filter((b) => b.payment_status === "paid");
    const totalRevenue = paidBookings.reduce((sum, b) => sum + b.price_cents, 0);
    const cancelledCount = allBookings.filter((b) => b.status === "cancelled").length;
    const noShowCount = allBookings.filter((b) => b.status === "no_show").length;

    // Fetch daily
    const { data: dailyRaw } = await supabase
      .from("revenue_daily")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("day", startDate.toISOString().split("T")[0])
      .lte("day", endDate.toISOString().split("T")[0])
      .order("day");

    setData({
      ...data,
      totalRevenue,
      totalBookings: allBookings.length,
      avgBookingValue: paidBookings.length > 0 ? Math.round(totalRevenue / paidBookings.length) : 0,
      cancellationRate: allBookings.length > 0 ? cancelledCount / allBookings.length : 0,
      noShowRate: allBookings.length > 0 ? noShowCount / allBookings.length : 0,
      daily: (dailyRaw || []) as RevenueData["daily"],
    });

    setLoading(false);
  };

  const fmt = (cents: number) => formatPrice(cents, currency);
  const pct = (rate: number) => `${(rate * 100).toFixed(1)}%`;

  // Find max daily revenue for chart scaling
  const maxDailyRevenue = Math.max(
    ...data.daily.map((d) => d.revenue_cents),
    1
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
        <div className="flex gap-2">
          {(
            [
              ["today", "Today"],
              ["week", "This Week"],
              ["month", "This Month"],
              ["last_month", "Last Month"],
            ] as [Period, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => fetchData(key)}
              disabled={loading}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                period === key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Key metrics */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <MetricCard label="Revenue" value={fmt(data.totalRevenue)} />
        <MetricCard label="Bookings" value={String(data.totalBookings)} />
        <MetricCard label="Avg Value" value={fmt(data.avgBookingValue)} />
        <MetricCard label="Cancellation Rate" value={pct(data.cancellationRate)} />
        <MetricCard label="No-Show Rate" value={pct(data.noShowRate)} />
      </div>

      {/* Revenue chart (simple bar chart) */}
      {data.daily.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Daily Revenue
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-end gap-1" style={{ height: "200px" }}>
              {data.daily.map((day) => {
                const height = (day.revenue_cents / maxDailyRevenue) * 100;
                const date = new Date(day.day);
                const label = date.toLocaleDateString("en-IE", {
                  day: "numeric",
                  month: "short",
                });
                return (
                  <div
                    key={day.day}
                    className="group relative flex flex-1 flex-col items-center justify-end"
                    style={{ height: "100%" }}
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-8 hidden rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block whitespace-nowrap z-10">
                      {fmt(day.revenue_cents)} &middot; {day.booking_count} bookings
                    </div>
                    <div
                      className="w-full max-w-[40px] rounded-t bg-gray-900 transition-all hover:bg-gray-700"
                      style={{
                        height: `${Math.max(height, 2)}%`,
                      }}
                    />
                    <span className="mt-1 text-[10px] text-gray-400">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Revenue by specialist */}
      {data.bySpecialist.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            By Specialist
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Specialist</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Bookings</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Revenue</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Avg Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.bySpecialist
                  .sort((a, b) => b.revenue_cents - a.revenue_cents)
                  .map((s) => (
                    <tr key={s.specialist_name}>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.specialist_name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{s.booking_count}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(s.revenue_cents)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(s.avg_value_cents)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue by service */}
      {data.byService.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            By Service
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Service</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Duration</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Bookings</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.byService
                  .sort((a, b) => b.revenue_cents - a.revenue_cents)
                  .map((s) => (
                    <tr key={s.service_name}>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.service_name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{s.duration_min} min</td>
                      <td className="px-4 py-3 text-right text-gray-600">{s.booking_count}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(s.revenue_cents)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
