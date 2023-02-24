// Main Server

// imports
import util from "util";
import utility from "./utility";
import scrape from "./scrape";
import database from "./database";
import log from "./log";

// config
import config from "../config/config.json";

//init logging
log.initLogs();

//send console logs to server log file
console.log = function () {
	//format message
	const message = util.format.apply(null, arguments as any | any[]);

	//log to file
	log.message(message, {
		file: ["server", "debug"],
	});

	//log to console
	process.stdout.write(message + "\n");
};
console.error = console.log;

// run function at certain hour
function runAtHour(hour: number, callback: Function) {
	// get the current time
	var now = utility.getTimezone(new Date());

	// init start
	var start: Date;

	// init wait
	var wait: number;

	// run today (hour is coming up)
	if (now.getUTCHours() < hour) {
		start = utility.getTimezone(
			new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate(),
				hour,
				0,
				0,
				0
			)
		);
	}
	// run tomorrow (hour already passed)
	else {
		start = utility.getTimezone(
			new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate() + 1,
				8,
				0,
				0,
				0
			)
		);
	}

	// time until run
	wait = start.getTime() - now.getTime();

	// log
	log.message("Will run in " + utility.formatSeconds(wait / 1000));

	// wait for the hour to come up
	setTimeout(() => {
		// run provided callback
		callback();
	}, wait);
}

// run data collection
async function run() {
	// beginning scrape
	log.message("Beginning Data Collection...");

	// delete old data
	if (config.updateDatabase) await database.deletePath("parts");

	// start time
	let startTime: Date = new Date();

	// scrape
	let entries: number = await scrape.scrapeData();

	// end time
	let endTime: Date = new Date();

	// display time elapsed
	log.message(
		"Time Elapsed: " +
			utility.formatSeconds(
				(endTime.getTime() - startTime.getTime()) / 1000
			)
	);

	// display total entries
	log.message("Total Entries: " + entries);

	// queue next run
	runAtHour(config.runAtHour, run);
}

// start
try {
	// run once
	if (config.runRightAway) {
		// log
		log.message("Data Collector Running Once...");

		// run
		run();
	}
	// run at a specific hour every day
	else {
		// log
		log.message(
			"Data Collector Running At Hour " +
				config.runAtHour +
				" Every Day..."
		);

		// run
		runAtHour(config.runAtHour, run);
	}
} catch (error) {
	console.error(error);
}
