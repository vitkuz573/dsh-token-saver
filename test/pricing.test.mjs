/**
 * Boundary, rate, and guard tests for this plugin's two halves.
 *
 * The browser half is a single-file artifact loaded by the Harness module
 * loader, so this test extracts the shipped `#region pricing` block out of
 * client.js and evaluates it. The Host half carries its own copy of the same
 * schedule in `#region peak-schedule`; that copy is compared against the
 * browser one here — source-text identical and instant-for-instant equal over
 * ten UTC days — so the two can never drift into disagreeing about when peak
 * rates apply. A hand-copied restatement of the schedule could pass while the
 * shipped code is wrong; this cannot.
 *
 * The guard's own decisions are driven through the real `apply()` with a
 * stand-in Cordis context and a stubbed clock.
 *
 * Run: node test/pricing.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../client.js", import.meta.url), "utf8");
const start = source.indexOf("// #region pricing");
const end = source.indexOf("// #endregion pricing");
assert.ok(start > 0, "client.js carries the pricing region start marker");
assert.ok(end > start, "client.js carries the pricing region end marker");

const pricing = new Function(
	`${source.slice(start, end)}
	return { RATES, PEAK_WINDOWS, PEAK_EDGES, isPeakMinute, isPeakInstant, peakStatus, isWeekendInstant, priceUsage, priceSaved, formatCountdown, formatMoney };`,
)();

const DAY_MS = 86400000;
const MONDAY = Date.UTC(2026, 0, 5);
assert.equal(new Date(MONDAY).getUTCDay(), 1, "fixture 2026-01-05 is a Monday");
const at = (dayMs, hour, minute = 0) => dayMs + (hour * 60 + minute) * 60000;

/** Money comparison with a tolerance: 1e6 tokens x 1e-6 is not exact in binary floating point. */
const near = (actual, expected, label) =>
	assert.ok(
		Math.abs(actual - expected) < 1e-9,
		`${label}: expected ~${expected}, got ${actual}`,
	);

let checks = 0;
const check = (label, fn) => {
	fn();
	checks += 1;
};
/** The same counter for checks that must await the guard. */
const acheck = async (label, fn) => {
	await fn();
	checks += 1;
};

// --- schedule: both weekday peak blocks and all four edges -------------------
check("Monday 00:59 is off-peak", () =>
	assert.equal(pricing.isPeakInstant(at(MONDAY, 0, 59)), false),
);
check("Monday 01:00 opens peak", () => assert.equal(pricing.isPeakInstant(at(MONDAY, 1)), true));
check("Monday 03:59 is still peak", () =>
	assert.equal(pricing.isPeakInstant(at(MONDAY, 3, 59)), true),
);
check("Monday 04:00 closes peak", () =>
	assert.equal(pricing.isPeakInstant(at(MONDAY, 4)), false),
);
check("Monday 05:59 stays off-peak in the gap", () =>
	assert.equal(pricing.isPeakInstant(at(MONDAY, 5, 59)), false),
);
check("Monday 06:00 opens the second peak block", () =>
	assert.equal(pricing.isPeakInstant(at(MONDAY, 6)), true),
);
check("Monday 09:59 is still peak", () =>
	assert.equal(pricing.isPeakInstant(at(MONDAY, 9, 59)), true),
);
check("Monday 10:00 closes the second peak block", () =>
	assert.equal(pricing.isPeakInstant(at(MONDAY, 10)), false),
);
check("Monday 23:59 is off-peak", () =>
	assert.equal(pricing.isPeakInstant(at(MONDAY, 23, 59)), false),
);

// --- schedule: weekends are off-peak in full --------------------------------
const SATURDAY = MONDAY + 5 * DAY_MS;
const SUNDAY = MONDAY + 6 * DAY_MS;
check("fixtures land on Saturday and Sunday", () => {
	assert.equal(new Date(SATURDAY).getUTCDay(), 6);
	assert.equal(new Date(SUNDAY).getUTCDay(), 0);
});
check("Saturday 02:00 is off-peak", () =>
	assert.equal(pricing.isPeakInstant(at(SATURDAY, 2)), false),
);
check("Saturday is flagged as a weekend", () =>
	assert.equal(pricing.isWeekendInstant(at(SATURDAY, 2)), true),
);
check("Sunday 07:00 is off-peak", () =>
	assert.equal(pricing.isPeakInstant(at(SUNDAY, 7)), false),
);
check("Monday is not flagged as a weekend", () =>
	assert.equal(pricing.isWeekendInstant(at(MONDAY, 7)), false),
);

// --- countdown: every shape lands on a real flip in the future --------------
const shapes = [
	["inside first peak block", at(MONDAY, 3)],
	["inside the weekday gap", at(MONDAY, 4)],
	["inside second peak block", at(MONDAY, 6, 30)],
	["after the last peak block", at(MONDAY, 10)],
	["Friday after the last peak block", at(MONDAY + 4 * DAY_MS, 10)],
	["Saturday", at(SATURDAY, 2)],
	["Sunday night", at(SUNDAY, 23, 59)],
	["weekday midnight", at(MONDAY, 0)],
];
for (const [label, now] of shapes) {
	check(`countdown from ${label} is positive and lands on a flip`, () => {
		const status = pricing.peakStatus(now);
		assert.equal(status.peak, pricing.isPeakInstant(now), `${label}: reports the active class`);
		assert.ok(Number.isFinite(status.untilMs), `${label}: countdown is finite`);
		assert.ok(status.untilMs > 0, `${label}: countdown is positive, got ${status.untilMs}`);
		const target = now + status.untilMs;
		assert.notEqual(
			pricing.isPeakInstant(target),
			status.peak,
			`${label}: target instant flips the class`,
		);
	});
}

check("Monday 03:00 waits one hour for 04:00", () =>
	assert.equal(pricing.peakStatus(at(MONDAY, 3)).untilMs, 60 * 60000),
);
check("Monday 04:00 waits two hours for 06:00", () =>
	assert.equal(pricing.peakStatus(at(MONDAY, 4)).untilMs, 2 * 60 * 60000),
);
check("Sunday 23:59 waits 61 minutes for Monday 01:00", () =>
	assert.equal(pricing.peakStatus(at(SUNDAY, 23, 59)).untilMs, 61 * 60000),
);
check("Friday 10:00 waits 2d 15h for Monday 01:00", () =>
	assert.equal(pricing.peakStatus(at(MONDAY + 4 * DAY_MS, 10)).untilMs, (2 * 24 + 15) * 3600000),
);
check("a weekend reports off-peak despite the following peak", () => {
	const status = pricing.peakStatus(at(SATURDAY, 12));
	assert.equal(status.peak, false);
	assert.equal(status.untilMs, (24 + 13) * 3600000);
});

// --- rates: published figures reproduce exactly -----------------------------
const fullMillion = {
	uncachedInputTokens: 1e6,
	cacheReadTokens: 1e6,
	cacheWriteTokens: 0,
	outputTokens: 1e6,
};
check("flash peak prices every bucket at its published rate", () => {
	const cost = pricing.priceUsage(fullMillion, "deepseek-flash", true);
	near(cost.cacheRead, 0.006, "cost.cacheRead");
	near(cost.cacheMiss, 0.3, "cost.cacheMiss");
	near(cost.output, 1.2, "cost.output");
	near(cost.total, 1.506, "cost.total");
});
check("flash off-peak is exactly half of peak", () => {
	const peak = pricing.priceUsage(fullMillion, "deepseek-flash", true).total;
	const off = pricing.priceUsage(fullMillion, "deepseek-flash", false).total;
	near(off, peak / 2, "off-peak is half of peak");
});
check("v4-pro peak prices every bucket at its published rate", () => {
	const cost = pricing.priceUsage(fullMillion, "deepseek-v4-pro", true);
	near(cost.cacheRead, 0.044, "cost.cacheRead");
	near(cost.cacheMiss, 1.32, "cost.cacheMiss");
	near(cost.output, 3.96, "cost.output");
	near(cost.total, 5.324, "cost.total");
});
check("cache writes are billed as cache-miss input", () => {
	const cost = pricing.priceUsage(
		{ uncachedInputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 1e6, outputTokens: 0 },
		"deepseek-v4-pro",
		true,
	);
	near(cost.cacheMiss, 1.32, "cost.cacheMiss");
	near(cost.total, 1.32, "cost.total");
});
check("cache reads stay far cheaper than cache misses", () => {
	for (const model of Object.keys(pricing.RATES)) {
		const rates = pricing.RATES[model];
		assert.ok(
			rates.cacheMiss / rates.cacheRead > 10,
			`${model}: cache read must stay much cheaper than a miss`,
		);
		assert.ok(rates.output > rates.cacheMiss, `${model}: output must cost more than a miss`);
	}
});
check("an unrated model yields no money instead of a guess", () => {
	assert.equal(pricing.priceUsage(fullMillion, "some-other-model", true), undefined);
	assert.equal(pricing.priceSaved(1000, "some-other-model", true), undefined);
	assert.equal(pricing.priceUsage(undefined, "deepseek-flash", true), undefined);
});
check("reclaimed tokens price at both input rates", () => {
	const saved = pricing.priceSaved(1e6, "deepseek-flash", true);
	near(saved.cached, 0.006, "saved.cached");
	near(saved.uncached, 0.3, "saved.uncached");
	assert.equal(pricing.priceSaved(0, "deepseek-flash", true), undefined);
});
check("peak windows are the published UTC blocks", () =>
	assert.deepEqual(
		pricing.PEAK_WINDOWS.map((w) => [...w]),
		[
			[60, 240],
			[360, 600],
		],
	),
);

// --- display formats --------------------------------------------------------
check("countdown formats every magnitude", () => {
	assert.equal(pricing.formatCountdown(38000), "38s");
	assert.equal(pricing.formatCountdown(42 * 60000), "42m");
	assert.equal(pricing.formatCountdown(7 * 3600000 + 22 * 60000), "7h 22m");
	assert.equal(pricing.formatCountdown(2 * DAY_MS + 15 * 3600000), "2d 15h");
	assert.equal(pricing.formatCountdown(Number.POSITIVE_INFINITY), "\u2014");
});
check("money keeps sub-cent precision and never shows a negative", () => {
	assert.equal(pricing.formatMoney(0), "$0");
	assert.equal(pricing.formatMoney(0.0001), "<$0.001");
	assert.equal(pricing.formatMoney(0.0784), "$0.0784");
	assert.equal(pricing.formatMoney(1.234), "$1.23");
	assert.equal(pricing.formatMoney(-1), "$0");
});

// --- the two halves share one schedule, textually and numerically -----------
const hostSource = readFileSync(new URL("../index.js", import.meta.url), "utf8");
const hostStart = hostSource.indexOf("// #region peak-schedule");
const hostEnd = hostSource.indexOf("// #endregion peak-schedule");
assert.ok(hostStart > 0, "index.js carries the peak-schedule region start marker");
assert.ok(hostEnd > hostStart, "index.js carries the peak-schedule region end marker");
const hostRegion = hostSource.slice(hostStart, hostEnd);
const clientRegion = source.slice(start, end);
const schedule = new Function(
	`${hostRegion}
	return { PEAK_WINDOWS, PEAK_EDGES, isPeakMinute, isPeakInstant, peakStatus, formatCountdown };`,
)();

/**
 * One function's exact source text, braces matched.
 * @param text - the region to search.
 * @param name - the declared function name.
 * @returns the declaration including its body.
 */
function functionSource(text, name) {
	const from = text.indexOf(`function ${name}(`);
	assert.ok(from >= 0, `${name} is declared`);
	let depth = 0;
	for (let index = text.indexOf("{", from); index < text.length; index += 1) {
		if (text[index] === "{") depth += 1;
		else if (text[index] === "}") {
			depth -= 1;
			if (depth === 0) return text.slice(from, index + 1);
		}
	}
	throw new Error(`unbalanced braces in ${name}`);
}

/**
 * Compare declarations that differ only in nesting depth: the browser half
 * declares these inside its factory closure, the Host half at module top level.
 * @param text - one function declaration.
 * @returns the same declaration with every line's indentation removed.
 */
function normalize(text) {
	return text
		.split("\n")
		.map((line) => line.trim())
		.join("\n");
}

for (const name of ["isPeakMinute", "isPeakInstant", "peakStatus", "formatCountdown"]) {
	check(`both halves carry the same ${name} source`, () =>
		assert.equal(
			normalize(functionSource(hostRegion, name)),
			normalize(functionSource(clientRegion, name)),
		),
	);
}

check("both halves agree on the rate class minute by minute for ten days", () => {
	for (let ms = MONDAY - 2 * DAY_MS; ms < MONDAY + 8 * DAY_MS; ms += 60000) {
		const when = new Date(ms).toISOString();
		assert.equal(schedule.isPeakInstant(ms), pricing.isPeakInstant(ms), `class at ${when}`);
		const hostStatus = schedule.peakStatus(ms);
		const clientStatus = pricing.peakStatus(ms);
		assert.equal(hostStatus.peak, clientStatus.peak, `reported class at ${when}`);
		assert.equal(hostStatus.untilMs, clientStatus.untilMs, `countdown at ${when}`);
	}
});

check("both halves declare the same peak windows and edges", () => {
	assert.deepEqual(
		schedule.PEAK_WINDOWS.map((w) => [...w]),
		pricing.PEAK_WINDOWS.map((w) => [...w]),
	);
	assert.deepEqual([...schedule.PEAK_EDGES], [...pricing.PEAK_EDGES]);
});

// --- the Host guard's own decisions -----------------------------------------
const host = await import(new URL("../index.js", import.meta.url));
const PEAK = at(MONDAY, 2);
const GAP = at(MONDAY, 4);

/** Mount the Host half against a stand-in context and capture what it mounts. */
function harness(config) {
	const listeners = [];
	const commands = new Map();
	const fake = {
		effect: (fn) => {
			const disposer = fn();
			return () => {
				if (typeof disposer === "function") disposer();
			};
		},
		on: (event, handler, options) => {
			listeners.push({ event, handler, options });
			return () => {};
		},
		commands: {
			register: (definition) => {
				commands.set(definition.name, definition);
				return () => {};
			},
		},
	};
	host.apply(fake, config);
	const gate = listeners.find((listener) => listener.event === "agent/pre-step");
	assert.ok(gate !== undefined, "the guard listens on agent/pre-step");
	return { commands, gate: gate.handler, options: gate.options };
}

/** Run one command handler. */
const command = (harnessed, name, rawInput = "") =>
	harnessed.commands.get(name).handler({ rawInput });

/** Judge one proposed step at one instant. */
async function decide(harnessed, ms) {
	const realNow = Date.now;
	Date.now = () => ms;
	try {
		let entered = 0;
		const decision = await harnessed.gate({}, () => {
			entered += 1;
			return Promise.resolve({ kind: "enter", messages: [] });
		});
		return { decision, entered };
	} finally {
		Date.now = realNow;
	}
}

/** Run one command handler at one instant. */
function commandAt(harnessed, ms, name, rawInput = "") {
	const realNow = Date.now;
	Date.now = () => ms;
	try {
		return command(harnessed, name, rawInput);
	} finally {
		Date.now = realNow;
	}
}

check("the Host guard names itself and depends on the command registry", () => {
	assert.equal(host.name, "token-saver");
	assert.deepEqual([...host.inject], ["commands"]);
});

await acheck("a peak step is refused without ever entering", async () => {
	const armed = harness({ enabled: true });
	assert.equal(armed.options.prepend, true);
	const { decision, entered } = await decide(armed, PEAK);
	assert.deepEqual(decision, { kind: "reject" });
	assert.equal(entered, 0);
});

await acheck("an off-peak step passes straight through", async () => {
	const armed = harness({ enabled: true });
	const { decision, entered } = await decide(armed, GAP);
	assert.equal(decision.kind, "enter");
	assert.equal(entered, 1);
});

await acheck("config can ship the guard disarmed", async () => {
	const idle = harness({ enabled: false });
	const { decision, entered } = await decide(idle, PEAK);
	assert.equal(decision.kind, "enter");
	assert.equal(entered, 1);
	assert.match(commandAt(idle, PEAK, "peak-guard").text, /Peak guard: off/);
});

await acheck("an override admits requests until it runs out, then refuses again", async () => {
	const armed = harness({ enabled: true });
	const allowed = commandAt(armed, PEAK, "peak-allow", "15");
	assert.equal(allowed.kind, "success");
	assert.match(allowed.text, /allowed for 15m/);
	assert.equal((await decide(armed, PEAK + 14 * 60000)).decision.kind, "enter");
	const expired = await decide(armed, PEAK + 15 * 60000);
	assert.deepEqual(expired.decision, { kind: "reject" });
	assert.equal(expired.entered, 0);
});

await acheck("/peak-block drops an override", async () => {
	const armed = harness({ enabled: true });
	commandAt(armed, PEAK, "peak-allow", "60");
	assert.equal((await decide(armed, PEAK)).decision.kind, "enter");
	const dropped = commandAt(armed, PEAK, "peak-block");
	assert.equal(dropped.kind, "success");
	assert.match(dropped.text, /override cleared/);
	assert.deepEqual((await decide(armed, PEAK)).decision, { kind: "reject" });
	assert.match(commandAt(armed, PEAK, "peak-block").text, /no override was active/);
});

await acheck("an omitted argument uses the configured default", async () => {
	const armed = harness({ enabled: true, overrideMinutes: 5 });
	assert.match(commandAt(armed, PEAK, "peak-allow").text, /allowed for 5m/);
	assert.equal((await decide(armed, PEAK + 4 * 60000)).decision.kind, "enter");
	assert.deepEqual((await decide(armed, PEAK + 5 * 60000)).decision, { kind: "reject" });
});

check("nonsense arguments and unknown subcommands are refused as errors", () => {
	const armed = harness({ enabled: true });
	for (const raw of ["abc", "0", "-5", "1.5", "100000", "15 minutes"]) {
		assert.equal(command(armed, "peak-allow", raw).kind, "error", `/peak-allow ${raw}`);
	}
	assert.equal(command(armed, "peak-guard", "maybe").kind, "error");
	assert.equal(command(armed, "peak-guard", "status").kind, "success");
	assert.equal(command(armed, "peak-allow", "").kind, "success");
});

await acheck("/peak-guard off disarms the refusal and on re-arms it", async () => {
	const armed = harness({ enabled: true });
	assert.equal(command(armed, "peak-guard", "off").kind, "success");
	assert.equal((await decide(armed, PEAK)).decision.kind, "enter");
	assert.equal(command(armed, "peak-guard", "on").kind, "success");
	assert.deepEqual((await decide(armed, PEAK)).decision, { kind: "reject" });
});

await acheck("the status line reports the class, the next flip, and the verdict", async () => {
	const armed = harness({ enabled: true });
	const peakLine = commandAt(armed, PEAK, "peak-guard", "status").text;
	assert.match(peakLine, /Peak guard: on/);
	assert.match(peakLine, /peak now, off-peak in 2h 00m \(04:00 UTC\)/);
	assert.match(peakLine, /REFUSING model requests/);
	const gapLine = commandAt(armed, GAP, "peak-guard", "status").text;
	assert.match(gapLine, /off-peak, peak in 2h 00m \(06:00 UTC\)/);
	assert.match(gapLine, /allowing model requests/);
});


console.log(`pricing.test.mjs: ${checks} checks passed`);
