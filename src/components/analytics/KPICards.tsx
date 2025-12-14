"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
} from "lucide-react"

interface OverviewData {
  total: number
  open: number
  resolved: number
  winRate: number
  totalAmountByCurrency: Record<string, number>
  avgResolutionTime: number
  thisMonthDisputes: number
  lastMonthDisputes: number
  monthOverMonthChange: number
}

interface KPICardsProps {
  data: OverviewData | null
  loading: boolean
}

export function KPICards({ data, loading }: KPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) {
    return null
  }

  const formatTotalAmount = () => {
    const currencies = Object.keys(data.totalAmountByCurrency)
    if (currencies.length === 0) return "$0.00"
    if (currencies.length === 1) {
      const currency = currencies[0]
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
      }).format(data.totalAmountByCurrency[currency])
    }
    return currencies
      .map((currency) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency,
        }).format(data.totalAmountByCurrency[currency])
      )
      .join(" + ")
  }

  const isPositiveChange = data.monthOverMonthChange >= 0

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Disputes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Disputes</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.total.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">All disputes</p>
        </CardContent>
      </Card>

      {/* Open Disputes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
          <AlertCircle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.open.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Require action</p>
        </CardContent>
      </Card>

      {/* Resolved Disputes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.resolved.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {data.winRate.toFixed(1)}% win rate
          </p>
        </CardContent>
      </Card>

      {/* Total Amount */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatTotalAmount()}</div>
          <p className="text-xs text-muted-foreground">Dispute value</p>
        </CardContent>
      </Card>

      {/* Win Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.winRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            {data.resolved} resolved disputes
          </p>
        </CardContent>
      </Card>

      {/* Average Resolution Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.avgResolutionTime.toFixed(1)} days
          </div>
          <p className="text-xs text-muted-foreground">Time to resolve</p>
        </CardContent>
      </Card>

      {/* This Month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Month</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.thisMonthDisputes.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {isPositiveChange ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span
              className={isPositiveChange ? "text-green-500" : "text-red-500"}
            >
              {Math.abs(data.monthOverMonthChange).toFixed(1)}%
            </span>
            {" vs last month"}
          </p>
        </CardContent>
      </Card>

      {/* Last Month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last Month</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.lastMonthDisputes.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">Previous period</p>
        </CardContent>
      </Card>
    </div>
  )
}

