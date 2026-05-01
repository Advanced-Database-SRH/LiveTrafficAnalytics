import { useState, useRef, useEffect, useCallback } from "react";
import {
	MessageSquare,
	X,
	Send,
	ChevronRight,
	Loader2,
	AlertCircle,
	Minimize2,
	Maximize2,
	Zap,
} from "lucide-react";

// ─────────────────────────────────────────────────────────
// CONFIG
// Replace this URL with your own backend proxy or Qdrant
// endpoint that returns a text answer given a user question.
// See qdrantService.js for the full Qdrant integration layer.
// ─────────────────────────────────────────────────────────
const CHAT_API_URL = "http://localhost:5000/api/chat";

// ─────────────────────────────────────────────────────────
// SUGGESTED PROMPTS shown when the chat is empty
// ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
	"What is the current traffic density?",
	"How many vehicles have been detected?",
	"What is the vehicle type breakdown?",
	"Are there any anomalies in the flow rate?",
	"Summarise the traffic conditions right now",
];

// ─────────────────────────────────────────────────────────
// Build a system prompt from live dashboard context so the
// AI always has up-to-date numbers when answering questions.
// ─────────────────────────────────────────────────────────
function buildSystemPrompt(ctx) {
	return `You are a traffic analysis assistant embedded in a live traffic monitoring dashboard.

Current live data snapshot:
- Total vehicles detected: ${ctx.totalVehicles}
- Traffic density status: ${ctx.trafficStatus}
- Vehicle breakdown: Cars=${ctx.vehicleBreakdown?.car ?? 0}, Buses=${ctx.vehicleBreakdown?.bus ?? 0}, Trucks=${ctx.vehicleBreakdown?.truck ?? 0}, Motorcycles=${ctx.vehicleBreakdown?.motorcycle ?? 0}
- Total stored events: ${ctx.eventCount}
- Weather: ${ctx.weather?.condition ?? "Unknown"}, ${ctx.weather?.temperature ?? ""}, Wind ${ctx.weather?.wind ?? ""}

Your role:
- Answer natural language questions about traffic conditions, vehicle counts, flow rates, and anomalies.
- Use the live data above when answering. Be concise and precise — this is a monitoring tool, not a chat app.
- If asked about historical trends or patterns you don't have data for, say so clearly.
- Format numbers clearly. Use bullet points sparingly.
- Keep answers under 120 words unless a detailed breakdown is explicitly requested.`;
}

// ─────────────────────────────────────────────────────────
// API call — replace body shape to match your backend
// ─────────────────────────────────────────────────────────
async function callChatAPI(messages, systemPrompt) {
	const res = await fetch(CHAT_API_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			system: systemPrompt,
			messages: messages.map((m) => ({ role: m.role, content: m.content })),
		}),
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.message || `API error ${res.status}`);
	}

	const data = await res.json();
	// Adapt this to your API's response shape:
	return (
		data.reply ?? data.content ?? data.message ?? "No response from server."
	);
}

// ─────────────────────────────────────────────────────────
// Typing animation dots
// ─────────────────────────────────────────────────────────
function TypingDots() {
	return (
		<div className="flex items-center gap-1.5 px-1 py-0.5">
			{[0, 150, 300].map((delay) => (
				<span
					key={delay}
					className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce"
					style={{ animationDelay: `${delay}ms` }}
				/>
			))}
		</div>
	);
}

// ─────────────────────────────────────────────────────────
// Single message bubble
// ─────────────────────────────────────────────────────────
function Message({ msg }) {
	const isUser = msg.role === "user";
	const isError = msg.role === "error";

	return (
		<div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
			{/* Avatar */}
			{!isUser && (
				<div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 ring-1 ring-cyan-500/30">
					<Zap size={13} className="text-cyan-400" />
				</div>
			)}

			{/* Bubble */}
			<div
				className={[
					"max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
					isUser
						? "rounded-tr-sm bg-blue-600/25 text-blue-50 ring-1 ring-blue-500/20"
						: isError
							? "rounded-tl-sm bg-red-900/30 text-red-300 ring-1 ring-red-500/20"
							: "rounded-tl-sm bg-white/[0.06] text-slate-200 ring-1 ring-white/8",
				].join(" ")}
			>
				{isError && (
					<div className="mb-1 flex items-center gap-1.5 text-red-400">
						<AlertCircle size={12} />
						<span className="text-[11px] font-semibold uppercase tracking-wider">
							Error
						</span>
					</div>
				)}
				<p className="whitespace-pre-wrap">{msg.content}</p>
				<p className="mt-1.5 text-right text-[10px] opacity-30">
					{new Date(msg.ts).toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})}
				</p>
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────
// MAIN CHATBOT COMPONENT
// Props:
//   trafficContext — live data from App.jsx (auto-injected
//                   into the system prompt on every request)
// ─────────────────────────────────────────────────────────
export default function Chatbot({ trafficContext = {} }) {
	const [open, setOpen] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const [messages, setMessages] = useState([
		{
			role: "assistant",
			content:
				"Traffic AI online. Ask me anything about the current flow rate, vehicle counts, density, or anomalies.",
			ts: Date.now(),
		},
	]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const bottomRef = useRef(null);
	const inputRef = useRef(null);
	const textareaRef = useRef(null);

	// Scroll to bottom on new messages
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, loading]);

	// Focus input when opened
	useEffect(() => {
		if (open) setTimeout(() => inputRef.current?.focus(), 120);
	}, [open]);

	// Auto-resize textarea
	const handleInput = (e) => {
		setInput(e.target.value);
		e.target.style.height = "auto";
		e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
	};

	const sendMessage = useCallback(
		async (text) => {
			const trimmed = (text ?? input).trim();
			if (!trimmed || loading) return;

			const userMsg = { role: "user", content: trimmed, ts: Date.now() };
			const nextMessages = [...messages, userMsg];

			setMessages(nextMessages);
			setInput("");
			if (textareaRef.current) textareaRef.current.style.height = "auto";
			setLoading(true);

			try {
				const systemPrompt = buildSystemPrompt(trafficContext);
				// Send only user/assistant turns (not error turns) to the API
				const apiMessages = nextMessages.filter(
					(m) => m.role === "user" || m.role === "assistant",
				);
				const reply = await callChatAPI(apiMessages, systemPrompt);

				setMessages((prev) => [
					...prev,
					{ role: "assistant", content: reply, ts: Date.now() },
				]);
			} catch (err) {
				setMessages((prev) => [
					...prev,
					{
						role: "error",
						content: err.message.includes("Failed to fetch")
							? "Cannot reach the chat backend. Make sure your server is running on port 5000."
							: err.message,
						ts: Date.now(),
					},
				]);
			} finally {
				setLoading(false);
				setTimeout(() => inputRef.current?.focus(), 60);
			}
		},
		[input, loading, messages, trafficContext],
	);

	const handleKey = (e) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};

	const clearChat = () => {
		setMessages([
			{
				role: "assistant",
				content:
					"Chat cleared. What would you like to know about the traffic data?",
				ts: Date.now(),
			},
		]);
	};

	const showSuggestions = messages.length <= 1 && !loading;

	// Panel dimensions
	const panelWidth = expanded ? "w-[520px]" : "w-[380px]";
	const panelHeight = expanded ? "h-[680px]" : "h-[540px]";

	return (
		<>
			{/* ── FAB (floating action button) ────────────────── */}
			<button
				onClick={() => setOpen((v) => !v)}
				aria-label="Toggle Traffic AI chat"
				className={[
					"fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl px-4 py-3",
					"bg-gradient-to-br from-slate-900 to-slate-800",
					"shadow-[0_4px_32px_rgba(0,0,0,0.5)] ring-1 ring-white/10",
					"transition-all duration-200 hover:scale-105 active:scale-95",
					open ? "opacity-0 pointer-events-none" : "opacity-100",
				].join(" ")}
			>
				<div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20">
					<MessageSquare size={16} className="text-cyan-400" />
					<span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
				</div>
				<span className="text-sm font-semibold text-white">Traffic AI</span>
			</button>

			{/* ── Chat Panel ──────────────────────────────────── */}
			<div
				className={[
					"fixed bottom-6 right-6 z-50 flex flex-col",
					"rounded-2xl overflow-hidden",
					"bg-[#0d1117] ring-1 ring-white/10",
					"shadow-[0_8px_64px_rgba(0,0,0,0.7)]",
					panelWidth,
					panelHeight,
					"transition-all duration-300 ease-out",
					open
						? "opacity-100 translate-y-0 scale-100"
						: "opacity-0 translate-y-4 scale-95 pointer-events-none",
				].join(" ")}
			>
				{/* Header */}
				<div className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#0d1117] px-4 py-3.5">
					<div className="flex items-center gap-3">
						<div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 ring-1 ring-cyan-500/25">
							<Zap size={15} className="text-cyan-400" />
							<span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#0d1117]" />
						</div>
						<div>
							<p className="text-[13px] font-bold text-white leading-tight">
								Traffic AI
							</p>
							<p className="text-[10px] text-slate-500 leading-tight tracking-wide">
								Natural language · Live data
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1">
						{/* Clear */}
						<button
							onClick={clearChat}
							title="Clear chat"
							className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
						>
							Clear
						</button>

						{/* Expand/shrink */}
						<button
							onClick={() => setExpanded((v) => !v)}
							className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
						>
							{expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
						</button>

						{/* Close */}
						<button
							onClick={() => setOpen(false)}
							className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
						>
							<X size={14} />
						</button>
					</div>
				</div>

				{/* Messages */}
				<div className="flex-1 overflow-y-auto px-4 py-4">
					<div className="space-y-4">
						{messages.map((msg, i) => (
							<Message key={i} msg={msg} />
						))}

						{loading && (
							<div className="flex gap-2.5">
								<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 ring-1 ring-cyan-500/30">
									<Loader2 size={13} className="animate-spin text-cyan-400" />
								</div>
								<div className="rounded-2xl rounded-tl-sm bg-white/[0.06] px-3.5 py-2.5 ring-1 ring-white/8">
									<TypingDots />
								</div>
							</div>
						)}

						<div ref={bottomRef} />
					</div>
				</div>

				{/* Suggestions */}
				{showSuggestions && (
					<div className="flex-shrink-0 space-y-1.5 border-t border-white/[0.07] px-4 py-3">
						<p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
							Try asking
						</p>
						{SUGGESTIONS.map((s) => (
							<button
								key={s}
								onClick={() => sendMessage(s)}
								className="group flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-left text-[12px] text-slate-400 transition hover:border-cyan-500/20 hover:bg-cyan-500/5 hover:text-cyan-300"
							>
								<span>{s}</span>
								<ChevronRight
									size={12}
									className="flex-shrink-0 opacity-0 transition group-hover:opacity-60"
								/>
							</button>
						))}
					</div>
				)}

				{/* Input */}
				<div className="flex-shrink-0 border-t border-white/[0.07] p-3">
					<div className="flex items-end gap-2">
						<textarea
							ref={(el) => {
								inputRef.current = el;
								textareaRef.current = el;
							}}
							rows={1}
							value={input}
							onChange={handleInput}
							onKeyDown={handleKey}
							disabled={loading}
							placeholder="Ask about traffic conditions…"
							className={[
								"flex-1 resize-none rounded-xl bg-white/[0.06] px-3.5 py-2.5",
								"text-[13px] text-slate-200 placeholder-slate-600",
								"ring-1 ring-white/8 transition",
								"focus:outline-none focus:ring-cyan-500/30",
								"disabled:opacity-40",
								"scrollbar-none",
							].join(" ")}
							style={{ minHeight: "44px", maxHeight: "120px" }}
						/>
						<button
							onClick={() => sendMessage()}
							disabled={!input.trim() || loading}
							className={[
								"flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition",
								input.trim() && !loading
									? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/40"
									: "bg-white/5 text-slate-600 cursor-not-allowed",
							].join(" ")}
						>
							<Send size={15} />
						</button>
					</div>
					<p className="mt-2 text-center text-[10px] text-slate-700">
						Enter to send · Shift+Enter for newline
					</p>
				</div>
			</div>
		</>
	);
}
