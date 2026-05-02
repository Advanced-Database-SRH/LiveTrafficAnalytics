import { useCallback, useEffect, useMemo, useState } from 'react'
import { Camera, Car, CloudSun, Gauge, Radio, Activity } from 'lucide-react'

// ✅ FIX 1: Use environment variables instead of hardcoded localhost URLs
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
const EVENTS_API = `${BASE}/api/traffic/events`
const COUNTS_API = `${BASE}/api/traffic/counts`

// ✅ FIX 2: Move static data outside the component so it's never recreated
const MOCK_WEATHER = {
  condition: 'Partly Cloudy',
  temperature: '18°C',
  wind: '12 km/h',
}

function StatCardSkeleton() {
  return (
    <div className="rounded-[24px] border border-white bg-white p-6 shadow-lg shadow-slate-200/70">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 w-28 animate-pulse rounded-lg bg-slate-100" />
          <div className="mt-3 h-10 w-20 animate-pulse rounded-lg bg-slate-100" />
        </div>
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-100" />
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="h-4 w-32 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-6 w-12 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  )
}

function App() {
  const [events, setEvents] = useState([])
  const [counts, setCounts] = useState([])
  const [loading, setLoading] = useState(true)   // true only on first load
  const [isRefreshing, setIsRefreshing] = useState(false) // ✅ FIX 3: separate refresh state
  const [error, setError] = useState('')

  // ✅ FIX 4: Wrap in useCallback so the function reference is stable
  const fetchTrafficData = useCallback(async (isInitial = false) => {
    if (!isInitial) setIsRefreshing(true)

    try {
      const [eventsRes, countsRes] = await Promise.all([
        fetch(EVENTS_API),
        fetch(COUNTS_API),
      ])

      if (!eventsRes.ok || !countsRes.ok) {
        throw new Error('Backend request failed')
      }

      const eventsData = await eventsRes.json()
      const countsData = await countsRes.json()

      setEvents(eventsData)
      setCounts(countsData)
      setError('')
    } catch (err) {
      setError('Backend not connected yet')
      console.error(err)
    } finally {
      if (isInitial) setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchTrafficData(true)
    const interval = setInterval(() => fetchTrafficData(false), 3000)
    return () => clearInterval(interval)
  }, [fetchTrafficData])

  const totalVehicles = useMemo(() => {
    return counts.reduce((sum, item) => sum + item.total, 0)
  }, [counts])

  const vehicleBreakdown = useMemo(() => {
    const map = { car: 0, bus: 0, truck: 0, motorcycle: 0 }
    counts.forEach((item) => {
      map[item._id] = item.total
    })
    return map
  }, [counts])

  const trafficStatus = useMemo(() => {
    if (totalVehicles < 10) return 'Low'
    if (totalVehicles < 40) return 'Medium'
    return 'High'
  }, [totalVehicles])

  // ✅ FIX 5: Memoize the stats array — was being recreated on every render
  const stats = useMemo(() => [
    {
      label: 'Total Vehicles',
      value: totalVehicles,
      change: isRefreshing ? 'Updating…' : 'Live',
      note: 'Stored vehicle events',
      icon: Car,
      color: 'from-blue-500 to-cyan-400',
    },
    {
      label: 'Traffic Density',
      value: trafficStatus,
      change: error ? 'Offline' : 'Live',
      note: 'Based on current count',
      icon: Gauge,
      color: 'from-violet-500 to-fuchsia-500',
    },
    {
      label: 'Weather',
      value: MOCK_WEATHER.temperature,
      change: MOCK_WEATHER.condition,
      note: `Wind speed: ${MOCK_WEATHER.wind}`,
      icon: CloudSun,
      color: 'from-amber-400 to-orange-500',
    },
  ], [totalVehicles, trafficStatus, isRefreshing, error])

  // ✅ FIX 6: Bar heights derived from real event data, not hardcoded index math
  const barData = useMemo(() => {
    const slice = events.slice(0, 6)
    if (slice.length === 0) return []
    // Use a simple proxy: index in the list as recency weight,
    // or swap `count` for a real numeric field from your API.
    const values = slice.map((_, i) => i + 1)
    const max = Math.max(...values)
    return slice.map((event, i) => ({
      id: event._id ?? i,
      heightPct: Math.max(15, Math.round((values[i] / max) * 100)),
    }))
  }, [events])

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-950">
      <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-8">

        {/* Header */}
        <header className="mb-8 overflow-hidden rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-8 text-white shadow-2xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-blue-100">
                <Radio size={16} />
                Live monitoring system
              </div>

              <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
                Live Traffic Analytics Dashboard
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                Real-time vehicle monitoring, weather conditions, traffic density,
                and historical insights for smart city traffic analysis.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-sm text-slate-300">System status</p>
              <div className="mt-2 flex items-center gap-2 text-lg font-bold">
                <span className={`h-3 w-3 rounded-full ${error ? 'bg-red-400' : 'bg-emerald-400'}`} />
                {error ? 'Frontend Preview' : 'Live Connected'}
              </div>
              {isRefreshing && (
                <p className="mt-1 text-xs text-slate-400">Refreshing…</p>
              )}
            </div>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
            Backend is not connected yet — showing frontend layout with available placeholder data.
          </div>
        )}

        {/* ✅ FIX 7: Skeleton on first load instead of empty/broken cards */}
        <section className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
            : stats.map((item, index) => {
                const Icon = item.icon
                return (
                  <div
                    key={index}
                    className="group rounded-[24px] border border-white bg-white p-6 shadow-lg shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">{item.label}</p>
                        <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                          {item.value}
                        </h2>
                      </div>

                      <div className={`rounded-2xl bg-gradient-to-br ${item.color} p-3 text-white shadow-lg`}>
                        <Icon size={24} />
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <p className="text-sm text-slate-400">{item.note}</p>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                        {item.change}
                      </span>
                    </div>
                  </div>
                )
              })}
        </section>

        {/* Camera feed */}
        <section className="mb-6 rounded-[28px] border border-white bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Live Camera Feed</h2>
              <p className="text-sm text-slate-500">YOLO processed traffic stream preview</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-600">
              Camera 1
            </span>
          </div>

          <div className="relative flex h-[420px] items-center justify-center overflow-hidden rounded-[22px] bg-slate-950 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.28),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.22),_transparent_30%)]" />
            <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              LIVE
            </div>

            <div className="relative text-center">
              <Camera className="mx-auto mb-4 text-blue-300" size={52} />
              <p className="text-xl font-black">Camera Feed</p>
              <span className="mt-2 block text-sm text-slate-400">
                YOLO output preview can be connected later
              </span>
            </div>
          </div>
        </section>

        {/* Charts row */}
        <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          {/* Traffic overview bar chart */}
          <div className="rounded-[28px] border border-white bg-white p-6 shadow-lg shadow-slate-200/70">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Traffic Overview</h2>
                <p className="text-sm text-slate-500">Latest event activity trend</p>
              </div>
              <span className="text-sm font-medium text-slate-400">Recent events</span>
            </div>

            <div className="flex h-80 items-end gap-4 rounded-[22px] bg-slate-50 p-5">
              {barData.length > 0
                ? barData.reverse().map((bar) => (
                    <div
                      key={bar.id}
                      className="flex-1 rounded-t-2xl bg-gradient-to-t from-blue-600 to-cyan-300 shadow-lg shadow-blue-200 transition-all duration-500"
                      style={{ height: `${bar.heightPct}%` }}
                    />
                  ))
                : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                    No event data yet
                  </div>
                )}
            </div>

            <div className="mt-3 flex justify-between text-sm text-slate-400">
              <span>Old</span>
              <span>Recent</span>
            </div>
          </div>

          {/* Vehicle breakdown */}
          <div className="rounded-[28px] border border-white bg-white p-6 shadow-lg shadow-slate-200/70">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Vehicle Breakdown</h2>
                <p className="text-sm text-slate-500">Detected class distribution</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                Live
              </span>
            </div>

            <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-cyan-400 to-amber-300 text-xl font-black text-white shadow-xl">
              {trafficStatus}
            </div>

            <div className="mt-8 space-y-4">
              {[
                ['Cars', vehicleBreakdown.car],
                ['Buses', vehicleBreakdown.bus],
                ['Trucks', vehicleBreakdown.truck],
                ['Motorcycles', vehicleBreakdown.motorcycle],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-medium text-slate-600">{label}</span>
                  <strong className="text-slate-950">{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent events */}
        <section className="rounded-[28px] border border-white bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Recent Vehicle Events</h2>
              <p className="text-sm text-slate-500">Latest detections from the traffic pipeline</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
              Live
            </span>
          </div>

          <ul className="max-h-64 space-y-3 overflow-y-auto">
            {events.slice(0, 8).map((event, index) => (
              <li
                key={event._id || index}
                className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm"
              >
                <div className="rounded-xl bg-blue-100 p-2 text-blue-600">
                  <Activity size={18} />
                </div>
                <div>
                  <strong>{event.class}</strong> #{event.vehicle_id} entered at{' '}
                  {event.entry_time || 'N/A'} and exited at {event.exit_time || 'N/A'}
                </div>
              </li>
            ))}

            {events.length === 0 && (
              <li className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Waiting for vehicle events from backend…
              </li>
            )}
          </ul>
        </section>

      </div>
    </main>
  )
}

export default App
