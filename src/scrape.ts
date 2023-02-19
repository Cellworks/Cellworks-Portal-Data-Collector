// Site Scraper

//dependencies
import * as fs from "fs";
import * as path from "path";
import * as puppeteer from "puppeteer";
import { Page } from "../node_modules/puppeteer/lib/types.js";

//make typescript happy by setting up missing types
interface Element {
	getAttribute(name: string): string;
	textContent: string;
}
interface ElementConfig {
	link: {
		selector: string;
		attribute?: string;
	};
	name: {
		selector: string;
		attribute?: string;
	};
	cost: {
		selector: string;
		attribute?: string;
	};
	image: {
		selector: string;
		attribute?: string;
	};
	badge_image?: {
		selector: string;
		attribute?: string;
	};
}
interface CategoryConfig {
	name: string;
	keywords: string[];
}

//state global lists
let linkList: string[];
let blacklist: string[];
let whitelist: string[];
let categoryList: CategoryConfig[];

//scrape entries from set sites with unique element selectors
export async function scrapeData() {
	//init entries array
	let entries: JSON[] = [];

	//refresh lists
	refreshLists();

	//get sites
	const sites = JSON.parse(
		fs.readFileSync(path.join(__dirname, "../config/sites.json")).toString()
	);

	//loop through sites
	for (let i = 0; i < sites.length; i++) {
		await scrape(sites[i].links, sites[i].container, async (entry: any) => {
			await createEntry(
				entries,
				entry,
				sites[i].storefront,
				sites[i].elements
			);
		});
	}

	return entries;
}

//scrape site
async function scrape(
	url: string[],
	desiredElement: string,
	cb: CallableFunction
) {
	//init puppeteer and vb (virtual browser)
	const browser = await puppeteer.launch({});

	//parse through each url provided
	for (let i = 0; i < url.length; i++) {
		const page: string = url[i];

		//open page
		const site: Page = await browser.newPage();

		//no timeout
		site.setDefaultNavigationTimeout(0);

		//go to url in vb
		await site.goto(page, { waitUntil: "domcontentloaded" });

		//get desired elements
		let elements: any = await site.$$(desiredElement);

		//find each value
		for (let i = 0; i < elements.length; i++) {
			await cb(elements[i]);
		}

		//close page
		await site.close();
	}

	//close vb
	browser.close();
}

//format entry with scraped data
async function createEntry(
	this: any,
	entries: JSON[],
	entry: any,
	storefront: string,
	elements: ElementConfig
) {
	//setup entry type
	type Entry = {
		storefront: string;
		category?: string;
		device?: string;
		link?: string;
		name?: string;
		cost?: number;
		image?: string;
		badge_image?: string;
	};

	//init entry data
	let data: Entry = {
		storefront: storefront,
	};

	//get product link
	try {
		if (elements.link.attribute) {
			data.link = await entry.$eval(
				elements.link.selector,
				(element: Element, attribute: string) =>
					element.getAttribute(attribute),
				elements.link.attribute
			);
		} else {
			data.link = await entry.$eval(
				elements.link.selector,
				(element: Element) => element.textContent
			);
		}
	} catch (error) {
		if (error instanceof Error) {
			console.log("[" + storefront + " - Product Link] " + error.message);
		}
	}

	//check if there is a link
	if (data.link) {
		//check if this is a duplicate
		if (linkList.indexOf(data.link) > -1) {
			console.log(
				"[" +
					storefront +
					" - Product Link] Found Duplicate Link- Skipping Entry (" +
					data.link +
					")"
			);
			return;
		} else {
			linkList.push(data.link);
		}
	}

	//if no link, dont add this entry
	else {
		console.log(
			"[" + storefront + " - Product Link] Skipping Entry: No Link Found"
		);
		return;
	}

	//get name
	try {
		if (elements.name.attribute) {
			data.name = await entry.$eval(
				elements.name.selector,
				(element: Element, attribute: string) =>
					element.getAttribute(attribute),
				elements.name.attribute
			);
		} else {
			data.name = await entry.$eval(
				elements.name.selector,
				(element: Element) => element.textContent
			);
		}
	} catch (error) {
		if (error instanceof Error) {
			console.log("[" + storefront + " - Product Name] " + error.message);
		}
	}

	//blacklist
	if (blacklist.some((substring) => String(data.name).includes(substring))) {
		console.log(
			"[" +
				storefront +
				" - Product Name] Skipping Entry: Blacklisted (" +
				data.name +
				") " +
				data.link
		);
		return;
	}
	//whitelist
	else if (
		!whitelist.some((substring) => String(data.name).includes(substring))
	) {
		console.log(
			"[" +
				storefront +
				" - Product Name] Skipping Entry: Not Whitelisted (" +
				data.name +
				") " +
				data.link
		);
		return;
	}

	//get cost
	try {
		let cost;
		if (elements.cost.attribute) {
			cost = await entry.$eval(
				elements.cost.selector,
				(element: Element, attribute: string) =>
					element.getAttribute(attribute),
				elements.cost.attribute
			);
		} else {
			cost = await entry.$eval(
				elements.cost.selector,
				(element: Element) => element.textContent
			);
		}
		data.cost = Number(cost.replace(/[^0-9.-]+/g, "")) as number;
	} catch (error) {
		if (error instanceof Error) {
			console.log("[" + storefront + " - Product Cost] " + error.message);
		}
	}

	//get image
	try {
		if (elements.image.attribute) {
			data.image = await entry.$eval(
				elements.image.selector,
				(element: Element, attribute: string) =>
					element.getAttribute(attribute),
				elements.image.attribute
			);
		} else {
			data.image = await entry.$eval(
				elements.image.selector,
				(element: Element) => element.textContent
			);
		}
	} catch (error) {
		if (error instanceof Error) {
			console.log(
				"[" + storefront + " - Product Image] " + error.message
			);
		}
	}

	//get badge image
	if (elements.badge_image) {
		try {
			if (elements.badge_image.attribute) {
				data.badge_image = await entry.$eval(
					elements.badge_image.selector,
					(element: Element, attribute: string) =>
						element.getAttribute(attribute),
					elements.badge_image.attribute
				);
			} else {
				data.badge_image = await entry.$eval(
					elements.badge_image.selector,
					(element: Element) => element.textContent
				);
			}
		} catch (error) {
			if (error instanceof Error) {
				console.log(
					"[" +
						storefront +
						" - Product Badge Image] " +
						error.message
				);
			}
		}
	}

	//determine category from name
	for (let i = 0; i < categoryList.length; i++) {
		if (
			categoryList[i].keywords.some((substring) =>
				String(data.name).includes(substring)
			)
		) {
			data.category = categoryList[i].name;
			break;
		}
	}
	if (!data.category) data.category = "Miscellaneous";

	//store entry
	let entryJson = JSON.stringify(data);
	// let jsonObject = '{"' + entryPosition + '" : ' + entryJson + '}'
	entries.push(JSON.parse(entryJson));
}

//refresh lists
function refreshLists() {
	linkList = [];

	//scrape settings
	let scrapeConfig = JSON.parse(
		fs
			.readFileSync(path.join(__dirname, "../config/scraping.json"))
			.toString()
	);

	//get and format blacklist
	blacklist = scrapeConfig.blacklist;
	// arrayUpper(blacklist)

	//get and format whitelist
	whitelist = scrapeConfig.whitelist;
	// arrayUpper(whitelist)

	//get and format category list
	categoryList = scrapeConfig.categories;
}
