// imports
import fs from "fs";

export default {
	//format number in ms to h:m:s
	formatSeconds: function (d: number) {
		d = Number(d);
		var h = Math.floor(d / 3600);
		var m = Math.floor((d % 3600) / 60);
		var s = Math.floor((d % 3600) % 60);

		var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
		var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
		var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
		return hDisplay + mDisplay + sDisplay;
	},

	//uppercase every character in string in array
	arrayUpper: function (array: Array<string>) {
		array.map((string: string) => {
			return string.toUpperCase();
		});
	},

	//return timestamp
	getTimestamp: function () {
		var timestamp = new Date(Date.now()).toLocaleString();
		return timestamp;
	},

	//get todays date
	getCurrentDay: function () {
		const today = new Date();
		return this.getDate(today);
	},

	//get formatted date from unix timestamp
	getDate: function (day: Date) {
		return (
			day.getFullYear() + "-" + (day.getMonth() + 1) + "-" + day.getDate()
		);
	},

	//create directory if doesn't exist
	createDirectory: function (dir: string) {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir);
		}
	},

	// alter time using a timezone offset from GMT
	getTimezone: function (time: Date, offset: number = -8) {
		// return time with timezone change
		return new Date(time.getTime() + offset * 3600 * 1000);
	},

	// run function at certain hour
	runAtHour: function (hour: number, callback: Function) {
		// get the current time
		var now = this.getTimezone(new Date());

		// log current time
		console.log(
			"Current Date & Time: " + now.toUTCString().replace(/ GMT$/, "")
		);

		// init start
		var start: Date;

		// init wait
		var wait: number;

		// run today (hour is coming up)
		if (now.getUTCHours() < hour) {
			start = this.getTimezone(
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
			start = this.getTimezone(
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
		console.log("Will run in " + this.formatSeconds(wait / 1000));

		// wait for the hour to come up
		setTimeout(() => {
			// run provided callback
			callback();
		}, wait);
	},
};
