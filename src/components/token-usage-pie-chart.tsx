"use client"

import * as React from "react"
import { Pie, PieChart, ResponsiveContainer, Cell } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

interface TokenUsagePieChartProps {
  data: {
    status: 'Used' | 'Available';
    count: number;
    fill: string;
  }[];
  totalTokens: number;
}

const chartConfig = {
  count: {
    label: "Tokens",
  },
  Used: {
    label: "Used",
    color: "hsl(var(--destructive))",
  },
  Available: {
    label: "Available",
    color: "hsl(var(--success))",
  },
} satisfies import("./ui/chart").ChartConfig;

const TokenUsagePieChart: React.FC<TokenUsagePieChartProps> = ({ data, totalTokens }) => {
  if (totalTokens === 0) {
    return (
       <Card className="flex flex-col h-full">
        <CardHeader>
          <CardTitle>Token Status</CardTitle>
          <CardDescription>Your customer token usage.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-muted-foreground text-center">No tokens registered in this period.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Token Status</CardTitle>
        <CardDescription>Your customer token usage for the selected period.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                />
              <Pie
                data={data}
                dataKey="count"
                nameKey="status"
                innerRadius={50}
                strokeWidth={5}
                labelLine={false}
                label={({
                  cx,
                  cy,
                  midAngle,
                  innerRadius,
                  outerRadius,
                  value,
                  index,
                }) => {
                  if (value === 0) return null;
                  const RADIAN = Math.PI / 180
                  const radius = 12 + innerRadius + (outerRadius - innerRadius)
                  const x = cx + radius * Math.cos(-midAngle * RADIAN)
                  const y = cy + radius * Math.sin(-midAngle * RADIAN)

                  return (
                    <text
                      x={x}
                      y={y}
                      className="fill-muted-foreground text-xs"
                      textAnchor={x > cx ? "start" : "end"}
                      dominantBaseline="central"
                    >
                      {data[index].status} ({value})
                    </text>
                  )
                }}
              >
                 {data.map((entry) => (
                    <Cell key={`cell-${entry.status}`} fill={entry.fill} />
                  ))}
              </Pie>
              <ChartLegend
                content={<ChartLegendContent nameKey="status" />}
                className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default TokenUsagePieChart;