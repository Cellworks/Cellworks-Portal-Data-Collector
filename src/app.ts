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

async function run() {
	// beginning scrape
	console.log("Beginning Data Collection...");

	// delete old data
	if (config.updateDatabase) await database.deletePath("parts");

	// start time
	let startTime: Date = new Date();

	// scrape
	let entries: number = await scrape.scrapeData();

	// end time
	let endTime: Date = new Date();

	// display time elapsed
	console.log(
		"Time Elapsed: " +
			utility.formatSeconds(
				(endTime.getTime() - startTime.getTime()) / 1000
			)
	);

	// display total entries
	console.log("Total Entries: " + entries);

	// queue next run
	utility.runAtHour(20, run);
}

try {
	utility.runAtHour(20, run);
} catch (error) {
	console.error(error);
}
