var moment = require('moment');

var genderclass = {
	'men': 'M',
	'women': 'W',
	'mixed': 'X'
};
var genderclassReverse = reverse(genderclass, true);

var ageclass = {
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
var ageclassReverse = reverse(ageclass, true);

var categoriesToObject = {MO: {age: 'open', gender: 'men'}, XO: {age: 'open', gender: 'mixed'}, WO: {age: 'open', gender: 'women'}, MV: {age: 'veteran', gender: 'men'}, XV: {age: 'veteran', gender: 'mixed'}, WV: {age: 'veteran', gender: 'women'}, MSV: {age: 'superveteran', gender: 'men'}, XSV: {age: 'superveteran', gender: 'mixed'}, WSV: {age: 'superveteran', gender: 'women'}, MUV: {age: 'ultraveteran', gender: 'men'}, XUV: {age: 'ultraveteran', gender: 'mixed'}, WUV: {age: 'ultraveteran', gender: 'women'}, MJ: {age: 'junior', gender: 'men'}, XJ: {age: 'junior', gender: 'mixed'}, WJ: {age: 'junior', gender: 'women'}, MY: {age: 'youth', gender: 'men'}, XY: {age: 'youth', gender: 'mixed'}, WY: {age: 'youth', gender: 'women'}, M18: {age: 'under18', gender: 'men'}, X18: {age: 'under18', gender: 'mixed'}, W18: {age: 'under18', gender: 'women'}, M20: {age: 'under20', gender: 'men'}, X20: {age: 'under20', gender: 'mixed'}, W20: {age: 'under20', gender: 'women'}, M23: {age: 'under23', gender: 'men'}, X23: {age: 'under23', gender: 'mixed'}, W23: {age: 'under23', gender: 'women'}};

var categoryInheritance = {'ultraveteran': 'superveteran', 'superveteran': 'veteran', 'veteran': 'open', 'junior': 'open', 'youth': 'open', 'under20': 'open', 'under23': 'open'};
var categorySorting = {'ultraveteran': [], 'superveteran': ['ultraveteran'], 'veteran': ['superveteran', 'ultraveteran'], 'open': ['veteran', 'superveteran', 'ultraveteran'], 'youth': ['open', 'veteran', 'superveteran', 'ultraveteran'], 'junior': ['youth', 'open', 'veteran', 'superveteran', 'ultraveteran'], 'under23': ['junior', 'youth', 'open', 'veteran', 'superveteran', 'ultraveteran'], 'under20': ['under23', 'junior', 'youth', 'open', 'veteran', 'superveteran', 'ultraveteran']};
var categoryInheritanceReverse = reverse(categoryInheritance);

function reverse(obj, bijective) {
	var rev = {};
	for (var key in obj) {
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

var blocks = {};
module.exports = helpers = {
	date: function(date) {
		return moment(date).format('D MMM YYYY');
	},

	dateinterval: function(start, end) {
		return moment(start).format('D MMM') + '–' + moment(end).format('D MMM YYYY');
	},

	printSeconds: function(t) {
		return helpers.time({
			seconds: t % 60,
			minutes: Math.floor(t / 60) % 60,
			hours: Math.floor(Math.floor(t / 60) / 60),
		})
	},

	extend: function(name, context) {
		var block = blocks[name];
		if(!block) {
			block = blocks[name] = [];
		}

		block.push(context.fn(this));
	},

	block: function(name) {
		var val = (blocks[name] || []).join('\n');

		// clear the block
		blocks[name] = [];
		return val;
	},

	title: function(value, context) {
		blocks.title = [value];
		return value;
	},

	index: function(index, context) {
		return index+1;
	},

	pad: function(number, digits) {
		number = "" + number;
		while(number.length < digits) {
			number = "0" + number;
		}
		return number;
	},

	time: function(time, context) {
		return helpers.pad((time.days||0)*24 + (time.hours||0), 2) + ':' + helpers.pad(time.minutes||0, 2) + ':' + helpers.pad(time.seconds||0, 2);
	},

	ageclassReverse: ageclassReverse,
	genderclassReverse: genderclassReverse,
	categorySorting: categorySorting,
	categoriesToObject: categoriesToObject,

	genderclass: function(gender, context) {
		return typeof genderclass[gender] === 'undefined' ? '' : genderclass[gender];
	},

	ageclass: function(age, context) {
		return typeof ageclass[age] === 'undefined' ? '' : ageclass[age];
	},

	getCategoryParents: function(age, gender) {
		var categories = categoryInheritance;
		var ret = [];
		ret.push(gender ? helpers.genderclass(gender) + helpers.ageclass(age) : age);
		if (categories.hasOwnProperty(age)) {
			ret.push.apply(ret, helpers.getCategoryParents(categories[age], gender));
		}
		return ret;
	},
	getCategoryDescendants: function(age, gender) {
		var categories = categoryInheritanceReverse;
		var ret = [];
		ret.push(gender ? helpers.genderclass(gender) + helpers.ageclass(age) : age);
		if (categories.hasOwnProperty(age)) {
			for (var subage in categories[age]) {
				if (categories[age].hasOwnProperty(subage)) {
					ret.push.apply(ret, helpers.getCategoryDescendants(categories[age][subage], gender));
				}
			}
		}
		return ret;
	},
	decodeCategory: function(cat) {
		return {
			gender: genderclassReverse[cat[0]],
			age: ageclassReverse[cat.substr(1)]
		};
	},

	equals: function(primary, secondary, options) {
		if(primary === secondary) {
			return options.fn(this);
		} else {
			return options.inverse(this);
		}
	},

	selected: function(values, name, options) {
		if(values.hasOwnProperty(name) && values[name] === true) {
			return options.fn(this);
		}
	},

	iofStatus: function(status) {
		if (status === 'OK') {
			return 'finished';
		} else if (status === 'OverTime') {
			return 'overtime';
		} else if (status === 'Disqualified') {
			return 'disqualified';
		} else if (status === 'DidNotFinish') {
			return 'not finished';
		} else if (status === '') {
			return '';
		}
		throw Error('wrong status name: ' + status);
	}
}
