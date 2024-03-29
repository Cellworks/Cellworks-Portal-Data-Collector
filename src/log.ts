// imports
import util from "util";
import path from "path";
import fs from "fs";
import utility from "./utility";

// get data
import config from "../config/config.json";

// colors
let ConsoleColor = {
	Red: "\x1b[31m%s\x1b[0m",
	Green: "\x1b[32m%s\x1b[0m",
	Yellow: "\x1b[33m%s\x1b[0m",
	Blue: "\x1b[34m%s\x1b[0m",
	Magenta: "\x1b[35m%s\x1b[0m",
	Cyan: "\x1b[36m%s\x1b[0m",
	White: "\x1b[39m%s\x1b[0m",
};

// keep track of the day
let currentDay: string = utility.getCurrentDay();

// log files path
let logPath = "../" + config.paths.logs + "/";

// log file write streams
let logFile: {
	[key: string]: fs.WriteStream;
} = {};

// types
type OptionsConfig = {
	file?: string | Array<string> | undefined | null;
	console?: boolean | undefined;
	color?: string | undefined;
};

export default {
	ConsoleColor,
	currentDay,
	logPath,
	logFile,

	//initialize logging
	initLogs: function () {
		//get current day
		this.currentDay = utility.getCurrentDay();

		//init log directory
		utility.createDirectory(path.join(__dirname, this.logPath));

		//init log file write stream list
		this.logFile = {};
	},

	//get log file
	getLog: function (logType: string) {
		//get current day
		const date = utility.getCurrentDay();

		//if its a new day, refresh stored write streams
		if (this.currentDay !== date) {
			//end every stored write stream
			for (const writeStream of Object.entries(this.logFile)) {
				writeStream[1].end();
			}

			//reset stored write streams
			this.logFile = {};

			//store new day
			this.currentDay = date;
		}

		//create log file write stream if it does not already exist
		if (!this.logFile[logType]) {
			//get path
			const filePath = path.join(
				__dirname,
				this.logPath,
				logType,
				"/",
				date + ".txt"
			);

			//make log directory if it doesn't exist
			if (!fs.existsSync(path.join(__dirname, this.logPath, logType))) {
				utility.createDirectory(
					path.join(__dirname, this.logPath, logType)
				);
			}

			//store log file stream
			this.logFile[logType] = fs.createWriteStream(filePath, {
				flags: "a",
			});

			//log debug
			this.debug("New Write Stream: " + logType);
		}

		//return log file
		return this.logFile[logType];
	},

	message: function (
		message: string | Function,
		options: OptionsConfig | undefined = {
			file: null,
			console: true,
			color: ConsoleColor.White,
		}
	) {
		//init options
		if (options === undefined) options = {};

		//if file is specified but console is not, prevent logging to console
		if (options.file && options.console === undefined)
			options.console = false;

		//if file is not specified, prevent logging to file
		if (options.file === undefined) options.file = null;

		//if color is not specified, default to white
		if (options.color === undefined) options.color = ConsoleColor.White;

		//custom message
		if (typeof message === "function") {
			message = message();
			if (typeof message !== "string") {
				throw new TypeError(
					'Invalid return value of function parameter "message" | Must return a String'
				);
			}
		}
		//apply prefix
		else if (typeof message === "string") {
			message = utility.getTimestamp() + " | " + message;
		}
		//non accepted variable
		else {
			throw new TypeError(
				'Invalid assignment to parameter "message" | Must be a Function or String'
			);
		}

		//log message to log files
		if (options.file) {
			//one log file -> array with single file
			if (typeof options.file === "string") {
				const file = options.file;
				options.file = [];
				options.file.push(file);
			}

			//log to files
			var fileIndex = 0;
			while (fileIndex < options.file.length) {
				//write to log
				this.getLog(options.file[fileIndex]).write(message + "\n");

				//next log file
				fileIndex++;
			}
		}

		//log message to console and server/debug log file
		if (options.console) {
			//log to console
			process.stdout.write(
				util.format.apply(null, [options.color, message]) + "\n"
			);

			//determine files to send to
			var files = [];
			//files were already accessed
			if (options.file) {
				if (!options.file.includes("server")) files.push("server");
				if (!options.file.includes("debug")) files.push("debug");
			}
			//files were not already accessed
			else files = ["server", "debug"];

			//log to server/debug file
			this.message(
				() => {
					return message;
				},
				{ file: files }
			);
		}
	},

	debug: function (
		message: string | Function,
		options?: OptionsConfig | undefined
	) {
		//init options
		if (options === undefined) options = {};

		//log to debug file
		if (options.file === undefined) options.file = "debug";

		//if debug in server config is true (and console option is not set), log to console as well
		if (config.debug === true && options.console === undefined)
			options.console = true;

		//set to debug color
		if (options.color === undefined) options.color = ConsoleColor.Magenta;

		//log debug
		this.message(message, options);
	},
};
