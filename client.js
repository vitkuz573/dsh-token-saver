/**
 * Token saver — browser half.
 *
 * One Settings page that switches the harness's token-saving machinery on and
 * off: deterministic tool-result pruning, the bounded tool-output budget,
 * manual and automatic compaction, and image offload.
 *
 * Every row's state is read from the plugin manager Remote (`listPlugins`) and
 * every switch calls `setPluginEnabled`, so the page shows what this deployment
 * can actually do rather than what a stock deployment usually contains. The
 * page never disables anything on its own: presets only turn capabilities on,
 * and a capability the Loader exposes read-only is shown as managed instead of
 * offering a control that would be refused.
 */
window.__ModuleLoader__.load({
	id: "@local/dsh-token-saver",
	factory: (require) => {
		const React = require("react");
		const h = React.createElement;

		/** Dictionary namespace owned by this plugin. */
		const NS = "tokenSaver";

		/** English copy; every other locale falls back to this dictionary. */
		const en = {
			nav: "Token saver",
			title: "Token saver",
			intro:
				"Every request carries the whole conversation. These capabilities keep that payload small: they prune tool output that has already been read, bound what one result may add, and compact the session before the context window fills. The composer's context meter shows the result on the next request.",
			presetMaximum: "Turn on everything",
			presetRecommended: "Recommended set",
			refresh: "Refresh",
			loading: "Reading this deployment's plugins…",
			loadFailed: "Could not read the plugin inventory: {error}",
			stateOn: "On",
			stateOff: "Off",
			stateStarting: "Starting",
			stateNeedsDependency: "Waiting for {name}",
			stateFailed: "Failed to start",
			stateUnavailable: "Not in this deployment",
			stateManaged: "Managed by this deployment",
			stateRequired: "Required",
			applying: "Applying…",
			unavailableHint:
				"This deployment does not ship this capability, so there is nothing to switch on.",
			summaryOk: "Enabled {count}.",
			summaryNone: "Nothing to change — this preset is already fully on.",
			summaryBlocked:
				"Nothing to change here: a higher-priority configuration layer manages {names}.",
			summaryRestart: "Enabled {count}. Restart dsh to apply the rest.",
			summaryOverridden:
				"Enabled {count}, but a higher-priority configuration layer wins for {overridden}.",
			summaryFailed: "Enabled {count}; {failed} could not be enabled.",
			singleOn: "{name} is on.",
			singleOnWithDependency: "Enabled {name}, together with {dependency}, which it needs.",
			singleOff: "{name} is off.",
			singleOffDependent: "Disabled {name}. {dependent} now waits for it.",
			singleRestart: "{name} is saved. Restart dsh to start it.",
			singleOverridden: "A higher-priority configuration layer wins for {name}.",
			singleFailed: "{name} could not be changed ({error}).",
			footnote:
				"Switches write the profile's plugin enablement, the same setting the Plugins page edits, and take effect for sessions started afterwards. Individual capabilities can be turned off here at any time; the presets above only turn things on.",
			savingsTitle:
				"Token saver: what this session's next request carries, and what has been removed from it since the last provider sample.",
			savingsPruned: "squeezed \u2212{tokens}",
			savingsNext: "next request ~{used} of {window}",
			savingsPercent: "{percent}% of window",
			savingsLessThanOne: "under 1% of window",
			savingsDetailLast: "Last reported request",
			savingsDetailNext: "Next request (estimated)",
			savingsDetailFreed: "Freed since that sample",
			savingsDetailSystem: "System prompt (estimated)",
			savingsDetailTools: "Tool schemas (estimated)",
			savingsDetailMessages: "Messages and tool results (estimated)",
			savingsCompact: "Compact now",
			savingsCompacting: "Compacting\u2026",
			savingsCompactDone: "Session compacted.",
			savingsCompactUnknown: "Compaction is not available in this deployment.",
			savingsCompactFailed: "Compaction failed: {error}",
			savingsCommandUnknown: "The Host returned no result for that command.",
			savingsCommandUnloaded:
				"The peak guard's Host half did not answer ({error}). Restart dsh web so it loads.",
			savingsCommandDone: "Command accepted.",
			peakBlocked: "\u26d4 sending blocked",
			peakBlockedHint:
				"The Host refuses the next model request while this rate class lasts. If its Host half is not loaded, nothing is refused \u2014 press Host status to check.",
			peakOverride: "override {when}",
			peakAllow: "Allow {minutes}m",
			peakAllowHint: "Ask the Host to admit model requests during peak hours",
			peakBlockNow: "Block now",
			peakGuardTitle: "Peak guard",
			peakGuardIsOff: "off \u2014 nothing is refused",
			peakGuardRefusing: "on \u2014 refusing model requests now",
			peakGuardOverridden: "on \u2014 allowing, override ends in {when}",
			peakGuardWaiting: "on \u2014 waiting, next peak in {when}",
			peakGuardOnAction: "Guard on",
			peakGuardOffAction: "Guard off",
			peakGuardStatus: "Host status",
			peakGuardExplain:
				"During peak hours the Host refuses every model request at the next step boundary, in every session of this profile \u2014 subagents and workflows included. A turn that is already running finishes the step it is in and then ends as blocked, and the message that step had claimed is discarded, so allow first when the text matters. An override lives in Host memory and disappears on restart, and the provider's off-peak holidays are not modelled. /peak-allow, /peak-block, and /peak-guard do the same thing by hand.",
			pricingPeak: "peak",
			pricingOffPeak: "off-peak",
			pricingRegimePeak: "peak \u00b7 off-peak in {when}",
			pricingRegimeOff: "off-peak \u00b7 peak in {when}",
			pricingRegimeWeekend: "off-peak weekend \u00b7 peak in {when}",
			pricingSpend: "spent {money}",
			pricingSaved: "saved {money}/request",
			pricingDetailModel: "Model",
			pricingDetailUnknownModel: "not reported yet",
			pricingDetailRegime: "Rate class now",
			pricingDetailSpend: "Session spend (estimated)",
			pricingDetailCacheRead: "Cache-read input",
			pricingDetailCacheMiss: "Cache-miss input and writes",
			pricingDetailOutput: "Output",
			pricingDetailSavedCached: "Saving per request, cached span",
			pricingDetailSavedUncached: "Saving per request, uncached span",
			pricingDetailRatesLabel: "Rates",
			pricingDetailRates:
				"{regime} \u00b7 cache read {cacheRead} \u00b7 cache miss {cacheMiss} \u00b7 output {output} per 1M",
			pricingNoRates:
				"No published rate for {model}: money figures stay hidden. Built-in rates cover deepseek-flash and deepseek-v4-pro.",
			pricingCaveat:
				"Estimates. Peak is 01:00\u201304:00 and 06:00\u201310:00 UTC, Monday to Friday, and the countdown reads this device's clock. Token counts are provider-reported per session; the whole session is priced at the rate class in effect now, so a session that spanned both classes is approximate, and Chinese public holidays are not modelled. Costs exclude account credits and negotiated discounts. Reclaiming a cached span saves the cache-read rate on each following request; it also invalidates the cached suffix once, which is not netted out here.",
			prunerTitle: "Tool-result pruner",
			prunerWhat:
				"Rewrites the oldest tool results to a head/middle/tail excerpt before every request. Model-free and deterministic, so it is the cheapest real saving: a long session stops paying for output it has already consumed.",
			spillTitle: "Bounded tool output",
			spillWhat:
				"Keeps one oversized tool result from entering the context whole: the excess is written to a file the agent can re-read on demand, and only the budgeted part is carried forward.",
			compactCommandTitle: "Manual compaction",
			compactCommandWhat:
				"Adds the compact command, so a session can be compacted at a moment you choose instead of after it has already become expensive. It runs on the compaction backend, which this page switches on together with it.",
			compactionTitle: "Automatic compaction",
			compactionWhat:
				"Summarizes the oldest span of the conversation once the next request approaches the model's context window. It costs one model call when it fires, and prevents the far larger cost of a turn that overruns the window.",
			imageOffloadTitle: "Image offload",
			imageOffloadWhat:
				"Replaces images that no longer fit the request budget with a placeholder and retries, instead of resending every image on every step of an image-heavy session.",
			meterTitle: "Token meter",
			meterWhat:
				"Measures request pressure and context composition, and drives the context meter and the compaction triggers. The other capabilities read it, so this one stays on.",
		};

		/**
		 * Token-saving capabilities this page controls, in display order.
		 *
		 * `module` is the exact package specifier the Loader row names; the page
		 * resolves each row from the live inventory by that name, so entry ids and
		 * patch ids stay the deployment's business. `presets` names the presets
		 * that turn the capability on, and `requires` lists the capabilities whose
		 * Cordis services it injects, so switching it on can switch them on first.
		 */
		const CAPABILITIES = [
			{
				id: "pruner",
				module: "@deepseek-ai/dsh-compaction-tool-result-pruner",
				presets: ["recommended", "maximum"],
			},
			{
				id: "spill",
				module: "@deepseek-ai/dsh-spill-policy",
				presets: ["recommended", "maximum"],
			},
			{
				id: "compactCommand",
				module: "@deepseek-ai/dsh-command-compact",
				presets: ["maximum"],
				requires: ["compaction"],
			},
			{
				id: "compaction",
				module: "@deepseek-ai/dsh-compaction-basic",
				presets: ["maximum"],
			},
			{
				id: "imageOffload",
				module: "@deepseek-ai/dsh-compaction-image-offload",
				presets: ["maximum"],
			},
			{ id: "meter", module: "@deepseek-ai/dsh-token-meter", presets: [], fixed: true },
		];

		const STYLE_TAG = "@local/dsh-token-saver/section.css";

		/** Page styles: theme tokens only, so both themes and every accent keep working. */
		const CSS = [
			".dts-root{display:block;box-sizing:border-box;width:100%;max-width:760px;padding:2px 0 24px}",
			".dts-title{margin:0 0 6px;color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:22px}",
			".dts-intro{margin:0 0 16px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}",
			".dts-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:12px}",
			".dts-button{font:inherit;font-size:13px;line-height:20px;padding:4px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer}",
			".dts-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}",
			".dts-button:disabled{opacity:.5;cursor:default}",
			".dts-button-primary{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);font-weight:500}",
			".dts-notice{margin:0 0 12px;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:18px}",
			".dts-notice-ok{color:var(--dsw-alias-state-success-primary)}",
			".dts-notice-warn{color:var(--dsw-alias-state-warn-label)}",
			".dts-notice-error{color:var(--dsw-alias-state-error-primary)}",
			".dts-list{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}",
			".dts-card{display:flex;align-items:flex-start;gap:12px;box-sizing:border-box;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}",
			".dts-card-main{flex:1;min-width:0}",
			".dts-card-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px}",
			".dts-card-name{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:20px}",
			".dts-card-what{margin:3px 0 0;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:18px}",
			".dts-card-note{margin:4px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}",
			".dts-chip{border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:0 7px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;white-space:nowrap}",
			".dts-chip-on{border-color:transparent;color:var(--dsw-alias-state-success-primary)}",
			".dts-chip-warn{border-color:transparent;color:var(--dsw-alias-state-warn-label)}",
			".dts-switch{position:relative;flex:none;width:32px;height:18px;margin-top:2px;padding:0;border:none;border-radius:999px;background:var(--dsw-alias-state-idle-primary);cursor:pointer;transition:background .15s ease}",
			".dts-switch:disabled{opacity:.5;cursor:default}",
			".dts-switch-on{background:var(--dsw-alias-button-primary-fill)}",
			".dts-knob{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-switch-thumb);transition:left .15s ease}",
			".dts-switch-on .dts-knob{left:16px}",
			".dts-footnote{margin:16px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}",
			".dts-strip{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:2px 2px 0;font-size:12px;line-height:18px}",
			".dts-strip-main{display:inline-flex;flex-wrap:wrap;align-items:center;gap:8px;font:inherit;padding:1px 6px;border:1px solid transparent;border-radius:var(--dsw-radius-sm,6px);background:0 0;color:var(--dsw-alias-label-tertiary);cursor:pointer;font-variant-numeric:tabular-nums}",
			".dts-strip-main:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dts-strip-saved{color:var(--dsw-alias-state-success-primary);font-weight:500}",
			".dts-strip-regime{display:inline-flex;align-items:center;gap:5px}",
			".dts-strip-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-warn-label);flex:none}",
			".dts-strip-dot[data-peak='1']{background:var(--dsw-alias-state-error-primary)}",
			".dts-strip-dot[data-peak='weekend']{background:var(--dsw-alias-state-success-primary)}",
			".dts-strip-caveat{margin:6px 0 0;padding-top:6px;border-top:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary)}",
			".dts-strip-action{font:inherit;font-size:12px;line-height:18px;padding:1px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer}",
			".dts-strip-action:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}",
			".dts-strip-action:disabled{opacity:.5;cursor:default}",
			".dts-strip-note{flex-basis:100%;margin:2px 0 0;color:var(--dsw-alias-label-tertiary)}",
			".dts-strip-note-ok{color:var(--dsw-alias-state-success-primary)}",
			".dts-strip-note-error{color:var(--dsw-alias-state-error-primary)}",
			".dts-strip-detail{flex-basis:100%;margin:4px 0 0;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}",
			".dts-strip-row{display:flex;justify-content:space-between;gap:16px}",
			".dts-strip-row dt{color:var(--dsw-alias-label-tertiary)}",
			".dts-strip-row dd{margin:0;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}",
			".dts-strip-blocked{color:var(--dsw-alias-state-error-primary);font-weight:600}",
			".dts-strip-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}",
			".dts-strip-mini{font:inherit;font-size:12px;line-height:18px;padding:1px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer}",
			".dts-strip-mini:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}",
			".dts-strip-mini:disabled{opacity:.5;cursor:default}",
		].join("");

		/**
		 * Mount this page's stylesheet once for the page's lifetime.
		 * @returns a disposer removing the stylesheet.
		 */
		function injectStyles() {
			if (typeof document === "undefined") return () => {};
			const existing = document.querySelector(
				"style[data-plugin-css=" + JSON.stringify(STYLE_TAG) + "]",
			);
			if (existing !== null) return () => {};
			const tag = document.createElement("style");
			tag.dataset.plugin = "@local/dsh-token-saver";
			tag.dataset.pluginCss = STYLE_TAG;
			tag.textContent = CSS;
			document.head.appendChild(tag);
			return () => tag.remove();
		}

		/**
		 * Resolve one capability's live row from the inventory.
		 * @param rows - every row `listPlugins` reported.
		 * @param capability - the capability whose row is wanted.
		 * @returns the matching row, or undefined when this deployment has none.
		 */
		function resolveRow(rows, capability) {
			let subpath;
			for (const row of rows) {
				if (row.moduleName === capability.module) return row;
				if (
					subpath === undefined &&
					typeof row.moduleName === "string" &&
					row.moduleName.startsWith(capability.module + "/")
				)
					subpath = row;
			}
			return subpath;
		}

		/**
		 * One capability by its page id.
		 * @param id - the capability's page id.
		 * @returns the capability, or undefined for an unknown id.
		 */
		function capabilityOf(id) {
			return CAPABILITIES.find((entry) => entry.id === id);
		}

		/**
		 * The capabilities one capability needs, dependencies first.
		 * @param capability - the capability being switched on.
		 * @returns its required capabilities, in the order they must be enabled.
		 */
		function dependencyChain(capability) {
			const chain = [];
			const seen = new Set([capability.id]);
			const visit = (entry) => {
				for (const id of entry.requires === undefined ? [] : entry.requires) {
					if (seen.has(id)) continue;
					seen.add(id);
					const dependency = capabilityOf(id);
					if (dependency === undefined) continue;
					visit(dependency);
					chain.push(dependency);
				}
			};
			visit(capability);
			return chain;
		}

		/**
		 * Name the first capability another capability requires but does not have.
		 * @param capability - the capability whose requirements are checked.
		 * @param rows - every row the inventory reported.
		 * @param t - the page's dictionary reader.
		 * @returns the missing dependency's display name, or undefined.
		 */
		function missingDependency(capability, rows, t) {
			for (const id of capability.requires === undefined ? [] : capability.requires) {
				const dependency = capabilityOf(id);
				const row = dependency === undefined ? undefined : resolveRow(rows, dependency);
				if (row === undefined || row.enabled !== true)
					return dependency === undefined ? id : t(dependency.id + "Title");
			}
			return undefined;
		}

		/**
		 * Read one Remote result envelope, or throw with the Host's own reason.
		 * @param result - the envelope the Remote call resolved to.
		 * @param operation - operation name used in the fallback message.
		 * @returns the envelope's value.
		 */
		function unwrap(result, operation) {
			if (result !== undefined && result.ok === true) return result.value;
			const failure = result === undefined ? undefined : result.error;
			const detail =
				failure === undefined
					? operation + " failed"
					: String(failure.code) + ": " + String(failure.message);
			throw new Error(detail);
		}

		/** Render any thrown value as one short sentence. */
		function messageOf(error) {
			if (error instanceof Error) return error.message;
			return String(error);
		}

		/**
		 * Compact a token count for an ambient strip: 940, 12.4k, 1.20M.
		 * @param value - token count.
		 * @returns the compact display form.
		 */
		function formatTokens(value) {
			if (!Number.isFinite(value)) return "?";
			const abs = Math.abs(value);
			if (abs >= 1e6) return (value / 1e6).toFixed(2) + "M";
			if (abs >= 1e4) return String(Math.round(value / 1e3)) + "k";
			if (abs >= 1e3) return (value / 1e3).toFixed(1) + "k";
			return String(Math.round(value));
		}

		// #region pricing

		/**
		 * Published DeepSeek peak rates in USD per 1M tokens, keyed by the
		 * provider's model id. Source: the provider's Models & Pricing page,
		 * <https://api-docs.deepseek.com/quick_start/pricing>. Off-peak is exactly
		 * half of every figure here, and `deepseek-flash` is DeepSeek-V4.1-Flash.
		 * Cache writes are priced as cache-miss input because the provider
		 * publishes a cache-read discount and no separate write premium.
		 */
		const RATES = Object.freeze({
			"deepseek-flash": Object.freeze({ cacheRead: 0.006, cacheMiss: 0.3, output: 1.2 }),
			"deepseek-v4-pro": Object.freeze({ cacheRead: 0.044, cacheMiss: 1.32, output: 3.96 }),
		});

		/**
		 * Peak windows as UTC minutes after midnight, Monday through Friday. Every
		 * other hour — weekends in full — is billed at half rate. Chinese public
		 * holidays are off-peak in full as well and are not modelled here.
		 */
		const PEAK_WINDOWS = Object.freeze([
			Object.freeze([60, 240]),
			Object.freeze([360, 600]),
		]);

		/** Every instant of a weekday at which the rate class can flip, in UTC minutes. */
		const PEAK_EDGES = Object.freeze([60, 240, 360, 600]);

		/** One UTC day in milliseconds. */
		const DAY_MS = 86400000;

		/**
		 * Rate class of one UTC weekday and minute.
		 * @param dow - UTC weekday, 0 = Sunday.
		 * @param minute - UTC minutes after midnight.
		 * @returns true while peak pricing applies.
		 */
		function isPeakMinute(dow, minute) {
			if (dow === 0 || dow === 6) return false;
			for (const window of PEAK_WINDOWS) {
				if (minute >= window[0] && minute < window[1]) return true;
			}
			return false;
		}

		/**
		 * Rate class of one instant.
		 * @param ms - epoch milliseconds.
		 * @returns true while peak pricing applies.
		 */
		function isPeakInstant(ms) {
			const date = new Date(ms);
			return isPeakMinute(date.getUTCDay(), date.getUTCHours() * 60 + date.getUTCMinutes());
		}

		/**
		 * The rate class in effect and how long it still lasts. Scans forward over
		 * the following eight UTC days, so a weekend stretches the answer to the
		 * next Monday instead of collapsing to zero.
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

		/** True when one instant falls on a UTC weekend. */
		function isWeekendInstant(ms) {
			const dow = new Date(ms).getUTCDay();
			return dow === 0 || dow === 6;
		}

		/**
		 * Price one session's provider-reported buckets.
		 * @param usage - the session's token-usage projection value.
		 * @param model - the selected route's model id.
		 * @param peak - whether peak rates apply.
		 * @returns per-bucket money, the total and the rates used, or undefined for
		 * an unrated model.
		 */
		function priceUsage(usage, model, peak) {
			const rates = RATES[model];
			if (rates === undefined || usage === undefined || usage === null) return undefined;
			const factor = (peak ? 1 : 0.5) / 1e6;
			const cacheRead = (usage.cacheReadTokens ?? 0) * rates.cacheRead * factor;
			const missTokens = (usage.uncachedInputTokens ?? 0) + (usage.cacheWriteTokens ?? 0);
			const cacheMiss = missTokens * rates.cacheMiss * factor;
			const output = (usage.outputTokens ?? 0) * rates.output * factor;
			return {
				cacheRead,
				cacheMiss,
				output,
				missTokens,
				total: cacheRead + cacheMiss + output,
				rates,
			};
		}

		/**
		 * What the context reclaimed from the next request saves at each input
		 * rate. A reclaimed span normally sits inside a cached prefix, so those
		 * tokens would have been re-sent at the cache-read rate on every following
		 * request; the uncached figure is the same span priced as a cache miss.
		 * @param tokens - tokens removed from the next request.
		 * @param model - the selected route's model id.
		 * @param peak - whether peak rates apply.
		 * @returns both money figures, or undefined for an unrated model.
		 */
		function priceSaved(tokens, model, peak) {
			const rates = RATES[model];
			if (rates === undefined || !(tokens > 0)) return undefined;
			const factor = (peak ? 1 : 0.5) / 1e6;
			return {
				cached: tokens * rates.cacheRead * factor,
				uncached: tokens * rates.cacheMiss * factor,
			};
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
		 * Money with enough precision for sub-cent figures: <$0.001, $0.0784, $1.23.
		 * @param value - an amount in USD.
		 * @returns the display form.
		 */
		function formatMoney(value) {
			if (!Number.isFinite(value) || value <= 0) return "$0";
			if (value < 0.001) return "<$0.001";
			if (value < 1) return "$" + value.toFixed(4);
			return "$" + value.toFixed(2);
		}

		// #endregion pricing

		/**
		 * This page's mirror of the Host peak guard, which is the authority: the
		 * mirror only decides what the strip shows and offers, and every action is
		 * re-issued to the Host as a command. `/peak-guard` from another client is
		 * therefore not reflected here until the strip's host status line is read,
		 * and the override is forgotten on page reload. The initial `enabled` value
		 * matches the profile patch's `config.enabled`.
		 */
		const peakGuard = { enabled: true, overrideUntil: 0 };

		/** Override lengths the strip offers, in minutes. */
		const ALLOW_CHOICES = [15, 60];

		/**
		 * Build this page's data store and actions over the plugin manager Remote.
		 * @param ctx - the browser plugin context.
		 * @param t - this page's dictionary reader.
		 * @returns the state store and the actions the section renders.
		 */
		function createController(ctx, t) {
			let state = {
				status: "loading",
				rows: [],
				busy: [],
				notice: null,
				error: null,
			};
			const listeners = new Set();

			const publish = (patch) => {
				state = { ...state, ...patch };
				for (const listener of [...listeners]) listener();
			};

			/** Read the live Host inventory into the store. */
			const refresh = async () => {
				try {
					const remote = ctx.remote;
					const manager = remote === undefined ? undefined : remote.pluginManager;
					if (manager === undefined)
						throw new Error("this deployment exposes no plugin manager");
					const rows = unwrap(await manager.listPlugins(), "listPlugins");
					publish({
						status: "ready",
						rows: Array.isArray(rows) ? rows : [],
						error: null,
					});
				} catch (error) {
					publish({ status: "error", rows: [], error: messageOf(error) });
				}
			};

			/**
			 * Persist one row's enablement and apply it.
			 * @param row - the inventory row to change.
			 * @param enabled - the desired state.
			 * @returns the observed application outcome.
			 */
			const setRowEnabled = async (row, enabled) => {
				try {
					const value = unwrap(
						await ctx.remote.pluginManager.setPluginEnabled(row.entryId, enabled),
						"setPluginEnabled",
					);
					if (value === undefined || value.application === undefined)
						return { failed: "failed" };
					if (value.application === "failed")
						return {
							failed:
								value.error === undefined ? "failed" : String(value.error.code),
						};
					return value.application;
				} catch (error) {
					return { failed: messageOf(error) };
				}
			};

			/**
			 * Apply one outcome to the page's notice, counting what it changed.
			 * @param outcome - what `setRowEnabled` reported.
			 * @param name - the capability's display name.
			 * @param counts - the running tally the preset summary prints.
			 */
			const account = (outcome, name, counts) => {
				if (outcome === "applied") counts.ok += 1;
				else if (outcome === "restart-required") {
					counts.ok += 1;
					counts.restart = true;
				} else if (outcome === "overridden") {
					counts.overridden.push(name);
				} else counts.failed += 1;
			};

			/** Turn one capability on or off by the user's click. */
			const setEnabled = async (capabilityId, enabled) => {
				const capability = capabilityOf(capabilityId);
				const row = capability === undefined ? undefined : resolveRow(state.rows, capability);
				if (capability === undefined || row === undefined) return;
				const name = t(capability.id + "Title");
				const needed = [];
				if (enabled)
					for (const dependency of dependencyChain(capability)) {
						const dependencyRow = resolveRow(state.rows, dependency);
						if (dependencyRow === undefined || dependencyRow.enabled === true) continue;
						if (dependencyRow.patchId === undefined) continue;
						needed.push({ dependency, row: dependencyRow });
					}
				const dependents = [];
				if (!enabled)
					for (const entry of CAPABILITIES) {
						if (entry.requires === undefined || !entry.requires.includes(capabilityId))
							continue;
						const entryRow = resolveRow(state.rows, entry);
						if (entryRow !== undefined && entryRow.enabled === true)
							dependents.push(t(entry.id + "Title"));
					}
				publish({ busy: [capability.id], notice: null });
				const dependencyOutcomes = [];
				for (const item of needed)
					dependencyOutcomes.push(await setRowEnabled(item.row, true));
				const outcome = await setRowEnabled(row, enabled);
				await refresh();
				publish({ busy: [] });
				const dependencyFailed = dependencyOutcomes.some(
					(result) => result !== "applied" && result !== "restart-required",
				);
				if (typeof outcome === "object" && outcome !== null)
					publish({
						notice: {
							kind: "error",
							text: t("singleFailed", { name, error: outcome.failed }),
						},
					});
				else if (outcome === "overridden")
					publish({ notice: { kind: "warn", text: t("singleOverridden", { name }) } });
				else if (dependencyFailed)
					publish({
						notice: {
							kind: "error",
							text: t("singleFailed", { name, error: "dependency" }),
						},
					});
				else if (outcome === "restart-required")
					publish({ notice: { kind: "warn", text: t("singleRestart", { name }) } });
				else if (enabled && needed.length > 0)
					publish({
						notice: {
							kind: "ok",
							text: t("singleOnWithDependency", {
								name,
								dependency: needed
									.map((item) => t(item.dependency.id + "Title"))
									.join(", "),
							}),
						},
					});
				else if (!enabled && dependents.length > 0)
					publish({
						notice: {
							kind: "warn",
							text: t("singleOffDependent", {
								name,
								dependent: dependents.join(", "),
							}),
						},
					});
				else
					publish({
						notice: { kind: "ok", text: t(enabled ? "singleOn" : "singleOff", { name }) },
					});
			};

			/** Turn on every capability one preset names, without disabling anything. */
			const applyPreset = async (preset) => {
				if (state.busy.length > 0) return;
				const wanted = CAPABILITIES.filter((entry) => entry.presets.includes(preset));
				const ordered = [];
				const seen = new Set();
				const collect = (capability) => {
					if (seen.has(capability.id)) return;
					seen.add(capability.id);
					for (const dependency of dependencyChain(capability)) collect(dependency);
					ordered.push(capability);
				};
				for (const capability of wanted) collect(capability);
				const pending = [];
				const blocked = [];
				for (const capability of ordered) {
					const row = resolveRow(state.rows, capability);
					if (row === undefined || row.enabled === true) continue;
					if (row.patchId === undefined) {
						blocked.push(t(capability.id + "Title"));
						continue;
					}
					pending.push({ capability, row });
				}
				if (pending.length === 0) {
					publish({
						notice:
							blocked.length === 0
								? { kind: "ok", text: t("summaryNone") }
								: {
										kind: "warn",
										text: t("summaryBlocked", { names: blocked.join(", ") }),
									},
					});
					return;
				}
				const counts = { ok: 0, failed: 0, restart: false, overridden: blocked };
				for (const item of pending) {
					publish({ busy: [item.capability.id], notice: null });
					account(
						await setRowEnabled(item.row, true),
						t(item.capability.id + "Title"),
						counts,
					);
					await refresh();
				}
				publish({ busy: [] });
				if (counts.failed > 0)
					publish({
						notice: {
							kind: "error",
							text: t("summaryFailed", { count: counts.ok, failed: counts.failed }),
						},
					});
				else if (counts.overridden.length > 0)
					publish({
						notice: {
							kind: "warn",
							text: t("summaryOverridden", {
								count: counts.ok,
								overridden: counts.overridden.join(", "),
							}),
						},
					});
				else if (counts.restart)
					publish({
						notice: { kind: "warn", text: t("summaryRestart", { count: counts.ok }) },
					});
				else publish({ notice: { kind: "ok", text: t("summaryOk", { count: counts.ok }) } });
			};

			/**
			 * Run one command in a session through the Host remote. The Host owns the
			 * refusal, so its own text is surfaced instead of a generic failure.
			 * @param sessionId - the session the strip belongs to.
			 * @param line - the complete slash-command line.
			 * @param args - the command's arguments.
			 * @param texts - dictionary keys for the unavailable, failed, and empty-success cases.
			 * @returns the notice the strip renders.
			 */
			const execute = async (sessionId, line, args, texts) => {
				try {
					const commands = ctx.remote.commands;
					if (commands === undefined) return { kind: "error", text: t(texts.unknown) };
					const result = await commands.execute(sessionId, line, args);
					if (result === undefined || result.ok !== true) {
						const failure = result === undefined ? undefined : result.error;
						return {
							kind: "error",
							text: t(texts.failed, {
								error:
									failure === undefined ? "failed" : String(failure.code),
							}),
						};
					}
					if (result.value === undefined) return { kind: "error", text: t(texts.unknown) };
					const outcome = result.value.result;
					if (outcome === undefined) return { kind: "error", text: t(texts.unknown) };
					if (outcome.kind === "error") return { kind: "error", text: String(outcome.text) };
					if (typeof outcome.text === "string" && outcome.text.length > 0)
						return { kind: "ok", text: outcome.text };
					return { kind: "ok", text: t(texts.done) };
				} catch (error) {
					return { kind: "error", text: t(texts.failed, { error: messageOf(error) }) };
				}
			};

			/** The shipped compact command's wording. */
			const COMPACT_TEXTS = {
				unknown: "savingsCompactUnknown",
				failed: "savingsCompactFailed",
				done: "savingsCompactDone",
			};

			/** The peak guard's wording, from the Host half of this bundle. */
			const GUARD_TEXTS = {
				unknown: "savingsCommandUnknown",
				failed: "savingsCommandUnloaded",
				done: "savingsCommandDone",
			};

			/** Condense one session now through the shipped compact command. */
			const compact = (sessionId) => execute(sessionId, "/compact", [], COMPACT_TEXTS);

			/** Ask the Host to show or change its peak guard. */
			const guard = (sessionId, line, args) =>
				execute(sessionId, line, args, GUARD_TEXTS);

			return {
				get: () => state,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
				refresh,
				setEnabled,
				applyPreset,
				compact,
				guard,
			};
		}

		/** The page's state until a controller answers. */
		const EMPTY_STATE = Object.freeze({
			status: "loading",
			rows: [],
			busy: [],
			notice: null,
			error: null,
		});

		/**
		 * Read the controller's state and re-render on every publish.
		 * @param controller - the page's controller.
		 * @returns the current state.
		 */
		function useControllerState(controller) {
			const [state, setState] = React.useState(() =>
				controller === undefined ? EMPTY_STATE : controller.get(),
			);
			React.useEffect(() => {
				if (controller === undefined) return undefined;
				setState(controller.get());
				return controller.subscribe(() => setState(controller.get()));
			}, [controller]);
			return state;
		}

		/**
		 * One capability's state, as the card renders it.
		 * @param capability - the capability to describe.
		 * @param state - the page state.
		 * @param t - the page's dictionary reader.
		 * @returns the chip's kind, its copy, and whether a switch is offered.
		 */
		function describe(capability, state, t) {
			const row = resolveRow(state.rows, capability);
			const busy = state.busy.includes(capability.id);
			if (row === undefined)
				return {
					kind: "off",
					text: "stateUnavailable",
					control: "none",
					busy,
					missing: true,
				};
			if (capability.fixed === true)
				return {
					kind: "off",
					text: "stateRequired",
					control: "none",
					busy,
					missing: false,
				};
			if (row.patchId === undefined)
				return {
					kind: "off",
					text: "stateManaged",
					control: "locked",
					busy,
					missing: false,
				};
			if (row.enabled !== true)
				return { kind: "off", text: "stateOff", control: "switch", busy, missing: false };
			if (row.fiberPhase === "failed")
				return {
					kind: "warn",
					text: "stateFailed",
					control: "switch",
					busy: false,
					missing: false,
				};
			if (row.fiberPhase === "pending" || row.fiberPhase === "loading") {
				const waiting = missingDependency(capability, state.rows, t);
				return waiting === undefined
					? {
							kind: "warn",
							text: "stateStarting",
							control: "switch",
							busy: false,
							missing: false,
						}
					: {
							kind: "warn",
							text: "stateNeedsDependency",
							params: { name: waiting },
							control: "switch",
							busy: false,
							missing: false,
						};
			}
			return { kind: "on", text: "stateOn", control: "switch", busy: false, missing: false };
		}

		/**
		 * The Settings page: one row per token-saving capability plus the presets.
		 * @param props - slot props (`t`, the shell's `close`, and the controller).
		 * @returns the section element tree.
		 */
		function TokenSaverSection(props) {
			const controller = props.controller;
			const t = typeof props.t === "function" ? props.t : (key) => key;
			const state = useControllerState(controller);
			React.useEffect(() => {
				if (controller !== undefined) controller.refresh();
			}, [controller]);
			const notices = [];
			if (state.status === "loading")
				notices.push(
					h("p", { className: "dts-notice", key: "loading" }, t("loading")),
				);
			if (state.error !== null)
				notices.push(
					h(
						"p",
						{ className: "dts-notice dts-notice-error", key: "error" },
						t("loadFailed", { error: state.error }),
					),
				);
			if (state.notice !== null)
				notices.push(
					h(
						"p",
						{
							className: "dts-notice dts-notice-" + state.notice.kind,
							key: "notice",
							role: "status",
							"aria-live": "polite",
						},
						state.notice.text,
					),
				);
			const busy = state.busy.length > 0;
			return h(
				"section",
				{ className: "dts-root" },
				h("h2", { className: "dts-title" }, t("title")),
				h("p", { className: "dts-intro" }, t("intro")),
				h(
					"div",
					{ className: "dts-toolbar" },
					h(
						"button",
						{
							type: "button",
							className: "dts-button dts-button-primary",
							disabled: busy || state.status !== "ready",
							onClick: () => {
								controller.applyPreset("maximum");
							},
						},
						t("presetMaximum"),
					),
					h(
						"button",
						{
							type: "button",
							className: "dts-button",
							disabled: busy || state.status !== "ready",
							onClick: () => {
								controller.applyPreset("recommended");
							},
						},
						t("presetRecommended"),
					),
					h(
						"button",
						{
							type: "button",
							className: "dts-button",
							disabled: busy,
							onClick: () => {
								if (controller !== undefined) controller.refresh();
							},
						},
						t("refresh"),
					),
				),
				notices,
				state.status === "ready" &&
					h(
						"ul",
						{ className: "dts-list" },
						CAPABILITIES.map((capability) => {
							const view = describe(capability, state, t);
							const name = t(capability.id + "Title");
							const row = resolveRow(state.rows, capability);
							const on = row !== undefined && row.enabled === true;
							const chip = h(
								"span",
								{
									className:
										"dts-chip" +
										(view.kind === "on"
											? " dts-chip-on"
											: view.kind === "warn"
												? " dts-chip-warn"
												: ""),
								},
								t(view.busy ? "applying" : view.text, view.params),
							);
							const control =
								view.control === "switch"
									? h(
											"button",
											{
												type: "button",
												role: "switch",
												"aria-checked": on,
												"aria-label": name,
												disabled: view.busy,
												className: "dts-switch" + (on ? " dts-switch-on" : ""),
												onClick: () => {
													controller.setEnabled(capability.id, !on);
												},
											},
											h("span", { className: "dts-knob" }),
										)
									: null;
							return h(
								"li",
								{ className: "dts-card", key: capability.id },
								h(
									"div",
									{ className: "dts-card-main" },
									h(
										"div",
										{ className: "dts-card-head" },
										h("span", { className: "dts-card-name" }, name),
										chip,
									),
									h("p", { className: "dts-card-what" }, t(capability.id + "What")),
									view.missing === true &&
										h("p", { className: "dts-card-note" }, t("unavailableHint")),
								),
								control,
							);
						}),
					),
				h("p", { className: "dts-footnote" }, t("footnote")),
			);
		}

		/**
		 * Ambient session strip below the composer: what the next request carries,
		 * what has been removed from it since the last provider sample, what that
		 * costs on the selected route at the rate class in effect now, and a
		 * one-click condensation of the session.
		 *
		 * Figures come from the token meter's session projections.
		 * `contextPressure.pressureTokens` is the provider-reported prompt size of
		 * the most recent request; `projectedTokens` is what the next request would
		 * cost once the surface's gains and losses since that sample are repriced,
		 * so the difference is exactly what pruning or compaction has removed.
		 * `tokenUsage` carries the four disjoint provider-reported billing buckets
		 * of the whole log, and `modelSelection` names the route they were billed
		 * on. Renders nothing until there is either a pressure reading or a
		 * published rate for the selected model.
		 * @param props - session slot props plus this plugin's compact action.
		 * @returns the strip, or null while it has nothing to report.
		 */
		function SavingsStrip(props) {
			const t = typeof props.t === "function" ? props.t : (key) => key;
			const useProjection = props.useProjection;
			const pressure = typeof useProjection === "function" ? useProjection("contextPressure") : undefined;
			const breakdown =
				typeof useProjection === "function" ? useProjection("contextBreakdown") : undefined;
			const usage = typeof useProjection === "function" ? useProjection("tokenUsage") : undefined;
			const selection =
				typeof useProjection === "function" ? useProjection("modelSelection") : undefined;
			const [open, setOpen] = React.useState(false);
			const [pending, setPending] = React.useState(false);
			const [outcome, setOutcome] = React.useState(null);
			const [guardState, setGuardState] = React.useState(() => ({ ...peakGuard }));
			const [guardNote, setGuardNote] = React.useState(null);
			const [guardPending, setGuardPending] = React.useState(false);
			const [nowMs, setNowMs] = React.useState(() => Date.now());
			React.useEffect(() => {
				const timer = setInterval(() => setNowMs(Date.now()), 1000);
				return () => clearInterval(timer);
			}, []);
			const used =
				pressure === undefined
					? undefined
					: pressure.projectedTokens ?? pressure.pressureTokens;
			const capacity = pressure === undefined ? undefined : pressure.contextWindow;
			const reading = used !== undefined && capacity !== undefined && capacity > 0;
			const model =
				selection === undefined || selection === null
					? undefined
					: (selection.next ?? selection.lastUsed)?.model;
			const status = peakStatus(nowMs);
			const cost = priceUsage(usage, model, status.peak);
			if (!reading && cost === undefined) return null;
			const reported = pressure === undefined ? undefined : pressure.pressureTokens;
			const freed = reported === undefined || used === undefined ? 0 : reported - used;
			const percent = reading ? (used / capacity) * 100 : undefined;
			const saved = freed > 0 ? priceSaved(freed, model, status.peak) : undefined;
			const weekend = status.peak ? false : isWeekendInstant(nowMs);
			const regime = status.peak
				? t("pricingRegimePeak", { when: formatCountdown(status.untilMs) })
				: weekend
					? t("pricingRegimeWeekend", { when: formatCountdown(status.untilMs) })
					: t("pricingRegimeOff", { when: formatCountdown(status.untilMs) });
			const money = (value) => formatMoney(value);
			const overrideLeft = guardState.overrideUntil - nowMs;
			const blocked = guardState.enabled && status.peak && overrideLeft <= 0;
			const overridden = guardState.enabled && status.peak && overrideLeft > 0;
			const runCompact = async () => {
				if (props.compact === undefined || pending) return;
				setPending(true);
				setOutcome(null);
				setOutcome(await props.compact(props.sessionId));
				setPending(false);
			};
			/**
			 * Ask the Host to change the guard, then mirror what it accepted. The Host
			 * stays the authority: a refused command leaves the mirror alone.
			 * @param line - the command line to run.
			 * @param args - its arguments.
			 * @param patch - the mirror update to apply on success, or undefined to only read.
			 */
			const runGuard = async (line, args, patch) => {
				if (props.guard === undefined || guardPending) return;
				setGuardPending(true);
				setGuardNote(null);
				const result = await props.guard(props.sessionId, line, args);
				if (result.kind !== "error" && patch !== undefined) {
					Object.assign(peakGuard, patch);
					setGuardState({ ...peakGuard });
				}
				setGuardNote(result);
				setGuardPending(false);
			};
			const allowFor = (minutes) =>
				runGuard("/peak-allow", [String(minutes)], {
					overrideUntil: Date.now() + minutes * 60000,
				});
			const blockNow = () => runGuard("/peak-block", [], { overrideUntil: 0 });
			const readGuard = () => runGuard("/peak-guard", [], undefined);
			const rows = [
				["savingsDetailLast", reading && reported !== undefined ? formatTokens(reported) : "—"],
				["savingsDetailNext", reading ? formatTokens(used) : "—"],
				["savingsDetailFreed", reading && freed > 0 ? "−" + formatTokens(freed) : "—"],
			];
			const priced = [
				["pricingDetailSpend", cost === undefined ? undefined : money(cost.total)],
				[
					"pricingDetailCacheRead",
					cost === undefined
						? undefined
						: formatTokens(usage.cacheReadTokens ?? 0) + " · " + money(cost.cacheRead),
				],
				[
					"pricingDetailCacheMiss",
					cost === undefined
						? undefined
						: formatTokens(cost.missTokens) + " · " + money(cost.cacheMiss),
				],
				[
					"pricingDetailOutput",
					cost === undefined
						? undefined
						: formatTokens(usage.outputTokens ?? 0) + " · " + money(cost.output),
				],
				[
					"pricingDetailSavedCached",
					saved === undefined ? undefined : money(saved.cached),
				],
				[
					"pricingDetailSavedUncached",
					saved === undefined ? undefined : money(saved.uncached),
				],
			];
			const modelText =
				model === undefined ? t("pricingDetailUnknownModel") : model;
			const ratesText =
				cost === undefined
					? t("pricingNoRates", { model: modelText })
					: t("pricingDetailRates", {
							regime: status.peak ? t("pricingPeak") : t("pricingOffPeak"),
							cacheRead: money(cost.rates.cacheRead),
							cacheMiss: money(cost.rates.cacheMiss),
							output: money(cost.rates.output),
						});
			return h(
				"div",
				{ className: "dts-strip" },
				h(
					"button",
					{
						type: "button",
						className: "dts-strip-main",
						title: t("savingsTitle"),
						"aria-expanded": open,
						onClick: () => setOpen(!open),
					},
					h(
						"span",
						{ className: "dts-strip-regime" },
						h("span", {
							className: "dts-strip-dot",
							"data-peak": status.peak ? "1" : weekend ? "weekend" : "0",
						}),
						regime,
					),
					(blocked || overridden) &&
						h(
							"span",
							{
								className: blocked ? "dts-strip-blocked" : "dts-strip-saved",
								title: t("peakBlockedHint"),
							},
							blocked
								? t("peakBlocked")
								: t("peakOverride", { when: formatCountdown(overrideLeft) }),
						),
					cost !== undefined &&
						h("span", null, t("pricingSpend", { money: money(cost.total) })),
					saved !== undefined &&
						h(
							"span",
							{ className: "dts-strip-saved" },
							t("pricingSaved", { money: money(saved.cached) }),
						),
					reading &&
						freed > 0 &&
						h(
							"span",
							{ className: "dts-strip-saved" },
							t("savingsPruned", { tokens: formatTokens(freed) }),
						),
					reading &&
						h(
							"span",
							null,
							t("savingsNext", {
								used: formatTokens(used),
								window: formatTokens(capacity),
							}),
						),
					reading &&
						h(
							"span",
							null,
							percent < 1
								? t("savingsLessThanOne")
								: t("savingsPercent", { percent: Math.round(percent) }),
						),
				),
				blocked &&
					h(
						"button",
						{
							type: "button",
							className: "dts-strip-action",
							title: t("peakAllowHint"),
							disabled: guardPending,
							onClick: () => allowFor(ALLOW_CHOICES[0]),
						},
						t("peakAllow", { minutes: ALLOW_CHOICES[0] }),
					),
				h(
					"button",
					{
						type: "button",
						className: "dts-strip-action",
						disabled: pending,
						onClick: runCompact,
					},
					pending ? t("savingsCompacting") : t("savingsCompact"),
				),
				(guardNote ?? outcome) !== null &&
					h(
						"span",
						{
							className:
								"dts-strip-note dts-strip-note-" + (guardNote ?? outcome).kind,
							role: "status",
							"aria-live": "polite",
						},
						(guardNote ?? outcome).text,
					),
				open &&
					h(
						"dl",
						{ className: "dts-strip-detail" },
						h(
							"div",
							{ className: "dts-strip-row" },
							h("dt", null, t("pricingDetailModel")),
							h("dd", null, modelText),
						),
						h(
							"div",
							{ className: "dts-strip-row" },
							h("dt", null, t("pricingDetailRegime")),
							h("dd", null, regime),
						),
						rows.map(([key, value]) =>
							h(
								"div",
								{ className: "dts-strip-row", key },
								h("dt", null, t(key)),
								h("dd", null, value === undefined ? "—" : value),
							),
						),
						breakdown !== undefined &&
							[
								["savingsDetailSystem", breakdown.systemTokens],
								["savingsDetailTools", breakdown.toolsTokens],
								["savingsDetailMessages", breakdown.messageTokens],
							].map(([key, value]) =>
								h(
									"div",
									{ className: "dts-strip-row", key },
									h("dt", null, t(key)),
									h("dd", null, formatTokens(value)),
								),
							),
						priced.map(([key, value]) =>
							h(
								"div",
								{ className: "dts-strip-row", key },
								h("dt", null, t(key)),
								h("dd", null, value === undefined ? "—" : value),
							),
						),
						h(
							"div",
							{ className: "dts-strip-row" },
							h("dt", null, t("pricingDetailRatesLabel")),
							h("dd", null, ratesText),
						),
						h(
							"div",
							{ className: "dts-strip-row" },
							h("dt", null, t("peakGuardTitle")),
							h(
								"dd",
								null,
								!guardState.enabled
									? t("peakGuardIsOff")
									: blocked
										? t("peakGuardRefusing")
										: overridden
											? t("peakGuardOverridden", {
													when: formatCountdown(overrideLeft),
												})
											: t("peakGuardWaiting", {
													when: formatCountdown(status.untilMs),
												}),
							),
						),
						h("div", { className: "dts-strip-caveat" }, t("peakGuardExplain")),
						h(
							"div",
							{ className: "dts-strip-actions" },
							ALLOW_CHOICES.map((minutes) =>
								h(
									"button",
									{
										type: "button",
										className: "dts-strip-mini",
										key: minutes,
										disabled: guardPending,
										onClick: () => allowFor(minutes),
									},
									t("peakAllow", { minutes }),
								),
							),
							h(
								"button",
								{
									type: "button",
									className: "dts-strip-mini",
									disabled: guardPending || overrideLeft <= 0,
									onClick: blockNow,
								},
								t("peakBlockNow"),
							),
							h(
								"button",
								{
									type: "button",
									className: "dts-strip-mini",
									disabled: guardPending,
									onClick: () =>
										runGuard("/peak-guard", [
											guardState.enabled ? "off" : "on",
										], { enabled: !guardState.enabled }),
								},
								guardState.enabled
									? t("peakGuardOffAction")
									: t("peakGuardOnAction"),
							),
							h(
								"button",
								{
									type: "button",
									className: "dts-strip-mini",
									disabled: guardPending,
									onClick: readGuard,
								},
								t("peakGuardStatus"),
							),
						),
						h("div", { className: "dts-strip-caveat" }, t("pricingCaveat")),
					),
			);
		}

		/**
		 * Register the page while the deployment exposes a plugin manager Remote.
		 * @param ctx - the browser plugin context.
		 */
		function apply(ctx) {
			const t = ctx.locale.bind(NS);
			ctx.effect(() => ctx.locale.register(NS, { en }), "token-saver: dictionary");
			ctx.effect(injectStyles, "token-saver: styles");
			const controller = createController(ctx, t);
			ctx.slots.inject("settings.section", () =>
				ctx.slots.register(
					{
						name: "settings.section",
						id: "token-saver",
						order: 30,
						label: () => t("nav"),
						locale: NS,
						inject: () => ({ controller }),
					},
					TokenSaverSection,
				),
			);
			ctx.slots.inject("conversation.composer.dock", () =>
				ctx.slots.register(
					{
						name: "conversation.composer.dock",
						id: "token-saver-savings",
						order: 10,
						locale: NS,
						inject: () => ({ compact: controller.compact, guard: controller.guard }),
					},
					SavingsStrip,
				),
			);
		}

		return {
			inject: ["slots", "locale", "remote", "remote.pluginManager", "remote.commands"],
			apply,
		};
	},
});
