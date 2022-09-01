import moment from 'moment';

const genderClasses = {
	'men': 'M',
	'women': 'W',
	'mixed': 'X'
};
export const genderclassReverse = reverse(genderClasses, true);

const ageClasses = {
	'under18': '18',
	'under20': '20',
	'under23': '23',
	'junior': 'J',
	'youth': 'Y',
	'open': 'O',
	'veteran': 'V',
	'superveteran': 'SV',
	'ultraveteran': 'UV'
};
export const ageclassReverse = reverse(ageClasses, true);

export const categoriesToObject = {MO: {age: 'open', gender: 'men'}, XO: {age: 'open', gender: 'mixed'}, WO: {age: 'open', gender: 'women'}, MV: {age: 'veteran', gender: 'men'}, XV: {age: 'veteran', gender: 'mixed'}, WV: {age: 'veteran', gender: 'women'}, MSV: {age: 'superveteran', gender: 'men'}, XSV: {age: 'superveteran', gender: 'mixed'}, WSV: {age: 'superveteran', gender: 'women'}, MUV: {age: 'ultraveteran', gender: 'men'}, XUV: {age: 'ultraveteran', gender: 'mixed'}, WUV: {age: 'ultraveteran', gender: 'women'}, MJ: {age: 'junior', gender: 'men'}, XJ: {age: 'junior', gender: 'mixed'}, WJ: {age: 'junior', gender: 'women'}, MY: {age: 'youth', gender: 'men'}, XY: {age: 'youth', gender: 'mixed'}, WY: {age: 'youth', gender: 'women'}, M18: {age: 'under18', gender: 'men'}, X18: {age: 'under18', gender: 'mixed'}, W18: {age: 'under18', gender: 'women'}, M20: {age: 'under20', gender: 'men'}, X20: {age: 'under20', gender: 'mixed'}, W20: {age: 'under20', gender: 'women'}, M23: {age: 'under23', gender: 'men'}, X23: {age: 'under23', gender: 'mixed'}, W23: {age: 'under23', gender: 'women'}};

const categoryInheritance = {'ultraveteran': 'superveteran', 'superveteran': 'veteran', 'veteran': 'open', 'junior': 'open', 'youth': 'open', 'under20': 'open', 'under23': 'open'};
export const categorySorting = {'ultraveteran': [], 'superveteran': ['ultraveteran'], 'veteran': ['superveteran', 'ultraveteran'], 'open': ['veteran', 'superveteran', 'ultraveteran'], 'youth': ['open', 'veteran', 'superveteran', 'ultraveteran'], 'junior': ['youth', 'open', 'veteran', 'superveteran', 'ultraveteran'], 'under23': ['junior', 'youth', 'open', 'veteran', 'superveteran', 'ultraveteran'], 'under20': ['under23', 'junior', 'youth', 'open', 'veteran', 'superveteran', 'ultraveteran']};
const categoryInheritanceReverse = reverse(categoryInheritance);

function reverse(obj, bijective) {
	let rev = {};
	for (let key in obj) {
		if (obj.hasOwnProperty(key)) {
			if (bijective) {
				rev[obj[key]] = key;
			} else {
				if (!rev.hasOwnProperty(obj[key])) {
					rev[obj[key]] = [];
				}
				rev[obj[key]].push(key);
			}
		}
	}
	return rev;
}

let blocks = {};

export function date(date) {
	return moment(date).format('D MMM YYYY');
}

export function dateinterval(start, end) {
	return moment(start).format('D MMM') + '–' + moment(end).format('D MMM YYYY');
}

export function printSeconds(t) {
	return time({
		seconds: t % 60,
		minutes: Math.floor(t / 60) % 60,
		hours: Math.floor(Math.floor(t / 60) / 60),
	});
}

export function extend(name, context) {
	let block = blocks[name];
	if (!block) {
		block = blocks[name] = [];
	}

	block.push(context.fn(this));
}

export function block(name) {
	let val = (blocks[name] || []).join('\n');

	// clear the block
	blocks[name] = [];
	return val;
}

export function setTitle(value, context) {
	blocks.title = [value];
	return value;
}

export function index(index, context) {
	return index + 1;
}

export function pad(number, digits) {
	number = '' + number;
	while (number.length < digits) {
		number = '0' + number;
	}
	return number;
}

export function time(time, context) {
	return pad((time.days || 0) * 24 + (time.hours || 0), 2) + ':' + pad(time.minutes || 0, 2) + ':' + pad(time.seconds || 0, 2);
}

export function genderclass(gender, context) {
	return typeof genderClasses[gender] === 'undefined' ? '' : genderClasses[gender];
}

export function ageclass(age, context) {
	return typeof ageClasses[age] === 'undefined' ? '' : ageClasses[age];
}

export function getCategoryParents(age, gender) {
	let categories = categoryInheritance;
	let ret = [];
	ret.push(gender ? genderclass(gender) + ageclass(age) : age);
	if (categories.hasOwnProperty(age)) {
		ret.push.apply(ret, getCategoryParents(categories[age], gender));
	}
	return ret;
}
export function getCategoryDescendants(age, gender) {
	let categories = categoryInheritanceReverse;
	let ret = [];
	ret.push(gender ? genderclass(gender) + ageclass(age) : age);
	if (categories.hasOwnProperty(age)) {
		for (let subage of categories[age]) {
			ret.push.apply(ret, getCategoryDescendants(subage, gender));
		}
	}
	return ret;
}
export function decodeCategory(cat) {
	return {
		gender: genderclassReverse[cat[0]],
		age: ageclassReverse[cat.substr(1)]
	};
}

export function equals(primary, secondary, options) {
	if (primary === secondary) {
		return options.fn(this);
	} else {
		return options.inverse(this);
	}
}

export function selected(values, name, options) {
	if (values.hasOwnProperty(name) && values[name] === true) {
		return options.fn(this);
	}
}

export function iofStatus(status) {
	if (status === 'OK') {
		return 'finished';
	} else if (status === 'OverTime') {
		return 'overtime';
	} else if (status === 'Disqualified') {
		return 'disqualified';
	} else if (status === 'DidNotFinish') {
		return 'not finished';
	} else if (status === 'DidNotStart') {
		return 'not started';
	}
	throw Error('wrong status name: ' + status);
}
