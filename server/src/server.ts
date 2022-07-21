// Main Server

//dependency: file parsing
import path from 'path'

//imports
const utility = require(path.join(__dirname, 'utility'))
const database = require(path.join(__dirname, 'database'))
const scrape = require(path.join(__dirname, 'scrape'))

async function run() {
	//start time
	let startTime: Date = new Date()

	//scrape
	let entries = await scrape.scrapeData()

	//end time
	let endTime: Date = new Date()

	// console.log(entries)

	//display time elapsed
	console.log(
		'Time Elapsed: ' +
			utility.formatSeconds((endTime.getTime() - startTime.getTime()) / 1000),
	)

	//store
	database.setValue('entries', entries)

	//display total entries
	console.log('Total Entries: ' + entries.length)
}

try {
	run()
} catch (error) {
	console.error(error)
}
