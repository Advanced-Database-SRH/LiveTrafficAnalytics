import { useMemo, useState } from "react";
import {
	AreaChart,
	Area,
	BarChart,
	Bar,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
	Legend,
} from "recharts";

const TABS = ["Hourly", "Daily", "Weekly"];

const TIMEZONE = "America/Denver";

const COLORS = {
	car: { stroke: "#2563eb", fill: "#93c5fd" },
	bus: { stroke: "#7c3aed", fill: "#c4b5fd" },
	truck: { stroke: "#d97706", fill: "#fcd34d" },
	motorcycle: { stroke: "#059669", fill: "#6ee7b7" },
	total: { stroke: "#2563eb", fill: "#93c5fd" },
};

function formatInTZ(date, options) {
	return new Intl.DateTimeFormat("en-GB", {
		...options,
		timeZone: TIMEZONE,
	}).format(date instanceof Date ? date : new Date(date));
}

function isoWeekKey(date) {
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone: TIMEZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})
		.formatToParts(date)
		.reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});

	const local = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00`);
	const day = local.getDay() === 0 ? 7 : local.getDay();
	const thursday = new Date(local);
	thursday.setDate(local.getDate() + (4 - day));
	const yearStart = new Date(thursday.getFullYear(), 0, 1);
	const week = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
	return `${thursday.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function localDateStr(date) {
	return formatInTZ(date, { year: "numeric", month: "2-digit", day: "2-digit" })
		.split("/")
		.reverse()
		.join("-");
}

function ChartTooltip({ active, payload, label }) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs">
			<p className="mb-1 font-semibold text-slate-700">{label}</p>
			{payload.map((p) => (
				<p
					key={p.dataKey}
					style={{ color: p.stroke ?? p.fill }}
					className="font-medium"
				>
					{p.name}: {p.value}
				</p>
			))}
		</div>
	);
}

function HourlyChart({ history }) {
	const data = useMemo(() => {
		const todayStr = localDateStr(new Date());

		// Build a map of hour → counts from history
		const hourMap = {};
		history.forEach((item) => {
			const d = new Date(item.timebucket);
			if (localDateStr(d) !== todayStr) return;

			const hour = formatInTZ(d, { hour: "2-digit", hour12: false });
			const label = `${hour.padStart(2, "0")}:00`;
			const c = item.counts || {};
			if (!hourMap[label])
				hourMap[label] = {
					time: label,
					car: 0,
					bus: 0,
					truck: 0,
					motorcycle: 0,
				};
			hourMap[label].car += c.car || 0;
			hourMap[label].bus += c.bus || 0;
			hourMap[label].truck += c.truck || 0;
			hourMap[label].motorcycle += c.motorcycle || 0;
		});

		const allHours = Array.from({ length: 24 }, (_, i) => {
			const label = `${String(i).padStart(2, "0")}:00`;
			return (
				hourMap[label] ?? {
					time: label,
					car: 0,
					bus: 0,
					truck: 0,
					motorcycle: 0,
				}
			);
		});

		return allHours;
	}, [history]);

	if (!data.some((d) => d.car + d.bus + d.truck + d.motorcycle > 0))
		return <Empty label="No data for today yet" />;

	return (
		<ResponsiveContainer width="100%" height="100%">
			<BarChart data={data} barSize={10}>
				<CartesianGrid
					strokeDasharray="3 3"
					vertical={false}
					stroke="#f1f5f9"
				/>
				<XAxis
					dataKey="time"
					tick={{ fontSize: 10 }}
					interval={2}
					tickFormatter={(v) => v.slice(0, 5)}
				/>
				<YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
				<Tooltip content={<ChartTooltip />} />
				<Legend
					iconType="circle"
					iconSize={8}
					wrapperStyle={{ fontSize: 11 }}
				/>
				{["car", "bus", "truck", "motorcycle"].map((cls) => (
					<Bar
						key={cls}
						dataKey={cls}
						name={cls.charAt(0).toUpperCase() + cls.slice(1)}
						stackId="a"
						fill={COLORS[cls].fill}
						stroke={COLORS[cls].stroke}
						radius={cls === "motorcycle" ? [6, 6, 0, 0] : [0, 0, 0, 0]}
					/>
				))}
			</BarChart>
		</ResponsiveContainer>
	);
}

function DailyChart({ history }) {
	const data = useMemo(() => {
		const now = new Date();
		const todayStr = localDateStr(now);

		const dayOfWeek = new Date(
			formatInTZ(now, {
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				weekday: "long",
			}),
		);

		const berlinNowParts = new Intl.DateTimeFormat("en-GB", {
			timeZone: TIMEZONE,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		})
			.formatToParts(now)
			.reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});

		const localToday = new Date(
			`${berlinNowParts.year}-${berlinNowParts.month}-${berlinNowParts.day}T00:00:00`,
		);
		const dow = localToday.getDay();
		const mondayOffset = dow === 0 ? -6 : 1 - dow;
		const monday = new Date(localToday);
		monday.setDate(localToday.getDate() + mondayOffset);

		const weekDays = Array.from({ length: 7 }, (_, i) => {
			const d = new Date(monday);
			d.setDate(monday.getDate() + i);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
			const label = new Intl.DateTimeFormat("en-GB", {
				weekday: "short",
				day: "numeric",
			}).format(d);
			return { key, label, car: 0, bus: 0, truck: 0, motorcycle: 0 };
		});

		const dayIndex = Object.fromEntries(weekDays.map((w, i) => [w.key, i]));

		history.forEach((item) => {
			const d = new Date(item.timebucket);
			const key = localDateStr(d);
			if (dayIndex[key] === undefined) return;
			const c = item.counts || {};
			weekDays[dayIndex[key]].car += c.car || 0;
			weekDays[dayIndex[key]].bus += c.bus || 0;
			weekDays[dayIndex[key]].truck += c.truck || 0;
			weekDays[dayIndex[key]].motorcycle += c.motorcycle || 0;
		});

		return weekDays.map(({ key, ...rest }) => rest);
	}, [history]);

	return (
		<ResponsiveContainer width="100%" height="100%">
			<AreaChart data={data}>
				<defs>
					{["car", "bus", "truck", "motorcycle"].map((cls) => (
						<linearGradient
							key={cls}
							id={`grad-${cls}`}
							x1="0"
							y1="0"
							x2="0"
							y2="1"
						>
							<stop
								offset="5%"
								stopColor={COLORS[cls].fill}
								stopOpacity={0.6}
							/>
							<stop
								offset="95%"
								stopColor={COLORS[cls].fill}
								stopOpacity={0.05}
							/>
						</linearGradient>
					))}
				</defs>
				<CartesianGrid
					strokeDasharray="3 3"
					vertical={false}
					stroke="#f1f5f9"
				/>
				<XAxis dataKey="label" tick={{ fontSize: 11 }} />
				<YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
				<Tooltip content={<ChartTooltip />} />
				<Legend
					iconType="circle"
					iconSize={8}
					wrapperStyle={{ fontSize: 11 }}
				/>
				{["car", "bus", "truck", "motorcycle"].map((cls) => (
					<Area
						key={cls}
						type="monotone"
						dataKey={cls}
						name={cls.charAt(0).toUpperCase() + cls.slice(1)}
						stroke={COLORS[cls].stroke}
						fill={`url(#grad-${cls})`}
						strokeWidth={2}
						dot={false}
					/>
				))}
			</AreaChart>
		</ResponsiveContainer>
	);
}

function WeeklyChart({ history }) {
	const data = useMemo(() => {
		const now = new Date();
		const berlinNowParts = new Intl.DateTimeFormat("en-GB", {
			timeZone: TIMEZONE,
			year: "numeric",
			month: "2-digit",
		})
			.formatToParts(now)
			.reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});

		const currentMonth = `${berlinNowParts.year}-${berlinNowParts.month}`;

		const weekMap = {};

		history.forEach((item) => {
			const d = new Date(item.timebucket);

			const dateStr = localDateStr(d);
			if (!dateStr.startsWith(currentMonth)) return;

			const weekKey = isoWeekKey(d);
			const c = item.counts || {};
			if (!weekMap[weekKey])
				weekMap[weekKey] = {
					week: weekKey,
					car: 0,
					bus: 0,
					truck: 0,
					motorcycle: 0,
				};
			weekMap[weekKey].car += c.car || 0;
			weekMap[weekKey].bus += c.bus || 0;
			weekMap[weekKey].truck += c.truck || 0;
			weekMap[weekKey].motorcycle += c.motorcycle || 0;
		});

		return Object.values(weekMap)
			.sort((a, b) => a.week.localeCompare(b.week))
			.map((w, i) => ({ ...w, week: `Week ${i + 1}` }));
	}, [history]);

	if (!data.length) return <Empty label="No weekly data yet" />;

	return (
		<ResponsiveContainer width="100%" height="100%">
			<BarChart data={data} barSize={28}>
				<CartesianGrid
					strokeDasharray="3 3"
					vertical={false}
					stroke="#f1f5f9"
				/>
				<XAxis dataKey="week" tick={{ fontSize: 11 }} />
				<YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
				<Tooltip content={<ChartTooltip />} />
				<Legend
					iconType="circle"
					iconSize={8}
					wrapperStyle={{ fontSize: 11 }}
				/>
				{["car", "bus", "truck", "motorcycle"].map((cls) => (
					<Bar
						key={cls}
						dataKey={cls}
						name={cls.charAt(0).toUpperCase() + cls.slice(1)}
						stackId="a"
						fill={COLORS[cls].fill}
						stroke={COLORS[cls].stroke}
						radius={cls === "motorcycle" ? [6, 6, 0, 0] : [0, 0, 0, 0]}
					/>
				))}
			</BarChart>
		</ResponsiveContainer>
	);
}

function Empty({ label = "No event data yet" }) {
	return (
		<div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
			{label}
		</div>
	);
}

export default function TrafficOverview({ events, history }) {
	const [activeTab, setActiveTab] = useState("Hourly");

	return (
		<div className="rounded-[28px] border border-white bg-white p-6 shadow-lg shadow-slate-200/70">
			{/* Header */}
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-xl font-bold">Traffic Overview</h2>
					<p className="text-sm text-slate-500">
						{activeTab === "Hourly" &&
							"Today's vehicle counts by hour (00:00–23:00)"}
						{activeTab === "Daily" &&
							"This week's vehicle counts by day (Mon–Sun)"}
						{activeTab === "Weekly" && "This month's vehicle totals by week"}
					</p>
				</div>

				{/* Tabs */}
				<div className="flex rounded-2xl bg-slate-100 p-1 gap-1">
					{TABS.map((tab) => (
						<button
							key={tab}
							onClick={() => setActiveTab(tab)}
							className={[
								"rounded-xl px-4 py-1.5 text-sm font-semibold transition-all duration-200",
								activeTab === tab
									? "bg-white text-slate-900 shadow-sm"
									: "text-slate-500 hover:text-slate-700",
							].join(" ")}
						>
							{tab}
						</button>
					))}
				</div>
			</div>

			{/* Chart area */}
			<div className="h-80 rounded-[22px] bg-slate-50 p-5">
				{activeTab === "Hourly" && <HourlyChart history={history} />}
				{activeTab === "Daily" && <DailyChart history={history} />}
				{activeTab === "Weekly" && <WeeklyChart history={history} />}
			</div>

			{/* Footer hint */}
			<p className="mt-3 text-right text-xs text-slate-400">
				{activeTab === "Hourly" &&
					"All 24 hours of today — America/Denver (MT)"}
				{activeTab === "Daily" &&
					"Mon–Sun of current week — America/Denver (MT)"}
				{activeTab === "Weekly" &&
					"Weeks of current month — America/Denver (MT)"}
			</p>
		</div>
	);
}
