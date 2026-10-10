/**
 * Host half of the token saver bundle: the peak-hour guard.
 *
 * The browser half shows what a request costs; this half is what actually
 * refuses to spend it. Every model request proposed by any agent in this
 * profile — the GUI session, its subagents, workflow children, and any other
 * client — passes through the `agent/pre-step` waterfall, so returning
 * `{ kind: 'reject' }` there ends that turn before the request is made. A turn
 * that is already running therefore finishes the step it is in (its tools
 * complete; nothing is torn mid-write) and stops at the next step boundary,
 * which is the interruption the settings page promises.
 *
 * A rejection ends the turn as `blocked` and discards the messages that step
 * had claimed, so the browser half warns before a send instead of relying on
 * this refusal to preserve text.
 *
 * The provider bills Chinese public holidays at off-peak rates and this
 * schedule does not know them, so a holiday is refused here until the user
 * grants an override. `/peak-allow`, `/peak-block`, and `/peak-guard` are the
 * user's authority over that, and they are commands (not tools) so the agent
 * can never grant itself an override.
 *
 * The schedule below is duplicated verbatim in `./client.js` so the browser can
 * price and display the same windows without a round trip; `test/pricing.test
 * .mjs` asserts that the two copies agree on every instant.
 */

// #region peak-schedule

/** Peak windows as UTC minutes after midnight, Monday through Friday. */
const PEAK_WINDOWS = [
	[60, 240],
	[360, 600],
];

/** Every minute of a weekday at which the rate class can flip. */
const PEAK_EDGES = [60, 240, 360, 600];

/** One UTC day in milliseconds. */
const DAY_MS = 86400000;

/**
 * Whether one UTC weekday minute falls in a peak window.
 * @param dow - UTC day of week, 0 for Sunday.
 * @param minute - minutes after UTC midnight.
 * @returns true when the provider bills that minute at peak rates.
 */
function isPeakMinute(dow, minute) {
	if (dow === 0 || dow === 6) return false;
	for (const window of PEAK_WINDOWS) {
		if (minute >= window[0] && minute < window[1]) return true;
	}
	return false;
}

/**
 * Whether one instant is billed at peak rates.
 * @param ms - epoch milliseconds.
 * @returns true when that instant is peak.
 */
function isPeakInstant(ms) {
	const date = new Date(ms);
	return isPeakMinute(date.getUTCDay(), date.getUTCHours() * 60 + date.getUTCMinutes());
}

/**
 * The rate class in effect and how long it still lasts.
 * @param nowMs - epoch milliseconds.
 * @returns the active class and milliseconds until the next change.
 */
function peakStatus(nowMs) {
	const peak = isPeakInstant(nowMs);
	const midnight = Math.floor(nowMs / DAY_MS) * DAY_MS;
	for (let day = 0; day <= 8; day += 1) {
		const dayStart = midnight + day * DAY_MS;
		const dow = new Date(dayStart).getUTCDay();
		if (dow === 0 || dow === 6) continue;
		for (const edge of PEAK_EDGES) {
			const instant = dayStart + edge * 60000;
			if (instant <= nowMs) continue;
			if (isPeakInstant(instant) !== peak) return { peak, untilMs: instant - nowMs };
		}
	}
	return { peak, untilMs: Number.POSITIVE_INFINITY };
}

/**
 * Time until a rate-class change: 2d 15h, 7h 22m, 42m, 38s.
 * @param ms - milliseconds remaining.
 * @returns the compact display form.
 */
function formatCountdown(ms) {
	if (!Number.isFinite(ms) || ms < 0) return "—";
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) return seconds + "s";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return minutes + "m";
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return hours + "h " + String(minutes % 60).padStart(2, "0") + "m";
	return Math.floor(hours / 24) + "d " + String(hours % 24).padStart(2, "0") + "h";
}

/**
 * Render one instant as a UTC wall clock reading.
 * @param ms - epoch milliseconds.
 * @returns a label such as `01:00 UTC`.
 */
function formatUtcClock(ms) {
	return `${new Date(ms).toISOString().slice(11, 16)} UTC`;
}

// #endregion peak-schedule

/** Guard defaults, used when the profile patch names none of them. */
const DEFAULTS = Object.freeze({
	enabled: true,
	overrideMinutes: 15,
	maxOverrideMinutes: 720,
});

/** This row's name in the loader's inventory. */
export const name = "token-saver";

/** The command registry is the guard's only Host dependency. */
export const inject = ["commands"];

/**
 * Read one positive whole number out of plugin config.
 * @param value - the untrusted config value.
 * @param fallback - the value to use when config names none or a bad one.
 * @returns a positive integer.
 */
function positiveMinutes(value, fallback) {
	return Number.isInteger(value) && value > 0 ? value : fallback;
}

/**
 * Mount the guard: one pre-step listener plus the three user commands.
 * @param ctx - the plugin's Cordis context.
 * @param config - the row's `config` from the profile patch.
 */
export function apply(ctx, config = {}) {
	const overrideMinutes = Math.min(
		positiveMinutes(config.overrideMinutes, DEFAULTS.overrideMinutes),
		positiveMinutes(config.maxOverrideMinutes, DEFAULTS.maxOverrideMinutes),
	);
	const maxOverrideMinutes = positiveMinutes(
		config.maxOverrideMinutes,
		DEFAULTS.maxOverrideMinutes,
	);
	/** Live policy: enablement plus the moment a granted override runs out. */
	const state = {
		enabled: config.enabled !== false,
		overrideUntil: 0,
	};

	/**
	 * Whether the guard refuses the next model request at this instant.
	 * @param nowMs - epoch milliseconds to judge.
	 * @returns true when the request must be refused.
	 */
	const refusesAt = (nowMs) =>
		state.enabled && nowMs >= state.overrideUntil && isPeakInstant(nowMs);

	/**
	 * Describe the live policy in one line, from the Host's own clock.
	 * @param nowMs - epoch milliseconds to describe.
	 * @returns the status text the strip and the commands share.
	 */
	const describeState = (nowMs) => {
		const status = peakStatus(nowMs);
		const change = Number.isFinite(status.untilMs) ? formatUtcClock(nowMs + status.untilMs) : "—";
		const rate = status.peak
			? `peak now, off-peak in ${formatCountdown(status.untilMs)} (${change})`
			: `off-peak, peak in ${formatCountdown(status.untilMs)} (${change})`;
		const override =
			nowMs < state.overrideUntil
				? `override until ${formatUtcClock(state.overrideUntil)} (${formatCountdown(state.overrideUntil - nowMs)} left)`
				: "no override";
		const verdict = refusesAt(nowMs) ? "REFUSING model requests" : "allowing model requests";
		return `Peak guard: ${state.enabled ? "on" : "off"} \u00b7 ${rate} \u00b7 ${override} \u00b7 ${verdict}`;
	};

	ctx.effect(
		() =>
			ctx.on(
				"agent/pre-step",
				(payload, next) => {
					if (!refusesAt(Date.now())) return next();
					return { kind: "reject" };
				},
				{ prepend: true },
			),
		"token-saver: peak gate",
	);

	ctx.effect(
		() =>
			ctx.commands.register({
				name: "peak-allow",
				description: `Allow model requests during peak hours for a while (default ${overrideMinutes} minutes)`,
				handler: (invocation) => {
					const raw = String(invocation.rawInput ?? "").trim();
					const minutes = raw.length === 0 ? overrideMinutes : Number(raw);
					if (!Number.isInteger(minutes) || minutes < 1 || minutes > maxOverrideMinutes)
						return {
							kind: "error",
							text: `Usage: /peak-allow [minutes] with 1-${maxOverrideMinutes}; omitted means ${overrideMinutes}.`,
						};
					const nowMs = Date.now();
					state.overrideUntil = nowMs + minutes * 60000;
					return {
						kind: "success",
						text: `Peak guard: requests allowed for ${minutes}m, until ${formatUtcClock(state.overrideUntil)}. ${describeState(nowMs)}`,
					};
				},
			}),
		"token-saver: /peak-allow",
	);

	ctx.effect(
		() =>
			ctx.commands.register({
				name: "peak-block",
				description: "Drop the peak-hour override and refuse model requests again",
				handler: () => {
					const nowMs = Date.now();
					const had = nowMs < state.overrideUntil;
					state.overrideUntil = 0;
					return {
						kind: "success",
						text: `${had ? "Peak guard: override cleared." : "Peak guard: no override was active."} ${describeState(nowMs)}`,
					};
				},
			}),
		"token-saver: /peak-block",
	);

	ctx.effect(
		() =>
			ctx.commands.register({
				name: "peak-guard",
				description: "Show or change the peak-hour guard (on, off, status)",
				handler: (invocation) => {
					const raw = String(invocation.rawInput ?? "").trim().toLowerCase();
					if (raw === "" || raw === "status")
						return { kind: "success", text: describeState(Date.now()) };
					if (raw !== "on" && raw !== "off")
						return { kind: "error", text: "Usage: /peak-guard [on|off|status]" };
					state.enabled = raw === "on";
					return {
						kind: "success",
						text: `Peak guard turned ${raw}. ${describeState(Date.now())}`,
					};
				},
			}),
		"token-saver: /peak-guard",
	);
}
