import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { subDays, format } from 'date-fns'

interface SpendingSession {
  _id: string
  model: string
  inputTokens: number
  outputTokens: number
  totalCost: number
}

interface DayData {
  date: string
  inputTokens: number
  outputTokens: number
  totalCost: number
}

interface TodayData {
  date: string
  inputTokens: number
  outputTokens: number
  totalCost: number
  sessions: SpendingSession[]
}

export function SpendingDashboard() {
  const today = useQuery(api.spending.getToday) as TodayData | null | undefined

  const startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd')
  const endDate = format(new Date(), 'yyyy-MM-dd')
  const weekData = useQuery(api.spending.getRange, { startDate, endDate }) as
    | DayData[]
    | undefined

  const weeklyTotal =
    weekData?.reduce((acc: number, d: DayData) => acc + d.totalCost, 0) ?? 0
  const weeklyTokens =
    weekData?.reduce(
      (acc: number, d: DayData) => acc + d.inputTokens + d.outputTokens,
      0
    ) ?? 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Today</p>
          <p className="text-2xl font-bold">
            ${today?.totalCost.toFixed(4) ?? '0.00'}
          </p>
          <p className="text-xs text-muted-foreground">
            {(
              (today?.inputTokens ?? 0) + (today?.outputTokens ?? 0)
            ).toLocaleString()}{' '}
            tokens
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">This Week</p>
          <p className="text-2xl font-bold">${weeklyTotal.toFixed(4)}</p>
          <p className="text-xs text-muted-foreground">
            {weeklyTokens.toLocaleString()} tokens
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Daily Average</p>
          <p className="text-2xl font-bold">${(weeklyTotal / 7).toFixed(4)}</p>
          <p className="text-xs text-muted-foreground">per day</p>
        </div>
      </div>

      {today && today.sessions && today.sessions.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium">Today by Model</h4>
          <div className="space-y-2">
            {today.sessions.map((session: SpendingSession) => (
              <div
                key={session._id}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm"
              >
                <span>{session.model.split('/')[1]}</span>
                <div className="text-right">
                  <span className="font-medium">
                    ${session.totalCost.toFixed(4)}
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    {(
                      session.inputTokens + session.outputTokens
                    ).toLocaleString()}{' '}
                    tokens
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {weekData && weekData.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium">Last 7 Days</h4>
          <div className="flex h-24 items-end gap-1">
            {weekData.map((day: DayData) => {
              const maxCost = Math.max(
                ...weekData.map((d: DayData) => d.totalCost)
              )
              const height = maxCost > 0 ? (day.totalCost / maxCost) * 100 : 0
              return (
                <div
                  key={day.date}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div
                    className="w-full rounded-t bg-primary transition-all"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${day.date}: $${day.totalCost.toFixed(4)}`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(day.date), 'EEE')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
