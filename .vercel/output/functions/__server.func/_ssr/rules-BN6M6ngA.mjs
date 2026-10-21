//#region node_modules/.nitro/vite/services/ssr/assets/rules-BN6M6ngA.js
/** Trait axes the ranking engine knows. Objects × traits is the 20Q matrix. */
var FEATURES = [
	"animal",
	"mammal",
	"bird",
	"reptile",
	"fish",
	"insect",
	"plant",
	"food",
	"fruit",
	"sweet",
	"drink",
	"tool",
	"clothing",
	"vehicle",
	"place",
	"electronic",
	"music",
	"sports",
	"toy",
	"furniture",
	"container",
	"person",
	"fictional",
	"nature",
	"weapon",
	"household",
	"alive",
	"edible",
	"dangerous",
	"small",
	"large",
	"metal",
	"soft",
	"flies",
	"swims",
	"wearable",
	"round",
	"cold",
	"hot",
	"indoor",
	"noisy",
	"pet",
	"water",
	"colorful",
	"sharp",
	"wooden"
];
var CATEGORIES = [
	"Animals",
	"Food",
	"Things",
	"Places",
	"Culture"
];
var FEATURE_SET = new Set(FEATURES);
/** Explicit yes-tags. Closures in `build` add the obvious parents (mammal → animal). */
var ROWS = [
	[
		"Cat",
		"Animals",
		5,
		"mammal pet soft small indoor"
	],
	[
		"Dog",
		"Animals",
		5,
		"mammal pet soft noisy"
	],
	[
		"Horse",
		"Animals",
		4,
		"mammal large pet"
	],
	[
		"Cow",
		"Animals",
		4,
		"mammal large food edible"
	],
	[
		"Pig",
		"Animals",
		4,
		"mammal food edible"
	],
	[
		"Sheep",
		"Animals",
		3,
		"mammal soft food edible"
	],
	[
		"Elephant",
		"Animals",
		4,
		"mammal large nature"
	],
	[
		"Lion",
		"Animals",
		4,
		"mammal large dangerous nature"
	],
	[
		"Tiger",
		"Animals",
		4,
		"mammal large dangerous nature"
	],
	[
		"Bear",
		"Animals",
		4,
		"mammal large dangerous nature"
	],
	[
		"Wolf",
		"Animals",
		3,
		"mammal dangerous nature"
	],
	[
		"Fox",
		"Animals",
		3,
		"mammal nature small"
	],
	[
		"Rabbit",
		"Animals",
		4,
		"mammal pet small soft"
	],
	[
		"Mouse",
		"Animals",
		4,
		"mammal small pet"
	],
	[
		"Bat",
		"Animals",
		3,
		"mammal small flies"
	],
	[
		"Whale",
		"Animals",
		4,
		"mammal large swims water nature"
	],
	[
		"Dolphin",
		"Animals",
		4,
		"mammal swims water"
	],
	[
		"Shark",
		"Animals",
		5,
		"fish large dangerous swims water"
	],
	[
		"Goldfish",
		"Animals",
		4,
		"fish small pet swims water"
	],
	[
		"Eagle",
		"Animals",
		3,
		"bird flies large nature"
	],
	[
		"Penguin",
		"Animals",
		4,
		"bird swims water cold"
	],
	[
		"Owl",
		"Animals",
		3,
		"bird flies nature"
	],
	[
		"Parrot",
		"Animals",
		3,
		"bird flies colorful pet noisy"
	],
	[
		"Snake",
		"Animals",
		4,
		"reptile dangerous nature"
	],
	[
		"Crocodile",
		"Animals",
		3,
		"reptile large dangerous swims water"
	],
	[
		"Frog",
		"Animals",
		3,
		"animal alive swims water small nature"
	],
	[
		"Turtle",
		"Animals",
		3,
		"reptile swims water slowish"
	],
	[
		"Spider",
		"Animals",
		4,
		"insect small dangerous"
	],
	[
		"Bee",
		"Animals",
		4,
		"insect small flies dangerous"
	],
	[
		"Ant",
		"Animals",
		3,
		"insect small"
	],
	[
		"Butterfly",
		"Animals",
		4,
		"insect small flies colorful"
	],
	[
		"Chicken",
		"Animals",
		4,
		"bird food edible"
	],
	[
		"Duck",
		"Animals",
		3,
		"bird swims water flies food edible"
	],
	[
		"Octopus",
		"Animals",
		3,
		"animal alive swims water"
	],
	[
		"Crab",
		"Animals",
		3,
		"animal alive swims water food edible"
	],
	[
		"Kangaroo",
		"Animals",
		3,
		"mammal large nature"
	],
	[
		"Monkey",
		"Animals",
		4,
		"mammal nature"
	],
	[
		"Deer",
		"Animals",
		3,
		"mammal nature"
	],
	[
		"Giraffe",
		"Animals",
		4,
		"mammal large nature"
	],
	[
		"Zebra",
		"Animals",
		3,
		"mammal large nature"
	],
	[
		"Panda",
		"Animals",
		4,
		"mammal large nature"
	],
	[
		"Squirrel",
		"Animals",
		3,
		"mammal small nature"
	],
	[
		"Hedgehog",
		"Animals",
		2,
		"mammal small nature"
	],
	[
		"Crocodile",
		"Animals",
		3,
		"reptile large dangerous water swims"
	],
	[
		"Apple",
		"Food",
		5,
		"fruit plant food edible round"
	],
	[
		"Banana",
		"Food",
		5,
		"fruit plant food edible sweet"
	],
	[
		"Orange",
		"Food",
		4,
		"fruit plant food edible round sweet"
	],
	[
		"Strawberry",
		"Food",
		4,
		"fruit plant food edible sweet small colorful"
	],
	[
		"Watermelon",
		"Food",
		3,
		"fruit plant food edible sweet large water"
	],
	[
		"Lemon",
		"Food",
		3,
		"fruit plant food edible"
	],
	[
		"Pizza",
		"Food",
		5,
		"food edible hot"
	],
	[
		"Hamburger",
		"Food",
		5,
		"food edible"
	],
	[
		"Hot dog",
		"Food",
		4,
		"food edible"
	],
	[
		"Taco",
		"Food",
		4,
		"food edible"
	],
	[
		"Sushi",
		"Food",
		4,
		"food edible fish"
	],
	[
		"Steak",
		"Food",
		3,
		"food edible hot"
	],
	[
		"Bread",
		"Food",
		5,
		"food edible"
	],
	[
		"Cheese",
		"Food",
		4,
		"food edible"
	],
	[
		"Egg",
		"Food",
		4,
		"food edible small round"
	],
	[
		"Rice",
		"Food",
		4,
		"food edible small"
	],
	[
		"Pasta",
		"Food",
		4,
		"food edible"
	],
	[
		"Salad",
		"Food",
		3,
		"food edible plant"
	],
	[
		"Soup",
		"Food",
		3,
		"food edible hot water"
	],
	[
		"Chocolate",
		"Food",
		5,
		"food edible sweet"
	],
	[
		"Ice cream",
		"Food",
		5,
		"food edible sweet cold"
	],
	[
		"Cake",
		"Food",
		4,
		"food edible sweet"
	],
	[
		"Cookie",
		"Food",
		4,
		"food edible sweet small"
	],
	[
		"Popcorn",
		"Food",
		3,
		"food edible"
	],
	[
		"Honey",
		"Food",
		3,
		"food edible sweet"
	],
	[
		"Carrot",
		"Food",
		3,
		"plant food edible"
	],
	[
		"Potato",
		"Food",
		4,
		"plant food edible"
	],
	[
		"Tomato",
		"Food",
		3,
		"fruit plant food edible"
	],
	[
		"Onion",
		"Food",
		2,
		"plant food edible"
	],
	[
		"Peanut",
		"Food",
		3,
		"plant food edible small"
	],
	[
		"Salt",
		"Food",
		3,
		"food small"
	],
	[
		"Coffee",
		"Food",
		5,
		"drink edible hot"
	],
	[
		"Tea",
		"Food",
		4,
		"drink edible hot plant"
	],
	[
		"Milk",
		"Food",
		4,
		"drink edible cold"
	],
	[
		"Wine",
		"Food",
		3,
		"drink edible"
	],
	[
		"Beer",
		"Food",
		3,
		"drink edible"
	],
	[
		"Soda",
		"Food",
		4,
		"drink edible sweet cold"
	],
	[
		"Hammer",
		"Things",
		3,
		"tool metal household"
	],
	[
		"Knife",
		"Things",
		4,
		"tool weapon sharp metal dangerous household"
	],
	[
		"Scissors",
		"Things",
		3,
		"tool sharp metal household"
	],
	[
		"Phone",
		"Things",
		5,
		"electronic small"
	],
	[
		"Computer",
		"Things",
		5,
		"electronic indoor"
	],
	[
		"Television",
		"Things",
		4,
		"electronic indoor noisy"
	],
	[
		"Camera",
		"Things",
		3,
		"electronic small"
	],
	[
		"Clock",
		"Things",
		3,
		"household indoor"
	],
	[
		"Lamp",
		"Things",
		3,
		"household indoor"
	],
	[
		"Chair",
		"Things",
		4,
		"furniture wooden indoor"
	],
	[
		"Table",
		"Things",
		4,
		"furniture wooden indoor large"
	],
	[
		"Bed",
		"Things",
		4,
		"furniture indoor large soft"
	],
	[
		"Sofa",
		"Things",
		3,
		"furniture indoor large soft"
	],
	[
		"Book",
		"Things",
		5,
		"indoor"
	],
	[
		"Pen",
		"Things",
		4,
		"small tool"
	],
	[
		"Key",
		"Things",
		4,
		"small metal"
	],
	[
		"Lock",
		"Things",
		3,
		"metal"
	],
	[
		"Mirror",
		"Things",
		3,
		"household indoor"
	],
	[
		"Umbrella",
		"Things",
		3,
		"tool"
	],
	[
		"Bicycle",
		"Things",
		4,
		"vehicle metal"
	],
	[
		"Car",
		"Things",
		5,
		"vehicle metal large noisy"
	],
	[
		"Airplane",
		"Things",
		5,
		"vehicle metal large flies noisy"
	],
	[
		"Boat",
		"Things",
		4,
		"vehicle water swims"
	],
	[
		"Train",
		"Things",
		4,
		"vehicle metal large noisy"
	],
	[
		"Shoe",
		"Things",
		4,
		"clothing wearable"
	],
	[
		"Hat",
		"Things",
		3,
		"clothing wearable"
	],
	[
		"Shirt",
		"Things",
		4,
		"clothing wearable soft"
	],
	[
		"Glasses",
		"Things",
		4,
		"wearable small"
	],
	[
		"Ring",
		"Things",
		3,
		"wearable small metal round"
	],
	[
		"Watch",
		"Things",
		4,
		"wearable small metal"
	],
	[
		"Guitar",
		"Things",
		4,
		"music wooden noisy"
	],
	[
		"Piano",
		"Things",
		3,
		"music large indoor noisy"
	],
	[
		"Drum",
		"Things",
		3,
		"music noisy round"
	],
	[
		"Ball",
		"Things",
		4,
		"sports toy round"
	],
	[
		"Doll",
		"Things",
		3,
		"toy small"
	],
	[
		"Teddy bear",
		"Things",
		4,
		"toy soft"
	],
	[
		"Dice",
		"Things",
		3,
		"toy small"
	],
	[
		"Toothbrush",
		"Things",
		3,
		"household small"
	],
	[
		"Soap",
		"Things",
		3,
		"household small"
	],
	[
		"Towel",
		"Things",
		3,
		"household soft"
	],
	[
		"Refrigerator",
		"Things",
		3,
		"household electronic large cold indoor"
	],
	[
		"Oven",
		"Things",
		3,
		"household electronic large hot indoor"
	],
	[
		"Microwave",
		"Things",
		3,
		"household electronic hot indoor"
	],
	[
		"Cup",
		"Things",
		4,
		"container household small"
	],
	[
		"Bottle",
		"Things",
		4,
		"container small"
	],
	[
		"Backpack",
		"Things",
		3,
		"container clothing"
	],
	[
		"Suitcase",
		"Things",
		3,
		"container"
	],
	[
		"Candle",
		"Things",
		3,
		"household hot"
	],
	[
		"Rope",
		"Things",
		2,
		"tool"
	],
	[
		"Ladder",
		"Things",
		2,
		"tool large"
	],
	[
		"Telescope",
		"Things",
		2,
		"tool metal"
	],
	[
		"Compass",
		"Things",
		2,
		"tool small metal"
	],
	[
		"Map",
		"Things",
		3,
		"tool"
	],
	[
		"Balloon",
		"Things",
		3,
		"toy round colorful flies"
	],
	[
		"Crown",
		"Things",
		3,
		"wearable metal"
	],
	[
		"Sword",
		"Things",
		4,
		"weapon sharp metal dangerous"
	],
	[
		"Shield",
		"Things",
		2,
		"weapon metal"
	],
	[
		"Trophy",
		"Things",
		3,
		"metal sports"
	],
	[
		"Flag",
		"Things",
		3,
		"colorful"
	],
	[
		"Diamond",
		"Things",
		3,
		"small"
	],
	[
		"Coin",
		"Things",
		3,
		"small metal round"
	],
	[
		"Backpack",
		"Things",
		3,
		"container"
	],
	[
		"Ocean",
		"Places",
		5,
		"place nature water large"
	],
	[
		"Mountain",
		"Places",
		4,
		"place nature large"
	],
	[
		"Desert",
		"Places",
		3,
		"place nature hot large"
	],
	[
		"Forest",
		"Places",
		4,
		"place nature plant"
	],
	[
		"River",
		"Places",
		4,
		"place nature water"
	],
	[
		"Beach",
		"Places",
		4,
		"place nature water"
	],
	[
		"Island",
		"Places",
		3,
		"place nature water"
	],
	[
		"City",
		"Places",
		4,
		"place large noisy"
	],
	[
		"School",
		"Places",
		4,
		"place indoor"
	],
	[
		"Hospital",
		"Places",
		3,
		"place indoor"
	],
	[
		"Library",
		"Places",
		3,
		"place indoor"
	],
	[
		"Castle",
		"Places",
		3,
		"place large"
	],
	[
		"Bridge",
		"Places",
		3,
		"place large"
	],
	[
		"Cave",
		"Places",
		2,
		"place nature"
	],
	[
		"Volcano",
		"Places",
		3,
		"place nature hot large dangerous"
	],
	[
		"Moon",
		"Places",
		4,
		"place nature large cold"
	],
	[
		"Sun",
		"Places",
		5,
		"nature hot large"
	],
	[
		"Star",
		"Places",
		4,
		"nature"
	],
	[
		"Cloud",
		"Places",
		4,
		"nature water flies"
	],
	[
		"Snow",
		"Places",
		4,
		"nature cold water"
	],
	[
		"Fire",
		"Places",
		4,
		"hot dangerous"
	],
	[
		"Tree",
		"Places",
		5,
		"plant nature large wooden alive"
	],
	[
		"Flower",
		"Places",
		4,
		"plant nature small colorful alive"
	],
	[
		"Rose",
		"Places",
		3,
		"plant nature small colorful"
	],
	[
		"Cactus",
		"Places",
		3,
		"plant nature hot"
	],
	[
		"Rain",
		"Places",
		4,
		"nature water"
	],
	[
		"Doctor",
		"Culture",
		4,
		"person"
	],
	[
		"Pirate",
		"Culture",
		3,
		"person fictional dangerous"
	],
	[
		"Astronaut",
		"Culture",
		4,
		"person"
	],
	[
		"Vampire",
		"Culture",
		3,
		"fictional person dangerous"
	],
	[
		"Ghost",
		"Culture",
		4,
		"fictional"
	],
	[
		"Dragon",
		"Culture",
		5,
		"fictional animal large dangerous flies"
	],
	[
		"Robot",
		"Culture",
		5,
		"electronic metal fictional"
	],
	[
		"Wizard",
		"Culture",
		4,
		"fictional person"
	],
	[
		"Clown",
		"Culture",
		3,
		"person colorful"
	],
	[
		"King",
		"Culture",
		3,
		"person"
	],
	[
		"Soccer",
		"Culture",
		4,
		"sports"
	],
	[
		"Basketball",
		"Culture",
		4,
		"sports round"
	],
	[
		"Chess",
		"Culture",
		3,
		"toy indoor"
	],
	[
		"Movie",
		"Culture",
		4,
		"electronic"
	],
	[
		"Song",
		"Culture",
		4,
		"music"
	],
	[
		"Money",
		"Culture",
		4,
		"small"
	],
	[
		"Guitar hero",
		"Culture",
		1,
		"music fictional"
	]
];
var PARENTS = {
	mammal: ["animal", "alive"],
	bird: ["animal", "alive"],
	reptile: ["animal", "alive"],
	fish: [
		"animal",
		"alive",
		"swims",
		"water"
	],
	insect: ["animal", "alive"],
	pet: ["animal", "alive"],
	fruit: [
		"food",
		"plant",
		"edible"
	],
	drink: ["edible"]
};
function slug(name) {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function build() {
	const seen = /* @__PURE__ */ new Set();
	const words = [];
	for (const [name, category, pop, raw] of ROWS) {
		const id = slug(name);
		if (seen.has(id)) continue;
		seen.add(id);
		const yes = /* @__PURE__ */ new Set();
		for (const token of raw.split(/\s+/)) {
			if (!token || token === "slowish") continue;
			if (!FEATURE_SET.has(token)) throw new Error(`Unknown feature "${token}" on ${name}`);
			const feature = token;
			yes.add(feature);
			for (const parent of PARENTS[feature] ?? []) yes.add(parent);
		}
		words.push({
			id,
			name,
			category,
			pop,
			yes
		});
	}
	return words;
}
var WORDS = build();
var WORD_BY_ID = new Map(WORDS.map((w) => [w.id, w]));
/** Trigger words → traits. Object names are handled separately as mentions. */
var LEXICON = {
	animal: ["animal"],
	animals: ["animal"],
	creature: ["animal"],
	beast: ["animal"],
	wildlife: ["animal", "nature"],
	mammal: ["mammal"],
	fur: ["mammal", "soft"],
	furry: ["mammal", "soft"],
	whiskers: ["mammal", "pet"],
	bark: [
		"mammal",
		"pet",
		"noisy"
	],
	meow: ["mammal", "pet"],
	purr: [
		"mammal",
		"pet",
		"soft"
	],
	bird: ["bird"],
	avian: ["bird"],
	feather: ["bird"],
	feathers: ["bird"],
	beak: ["bird"],
	reptile: ["reptile"],
	scales: ["reptile", "fish"],
	fish: ["fish"],
	seafood: [
		"fish",
		"food",
		"edible"
	],
	fin: ["fish", "swims"],
	fins: ["fish", "swims"],
	gill: ["fish", "swims"],
	gills: ["fish", "swims"],
	predator: ["dangerous", "animal"],
	paw: ["mammal", "pet"],
	paws: ["mammal", "pet"],
	tail: ["animal"],
	trunk: ["mammal", "large"],
	insect: ["insect"],
	bug: ["insect"],
	bugs: ["insect"],
	plant: ["plant"],
	leaf: ["plant"],
	leaves: ["plant"],
	garden: ["plant", "nature"],
	food: ["food", "edible"],
	meal: ["food", "edible"],
	snack: [
		"food",
		"edible",
		"small"
	],
	eat: ["edible", "food"],
	eaten: ["edible", "food"],
	edible: ["edible", "food"],
	tasty: ["edible", "food"],
	yummy: [
		"edible",
		"food",
		"sweet"
	],
	fruit: ["fruit"],
	sweet: ["sweet"],
	sugar: ["sweet", "food"],
	dessert: ["sweet", "food"],
	candy: [
		"sweet",
		"food",
		"small"
	],
	drink: ["drink"],
	beverage: ["drink"],
	sip: ["drink"],
	thirsty: ["drink"],
	tool: ["tool"],
	hardware: ["tool", "metal"],
	clothing: ["clothing", "wearable"],
	clothes: ["clothing", "wearable"],
	fabric: ["clothing", "soft"],
	fashion: ["clothing", "wearable"],
	wearable: ["wearable"],
	wear: ["wearable"],
	vehicle: ["vehicle"],
	transport: ["vehicle"],
	drive: ["vehicle"],
	driving: ["vehicle"],
	wheel: ["vehicle", "round"],
	wheels: ["vehicle", "round"],
	place: ["place"],
	location: ["place"],
	electronic: ["electronic"],
	electric: ["electronic"],
	digital: ["electronic"],
	gadget: ["electronic", "small"],
	device: ["electronic"],
	screen: ["electronic"],
	battery: ["electronic"],
	music: ["music"],
	song: ["music"],
	instrument: ["music"],
	band: ["music", "noisy"],
	sports: ["sports"],
	sport: ["sports"],
	athlete: ["sports", "person"],
	toy: ["toy"],
	furniture: ["furniture", "indoor"],
	container: ["container"],
	box: ["container"],
	person: ["person"],
	human: ["person"],
	people: ["person"],
	someone: ["person"],
	fictional: ["fictional"],
	fantasy: ["fictional"],
	magic: ["fictional"],
	mythical: ["fictional"],
	pretend: ["fictional", "toy"],
	nature: ["nature"],
	outdoor: ["nature"],
	outdoors: ["nature"],
	wild: ["nature", "animal"],
	weapon: ["weapon", "dangerous"],
	blade: [
		"weapon",
		"sharp",
		"metal"
	],
	fight: ["weapon", "dangerous"],
	household: ["household", "indoor"],
	kitchen: [
		"household",
		"indoor",
		"food"
	],
	chore: ["household", "indoor"],
	alive: ["alive"],
	living: ["alive"],
	dangerous: ["dangerous"],
	deadly: ["dangerous"],
	scary: ["dangerous"],
	poison: ["dangerous"],
	small: ["small"],
	tiny: ["small"],
	little: ["small"],
	mini: ["small"],
	miniature: ["small"],
	pocket: ["small"],
	large: ["large"],
	big: ["large"],
	huge: ["large"],
	giant: ["large"],
	enormous: ["large"],
	massive: ["large"],
	metal: ["metal"],
	steel: ["metal"],
	iron: ["metal"],
	chrome: ["metal"],
	soft: ["soft"],
	fluffy: ["soft"],
	fuzzy: ["soft"],
	plush: ["soft", "toy"],
	flies: ["flies"],
	fly: ["flies"],
	flying: ["flies"],
	flight: ["flies"],
	wing: ["flies"],
	wings: ["flies"],
	sky: ["flies", "nature"],
	air: ["flies"],
	swims: ["swims", "water"],
	swim: ["swims", "water"],
	swimming: ["swims", "water"],
	underwater: ["swims", "water"],
	aquatic: ["swims", "water"],
	marine: ["swims", "water"],
	ocean: [
		"water",
		"nature",
		"large"
	],
	sea: ["water", "nature"],
	round: ["round"],
	sphere: ["round"],
	circular: ["round"],
	circle: ["round"],
	cold: ["cold"],
	ice: ["cold", "water"],
	frozen: ["cold"],
	freeze: ["cold"],
	snow: [
		"cold",
		"water",
		"nature"
	],
	winter: ["cold"],
	chilly: ["cold"],
	hot: ["hot"],
	heat: ["hot"],
	burn: ["hot", "dangerous"],
	spicy: ["hot", "food"],
	warm: ["hot"],
	fire: ["hot", "dangerous"],
	indoor: ["indoor"],
	inside: ["indoor"],
	room: ["indoor"],
	house: ["indoor", "place"],
	noisy: ["noisy"],
	loud: ["noisy"],
	sound: ["noisy", "music"],
	noise: ["noisy"],
	pet: ["pet"],
	tame: ["pet"],
	domestic: ["pet"],
	puppy: [
		"pet",
		"mammal",
		"small"
	],
	kitten: [
		"pet",
		"mammal",
		"small"
	],
	water: ["water"],
	wet: ["water"],
	splash: ["water"],
	rain: ["water", "nature"],
	colorful: ["colorful"],
	colourful: ["colorful"],
	bright: ["colorful"],
	rainbow: ["colorful"],
	vivid: ["colorful"],
	sharp: ["sharp"],
	pointy: ["sharp"],
	cut: ["sharp"],
	wooden: ["wooden"],
	wood: ["wooden"],
	timber: ["wooden"],
	berry: [
		"fruit",
		"sweet",
		"small"
	],
	berries: [
		"fruit",
		"sweet",
		"small"
	],
	jam: ["sweet", "food"],
	jelly: ["sweet", "food"],
	pie: ["sweet", "food"],
	pastry: ["sweet", "food"],
	tart: [
		"sweet",
		"food",
		"fruit"
	],
	pudding: ["sweet", "food"],
	yogurt: ["sweet", "food"],
	sorbet: [
		"sweet",
		"food",
		"cold"
	],
	gelato: [
		"sweet",
		"food",
		"cold"
	],
	juicy: ["fruit", "food"],
	ripe: ["fruit", "plant"],
	orchard: [
		"fruit",
		"plant",
		"nature"
	],
	vegetable: ["plant", "food"],
	veggie: ["plant", "food"],
	veggies: ["plant", "food"],
	meat: ["food"],
	bake: ["food", "sweet"],
	baked: ["food", "sweet"],
	bakery: ["food", "sweet"],
	breakfast: ["food"],
	lunch: ["food"],
	dinner: ["food"],
	treat: ["sweet", "food"],
	zoo: ["animal", "place"],
	safari: ["animal", "nature"],
	farm: [
		"animal",
		"food",
		"nature"
	],
	red: ["colorful"],
	pink: ["colorful"],
	purple: ["colorful"],
	yellow: ["colorful"],
	orange: ["fruit", "colorful"],
	green: ["plant"],
	blue: ["water", "colorful"],
	robot: ["electronic", "metal"],
	machine: ["electronic", "metal"],
	computer: ["electronic"],
	phone: ["electronic", "small"],
	car: ["vehicle", "metal"]
};
var NEGATION = /* @__PURE__ */ new Set([
	"not",
	"no",
	"never",
	"isn't",
	"isnt",
	"aren't",
	"arent",
	"wasn't",
	"wasnt",
	"without",
	"dont",
	"don't",
	"doesn't",
	"doesnt",
	"won't",
	"wont",
	"neither",
	"nor"
]);
var INTENSIFIERS = /* @__PURE__ */ new Set([
	"very",
	"super",
	"extremely",
	"really",
	"totally",
	"incredibly"
]);
var HEDGES = /* @__PURE__ */ new Set([
	"maybe",
	"sometimes",
	"kinda",
	"somewhat",
	"partly",
	"probably",
	"sorta"
]);
var STOP = /* @__PURE__ */ new Set([
	"a",
	"an",
	"the",
	"it",
	"its",
	"it's",
	"is",
	"of",
	"and",
	"or",
	"to",
	"in",
	"on",
	"with",
	"for",
	"that",
	"this",
	"was",
	"be",
	"as",
	"at",
	"by",
	"from",
	"your",
	"my",
	"some",
	"just",
	"like",
	"something",
	"thing",
	"stuff",
	"kind",
	"sort",
	"has",
	"have",
	"had",
	"can",
	"could",
	"would",
	"should",
	"you",
	"we",
	"they",
	"i",
	"but",
	"if",
	"so",
	"than",
	"then",
	"about",
	"into",
	"over",
	"after",
	"before",
	"also",
	"too",
	"more",
	"most",
	"much",
	"many",
	"one",
	"two"
]);
var PRIOR = .22;
var VECTORS = /* @__PURE__ */ new Map();
for (const word of WORDS) {
	const row = {};
	for (const feature of FEATURES) row[feature] = word.yes.has(feature) ? 1 : 0;
	VECTORS.set(word.id, row);
}
var BY_LENGTH = [...WORDS].sort((a, b) => b.name.length - a.name.length);
function emptyMemory() {
	return {
		repeats: /* @__PURE__ */ new Map(),
		nameHits: /* @__PURE__ */ new Map(),
		attacks: 0
	};
}
function initialScores() {
	const scores = /* @__PURE__ */ new Map();
	for (const word of WORDS) scores.set(word.id, word.pop * PRIOR);
	return scores;
}
function wordCount() {
	return WORDS.length;
}
function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function parsePrompt(raw) {
	const normalized = raw.toLowerCase().replace(/[^a-z0-9'\s-]/g, " ").replace(/\s+/g, " ").trim();
	const mentions = [];
	let scrubbed = ` ${normalized} `;
	for (const word of BY_LENGTH) {
		const name = word.name.toLowerCase();
		const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, "g");
		if (!re.test(scrubbed)) continue;
		const idx = scrubbed.indexOf(name);
		const before = scrubbed.slice(Math.max(0, idx - 16), idx);
		const negative = /\b(not|no|never|isn't|isnt|aren't|arent|without|don't|dont)\b/.test(before);
		if (mentions.length < 3) mentions.push({
			id: word.id,
			sign: negative ? -1 : 1
		});
		scrubbed = scrubbed.replace(re, " ");
	}
	const tokens = normalized.split(" ").filter(Boolean);
	const assertions = [];
	let flipRemain = 0;
	let weightMul = 1;
	for (const token of tokens) {
		const bare = token.replace(/'/g, "");
		if (NEGATION.has(token) || NEGATION.has(bare)) {
			flipRemain = 3;
			continue;
		}
		if (INTENSIFIERS.has(token)) {
			weightMul = Math.max(weightMul, 1.35);
			continue;
		}
		if (HEDGES.has(token)) {
			weightMul = Math.min(weightMul, .5);
			continue;
		}
		if (STOP.has(token) || STOP.has(bare)) continue;
		const features = LEXICON[token] ?? LEXICON[bare];
		if (features) {
			const sign = flipRemain > 0 ? -1 : 1;
			for (const feature of features) assertions.push({
				feature,
				sign,
				weight: weightMul
			});
			if (flipRemain > 0) flipRemain -= 1;
			weightMul = 1;
			continue;
		}
		if (flipRemain > 0) flipRemain -= 1;
		weightMul = 1;
	}
	for (const mention of mentions) {
		const word = WORD_BY_ID.get(mention.id);
		if (!word) continue;
		for (const feature of word.yes) assertions.push({
			feature,
			sign: mention.sign,
			weight: mention.sign > 0 ? .72 : .45
		});
	}
	return {
		assertions,
		mentions,
		normalized
	};
}
function traitSim(aId, bId) {
	if (aId === bId) return 1;
	const a = VECTORS.get(aId);
	const b = VECTORS.get(bId);
	if (!a || !b) return 0;
	let dot = 0;
	let na = 0;
	let nb = 0;
	for (const feature of FEATURES) {
		const x = a[feature];
		const y = b[feature];
		dot += x * y;
		na += x * x;
		nb += y * y;
	}
	if (na === 0 || nb === 0) return 0;
	return Math.min(1, Math.max(0, dot / Math.sqrt(na * nb)));
}
/** How hard this prompt argues against the planted word. 0 agrees, 1 is a lie. */
function hostilityOf(parsed, secretId) {
	const vec = VECTORS.get(secretId);
	if (!vec) return 0;
	let hostile = 0;
	let mass = 0;
	for (const assertion of parsed.assertions) {
		mass += assertion.weight;
		const has = vec[assertion.feature] === 1;
		if (assertion.sign > 0 && !has || assertion.sign < 0 && has) hostile += assertion.weight;
	}
	for (const mention of parsed.mentions) {
		mass += 1.2;
		if (mention.id === secretId) {
			if (mention.sign < 0) hostile += 1.6;
		} else if (mention.sign > 0) hostile += 1.1;
	}
	if (mass === 0) return 0;
	return Math.min(1, hostile / mass);
}
function applyPrompt(scores, raw, memory, secretId) {
	const parsed = parsePrompt(raw);
	if (!parsed.normalized || parsed.assertions.length === 0 && parsed.mentions.length === 0) return {
		scores,
		shrug: true,
		resisted: false
	};
	const seen = memory.repeats.get(parsed.normalized) ?? 0;
	memory.repeats.set(parsed.normalized, seen + 1);
	const repeatDamp = seen === 0 ? 1 : Math.pow(.4, seen);
	const hostility = hostilityOf(parsed, secretId);
	const opposed = hostility >= .22;
	const resisted = hostility >= .42;
	if (opposed && repeatDamp > .5) memory.attacks += 1;
	const pressure = memory.attacks;
	const belief = opposed ? Math.min(.86, .22 + pressure * .018) : 1;
	const bruise = opposed ? Math.min(.72, .08 + pressure * .014) : 1;
	const secretBefore = scores.get(secretId) ?? 0;
	const punches = /* @__PURE__ */ new Map();
	for (const mention of parsed.mentions) {
		const hits = memory.nameHits.get(mention.id) ?? 0;
		memory.nameHits.set(mention.id, hits + 1);
		const punch = 2.45 * Math.pow(.58, hits);
		punches.set(mention.id, mention.sign > 0 ? punch : -punch);
	}
	const next = new Map(scores);
	for (const word of WORDS) {
		const vector = VECTORS.get(word.id);
		let delta = 0;
		for (const assertion of parsed.assertions) {
			const has = vector[assertion.feature] === 1;
			if (assertion.sign > 0) delta += has ? assertion.weight : -.4 * assertion.weight;
			else delta += has ? -1.15 * assertion.weight : .26 * assertion.weight;
		}
		const named = punches.get(word.id);
		if (named) delta += named;
		delta = Math.max(-4.2, Math.min(4.2, delta * repeatDamp));
		const sim = traitSim(word.id, secretId);
		if (word.id === secretId && delta < 0) delta *= bruise;
		else if (opposed && sim < .3 && delta > 0) delta *= belief;
		next.set(word.id, (next.get(word.id) ?? 0) + delta);
	}
	if (opposed) {
		let secretNow = next.get(secretId) ?? 0;
		const dropped = secretBefore - secretNow;
		if (dropped > 0) {
			const hold = Math.max(.22, .92 - pressure * .013);
			secretNow += dropped * hold;
			next.set(secretId, secretNow);
		}
	}
	return {
		scores: next,
		shrug: false,
		resisted
	};
}
function ranked(scores) {
	const rows = WORDS.map((word) => ({
		id: word.id,
		name: word.name,
		score: scores.get(word.id) ?? 0,
		pop: word.pop
	}));
	rows.sort((a, b) => b.score - a.score || b.pop - a.pop || a.name.localeCompare(b.name));
	return rows;
}
function topN(scores, n) {
	return ranked(scores).slice(0, n);
}
function rankOf(scores, id) {
	const board = ranked(scores);
	const index = board.findIndex((row) => row.id === id);
	return index < 0 ? board.length : index + 1;
}
function leadingGuess(scores) {
	return ranked(scores)[0];
}
/** 0 = same trait fingerprint, 1 = nothing in common. */
function traitDistance(aId, bId) {
	if (aId === bId) return 0;
	const a = VECTORS.get(aId);
	const b = VECTORS.get(bId);
	if (!a || !b) return 1;
	let dot = 0;
	let na = 0;
	let nb = 0;
	for (const feature of FEATURES) {
		const x = a[feature];
		const y = b[feature];
		dot += x * y;
		na += x * x;
		nb += y * y;
	}
	if (na === 0 || nb === 0) return 1;
	const similarity = dot / Math.sqrt(na * nb);
	return Math.min(1, Math.max(0, 1 - similarity));
}
function pointsFor(rank, distance, guessId, secretId) {
	if (guessId === secretId) return 0;
	let base = 100;
	if (rank <= 1) base = 10;
	else if (rank <= 5) base = 20;
	else if (rank <= 20) base = 50;
	else if (rank <= 100) base = 80;
	else base = 100;
	const bonus = Math.round(Math.min(1, Math.max(0, distance)) * 20);
	return Math.min(120, base + bonus);
}
function scoreLabel(points) {
	if (points <= 0) return "The machine held.";
	if (points < 40) return "A nudge.";
	if (points < 70) return "Real drift.";
	if (points < 95) return "Buried.";
	return "Lost in the dark.";
}
function findWord(id) {
	return WORD_BY_ID.get(id);
}
function searchWords(query) {
	const q = query.trim().toLowerCase();
	if (!q) return WORDS;
	return WORDS.filter((word) => word.name.toLowerCase().includes(q));
}
function randomWord(avoid) {
	const pool = avoid ? WORDS.filter((word) => word.id !== avoid) : WORDS;
	return pool[Math.floor(Math.random() * pool.length)] ?? WORDS[0];
}
var CLOCK_MS = 3e5;
function otherSide(side) {
	return side === "amber" ? "tide" : "amber";
}
//#endregion
export { findWord as a, otherSide as c, rankOf as d, scoreLabel as f, wordCount as g, traitDistance as h, emptyMemory as i, pointsFor as l, topN as m, CLOCK_MS as n, initialScores as o, searchWords as p, applyPrompt as r, leadingGuess as s, CATEGORIES as t, randomWord as u };
