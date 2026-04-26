import { useEffect, useMemo, useState } from 'react'

const EVENTS_API = 'http://localhost:5000/api/traffic/events'
const COUNTS_API = 'http://localhost:5000/api/traffic/counts'

function App() {
  const [events, setEvents] = useState([])
  const [counts, setCounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchTrafficData() {
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
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrafficData()
    const interval = setInterval(fetchTrafficData, 3000)

    return () => clearInterval(interval)
  }, [])

  const totalVehicles = useMemo(() => {
    return counts.reduce((sum, item) => sum + item.total, 0)
  }, [counts])

  const vehicleBreakdown = useMemo(() => {
    const map = {
      car: 0,
      bus: 0,
      truck: 0,
      motorcycle: 0,
    }

    counts.forEach((item) => {
      map[item._id] = item.total
    })

    return map
  }, [counts])

  const latestEvent = events[0]

  const trafficStatus = useMemo(() => {
    if (totalVehicles < 10) return 'Low'
    if (totalVehicles < 40) return 'Medium'
    return 'High'
  }, [totalVehicles])

  const lastUpdated = latestEvent?.createdAt
    ? new Date(latestEvent.createdAt).toLocaleTimeString()
    : 'Waiting...'

  const stats = [
    {
      label: 'Total Vehicles',
      value: totalVehicles,
      change: loading ? 'Loading' : 'Live',
      note: 'stored vehicle events',
    },
    {
      label: 'Traffic Density',
      value: trafficStatus,
      change: error ? 'Offline' : 'Live',
      note: 'based on total count',
    },
    {
      label: 'Cars',
      value: vehicleBreakdown.car,
      change: '+',
      note: 'detected cars',
    },
    {
      label: 'Last Updated',
      value: lastUpdated,
      change: 'Now',
      note: 'latest event time',
    },
  ]

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 p-5 md:p-8 max-w-[1500px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold">
            Live Traffic Analytics Dashboard
          </h1>
          <p className="text-slate-500 mt-2">
            Real-time vehicle monitoring, traffic density, and historical insights
          </p>
        </div>

        <button className="bg-gradient-to-r from-blue-600 to-violet-600 text-white px-5 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 transition">
          Export Report
        </button>
      </header>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 font-medium">
          {error} — start backend on port 5000 and try again.
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats.map((item, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-2xl shadow-md p-6 hover:shadow-lg transition"
          >
            <div className="flex justify-between items-center">
              <p className="text-gray-500 text-sm">{item.label}</p>
              <span className="text-green-600 font-semibold text-sm">
                {item.change}
              </span>
            </div>

            <h2 className="text-3xl font-bold mt-3">{item.value}</h2>

            <p className="text-gray-400 text-sm mt-1">{item.note}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 mb-6">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Traffic Overview</h2>
            <span className="text-sm text-gray-500">Latest events</span>
          </div>

          <div className="h-80 flex items-end gap-4 bg-slate-50 rounded-xl p-5">
            {events.slice(0, 6).reverse().map((event, index) => (
              <div
                key={event._id || index}
                className="flex-1 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-xl"
                style={{ height: `${30 + ((index + 1) * 10)}%` }}
              ></div>
            ))}

            {events.length === 0 && (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                No event data yet
              </div>
            )}
          </div>

          <div className="flex justify-between text-sm text-gray-400 mt-3">
            <span>Old</span>
            <span>Recent</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Vehicle Breakdown</h2>
            <span className="text-green-600 font-semibold text-sm">Live</span>
          </div>

          <div className="w-40 h-40 mx-auto rounded-full bg-gradient-to-tr from-blue-500 to-yellow-400 flex items-center justify-center text-white text-xl font-bold shadow-inner">
            {trafficStatus}
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex justify-between">
              <span>Cars</span>
              <strong>{vehicleBreakdown.car}</strong>
            </div>
            <div className="flex justify-between">
              <span>Buses</span>
              <strong>{vehicleBreakdown.bus}</strong>
            </div>
            <div className="flex justify-between">
              <span>Trucks</span>
              <strong>{vehicleBreakdown.truck}</strong>
            </div>
            <div className="flex justify-between">
              <span>Motorcycles</span>
              <strong>{vehicleBreakdown.motorcycle}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Live Camera</h2>
            <span className="text-gray-400 text-sm">Camera 1</span>
          </div>

          <div className="h-64 bg-slate-900 text-white rounded-xl flex flex-col items-center justify-center">
            <p className="text-lg font-bold">Camera Feed</p>
            <span className="text-gray-400 text-sm">
              YOLO output preview can be connected later
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Recent Vehicle Events</h2>
            <span className="text-green-600 text-sm font-semibold">Live</span>
          </div>

          <ul className="space-y-3 max-h-64 overflow-y-auto">
            {events.slice(0, 8).map((event, index) => (
              <li
                key={event._id || index}
                className="bg-slate-100 p-3 rounded-xl text-sm"
              >
                <strong>{event.class}</strong> #{event.vehicle_id} entered at{' '}
                {event.entry_time || 'N/A'} and exited at{' '}
                {event.exit_time || 'N/A'}
              </li>
            ))}

            {events.length === 0 && (
              <li className="bg-slate-100 p-3 rounded-xl text-sm text-slate-500">
                Waiting for vehicle events from backend...
              </li>
            )}
          </ul>
        </div>
      </section>
    </main>
  )
}

export default App