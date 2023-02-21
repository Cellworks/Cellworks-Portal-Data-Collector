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
};
