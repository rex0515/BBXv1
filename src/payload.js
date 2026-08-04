if (!document.is_l_infected) {
	document.is_l_infected = true;

	(() => {
		// Parser util functions
		class PUtil {
			static id(e) { return e; }

			static range(e) {
				return e.split("-").filter((_, i) => i < 2).map(t => parseInt(t));
			}

			static percentage(e) {
				return clamp(parseInt(e.replace("%")), 0, 100) / 100;
			}
		}

		class CommandArg {
			constructor(type_checker, arg_parser) {
				this.type_checker = type_checker;
				this.arg_parser = arg_parser;
			}

			static or(...args) {
				const type_checker = e => args.some(p => p.type_checker(e));
				const arg_parser = e => { for (const arg of args) { if (arg.type_checker(e)) return arg.arg_parser(e) } };
				return new this (type_checker, arg_parser);
			}
		}

		class CommandSchema {
			static _commands = [];
			constructor(command, c_args, callback) {
				if (this.constructor._commands.includes(command)) {
					console.warn(command + " is already assigned")
				}
				this.constructor._commands.push(command);

				this.cmd = command;
				this.c_args = c_args;
				this.callback = callback;
			}

			run(args) {
				command_history.splice(0, 0, [this, args]);

				if (args.length !== this.c_args.length) return "arg length mismatch";
				const arg_err = [];
				const current_args = this.c_args.map((arg_p, i) => {
					if (!arg_p.type_checker(args[i])) arg_err.push(i);
					return arg_p.arg_parser(args[i]);
				})

				if (arg_err.length > 0) {
					console.warn(this.cmd, args, arg_err);
					return arg_err;
				}

				this.callback(...current_args);
			}
		}

		class PersistentStorage {
			static select_settings = {};
			static string_colors = {};
			static percentage_bar = {};
			static misc = {};
			static cursor_position;

			static get lsk() {
				const a = (new URL(document.URL)).pathname.split("/").filter(e => e !== "");
				return "l-persistent-storage" + `-${a[a.length - 1]}`;
			}

			static update_field(field, key, value) {
				this[field][key] = value;
				this.store();
			}

			static update_value(field, value) {
				this[field] = value;
				this.store();
			}

			static reset() {
				localStorage.removeItem(this.lsk)
			}

			static setup() {
				this.select_settings["stroke"] = "#f27059";
				this.select_settings["opacity"] = "0.2";
				this.select_settings["stroke-width"] = "48px";
				this.select_settings["stroke-linecap"] = "round";

				this.percentage_bar.fg = "#f7633f";
				this.percentage_bar.bg = "#131313";

				this.misc.is_auto_focus = false;

				this.cursor_position = 0;
			}

			static load() {
				const stored_settings = localStorage.getItem(this.lsk);
				if (stored_settings === null) {
					this.setup();
				} else {
					const parsed_settings = JSON.parse(stored_settings);
					this.select_settings = parsed_settings.select_settings;
					this.string_colors = parsed_settings.string_colors;
					this.cursor_position = parsed_settings.cursor_position;
					this.percentage_bar = parsed_settings.percentage_bar;
					this.misc = parsed_settings.misc;
				}

				// Load select settings
				Object.keys(this.select_settings).forEach(key => {
					set_select_property(key, this.select_settings[key]);
				})

				// Load string colors
				Object.keys(this.string_colors).forEach(key => {
					set_string_color(key, this.string_colors[key]);
				})

				// Load percentage bar settings
				set_percentage_bar_fg(this.percentage_bar.fg);
				set_percentage_bar_bg(this.percentage_bar.bg);

				// Load cursor position
				set_cursor(this.cursor_position);

				// Load miscellaneous settings
				if (is_auto_focus === undefined) console.warn("is_auto_focus setting is disabled");
				is_auto_focus = this.misc.is_auto_focus;
			}

			static store() {
				let current_settings = {
					select_settings: this.select_settings,
					string_colors: this.string_colors,
					cursor_position: this.cursor_position,
					percentage_bar: this.percentage_bar,
				}
				localStorage.setItem(this.lsk, JSON.stringify(current_settings));
			}
		}

		// Some named arguments
		class NamedArgs {
			static uint = new CommandArg(
				/* unsigned int */
				/ /i.test.bind(/^\d+$/i),
				parseInt
			)
			static uint_range = new CommandArg(
				/* unsigned int range */
				/ /i.test.bind(/^\d+-\d+$/i),
				PUtil.range
			)
			static percentage = new CommandArg(
				/* percentage */
				/ /i.test.bind(/^\d+%$/i),
				PUtil.percentage
			)
			static char = new CommandArg(
				/* a character between a-z, case-insensitive */
				/ /i.test.bind(/^[A-Z]$/i),
				PUtil.id
			)
			static string = new CommandArg(
				/* a string */
				_ => true,
				PUtil.id
			)
			static hex_color = new CommandArg(
				/* a color in hexadecimal format, must include 6 characters */
				/ /i.test.bind(/^#[0-9A-F]{6}$/i),
				PUtil.id
			)
			static px_size = new CommandArg(
				/* a length in pixels */
				/ /i.test.bind(/^[0-9]+px$/i),
				PUtil.id
			)
			static color_char = CommandArg.or(
				NamedArgs.hex_color, NamedArgs.char
			)
		}

		// Commands used by the console
		let commands = [
			new CommandSchema(
				// Sets the cursor at the given line
				/* line-index */
				"goto", [NamedArgs.uint], e => set_cursor(e - 1)
			),
			new CommandSchema(
				// Toggles autofocus when using goto or arrow keys
				"autofocus", [], _ => is_auto_focus = !is_auto_focus
			),
			new CommandSchema(
				// Scrolls the page towards the current cursor
				"focus", [], _ => lines[line_cursor].scrollIntoView({ behavior: "smooth", block: "center" })
			),
			new CommandSchema(
				// Scrolls the page towards the top
				"top", [], _ => window.scrollTo({ top: 0, left: 0, behavior: "smooth" })
			),

			new CommandSchema(
				// Sets the select color
				/* color */
				"sclr", [ NamedArgs.color_char ], e => apply_smart_color(set_select_property, e, ["stroke"])
			),
			new CommandSchema(
				// Sets the select opacity
				/* opacity */
				"sopa", [ NamedArgs.percentage ], e => set_select_property("opacity", e)
			),
			new CommandSchema(
				/* Sets the select size */ /* size */
				"size", [ NamedArgs.px_size ], e => set_select_property("stroke-width", e)
			),

			new CommandSchema(
				// Sets the color of one of the base string
				/* string-index */
				/* color */
				"bclr", [ NamedArgs.uint, NamedArgs.color_char ], (i, c) => apply_smart_color(set_string_color, c, [i]) ),
			new CommandSchema(
				// Sets the color of multiple base strings between the specified range
				/* range */
				/* color */
				"rclr",
				[ NamedArgs.uint_range, NamedArgs.color_char ],
				(r, c) => { for (let i = r[0]; i < r[1]; i++) apply_smart_color(set_string_color, c, [i]); }
			),

			new CommandSchema(
				// Sets the foreground color of the percentage bar
				/* color */
				"pfg", [ NamedArgs.color_char ], c => apply_smart_color(set_percentage_bar_fg, c, [])
			),
			new CommandSchema(
				// Sets the background color of the percentage bar
				/* color */
				"pbg", [ NamedArgs.color_char ], c => apply_smart_color(set_percentage_bar_bg, c, [])
			),

			new CommandSchema(
				// Copies one of the defined colors to clipboard
				/* color-id */
				"ccp", [ NamedArgs.char ], copy_from_console
			),
			new CommandSchema(
				// Resets every setting related to the current pattern
				"reset", [], reset_with_consent
			),
			new CommandSchema(
				// Resets every setting related to the current pattern without the prompt
				"force-reset", [], _ => reset_with_consent(true)
			),
		];

		// Global variables

		let styleSheet;

		let line_cursor = 0;
		let sel_idx, max_lines, lines;

		let console_in;
		let console_state = false;

		let string_rules = {};

		const command_history = [];
		let command_history_cursor = -1;
		let current_command;

		let percent_bar, progress_bar, progress_disp;

		let is_auto_focus;

		// Util functions
		function run_after_load(elem, func) {
			elem.addEventListener("load", func);
			switch (elem.readyState) {
				case "loading":
					break;
				default: {
					elem.dispatchEvent(new Event('load'));
					break;
				}
			}
		}

		function clamp(x, a, b) {
			return Math.min(Math.max(x, a), b);
		}

		// Helper functions
		function get_current_progress() {
			return (line_cursor / max_lines).toFixed(2);
		}

		function get_defined_color(cid) {
			const target = document.querySelector("object.pattern_svg").contentDocument.querySelector(".s1-" + cid);
			if (!target) return -1;

			const style = window.getComputedStyle(target)
			return "#" + style.stroke
				.replace("rgb(", "").replace(")", "").replaceAll(" ", "")
				.split(",").map(e => parseInt(e, 10).toString(16))
				.join("")
		}

		function apply_smart_color(f, clr, args) {
			const new_clr = /^[A-Z]$/i.test(clr) ? get_defined_color(clr) : clr;
			if (/^#[0-9A-F]{6}$/i.test(new_clr)) f(...args, new_clr);
			else console.warn("Couldn't apply color to", f, clr, args);
		}

		// Console command functions
		function copy_from_console(cid) {
			const color = get_defined_color(cid);
			if (color === -1) return;

			navigator.clipboard.writeText(color).then(
				_ => console.log("copy success"),
				_ => console.log("copy error")
			);
		}

		function set_string_color(sid, color) {
			if (!string_rules[sid]) {
				string_rules[sid] = styleSheet.insertRule(`.s1.s1-${sid} { }`, styleSheet.cssRules.length)
			}

			styleSheet.cssRules[string_rules[sid]].style.setProperty("stroke", color, "important");
			PersistentStorage.update_field("string_colors", sid, color);
		}

		function set_select_property(property, style) {
			styleSheet.cssRules[sel_idx].style.setProperty(property, style, "important");
			PersistentStorage.update_field("select_settings", property, style);
		}

		function reset_with_consent(force=false) {
			let inp = ""
			if (!force) inp = prompt("This deletes every setting for this pattern. This process is irreversible. Please type 'CONFIRM' to continue.");

			if (inp.toLowerCase() === "confirm" || force) {
				PersistentStorage.reset();
				alert("Process successful. Please refresh the site.")
			} else {
				alert("Process aborted.")
			}
		}

		function set_cursor(pos) {
			const prev = line_cursor;
			line_cursor = pos;

			if (line_cursor <= 0) line_cursor = 0;
			if (line_cursor >= max_lines) line_cursor = max_lines;

			lines[prev].classList.remove("l-selected-line");
			lines[line_cursor].classList.add("l-selected-line");

			PersistentStorage.update_value("cursor_position", pos);
			update_percentage_bar(get_current_progress());

			if (is_auto_focus)
				lines[line_cursor].scrollIntoView({ behavior: "smooth", block: "center" });
		}

		// Percentage bar functions
		function set_percentage_bar_fg(color) {
			progress_bar.style.backgroundColor = color;
			PersistentStorage.update_field("percentage_bar", "fg", color);
		}

		function set_percentage_bar_bg(color) {
			percent_bar.style.backgroundColor = color;
			PersistentStorage.update_field("percentage_bar", "bg", color);
		}

		function create_percentage_bar() {
			const target = document.querySelector(".pattern_info");

			percent_bar = document.createElement("div");
			progress_bar = document.createElement("div");
			progress_disp = document.createElement("span");

			percent_bar.classList.add("percentage_bar");
			percent_bar.style.width = "100%";
			percent_bar.style.height = "20px";
			percent_bar.style.borderRadius = "10px";
			percent_bar.style.display = "grid";
			percent_bar.style.gridTemplateAreas = '"loverlay"';

			percent_bar.style.marginBottom = "10px";

			percent_bar.style.backgroundColor = "#131313";

			progress_bar.style.width = "0%";
			progress_bar.style.height = "100%";
			progress_bar.style.borderRadius = "10px";

			progress_bar.style.gridArea = "loverlay";
			progress_bar.style.backgroundColor = "#f7633f";

			progress_disp.style.gridArea = "loverlay";
			progress_disp.style.justifySelf = "center";
			progress_disp.style.color = "#ffffff";
			progress_disp.style.mixBlendMode = "difference";

			progress_disp.innerText = "Progress -%"

			percent_bar.appendChild(progress_bar);
			percent_bar.appendChild(progress_disp);
			target.insertBefore(percent_bar, target.firstElementChild);
		}

		function update_percentage_bar(percent) {
			const target = `${Math.round(percent * 100)}%`;
			progress_bar.style.width = target;
			progress_disp.innerText = "Progress " + target;
		}

		// Console functions
		function create_console() {
			const c_wrapper = document.createElement("div");
			c_wrapper.classList.add("l-console-wrapper");
			document.querySelector("style").sheet.insertRule(".l-console-wrapper::before { content: ':' }");

			console_in = document.createElement("input");
			console_in.type = "text";

			c_wrapper.style.position = "sticky";
			c_wrapper.style.bottom = "10px";
			c_wrapper.style.left = "10px";
			c_wrapper.style.marginLeft = "10px";

			c_wrapper.style.fontSize = "20px";
			c_wrapper.style.color = "#ffffff";
			c_wrapper.style.backgroundColor = "#000000";
			c_wrapper.style.width = "fit-content";
			c_wrapper.style.height = "fit-content";

			console_in.style.fontSize = "20px";
			console_in.style.color = "#ffffff";
			console_in.style.backgroundColor = "#00000000";

			console_in.style.padding = "2px 2px 2px 0";
			console_in.style.width = "fit-content";
			console_in.style.minWidth = "10em"
			console_in.style.height = "fit-content";
			console_in.style.minHeight = "1em";

			console_in.style.zIndex = "9999999";

			c_wrapper.append(console_in);
			document.body.appendChild(c_wrapper);
			close_console();
		}

		function open_console() {
			console_state = true;
			console_in.parentElement.style.display = "unset";
			console_in.focus();
		}

		function execute_console() {
			let command = console_in.value;
			let [c, ...args] = command.toLowerCase().split(" ").filter(v => v !== "");
			commands.forEach(cmd => {
				if (cmd.cmd === c) {
					cmd.run(args);
				}
			})
		}

		function set_console_from_history(index) {
			console_in.value = index < 0 ? current_command : (command_history[index].map((e, i) => {
				return i === 0 ? e.cmd : e.join(" ")
			}).join(" "));
		}

		function close_console() {
			console_state = false;
			console_in.parentElement.style.display = "none";
			console_in.value = "";
		}

		function handle_keypress(e) {
			if (lines === undefined) return;

			switch (e.key) {
				case "ArrowDown":
					if (console_state) {
						command_history_cursor -= 1;
						if (command_history_cursor < -1) command_history_cursor = -1;
						set_console_from_history(command_history_cursor);
					} else set_cursor(line_cursor + 1);

					e.preventDefault();
					break;
				case "ArrowUp":
					if (console_state) {
						if (command_history_cursor === -1) current_command = console_in.value;

						command_history_cursor += 1;
						if (command_history_cursor >= command_history.length) command_history_cursor = command_history.length - 1;
						set_console_from_history(command_history_cursor);
					} else set_cursor(line_cursor - 1);

					e.preventDefault();
					break;
				case ":":
					e.preventDefault();
					open_console();
					break;
				case "Escape":
					if (console_state) {
						e.preventDefault();
						close_console();
					}
					break;
				case "Enter":
					if (console_state) {
						e.preventDefault();
						execute_console();
						close_console();
					}
					break;
				default: {
					command_history_cursor = -1;
				}
			}
		}

		// Runs once on startup
		function setup() {
			if (lines !== undefined) return;

			try {
				document.addEventListener("keydown", handle_keypress);

				styleSheet = document.querySelector("object.pattern_svg").contentDocument.querySelector("style").sheet;
				sel_idx = styleSheet.insertRule(".l-selected-line { }", styleSheet.cssRules.length)

				lines = document.querySelector("object.pattern_svg").contentDocument.querySelectorAll("use.l");
				max_lines = lines.length - 1;
				lines[line_cursor].classList.add("l-selected-line");

				create_console();
				create_percentage_bar();

				PersistentStorage.load();

				update_percentage_bar(get_current_progress());

				console.log("setup complete")
			}
			catch (e) {
				console.log(e);
			}
		}

		// Main part
		run_after_load(document, _ => {
			run_after_load(document.querySelector("object.pattern_svg"), setup);
		});
	}) ();
}
