/**
 * Render smoke test for the savings strip's peak-guard controls.
 *
 * The browser half is a single-file artifact loaded by the Harness module
 * loader; this test loads it exactly that way (a stand-in `window.__Module
 * Loader__` and a minimal React), mounts the composer-dock component the plugin
 * registers, and walks the returned element tree. It proves the strip renders in
 * both rate classes, labels its controls from the shipped dictionary, asks the
 * Host for an override when one is clicked, mirrors only what the Host accepts,
 * and drops that mirror when the override expires.
 *
 * Run: node test/guard-ui.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../client.js", import.meta.url), "utf8");

// --- a minimal React ---------------------------------------------------------
let states = [];
let cursor = 0;
const cleanups = [];
let ticker = null;
// The strip reads the wall clock through its own 1s interval; these stand-ins
// let the test move that clock and fire one tick without a real timer.
globalThis.setInterval = (callback) => {
	ticker = callback;
	return 1;
};
globalThis.clearInterval = () => {
	ticker = null;
};
const fakeReact = {
	createElement: (type, props, ...children) => ({
		type,
		props: props === null || props === undefined ? {} : props,
		children: children.flat(Number.POSITIVE_INFINITY),
	}),
	useState: (initial) => {
		const index = cursor;
		cursor += 1;
		if (!(index in states))
			states[index] = typeof initial === "function" ? initial() : initial;
		return [
			states[index],
			(value) => {
				states[index] = typeof value === "function" ? value(states[index]) : value;
			},
		];
	},
	useEffect: (effect) => {
		cleanups.push(effect());
	},
};

// --- load the shipped artifact the way the loader does ----------------------
let plugin;
globalThis.window = {
	__ModuleLoader__: {
		load: ({ id, factory }) => {
			assert.equal(id, "@local/dsh-token-saver", "the artifact keeps its id");
			plugin = factory((name) => {
				assert.equal(name, "react", "the artifact requires only react");
				return fakeReact;
			});
		},
	},
};
new Function(source)();
assert.ok(plugin !== undefined, "the artifact registered itself");

/** A dictionary reader that keeps the key and its parameters visible. */
const t = (key, params) =>
	params === undefined
		? key
		: `${key}(${Object.entries(params)
				.map(([name, value]) => `${name}=${value}`)
				.join(",")})`;

let dock;
const ctx = {
	locale: { bind: () => t, register: () => () => {} },
	effect: (fn) => {
		const disposer = fn();
		return () => {
			if (typeof disposer === "function") disposer();
		};
	},
	slots: {
		inject: (name, fn) => fn(),
		register: (spec, component) => {
			if (spec.name === "conversation.composer.dock") dock = { spec, component };
			return () => {};
		},
	},
	remote: {},
};
plugin.apply(ctx);
assert.ok(dock !== undefined, "the strip registers into the composer dock");
const injected = dock.spec.inject();
assert.equal(typeof injected.guard, "function", "the strip receives the guard action");
assert.equal(typeof injected.compact, "function", "the strip keeps the compact action");

const projections = {
	contextPressure: { pressureTokens: 120000, projectedTokens: 90000, contextWindow: 1000000 },
	contextBreakdown: { systemTokens: 1000, toolsTokens: 2000, messageTokens: 87000 },
	tokenUsage: {
		uncachedInputTokens: 1000,
		cacheReadTokens: 200000,
		cacheWriteTokens: 0,
		outputTokens: 5000,
	},
	modelSelection: { next: { model: "deepseek-flash" }, lastUsed: { model: "deepseek-flash" } },
};

/** Every string the tree renders. */
function labels(node) {
	if (node === null || node === undefined || typeof node === "boolean") return [];
	if (typeof node === "string" || typeof node === "number") return [String(node)];
	if (Array.isArray(node)) return node.flatMap(labels);
	return labels(node.children);
}

/** Every element the tree contains. */
function elements(node) {
	if (node === null || node === undefined || typeof node !== "object") return [];
	if (Array.isArray(node)) return node.flatMap(elements);
	return [node, ...elements(node.children)];
}

/** One button by the label it renders. */
const button = (tree, label) =>
	elements(tree).find(
		(node) => node.type === "button" && labels(node).includes(label),
	);

/** Run one step with a stubbed clock. */
async function at(ms, fn) {
	const realNow = Date.now;
	Date.now = () => ms;
	try {
		return await fn();
	} finally {
		Date.now = realNow;
	}
}

/** Mount the strip at one instant. */
function render(nowMs, extra = {}) {
	const realNow = Date.now;
	Date.now = () => nowMs;
	try {
		cursor = 0;
		return dock.component({
			t,
			sessionId: "session-1",
			useProjection: (name) => projections[name],
			compact: injected.compact,
			guard: injected.guard,
			...extra,
		});
	} finally {
		Date.now = realNow;
	}
}

/** Fire the strip's own one-second clock, as the page would. */
function tick() {
	assert.equal(typeof ticker, "function", "the strip runs its own clock");
	ticker();
}

/** Mount the strip fresh at one instant, as a page load would. */
function mount(nowMs, extra = {}) {
	states = [];
	cleanups.length = 0;
	return render(nowMs, extra);
}

const MONDAY_PEAK = Date.UTC(2026, 0, 5, 2, 0);
const MONDAY_EDGE = Date.UTC(2026, 0, 5, 1, 0);
const MONDAY_OFF = Date.UTC(2026, 0, 5, 5, 0);
const MINUTE = 60000;

let checks = 0;
const check = (label, fn) => {
	fn();
	checks += 1;
};
const acheck = async (label, fn) => {
	await fn();
	checks += 1;
};

check("the strip renders its money and rate class off-peak", () => {
	const text = labels(mount(MONDAY_OFF));
	assert.ok(
		text.some((line) => line.startsWith("pricingRegimeOff")),
		"the off-peak regime is labelled",
	);
	assert.ok(
		text.some((line) => line.startsWith("pricingSpend")),
		"the session spend is labelled",
	);
	assert.ok(!text.includes("peakBlocked"), "nothing claims to be blocked off-peak");
	assert.equal(button(mount(MONDAY_OFF), "peakAllow(minutes=15)"), undefined);
});

check("during peak the strip says it is blocking and offers an override", () => {
	const tree = mount(MONDAY_PEAK);
	const text = labels(tree);
	assert.ok(text.includes("peakBlocked"), "the blocked segment is shown");
	const allow = button(tree, "peakAllow(minutes=15)");
	assert.ok(allow !== undefined, "the quick override button is shown");
	assert.notEqual(allow.props.disabled, true, "the override button is enabled");
	assert.equal(typeof allow.props.onClick, "function");
	assert.equal(typeof allow.props.title, "string", "the button explains itself on hover");
	assert.ok(text.some((line) => line.startsWith("pricingRegimePeak")), "peak is labelled");
});

check("the detail panel lists the guard and its controls", () => {
	const closed = mount(MONDAY_PEAK);
	const main = elements(closed).find(
		(node) => node.type === "button" && node.props.className === "dts-strip-main",
	);
	assert.ok(main !== undefined, "the strip has its expander");
	main.props.onClick();
	const text = labels(render(MONDAY_PEAK));
	assert.ok(text.includes("peakGuardTitle"), "the guard row is titled");
	assert.ok(text.includes("peakGuardRefusing"), "the guard reports the refusal");
	assert.ok(text.includes("peakGuardExplain"), "the guard explains what it does");
	for (const action of ["peakBlockNow", "peakGuardOffAction", "peakGuardStatus"]) {
		assert.ok(text.includes(action), `${action} is offered`);
	}
	assert.ok(
		button(render(MONDAY_PEAK), "peakAllow(minutes=60)") !== undefined,
		"a long override is offered in the detail",
	);
});

check("a peak that starts while the page is open flips the strip by itself", () => {
	const before = mount(MONDAY_EDGE - MINUTE / 2);
	const text = labels(before);
	assert.ok(
		text.some((line) => line.startsWith("pricingRegimeOff")),
		"half a minute before the edge the strip is still off-peak",
	);
	assert.ok(!text.includes("peakBlocked"), "and nothing is blocked yet");
	at(MONDAY_EDGE + 1000, () => {
		tick();
	});
	const after = labels(render(MONDAY_EDGE + 1000));
	assert.ok(after.includes("peakBlocked"), "one tick past the edge it reports blocking");
	assert.ok(
		after.some((line) => line.startsWith("pricingRegimePeak")),
		"and the rate class flipped too",
	);
	assert.ok(
		button(render(MONDAY_EDGE + 1000), "peakAllow(minutes=15)") !== undefined,
		"with the override button ready",
	);
});

await acheck("the strip asks the Host before it mirrors anything", async () => {
	const refusals = [];
	const refusing = async (sessionId, line, args) => {
		refusals.push([sessionId, line, args]);
		return { kind: "error", text: "Peak guard is refusing." };
	};
	const tree = mount(MONDAY_PEAK, { guard: refusing });
	await at(MONDAY_PEAK, () => button(tree, "peakAllow(minutes=15)").props.onClick());
	assert.deepEqual(refusals, [["session-1", "/peak-allow", ["15"]]]);
	const afterRefusal = labels(render(MONDAY_PEAK, { guard: refusing }));
	assert.ok(afterRefusal.includes("peakBlocked"), "a refused command leaves it blocking");
	assert.ok(afterRefusal.includes("Peak guard is refusing."), "and shows the Host's text");
});

await acheck("an accepted override is mirrored, then expires on its own", async () => {
	const accepted = [];
	const granting = async (sessionId, line, args) => {
		accepted.push([line, ...args]);
		return { kind: "ok", text: "Peak guard: requests allowed for 15m." };
	};
	const tree = mount(MONDAY_PEAK, { guard: granting });
	await at(MONDAY_PEAK, () => button(tree, "peakAllow(minutes=15)").props.onClick());
	assert.deepEqual(accepted, [["/peak-allow", "15"]]);
	const noted = labels(render(MONDAY_PEAK, { guard: granting }));
	assert.ok(
		noted.includes("Peak guard: requests allowed for 15m."),
		"the Host's own wording is kept in the note",
	);
	const shown = labels(mount(MONDAY_PEAK + 5 * MINUTE, { guard: granting }));
	assert.ok(
		shown.some((line) => line.startsWith("peakOverride(when=10m)")),
		`the override counts down, got ${shown.filter((line) => line.startsWith("peakOverride"))}`,
	);
	const expired = labels(mount(MONDAY_PEAK + 20 * MINUTE, { guard: granting }));
	assert.ok(expired.includes("peakBlocked"), "once it runs out the strip blocks again");
});

console.log(`guard-ui.test.mjs: ${checks} checks passed`);
