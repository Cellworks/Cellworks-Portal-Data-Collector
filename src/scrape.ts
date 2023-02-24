// Site Scraper

// imports
import puppeteer, { ElementHandle, Page } from "puppeteer";
import database from "./database";
import log from "./log";

// get data
import config from "../config/config.json";
import siteData from "../config/sites.json";
import scrapeConfig from "../config/scraping.json";

// lists
let blacklist: string[];
let whitelist: string[];
let categoryList: CategoryConfig[];

// types
interface CategoryConfig {
	name: string;
	keywords: string[];
}
interface PageConfig {
	multiple: boolean;
	itemAmount: string;
	itemPerPage: number;
	removeFromItemAmount: string;
}
// setup entry type
type Entry = {
	storefront: string;
	device: string;
	version: string;
	category?: string;
	link?: string | Promise<string | null> | null;
	name?: string | Promise<string | null> | null;
	cost?: number | Promise<number | null> | null;
	image?: string | Promise<string | null> | null;
	badge_image?: string | Promise<string | null> | null;
};

// init entry amount
let entryAmount: number;

// exported functions
export default {
	// scrape entries from set sites with unique element selectors
	scrapeData: async function (): Promise<number> {
		// restart entry amount
		entryAmount = 0;

		// refresh lists
		refreshLists();

		// loop through sites
		for (const site of Object.entries(siteData)) {
			// don't run on default entry (duplicate)
			if (site[0] === "default") continue;

			// loop through devices
			for (const device of Object.entries(site[1].devices)) {
				// loop through versions
				for (const version of Object.entries(device[1].version)) {
					// create link for this device and version
					let link = site[1].link
						.replace("<device>", String(device[1].linkPath))
						.replace("<version>", String(version[1]));

					// log
					console.log(
						"[" +
							site[1].storefront +
							"] Scraping " +
							device[0] +
							"-" +
							version[0] +
							"..."
					);

					// scrape site
					await scrape(
						link,
						site[1].container,
						async (product: any) => {
							// create entry for the scraped product
							let entry = await createEntry(
								product,
								{
									storefront: site[1].storefront,
									device: device[0],
									version: version[0],
								},
								site[1].elements
							);

							// entry created
							if (entry !== undefined) {
								// increase entry amount by 1
								entryAmount += 1;

								if (config.updateDatabase) {
									//add entry to database
									database.setValue(
										"parts/" +
											device[0] +
											"-" +
											version[0] +
											"/" +
											entry.category,
										entry
									);
								}
							}
						},
						site[1].pages ? site[1].pages : undefined
					);
				}
			}
		}

		return entryAmount;
	},
};

// scrape site
async function scrape(
	url: string,
	desiredElement: string,
	cb: CallableFunction,
	pages: PageConfig | undefined
) {
	// init puppeteer and vb (virtual browser)
	const browser = await puppeteer.launch({});

	// init url list
	let links = [];

	// if this link can have several pages, fill them out
	if (pages?.multiple) {
		// get first page link
		const page: string = url.replace("<page>", "1");

		// open page
		const site: Page = await browser.newPage();

		// no timeout
		site.setDefaultNavigationTimeout(0);

		// go to link in vb
		try {
			await site.goto(page, { waitUntil: "domcontentloaded" });
		} catch (err) {
			log.message("Error loading page: " + JSON.stringify(err));
		}

		// find how many pages
		let itemElement: ElementHandle<Element>[] = await site.$$(
			pages.itemAmount
		);

		// find page amount
		let itemAmount = Number(
			(
				(await itemElement[0].evaluate(
					(el) => el.textContent
				)) as string
			).replace(pages.removeFromItemAmount, "")
		);
		let pageAmount = Math.ceil(itemAmount / pages.itemPerPage);

		// generate pages
		for (let i = 1; i <= pageAmount; i++) {
			links.push(url.replace("<page>", i.toString()));
		}
	} else {
		links.push(url);
	}

	// parse through each link provided
	for (let i = 0; i < links.length; i++) {
		const page: string = links[i];

		// open page
		const site: Page = await browser.newPage();

		// no timeout
		site.setDefaultNavigationTimeout(0);

		// go to link in vb
		await site.goto(page, { waitUntil: "domcontentloaded" });

		// get desired elements
		let elements: ElementHandle<Element>[] = await site.$$(desiredElement);

		// find each value
		for (let i = 0; i < elements.length; i++) {
			await cb(elements[i]);
		}

		// close page
		await site.close();
	}

	// close vb
	browser.close();
}

// format entry with scraped data
async function createEntry(
	this: any,
	product: ElementHandle<Element>,
	data: Entry,
	elements: any
): Promise<Entry | undefined> {
	// get product link
	try {
		if (elements.link.attribute) {
			data.link = await product.$eval(
				elements.link.selector,
				(element: Element, attribute: string | unknown) =>
					element.getAttribute(attribute as string),
				elements.link.attribute
			);
		} else {
			data.link = await product.$eval(
				elements.link.selector,
				(element: Element) => element.textContent
			);
		}
	} catch (error) {
		if (error instanceof Error) {
			log.debug(
				"[" + data.storefront + " - Product Link] " + error.message
			);
		}
	}

	// check if there is a product link
	if (data.link === undefined) {
		log.debug(
			"[" +
				data.storefront +
				" - Product Link] Skipping Entry: No Link Found"
		);
		return;
	}

	// get name
	try {
		if (elements.name.attribute) {
			data.name = await product.$eval(
				elements.name.selector,
				(element: Element, attribute: string | unknown) =>
					element.getAttribute(attribute as string),
				elements.name.attribute
			);
		} else {
			data.name = await product.$eval(
				elements.name.selector,
				(element: Element) => element.textContent
			);
		}
	} catch (error) {
		if (error instanceof Error) {
			log.debug(
				"[" + data.storefront + " - Product Name] " + error.message
			);
		}
	}

	// blacklist
	if (blacklist.some((substring) => String(data.name).includes(substring))) {
		log.debug(
			"[" +
				data.storefront +
				" - Product Name] Skipping Entry: Blacklisted (" +
				data.name +
				") " +
				data.link
		);
		return;
	}
	// whitelist
	else if (
		!whitelist.some((substring) => String(data.name).includes(substring))
	) {
		log.debug(
			"[" +
				data.storefront +
				" - Product Name] Skipping Entry: Not Whitelisted (" +
				data.name +
				") " +
				data.link
		);
		return;
	}

	// get cost
	try {
		let cost;
		if (elements.cost.attribute) {
			cost = await product.$eval(
				elements.cost.selector,
				(element: Element, attribute: string | unknown) =>
					element.getAttribute(attribute as string),
				elements.cost.attribute
			);
		} else {
			cost = await product.$eval(
				elements.cost.selector,
				(element: Element) => element.textContent
			);
		}
		data.cost = Number(cost!.replace(/[^0-9.-]+/g, "")) as number;
	} catch (error) {
		if (error instanceof Error) {
			log.debug(
				"[" + data.storefront + " - Product Cost] " + error.message
			);
		}
	}

	// get image
	try {
		if (elements.image.attribute) {
			data.image = await product.$eval(
				elements.image.selector,
				(element: Element, attribute: string | unknown) =>
					element.getAttribute(attribute as string),
				elements.image.attribute
			);
		} else {
			data.image = await product.$eval(
				elements.image.selector,
				(element: Element) => element.textContent
			);
		}
	} catch (error) {
		if (error instanceof Error) {
			log.debug(
				"[" + data.storefront + " - Product Image] " + error.message
			);
		}
	}

	// get badge image
	if (elements.badge_image) {
		try {
			if (elements.badge_image.attribute) {
				data.badge_image = await product.$eval(
					elements.badge_image.selector,
					(element: Element, attribute: string | unknown) =>
						element.getAttribute(attribute as string),
					elements.badge_image.attribute
				);
			} else {
				data.badge_image = await product.$eval(
					elements.badge_image.selector,
					(element: Element) => element.textContent
				);
			}
		} catch (error) {
			if (error instanceof Error) {
				log.debug(
					"[" +
						data.storefront +
						" - Product Badge Image] " +
						error.message
				);
			}
		}
	}

	// determine category from name
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
	if (!data.category) data.category = "misc";

	// return amended data
	return data;
}

// refresh lists
function refreshLists() {
	//get and format blacklist
	blacklist = scrapeConfig.blacklist;

	//get and format whitelist
	whitelist = scrapeConfig.whitelist;

	//get and format category list
	categoryList = scrapeConfig.categories;
}
