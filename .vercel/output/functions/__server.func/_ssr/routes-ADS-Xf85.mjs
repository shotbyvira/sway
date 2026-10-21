import { o as __toESM } from "../_runtime.mjs";
import { U as isRedirect, b as require_jsx_runtime, q as require_react, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as findWord, c as otherSide, d as rankOf, f as scoreLabel, g as wordCount, h as traitDistance, i as emptyMemory, l as pointsFor, m as topN, o as initialScores, p as searchWords, r as applyPrompt, s as leadingGuess, t as CATEGORIES, u as randomWord } from "./rules-BN6M6ngA.mjs";
import { a as string, i as object, r as number, t as _enum } from "../_libs/zod.mjs";
import { a as RotateCcw, c as Copy, i as Search, l as ArrowRight, o as EyeOff, r as Timer, s as Dices, t as Trophy } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-ADS-Xf85.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function useServerFn(serverFn) {
	const router = useRouter();
	return import_react.useCallback(async (...args) => {
		try {
			const res = await serverFn(...args);
			if (isRedirect(res)) throw res;
			return res;
		} catch (err) {
			if (isRedirect(err)) {
				err.options._fromLocation = router.stores.location.get();
				return router.navigate(router.resolveRedirect(err).options);
			}
			throw err;
		}
	}, [router, serverFn]);
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var seatSchema = string().regex(/^[a-zA-Z0-9-]{8,64}$/);
var teamSchema = _enum(["amber", "tide"]);
var handleSchema = string().min(1).max(24);
var codeSchema = string().min(4).max(4);
var seatInput = object({
	playerId: seatSchema,
	handle: handleSchema,
	team: teamSchema
});
var createRoomFn = createServerFn({ method: "POST" }).validator(seatInput).handler(createSsrRpc("744a2dc11cf9209366cbcc6d5b8c65bf5e4dddb86a4fab8fd44dd34fb9e4c417"));
var joinRoomFn = createServerFn({ method: "POST" }).validator(seatInput.extend({ code: codeSchema })).handler(createSsrRpc("e6cb560bb39f1da4185f1e2f1def0ac5eb80464723dbf85b43a49fb17ed5ac6f"));
var syncRoomFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema
})).handler(createSsrRpc("1dd9208c0c921e22d516a74098a01cff9845ad73cf40f26c663cd3b5efdea9f0"));
var chooseTeamFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema,
	team: teamSchema
})).handler(createSsrRpc("0f9d0093aafbe05c6c7b911de3cc1ef5bc498b5bc8932af1840964fa776bff48"));
var setLobbyFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema,
	cycles: number().int().min(1).max(3).optional(),
	amberName: string().max(24).optional(),
	tideName: string().max(24).optional()
})).handler(createSsrRpc("244562d352734ea00df14216079edf889e90307b125ffefb28e8e6aae4fc2e8e"));
var startRoomFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema
})).handler(createSsrRpc("16ec007b4d37f508e1979a1464e89d9c207b1b15378988b224a6cf0d5af947d0"));
var lockWordFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema,
	wordId: string().min(1).max(64)
})).handler(createSsrRpc("89d3dd6d196c38f99c95e1cc4318861e553837f9cc1cef9aabbabbf2ca69604d"));
var feedPromptFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema,
	text: string().max(120)
})).handler(createSsrRpc("31d287e61fb64842b370739786f6c09d5b6956aed3ddb909922e0bb1b17a6138"));
var advanceRoomFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema
})).handler(createSsrRpc("d6b44cd8f5eed690c4894021d24b4ff5f06b4587ab084a29866c309b11b06f62"));
var rematchRoomFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema
})).handler(createSsrRpc("2d56ba24a4facf4f4d204e7b2469591ade9eae1b71ece9a188a0167a8ee73803"));
var leaveRoomFn = createServerFn({ method: "POST" }).validator(object({
	code: codeSchema,
	playerId: seatSchema
})).handler(createSsrRpc("cb2afaa8c62a6d82793661c62ceb712f81ab0eb4e4c11e947d00e92643db4ead"));
var SEAT_KEY = "sway.seat.v1";
var ROOM_KEY = "sway.room.v1";
var HANDLE_KEY = "sway.handle.v1";
var TEAM_KEY = "sway.team.v1";
function seatId() {
	if (typeof window === "undefined") return "00000000-0000-4000-8000-000000000001";
	try {
		const existing = localStorage.getItem(SEAT_KEY);
		if (existing && /^[a-zA-Z0-9-]{8,64}$/.test(existing)) return existing;
		const id = crypto.randomUUID();
		localStorage.setItem(SEAT_KEY, id);
		return id;
	} catch {
		return crypto.randomUUID();
	}
}
function rememberRoom(code) {
	if (typeof window === "undefined") return;
	try {
		if (code) sessionStorage.setItem(ROOM_KEY, code);
		else sessionStorage.removeItem(ROOM_KEY);
	} catch {}
}
function recalledRoom() {
	if (typeof window === "undefined") return null;
	try {
		const code = sessionStorage.getItem(ROOM_KEY);
		return code && /^[A-Z0-9]{4}$/.test(code) ? code : null;
	} catch {
		return null;
	}
}
function savedHandle() {
	if (typeof window === "undefined") return "";
	try {
		return localStorage.getItem(HANDLE_KEY) ?? "";
	} catch {
		return "";
	}
}
function saveHandle(handle) {
	try {
		localStorage.setItem(HANDLE_KEY, handle.slice(0, 16));
	} catch {}
}
function savedTeam() {
	if (typeof window === "undefined") return "amber";
	try {
		return localStorage.getItem(TEAM_KEY) === "tide" ? "tide" : "amber";
	} catch {
		return "amber";
	}
}
function saveTeam(team) {
	try {
		localStorage.setItem(TEAM_KEY, team);
	} catch {}
}
function formatClock$1(ms) {
	const total = Math.max(0, Math.ceil(ms / 1e3));
	return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}
function sideLabel(side, room) {
	return side === "amber" ? room.amberName : room.tideName;
}
function splitNote(players) {
	const amber = players.filter((player) => player.team === "amber").length;
	const tide = players.filter((player) => player.team === "tide").length;
	if (amber + tide < 2) return {
		ok: false,
		text: "Need at least two people."
	};
	if (amber === 0 || tide === 0) return {
		ok: false,
		text: "Both sides need someone."
	};
	if (Math.abs(amber - tide) > 1) return {
		ok: false,
		text: "Move someone over. Sides stay within one player."
	};
	return {
		ok: true,
		text: `${amber} against ${tide}. Anyone can start.`
	};
}
function blip$1(freq) {
	try {
		const Ctx = window.AudioContext || window.webkitAudioContext;
		const ctx = blip$1.ctx ?? new Ctx();
		blip$1.ctx = ctx;
		if (ctx.state === "suspended") ctx.resume();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.value = freq;
		gain.gain.value = .03;
		gain.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + .08);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + .08);
	} catch {}
}
function RoomPlay({ intent, onExit, onRegisterLeave }) {
	const createRoom = useServerFn(createRoomFn);
	const joinRoom = useServerFn(joinRoomFn);
	const syncRoom = useServerFn(syncRoomFn);
	const chooseTeam = useServerFn(chooseTeamFn);
	const setLobby = useServerFn(setLobbyFn);
	const startRoom = useServerFn(startRoomFn);
	const lockWord = useServerFn(lockWordFn);
	const feedPrompt = useServerFn(feedPromptFn);
	const advanceRoom = useServerFn(advanceRoomFn);
	const rematchRoom = useServerFn(rematchRoomFn);
	const leaveRoom = useServerFn(leaveRoomFn);
	const syncRef = (0, import_react.useRef)(syncRoom);
	const leaveRef = (0, import_react.useRef)(leaveRoom);
	syncRef.current = syncRoom;
	leaveRef.current = leaveRoom;
	const playerIdRef = (0, import_react.useRef)("");
	const codeRef = (0, import_react.useRef)(null);
	const amberFocus = (0, import_react.useRef)(false);
	const tideFocus = (0, import_react.useRef)(false);
	const closedRef = (0, import_react.useRef)(false);
	const [gate, setGate] = (0, import_react.useState)("form");
	const [room, setRoom] = (0, import_react.useState)(null);
	const [handle, setHandle] = (0, import_react.useState)("");
	const [team, setTeam] = (0, import_react.useState)("amber");
	const [codeText, setCodeText] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const pendingRef = (0, import_react.useRef)(false);
	const [pending, setPending] = (0, import_react.useState)(false);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const [tick, setTick] = (0, import_react.useState)(0);
	const [amberDraft, setAmberDraft] = (0, import_react.useState)("Amber");
	const [tideDraft, setTideDraft] = (0, import_react.useState)("Tide");
	const [query, setQuery] = (0, import_react.useState)("");
	const [category, setCategory] = (0, import_react.useState)("All");
	const [picked, setPicked] = (0, import_react.useState)(null);
	const [draft, setDraft] = (0, import_react.useState)("");
	codeRef.current = room?.code ?? codeRef.current;
	function take(next) {
		codeRef.current = next.code;
		rememberRoom(next.code);
		setRoom((prev) => {
			if (prev && prev.code === next.code && next.version < prev.version) return prev;
			return next;
		});
		setGate("form");
	}
	function apply(res) {
		if (!res.ok) {
			setError(res.error);
			if (res.error.includes("No room")) {
				rememberRoom(null);
				codeRef.current = null;
				setRoom(null);
				setGate("form");
			}
			return;
		}
		setError("");
		take(res.room);
	}
	function dropSeatLocal() {
		const code = codeRef.current;
		const playerId = playerIdRef.current;
		rememberRoom(null);
		codeRef.current = null;
		if (code && playerId) leaveRef.current({ data: {
			code,
			playerId
		} });
	}
	function exitRoom() {
		dropSeatLocal();
		onExit();
	}
	(0, import_react.useEffect)(() => {
		onRegisterLeave(dropSeatLocal);
		return () => onRegisterLeave(() => {});
	}, [onRegisterLeave]);
	(0, import_react.useEffect)(() => {
		const playerId = seatId();
		playerIdRef.current = playerId;
		setHandle(savedHandle());
		setTeam(savedTeam());
		const saved = recalledRoom();
		if (!saved) {
			setGate("form");
			return;
		}
		let stop = false;
		syncRef.current({ data: {
			code: saved,
			playerId
		} }).then((res) => {
			if (stop) return;
			if (res.ok && res.room.you) take(res.room);
			else {
				rememberRoom(null);
				setGate("form");
			}
		}).catch(() => {
			if (!stop) setGate("form");
		});
		return () => {
			stop = true;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (!room) return;
		const timer = setInterval(() => {
			const code = room.code;
			const playerId = playerIdRef.current;
			if (!code || !playerId) return;
			syncRef.current({ data: {
				code,
				playerId
			} }).then((res) => {
				if (!res.ok) {
					if (res.error.includes("No room")) {
						rememberRoom(null);
						codeRef.current = null;
						setRoom(null);
						setError("That room closed.");
					}
					return;
				}
				if (!res.room.you) {
					rememberRoom(null);
					codeRef.current = null;
					setRoom(null);
					setError("You left this room.");
					return;
				}
				take(res.room);
			}).catch(() => {});
		}, 1e3);
		return () => clearInterval(timer);
	}, [room?.code]);
	(0, import_react.useEffect)(() => {
		if (!amberFocus.current && room) setAmberDraft(room.amberName);
		if (!tideFocus.current && room) setTideDraft(room.tideName);
	}, [
		room?.amberName,
		room?.tideName,
		room
	]);
	(0, import_react.useEffect)(() => {
		if (room?.status !== "sway" || room.deadline == null) return;
		closedRef.current = false;
		let frame = 0;
		let last = -1;
		const loop = () => {
			const remain = Math.max(0, (room.deadline ?? 0) - Date.now());
			const shown = Math.ceil(remain / 1e3);
			if (shown !== last) {
				last = shown;
				setTick(shown);
			}
			if (remain <= 0) {
				if (!closedRef.current) {
					closedRef.current = true;
					syncRef.current({ data: {
						code: room.code,
						playerId: playerIdRef.current
					} }).then((res) => {
						if (res.ok) take(res.room);
					});
				}
				return;
			}
			frame = requestAnimationFrame(loop);
		};
		frame = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(frame);
	}, [
		room?.status,
		room?.deadline,
		room?.code
	]);
	async function run(task) {
		if (pendingRef.current) return;
		pendingRef.current = true;
		setPending(true);
		setError("");
		try {
			apply(await task());
		} catch {
			setError("Couldn't reach the room. Try again.");
		} finally {
			pendingRef.current = false;
			setPending(false);
		}
	}
	function enter() {
		const name = handle.trim();
		if (!name) {
			setError("Add a name so your team can see you.");
			return;
		}
		saveHandle(name);
		saveTeam(team);
		const playerId = playerIdRef.current || seatId();
		playerIdRef.current = playerId;
		if (intent === "join" && !room) {
			const code = codeText.toUpperCase();
			if (code.length !== 4) {
				setError("Room codes are four letters.");
				return;
			}
			run(() => joinRoom({ data: {
				code,
				playerId,
				handle: name,
				team
			} }));
			return;
		}
		run(() => createRoom({ data: {
			playerId,
			handle: name,
			team
		} }));
	}
	async function copyCode() {
		if (!room) return;
		try {
			await navigator.clipboard.writeText(room.code);
			setCopied(true);
		} catch {
			setCopied(false);
			setError("Couldn't copy. Read the code out loud.");
		}
	}
	function pushNames(next) {
		if (!room || room.status !== "lobby") return;
		run(() => setLobby({ data: {
			code: room.code,
			playerId: playerIdRef.current,
			cycles: next?.cycles ?? room.cycles,
			amberName: next?.amberName ?? amberDraft,
			tideName: next?.tideName ?? tideDraft
		} }));
	}
	const filtered = (0, import_react.useMemo)(() => {
		return searchWords(query).filter((word) => category === "All" || word.category === category).slice(0, 48);
	}, [query, category]);
	if (gate === "boot" && !room) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "Opening the room…"
	});
	if (!room) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rise flex flex-1 flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl leading-none",
				children: intent === "join" ? "Join a room" : "Make a room"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm leading-relaxed text-muted",
				children: intent === "join" ? "Same code, your own phone. You'll type at the same time as the rest of your side." : "You'll get a four-letter code. Everyone else joins from their own phone."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mt-6 block",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs tracking-widest text-muted uppercase",
					children: "Your name"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: handle,
					maxLength: 16,
					autoComplete: "nickname",
					onChange: (e) => setHandle(e.target.value),
					placeholder: "Maya",
					className: "mt-1 w-full min-h-12 rounded-lg border border-line bg-surface px-3 text-fg outline-none focus:border-amber"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-xs tracking-widest text-muted uppercase",
				children: "Start on"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 grid grid-cols-2 gap-2",
				children: ["amber", "tide"].map((side) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setTeam(side),
					className: "min-h-12 rounded-lg border font-medium " + (team === side ? side === "amber" ? "border-amber bg-amber text-amber-ink" : "border-tide bg-tide text-tide-ink" : "border-line bg-surface text-fg"),
					children: side === "amber" ? "Amber" : "Tide"
				}, side))
			}),
			intent === "join" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mt-4 block",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs tracking-widest text-muted uppercase",
					children: "Room code"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: codeText,
					maxLength: 4,
					autoCapitalize: "characters",
					autoCorrect: "off",
					spellCheck: false,
					onChange: (e) => setCodeText(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4)),
					placeholder: "K7MQ",
					className: "mt-1 w-full min-h-14 rounded-lg border border-line bg-surface text-center font-display text-3xl tracking-[0.28em] text-fg uppercase outline-none focus:border-amber"
				})]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-sm text-heat",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				disabled: pending,
				onClick: enter,
				className: "mt-6 flex min-h-12 items-center justify-between rounded-lg bg-amber px-4 py-3 font-medium text-amber-ink disabled:opacity-40",
				children: [intent === "join" ? "Join" : "Open the room", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, {
					className: "size-5",
					"aria-hidden": "true"
				})]
			})
		]
	});
	const you = room.you;
	const note = splitNote(room.players);
	const setterName = sideLabel(room.setter, room);
	const swayerName = sideLabel(room.swayer, room);
	const leftMs = room.status === "sway" && room.deadline != null ? Math.max(0, room.deadline - Date.now()) : 0;
	const planting = you?.team === room.setter;
	const swaying = you?.team === room.swayer;
	const mine = you?.used ?? 0;
	const swayers = room.players.filter((player) => player.team === room.swayer);
	const result = room.results.find((row) => row.cycle === room.cycle && row.half === room.half);
	const amberPoints = room.results.filter((row) => row.swayer === "amber").reduce((sum, row) => sum + row.points, 0);
	const tidePoints = room.results.filter((row) => row.swayer === "tide").reduce((sum, row) => sum + row.points, 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-1 flex-col",
		children: [
			room.status === "lobby" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rise flex flex-1 flex-col",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs tracking-widest text-muted uppercase",
						children: "Room"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1 flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-5xl tracking-[0.18em]",
							children: room.code
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => void copyCode(),
							className: "inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {
								className: "size-4",
								"aria-hidden": "true"
							}), copied ? "Copied" : "Copy"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: "Share the code. Everyone joins on their own phone and plays at once."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TeamColumn, {
							tone: "amber",
							name: amberDraft,
							editable: true,
							youId: you?.id ?? "",
							players: room.players.filter((player) => player.team === "amber"),
							onFocus: () => {
								amberFocus.current = true;
							},
							onChange: setAmberDraft,
							onBlur: () => {
								amberFocus.current = false;
								pushNames({ amberName: amberDraft });
							}
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TeamColumn, {
							tone: "tide",
							name: tideDraft,
							editable: true,
							youId: you?.id ?? "",
							players: room.players.filter((player) => player.team === "tide"),
							onFocus: () => {
								tideFocus.current = true;
							},
							onChange: setTideDraft,
							onBlur: () => {
								tideFocus.current = false;
								pushNames({ tideName: tideDraft });
							}
						})]
					}),
					you && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						disabled: pending,
						onClick: () => void run(() => chooseTeam({ data: {
							code: room.code,
							playerId: playerIdRef.current,
							team: otherSide(you.team)
						} })),
						className: "mt-3 min-h-11 rounded-lg border border-line bg-surface text-sm text-fg disabled:opacity-40",
						children: ["Switch to ", sideLabel(otherSide(you.team), room)]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-xs tracking-widest text-muted uppercase",
						children: "Swaps"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 grid grid-cols-3 gap-2",
						children: [
							1,
							2,
							3
						].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: pending,
							onClick: () => pushNames({ cycles: n }),
							className: "min-h-12 rounded-lg border text-sm " + (room.cycles === n ? "border-fg bg-fg text-bg" : "border-line bg-surface text-fg"),
							children: n === 1 ? "One each" : `${n} each`
						}, n))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-sm text-muted",
						children: [note.text, " Each swayer owes 20 prompts inside one five-minute clock."]
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-heat",
						children: error
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						disabled: pending || !note.ok,
						onClick: () => void run(async () => {
							await setLobby({ data: {
								code: room.code,
								playerId: playerIdRef.current,
								cycles: room.cycles,
								amberName: amberDraft,
								tideName: tideDraft
							} });
							return startRoom({ data: {
								code: room.code,
								playerId: playerIdRef.current
							} });
						}),
						className: "mt-4 flex min-h-12 items-center justify-between rounded-lg bg-amber px-4 py-3 font-medium text-amber-ink disabled:opacity-40",
						children: [
							amberDraft.trim() || room.amberName,
							" plants first",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, {
								className: "size-5",
								"aria-hidden": "true"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: exitRoom,
						className: "mt-3 min-h-11 text-sm text-muted",
						children: "Leave room"
					})
				]
			}),
			room.status === "plant" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rise flex flex-1 flex-col",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs tracking-widest text-muted uppercase",
					children: [
						"Room ",
						room.code,
						" · swap ",
						room.cycle,
						" of ",
						room.cycles
					]
				}), planting ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-2 font-display text-4xl leading-none",
						children: "Pick a secret"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-sm text-muted",
						children: [
							swayerName,
							" sees it the moment it's locked. Anyone on ",
							setterName,
							" can lock — the first one starts the clock."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative mt-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							className: "pointer-events-none absolute top-3.5 left-3 size-4 text-muted",
							"aria-hidden": "true"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: query,
							onChange: (e) => setQuery(e.target.value),
							placeholder: "Search the bank",
							className: "w-full min-h-12 rounded-lg border border-line bg-surface pr-3 pl-10 text-fg outline-none focus:border-amber"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 flex gap-2 overflow-x-auto pb-1",
						children: ["All", ...CATEGORIES].map((cat) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setCategory(cat),
							className: "min-h-10 shrink-0 rounded-full border px-3 text-sm " + (category === cat ? "border-fg bg-fg text-bg" : "border-line bg-surface text-muted"),
							children: cat
						}, cat))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 grid max-h-[42dvh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3",
						children: filtered.map((word) => {
							const on = picked?.id === word.id;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setPicked(word),
								className: "min-h-12 rounded-lg border px-3 py-2 text-left text-sm " + (on ? "border-amber bg-amber text-amber-ink" : "border-line bg-surface text-fg"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block font-medium",
									children: word.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs " + (on ? "text-amber-ink/70" : "text-muted"),
									children: word.category
								})]
							}, word.id);
						})
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-heat",
						children: error
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setPicked(randomWord(picked?.id)),
							className: "min-h-12 rounded-lg border border-line bg-surface px-4 text-sm",
							children: "Surprise"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							disabled: !picked || pending,
							onClick: () => picked && void run(() => lockWord({ data: {
								code: room.code,
								playerId: playerIdRef.current,
								wordId: picked.id
							} })),
							className: "min-h-12 flex-1 rounded-lg bg-amber px-4 font-medium text-amber-ink disabled:opacity-40",
							children: ["Lock ", picked ? picked.name : "a word"]
						})]
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, {
						className: "mt-4 size-8 text-muted",
						"aria-hidden": "true"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
						className: "mt-4 font-display text-4xl leading-[1.05]",
						children: [setterName, " is planting."]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-sm leading-relaxed text-muted",
						children: [
							"Stay on this screen. The word shows up here when they lock it. Then everyone on ",
							swayerName,
							" types at the same time — 20 prompts each, one five-minute clock."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4 space-y-1 text-sm text-muted",
						children: room.players.filter((player) => player.team === room.setter).map((player) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [player.handle, player.id === you?.id ? " · you" : ""] }, player.id))
					})
				] })]
			}),
			room.status === "sway" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rise flex flex-1 flex-col",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs tracking-widest text-muted uppercase",
								children: [
									swayerName,
									" sways · ",
									room.cycle,
									"/",
									room.cycles
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-fg",
								children: swaying ? `Yours ${Math.min(mine, room.perPlayer)}/${room.perPlayer}` : "You're watching"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted",
								children: ["Room ", room.code]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "w-24",
							"aria-label": `${formatClock$1(leftMs)} left`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-right font-medium tabular-nums " + (leftMs <= 6e4 ? "text-heat" : "text-amber"),
								children: formatClock$1(leftMs)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "h-full " + (leftMs <= 6e4 ? "bg-heat" : "bg-amber"),
									style: { width: `${Math.max(0, Math.min(100, leftMs / 3e5 * 100))}%` }
								})
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 rounded-lg border px-4 py-3 " + ((room.secretRank ?? 99) <= 8 ? "border-heat bg-heat-ink" : "border-line bg-surface"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs tracking-widest text-muted uppercase",
							children: "Secret to bury"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1 flex items-end justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-4xl leading-none",
								children: room.secret?.name ?? "…"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-right text-sm " + ((room.secretRank ?? 99) <= 8 ? "text-heat" : "text-tide"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "block font-medium tabular-nums",
									children: ["#", room.secretRank ?? "—"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-xs text-muted",
									children: ["of ", wordCount()]
								})]
							})]
						})]
					}),
					swaying && mine < room.perPlayer && leftMs > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "mt-3 flex gap-2",
						onSubmit: (e) => {
							e.preventDefault();
							const text = draft.trim();
							if (!text || pendingRef.current) return;
							blip$1(360);
							run(async () => {
								const res = await feedPrompt({ data: {
									code: room.code,
									playerId: playerIdRef.current,
									text
								} });
								if (res.ok) setDraft("");
								return res;
							});
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: draft,
							maxLength: 80,
							onChange: (e) => setDraft(e.target.value),
							placeholder: "One trait or name",
							"aria-label": "Prompt for the engine",
							className: "min-h-12 flex-1 rounded-lg border border-line bg-surface px-3 text-fg outline-none focus:border-amber"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							disabled: !draft.trim() || pending,
							className: "min-h-12 rounded-lg bg-amber px-4 font-medium text-amber-ink disabled:opacity-40",
							children: "Feed"
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-muted",
						children: swaying ? "You're done. The clock stays up until your side finishes or time runs out." : `${swayerName} is feeding the machine. You can't send from this side.`
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-heat",
						children: error
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 flex items-center gap-1 text-xs text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, {
								className: "size-3.5",
								"aria-hidden": "true"
							}),
							"Everyone on ",
							swayerName,
							" types at once."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4 space-y-1",
						children: swayers.map((player) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center justify-between text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: player.id === you?.id ? "text-fg" : "text-muted",
								children: [player.handle, player.id === you?.id ? " · you" : ""]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "tabular-nums text-fg",
								children: [
									player.used,
									"/",
									room.perPlayer
								]
							})]
						}, player.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
						className: "mt-4 space-y-2",
						children: room.board.map((row, index) => {
							const isSecret = row.id === room.secret?.id;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "rounded-lg bg-surface-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex min-h-11 items-center px-3 text-sm",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: isSecret ? "font-medium text-heat" : "text-fg",
										children: [
											index + 1,
											". ",
											row.name,
											isSecret && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "ml-2 text-xs font-normal text-heat",
												children: "secret"
											})
										]
									})
								})
							}, row.id);
						})
					}),
					room.prompts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4 flex max-h-32 flex-wrap gap-2 overflow-y-auto",
						children: room.prompts.map((line, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-fg",
									children: line.handle
								}),
								" · ",
								line.shrug ? "shrugged" : line.text,
								line.resisted && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-1 text-heat",
									children: "held"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "ml-1 text-fg",
									children: ["#", line.rank]
								})
							]
						}, `${line.handle}-${index}-${line.text}`))
					})
				]
			}),
			room.status === "reveal" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rise flex flex-1 flex-col",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs tracking-widest text-muted uppercase",
						children: [swayerName, " swayed"]
					}),
					result ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-2 font-display text-5xl leading-none",
							children: result.points
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-lg",
							children: scoreLabel(result.points)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 grid grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-lg border border-line bg-surface p-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs tracking-widest text-muted uppercase",
										children: "Secret"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 font-display text-2xl leading-tight",
										children: result.secretName
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-sm text-muted",
										children: ["finished #", result.rank]
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-lg border p-3 " + (result.guessName === result.secretName ? "border-heat bg-heat-ink" : "border-tide bg-tide-ink"),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs tracking-widest text-muted uppercase",
										children: "Machine said"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 font-display text-2xl leading-tight",
										children: result.guessName
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-sm text-muted",
										children: [Math.round(result.distance * 100), "% unlike"]
									})
								]
							})]
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-2 font-display text-4xl leading-none",
						children: "Reading the board…"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4 max-h-28 space-y-1 overflow-y-auto text-sm text-muted",
						children: [...room.prompts].reverse().map((line, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "truncate",
								children: [
									line.handle,
									": ",
									line.shrug ? "shrugged" : line.text
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "shrink-0 tabular-nums text-fg",
								children: ["#", line.rank]
							})]
						}, `${line.text}-${index}`))
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-heat",
						children: error
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						disabled: pending,
						onClick: () => void run(() => advanceRoom({ data: {
							code: room.code,
							playerId: playerIdRef.current
						} })),
						className: "mt-auto flex min-h-12 items-center justify-between rounded-lg bg-fg px-4 py-3 font-medium text-bg disabled:opacity-40",
						children: [room.half === 1 && room.cycle >= room.cycles ? "See the table" : "Next plant", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, {
							className: "size-5",
							"aria-hidden": "true"
						})]
					})
				]
			}),
			room.status === "match" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rise flex flex-1 flex-col",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trophy, {
						className: "size-8 text-amber",
						"aria-hidden": "true"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-3 font-display text-5xl leading-none",
						children: amberPoints === tidePoints ? "Draw" : amberPoints > tidePoints ? room.amberName : room.tideName
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-muted",
						children: amberPoints === tidePoints ? "Neither side dragged harder." : "Furthest drift takes the table."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScoreTile, {
							name: room.amberName,
							points: amberPoints,
							tone: "amber"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScoreTile, {
							name: room.tideName,
							points: tidePoints,
							tone: "tide"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-4 space-y-2",
						children: room.results.map((row, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "rounded-lg border border-line bg-surface px-3 py-2 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-muted",
									children: [sideLabel(row.swayer, room), " buried "]
								}),
								row.secretName,
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-muted",
									children: [" → ", row.guessName]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "float-right font-medium tabular-nums",
									children: row.points
								})
							]
						}, index))
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-heat",
						children: error
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-auto flex gap-2 pt-6",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: exitRoom,
							className: "min-h-12 rounded-lg border border-line px-4 text-sm",
							children: "Home"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							disabled: pending,
							onClick: () => void run(() => rematchRoom({ data: {
								code: room.code,
								playerId: playerIdRef.current
							} })),
							className: "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-amber font-medium text-amber-ink disabled:opacity-40",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, {
								className: "size-4",
								"aria-hidden": "true"
							}), "Rematch"]
						})]
					})
				]
			})
		]
	});
}
function TeamColumn({ tone, name, editable, players, youId, onFocus, onChange, onBlur }) {
	const tide = tone === "tide";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border p-3 " + (tide ? "border-tide/40" : "border-amber/40"),
		children: [editable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			value: name,
			maxLength: 16,
			"aria-label": tide ? "Tide team name" : "Amber team name",
			onFocus,
			onChange: (e) => onChange(e.target.value),
			onBlur,
			className: "w-full bg-transparent font-medium outline-none " + (tide ? "text-tide" : "text-amber")
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-medium " + (tide ? "text-tide" : "text-amber"),
			children: name
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
			className: "mt-2 space-y-1 text-sm",
			children: [players.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
				className: "text-muted",
				children: "Waiting"
			}), players.map((player) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "truncate",
				children: [player.handle, player.id === youId ? " · you" : ""]
			}, player.id))]
		})]
	});
}
function ScoreTile({ name, points, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg p-4 " + (tone === "amber" ? "bg-amber text-amber-ink" : "bg-tide text-tide-ink"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs tracking-widest uppercase opacity-70",
			children: name
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-4xl leading-none",
			children: points
		})]
	});
}
var CLOCK_MS = 3e5;
var PER_PLAYER = 20;
var BEST_KEY = "sway.best.v1";
function sideName(side, amber, tide) {
	return side === "amber" ? amber : tide;
}
function blip(freq, dur = .09) {
	try {
		const Ctx = window.AudioContext || window.webkitAudioContext;
		const ctx = blip.ctx ?? new Ctx();
		blip.ctx = ctx;
		if (ctx.state === "suspended") ctx.resume();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.value = freq;
		gain.gain.value = .035;
		gain.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + dur);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + dur);
	} catch {}
}
function SwayApp() {
	const [phase, setPhase] = (0, import_react.useState)("home");
	const [roomIntent, setRoomIntent] = (0, import_react.useState)("make");
	const [rulesOpen, setRulesOpen] = (0, import_react.useState)(false);
	const [results, setResults] = (0, import_react.useState)([]);
	const [secretId, setSecretId] = (0, import_react.useState)(null);
	const [scores, setScores] = (0, import_react.useState)(() => initialScores());
	const [step, setStep] = (0, import_react.useState)(0);
	const [draft, setDraft] = (0, import_react.useState)("");
	const [logs, setLogs] = (0, import_react.useState)([]);
	const [leftMs, setLeftMs] = (0, import_react.useState)(CLOCK_MS);
	const [best, setBest] = (0, import_react.useState)(null);
	const deadlineRef = (0, import_react.useRef)(0);
	const memoryRef = (0, import_react.useRef)(emptyMemory());
	const draftRef = (0, import_react.useRef)("");
	const lockRef = (0, import_react.useRef)(false);
	const submitRef = (0, import_react.useRef)(() => {});
	const leaveRef = (0, import_react.useRef)(() => {});
	draftRef.current = draft;
	(0, import_react.useEffect)(() => {
		try {
			const raw = localStorage.getItem(BEST_KEY);
			if (raw) setBest(Number(raw));
		} catch {}
		if (recalledRoom()) {
			setRoomIntent("join");
			setPhase("room");
		}
	}, []);
	const secret = secretId ? findWord(secretId) : void 0;
	const board = (0, import_react.useMemo)(() => secretId ? topN(scores, 5) : [], [scores, secretId]);
	const secretRank = secretId ? rankOf(scores, secretId) : wordCount();
	function rememberBest(points) {
		setBest((prev) => {
			const next = prev == null ? points : Math.max(prev, points);
			try {
				localStorage.setItem(BEST_KEY, String(next));
			} catch {}
			return next;
		});
	}
	function openSway(id) {
		memoryRef.current = emptyMemory();
		lockRef.current = false;
		const seeded = initialScores();
		seeded.set(id, (seeded.get(id) ?? 0) + 2.4);
		deadlineRef.current = performance.now() + CLOCK_MS;
		setSecretId(id);
		setScores(seeded);
		setStep(0);
		setLogs([]);
		setDraft("");
		setLeftMs(CLOCK_MS);
		setPhase("sway");
	}
	function finishHalf(finalScores, finalLogs) {
		if (!secret) return;
		const guess = leadingGuess(finalScores);
		const rank = rankOf(finalScores, secret.id);
		const distance = traitDistance(secret.id, guess.id);
		const points = pointsFor(rank, distance, guess.id, secret.id);
		const result = {
			setter: "amber",
			swayer: "tide",
			secretId: secret.id,
			secretName: secret.name,
			prompts: finalLogs.map((line) => line.text),
			guessId: guess.id,
			guessName: guess.name,
			rank,
			distance,
			points,
			trace: finalLogs.map((line) => line.rank)
		};
		blip(points >= 70 ? 520 : 220, .16);
		rememberBest(points);
		setResults([result]);
		setPhase("drill-reveal");
	}
	function pushPrompt(reason) {
		if (lockRef.current || !secretId || phase !== "sway") return;
		if (reason === "timeout") {
			lockRef.current = true;
			finishHalf(scores, logs);
			return;
		}
		const text = draftRef.current.trim().slice(0, 80);
		if (!text) return;
		lockRef.current = true;
		const applied = applyPrompt(scores, text, memoryRef.current, secretId);
		const rank = rankOf(applied.scores, secretId);
		const line = {
			text,
			shrug: applied.shrug,
			resisted: applied.resisted,
			rank
		};
		const nextLogs = [...logs, line];
		const nextStep = step + 1;
		setScores(applied.scores);
		setLogs(nextLogs);
		setDraft("");
		setStep(nextStep);
		blip(applied.resisted ? 180 : applied.shrug ? 140 : 360, .06);
		if (nextStep >= PER_PLAYER) {
			finishHalf(applied.scores, nextLogs);
			return;
		}
		lockRef.current = false;
	}
	submitRef.current = pushPrompt;
	(0, import_react.useEffect)(() => {
		if (phase !== "sway") return;
		let frame = 0;
		let lastShown = -1;
		const tick = (now) => {
			const remain = Math.max(0, deadlineRef.current - now);
			const shown = Math.ceil(remain / 1e3);
			if (shown !== lastShown) {
				lastShown = shown;
				setLeftMs(remain);
			}
			if (remain <= 0) {
				submitRef.current("timeout");
				return;
			}
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [phase]);
	function startDrill() {
		const word = randomWord();
		setResults([]);
		openSway(word.id);
	}
	function goHome() {
		leaveRef.current();
		leaveRef.current = () => {};
		setPhase("home");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-6 sm:px-6 sm:py-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-6 flex items-baseline justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: goHome,
					className: "text-left",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs tracking-[0.22em] text-muted uppercase",
						children: "Party engine"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-3xl leading-none text-fg",
						children: "Sway"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-right text-xs text-muted",
					children: [
						wordCount(),
						" words",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
						best != null ? `Drill best ${best}` : "20 each · 5 min"
					]
				})]
			}),
			phase === "home" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rise flex flex-1 flex-col",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-4xl leading-[1.05] text-fg sm:text-5xl",
						children: "Drag the machine off the word."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 max-w-md text-base leading-relaxed text-muted",
						children: "Open a room and share the code. Both teams join from their own phones and type at the same time. One side plants a secret. The other has five minutes, twenty prompts each, to drag the machine off it."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-8 flex flex-col gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => {
									setRoomIntent("make");
									setPhase("room");
								},
								className: "flex min-h-12 items-center justify-between rounded-lg bg-amber px-4 py-3 text-left font-medium text-amber-ink",
								children: ["Make a room", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, {
									className: "size-5",
									"aria-hidden": "true"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => {
									setRoomIntent("join");
									setPhase("room");
								},
								className: "flex min-h-12 items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-left font-medium text-fg",
								children: ["Join a room", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, {
									className: "size-5 text-tide",
									"aria-hidden": "true"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: startDrill,
								className: "flex min-h-12 items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-left font-medium text-fg",
								children: ["Solo drill", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dices, {
									className: "size-5 text-tide",
									"aria-hidden": "true"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setRulesOpen((v) => !v),
								className: "min-h-11 text-left text-sm text-muted underline-offset-4 hover:underline",
								children: rulesOpen ? "Hide how the machine thinks" : "How the machine thinks"
							})
						]
					}),
					rulesOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rise mt-4 rounded-lg border border-line bg-surface p-4 text-sm leading-relaxed text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Every word in the bank sits on a grid of traits — alive, metal, flies, sweet — the same shape as the old 20Q neural net, which kept a weight between each object and each question." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3",
							children: "A prompt is a claim. Traits that fit the secret feed it. A lie is doubted, and the machine hauls its word back. The grip is strong at first — scattershot opposites bounce. Stay on one distant theme and the grip tires."
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HowToPlay, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScoringGuide, { total: wordCount() })
				]
			}),
			phase === "room" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoomPlay, {
				intent: roomIntent,
				onExit: goHome,
				onRegisterLeave: (leave) => {
					leaveRef.current = leave;
				}
			}),
			phase === "sway" && secret && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwayTurn, {
				secretName: secret.name,
				secretRank,
				step,
				budget: PER_PLAYER,
				perPlayer: PER_PLAYER,
				seat: 1,
				seats: 1,
				leftMs,
				clockMs: CLOCK_MS,
				draft,
				setDraft,
				logs,
				board,
				onSubmit: pushPrompt,
				label: "Drill"
			}),
			phase === "drill-reveal" && results.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Reveal, {
				result: results[results.length - 1],
				amberName: "Amber",
				tideName: "Tide",
				drill: true,
				onNext: () => setPhase("home"),
				nextLabel: "Back"
			})
		]
	});
}
var PLAY_STEPS = [
	"Make a room and share the four-letter code. Friends join from their own phones. Two teams, 2 to 29 people, sides within one player of each other.",
	"Amber plants a secret from the bank. Only Amber sees the picker. Tide waits on their own screens.",
	"The word unlocks for Tide. Everyone on Tide types at the same time. Each person owes 20 prompts. One shared five-minute clock.",
	"Feed a short claim: a trait, a name, or a sentence. The machine already knows the secret and fights to keep it. Stay on one distant theme. Random opposites bounce.",
	"When everyone has sent 20, or the clock hits zero, the machine names its guess. Points are how far the secret fell.",
	"Swap sides. Play one, two, or three plants each. Highest total wins. Solo drill is the same fight, alone, best score kept on this device."
];
var SCORE_BANDS = [
	{
		where: "Still the top answer",
		points: "0"
	},
	{
		where: "Finishes 2nd–5th",
		points: "20"
	},
	{
		where: "Finishes 6th–20th",
		points: "50"
	},
	{
		where: "Finishes 21st–100th",
		points: "80"
	},
	{
		where: "Deeper than 100th",
		points: "100"
	}
];
function HowToPlay() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-8 rounded-lg border border-line bg-surface p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-2xl leading-none text-fg",
			children: "How to play"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
			className: "mt-4 space-y-3",
			children: PLAY_STEPS.map((step, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex gap-3 text-sm leading-relaxed text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "w-4 shrink-0 font-display text-lg leading-none text-amber",
					children: index + 1
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: step })]
			}, index))
		})]
	});
}
function ScoringGuide({ total }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-3 rounded-lg border border-line bg-surface p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl leading-none text-fg",
				children: "Scoring"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 text-sm leading-relaxed text-muted",
				children: [
					"When the sway ends, the machine names one guess. Your points depend on where the secret still sits in its list of ",
					total,
					" words. Rank 1 means it never left the top."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-4",
				children: SCORE_BANDS.map((band) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-baseline justify-between gap-3 border-t border-line py-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted",
						children: band.where
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-medium tabular-nums text-fg",
						children: band.points
					})]
				}, band.where))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm leading-relaxed text-muted",
				children: "Add up to 20 more when that guess shares almost no traits with the secret. 120 is the ceiling. The card then calls it held, a nudge, real drift, buried, or lost in the dark."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm leading-relaxed text-muted",
				children: "Each plant scores on its own. Add them up. The higher sway total wins the table."
			})
		]
	});
}
function formatClock(ms) {
	const total = Math.max(0, Math.ceil(ms / 1e3));
	return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}
function SwayTurn({ secretName, secretRank, step, budget, perPlayer, seat, seats, leftMs, clockMs, draft, setDraft, logs, board, onSubmit, label }) {
	const ratio = leftMs / clockMs;
	const close = secretRank <= 8;
	const urgent = leftMs <= 6e4;
	const hi = board[0]?.score ?? 1;
	const lo = board[board.length - 1]?.score ?? 0;
	const mine = Math.floor(step / seats) + 1;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rise flex flex-1 flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs tracking-widest text-muted uppercase",
						children: label
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-fg",
						children: [
							"Player ",
							seat,
							" of ",
							seats,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-muted",
								children: [
									" · yours ",
									Math.min(mine, perPlayer),
									"/",
									perPlayer
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: [
							"Prompt ",
							Math.min(step + 1, budget),
							" of ",
							budget
						]
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-24",
					"aria-label": `${formatClock(leftMs)} left`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-right font-medium tabular-nums " + (urgent ? "text-heat" : "text-amber"),
						children: formatClock(leftMs)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full " + (urgent ? "bg-heat" : "bg-amber"),
							style: { width: `${Math.max(0, Math.min(100, ratio * 100))}%` }
						})
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 rounded-lg border px-4 py-3 " + (close ? "border-heat bg-heat-ink" : "border-line bg-surface"),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs tracking-widest text-muted uppercase",
						children: "Secret to bury"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1 flex items-end justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-4xl leading-none",
							children: secretName
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-right text-sm " + (close ? "text-heat" : "text-tide"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "block font-medium tabular-nums",
								children: ["#", secretRank]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-xs text-muted",
								children: ["of ", wordCount()]
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-muted",
						children: close ? "Still gripping. Blunt lies bounce. Commit to one distant theme." : "The grip is tiring. Stay on that theme — don't wander back."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "mt-3 flex gap-2",
				onSubmit: (e) => {
					e.preventDefault();
					onSubmit();
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: draft,
					autoFocus: true,
					maxLength: 80,
					onChange: (e) => setDraft(e.target.value),
					placeholder: `Player ${seat}: one trait or name`,
					"aria-label": "Prompt for the engine",
					className: "min-h-12 flex-1 rounded-lg border border-line bg-surface px-3 text-fg outline-none focus:border-amber"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: !draft.trim(),
					className: "min-h-12 rounded-lg bg-amber px-4 font-medium text-amber-ink disabled:opacity-40",
					children: "Feed"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 flex items-center gap-1 text-xs text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, {
					className: "size-3.5",
					"aria-hidden": "true"
				}), "One clock for the side. Time up locks the guess."]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "mt-4 space-y-2",
				children: board.map((row, index) => {
					const span = hi - lo || 1;
					const width = 16 + (row.score - lo) / span * 84;
					const isSecret = row.name === secretName;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "relative",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "absolute inset-y-0 left-0 rounded-lg " + (isSecret ? "bg-heat/25" : "bg-surface-2"),
							style: { width: `${width}%` }
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "relative flex min-h-11 items-center justify-between px-3 text-sm",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: isSecret ? "font-medium text-heat" : "text-fg",
								children: [
									index + 1,
									". ",
									row.name,
									isSecret && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ml-2 text-xs font-normal text-heat",
										children: "secret"
									})
								]
							})
						})]
					}, row.id);
				})
			}),
			logs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-4 flex max-h-28 flex-wrap gap-2 overflow-y-auto",
				children: logs.map((line, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted",
					children: [
						line.shrug ? "shrugged" : line.text,
						line.resisted && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-1 text-heat",
							children: "held"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "ml-1 text-fg",
							children: ["#", line.rank]
						})
					]
				}, i))
			})
		]
	});
}
function Reveal({ result, amberName, tideName, drill, onNext, nextLabel }) {
	const held = result.guessId === result.secretId;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rise flex flex-1 flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs tracking-widest text-muted uppercase",
				children: drill ? "Drill" : `${sideName(result.swayer, amberName, tideName)} swayed`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 font-display text-5xl leading-none",
				children: result.points
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-lg text-fg",
				children: scoreLabel(result.points)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 grid grid-cols-2 gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-lg border border-line bg-surface p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs tracking-widest text-muted uppercase",
							children: "Secret"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 font-display text-2xl leading-tight",
							children: result.secretName
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-sm text-muted",
							children: ["finished #", result.rank]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-lg border p-3 " + (held ? "border-heat bg-heat-ink" : "border-tide bg-tide-ink"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs tracking-widest text-muted uppercase",
							children: "Machine said"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 font-display text-2xl leading-tight",
							children: result.guessName
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-sm text-muted",
							children: [Math.round(result.distance * 100), "% unlike"]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-between text-xs text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Same traits" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Nothing in common" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-1 h-2 overflow-hidden rounded-full bg-surface-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-full bg-amber",
						style: { width: `${Math.round(result.distance * 100)}%` }
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "mt-4 max-h-48 space-y-1 overflow-y-auto text-sm text-muted",
				children: result.prompts.map((prompt, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "truncate",
						children: prompt === "—" ? "silence" : prompt
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "shrink-0 tabular-nums text-fg",
						children: ["#", result.trace[i]]
					})]
				}, i))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: onNext,
				className: "mt-auto flex min-h-12 items-center justify-between rounded-lg bg-fg px-4 py-3 font-medium text-bg",
				children: [nextLabel, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, {
					className: "size-5",
					"aria-hidden": "true"
				})]
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwayApp, {});
}
//#endregion
export { Home as component };
