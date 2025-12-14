"use client"

import * as React from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, parseISO } from "date-fns"

interface TimeSeriesData {
  date: string
  total: number
  resolved: number
}

interface DisputesOverTimeChartProps {
  data: TimeSeriesData[] | null
  loading: boolean
}

export function DisputesOverTimeChart({
  data,
  loading,
}: DisputesOverTimeChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Disputes Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Disputes Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Format data for chart
  const chartData = data.map((item) => ({
    ...item,
    dateFormatted: format(parseISO(item.date), "MMM dd"),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disputes Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="dateFormatted"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              labelFormatter={(label) => {
                const item = chartData.find((d) => d.dateFormatted === label)
                return item ? format(parseISO(item.date), "MMM dd, yyyy") : label
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Total Disputes"
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="resolved"
              stroke="#10b981"
              strokeWidth={2}
              name="Resolved"
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

