// Database Utility

//dependencies
import * as fs from "fs";
import * as path from "path";
import * as firebase from "firebase-admin";

//get config values
const config = JSON.parse(
	fs.readFileSync(path.join(__dirname, "../config/config.json")).toString()
);

//init database
firebase.initializeApp({
	credential: firebase.credential.cert(config.firebase),
	databaseURL: config.database.databaseURL,
});
const database = firebase.database();

//set value in database
export function setValue(path: string, value: any) {
	database.ref(path).set(value);
}

//get value in database
export async function getValue(path: string) {
	//init value
	let value;

	//get value
	await database
		.ref(path)
		.orderByKey()
		.once("value", async (data: any) => {
			value = await data.val();
		});

	return value;
}

//check to see if a path in the database exists
export async function pathExists(path: string) {
	//check for path
	const exists = await database
		.ref(path)
		.orderByKey()
		.limitToFirst(1)
		.once("value")
		.then((res: any) => res.exists());

	return exists;
}
