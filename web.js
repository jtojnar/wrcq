"use strict";

var express = require('express');
var path = require('path');
var fs = require('fs');

var parseString = require('xml2js').parseString;

var passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	crypto = require('crypto'),
	flash = require('connect-flash'),
	sha1 = function(d) {
		return crypto.createHash('sha1').update(d).digest('hex');
	};

var _dbUri = process.env.HEROKU_POSTGRESQL_COPPER_URL;

passport.serializeUser(function(user, done) {
	done(null, user.id);
});
passport.deserializeUser(function(id, done) {
	pg.connect(_dbUri, function(err, client) {
		if(err) {return done(err, false);}

		var query = client.query('select * from "user" where "id"=$1', [id]);
		var rows = [];
		query.on('row', function(row) {
			rows.push(row);
		});

		query.on('end', function(result) {
			if(result.rowCount == 0) {return done(err, false);}
			var user = rows[0];
			return done(err, user);
		});
	});
});


// thisisdangerous
passport.use(new LocalStrategy(
	function(email, password, done) {
		process.nextTick(function () {
			pg.connect(_dbUri, function(err, client) {
				if(err) {return done(err);}

				var query = client.query('select * from "user" where "email"=$1', [email]);
				var rows = [];
				query.on('row', function(row) {
					rows.push(row);
				});

				query.on('end', function(result) {
					if(result.rowCount == 0) {return done(null, false, {message: 'Unknown user ' + email});}
					var user = rows[0];
					if(user.password != sha1(password+user.salt)) {return done(null, false, {message: 'Invalid password'});}
					return done(null, user);
				});
			});
		});
	}
));

var hbs = require('hbs');
hbs.registerHelper('date', function(date) {
	return moment(date).format('L');
});

var blocks = {};

hbs.registerHelper('extend', function(name, context) {
	var block = blocks[name];
	if(!block) {
		block = blocks[name] = [];
	}

	block.push(context.fn(this));
});

hbs.registerHelper('block', function(name) {
	var val = (blocks[name] || []).join('\n');

	// clear the block
	blocks[name] = [];
	return val;
});

hbs.registerHelper('title', function(value, context) {
	blocks.title = [value];
	return value;
});

hbs.registerHelper('index', function(index, context) {
	return index+1;
});

var genderclass = {
	'men': 'M',
	'women': 'W',
	'mixed': 'X'
};
hbs.registerHelper('genderclass', function(gender, context) {
	return typeof genderclass[gender] === 'undefined' ? '' : genderclass[gender];
});

var ageclass = {
	'under20': '20',
	'under23': '23',
	'junior': 'J',
	'open': 'O',
	'veteran': 'V',
	'superveteran': 'SV',
	'ultraveteran': 'UV'
};
hbs.registerHelper('ageclass', function(age, context) {
	return typeof ageclass[age] === 'undefined' ? '' : ageclass[age];
});

hbs.registerHelper('each', function(context, options) {
	var fn = options.fn, inverse = options.inverse;
	var i = 0, ret = "", data;

	if(options.data) {
		data = hbs.handlebars.createFrame(options.data);
	}

	if(context && typeof context === 'object') {
		if(context instanceof Array) {
			for(var j = context.length; i<j; i++) {
				if(data) {data.index = i;}
				if(i === (j-1)) {
					data.last = true;
				} else {
					data.last = false;
				}
				ret = ret + fn(context[i], {data: data});
			}
		} else {
			var j = context.length;
			for(var key in context) {
				if(context.hasOwnProperty(key)) {
					if(data) {data.key = key;}
					if(i === (j-1)) {
						data.last = true;
					} else {
						data.last = false;
					}
					ret = ret + fn(context[key], {data: data});
					i++;
				}
			}
		}
	}

	if(i === 0) {
		ret = inverse(this);
	}

	return ret;
});

hbs.registerPartials(path.join(__dirname, 'view', 'partial'));

var pg = require('pg');
var moment = require('moment');

var publicDir = path.join(__dirname, 'public');

var app = express();


app.configure(function() {
	app.set('views', path.join(__dirname, 'view'));
	app.set('port', process.env.PORT || 5000);
	app.set('view engine', 'hbs');


	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.session({secret: 'too much to bear'}));
	app.use(flash());
	app.use(passport.initialize());
	app.use(passport.session());

	app.use(express.compress());
	app.use(express.favicon());
	app.use(express.static(publicDir));
});

app.configure('development', function() {
	app.use(express.logger());
});


app.get('/', function(req, res) {
	pg.connect(_dbUri, function(err, client) {
		var query = client.query('select * from update order by timestamp desc limit 10');
		var updates = [];
		query.on('row', function(row) {
			updates.push(row);
		});

		query.on('end', function(result) {
			var query = client.query('select * from event order by start asc');
			var events = [];
			query.on('row', function(row) {
				events.push(row);
			});

			query.on('end', function(result) {
				res.render('index', {updates: updates, events: events, identity: req.user});
			});
		});
	});
});

app.get('/events', function(req, res) {
	res.render('events', {identity: req.user});
});

app.get('/results', function(req, res) {
	var event = {id: 3, name: 'WRC 1998'};
	pg.connect(_dbUri, function(err, client) {
		var query = client.query('select * from member where event_id=$1', [event.id]);
		var members = [];
		query.on('row', function(row) {
			members.push(row);
		});

		query.on('end', function(result) {
			var query = client.query('select * from team where event_id=$1', [event.id]);
			var teams = [];
			var counters = {MO: 0, XO: 0, WO: 0, MV: 0, XV: 0, WV: 0, MSV: 0, XSV: 0, WSV: 0, MUV: 0, XUV: 0, WUV: 0, MJ: 0, XJ: 0, WJ: 0, M20: 0, X20: 0, W20: 0, M23: 0, X23: 0, W23: 0};

			query.on('row', function(row) {
				row.members = [];
				var mcache = [];
				for(var i = 0; i < members.length; i++) {
					if(members[i].team_id == row.id) {
						row.members.push(members[i]);
						mcache.push(i);
					}
				};
				for(var i = mcache.length - 1; i >= 0; i--) {
					members.splice(mcache[i], 1);
				};
				mcache = [];
				teams.push(row);
				if(row.duration == 24) {
					row.duration = '';
					var gender = hbs.handlebars.helpers.genderclass(row.gender);
					
					if(row.age == 'ultraveteran') {
						row[gender+'UV'] = ++counters[gender+'UV'];
						row[gender+'SV'] = ++counters[gender+'SV'];
						row[gender+'V'] = ++counters[gender+'V'];
						row[gender+'O'] = ++counters[gender+'O'];
					} else if(row.age == 'superveteran') {
						row[gender+'SV'] = ++counters[gender+'SV'];
						row[gender+'V'] = ++counters[gender+'V'];
						row[gender+'O'] = ++counters[gender+'O'];
					} else if(row.age == 'veteran') {
						row[gender+'V'] = ++counters[gender+'V'];
						row[gender+'O'] = ++counters[gender+'O'];
					} else if(row.age == 'open') {
						row[gender+'O'] = ++counters[gender+'O'];
					} else if(row.age == 'junior') {
						row[gender+'J'] = ++counters[gender+'J'];
					} else if(row.age == 'under23') {
						row[gender+'23'] = ++counters[gender+'23'];
					} else if(row.age == 'under20') {
						row[gender+'20'] = ++counters[gender+'20'];
					}
				}
			});

			query.on('end', function(result) {
				res.render('results', {
					title: 'Results of ' + event.name,
					event: event,
					teams: teams,
					mo: {teams: [
						{score: 400, time: '20:00:00', members: [{firstname: 'Petr', lastname: 'Novak', country_code: 'CZE'}]},
						{score: 300, time: '20:00:00', members: [{firstname: 'Michal', lastname: 'Dvorak', country_code: 'CZE'}]},
						{score: 200, time: '20:00:00', members: [{firstname: 'Jan', lastname: 'Novotny', country_code: 'CZE'}]}
					]},
					xo: {teams: [
						{score: 340, time: '20:00:00', members: [{firstname: 'Mixr', lastname: 'Novak', country_code: 'CZE'}]},
						{score: 310, time: '20:00:00', members: [{firstname: 'Mixal', lastname: 'Dvorak', country_code: 'CZE'}]},
						{score: 300, time: '20:00:00', members: [{firstname: 'Mix', lastname: 'Novotny', country_code: 'CZE'}]}
					]},
					wo: {teams: [
						{score: 200, time: '20:00:00', members: [{firstname: 'Petra', lastname: 'Novak', country_code: 'CZE'}]},
						{score: 100, time: '19:00:00', members: [{firstname: 'Michala', lastname: 'Dvorak', country_code: 'CZE'}]},
						{score: 100, time: '20:00:00', members: [{firstname: 'Jana', lastname: 'Novotny', country_code: 'CZE'}]}
					]},
					identity: req.user,
					isMO: counters.MO, isXO: counters.XO, isWO: counters.WO, isMV: counters.MV, isXV: counters.XV, isWV: counters.WV, isMSV: counters.MSV, isXSV: counters.XSV, isWSV: counters.WSV, isMUV: counters.MUV, isXUV: counters.XUV, isWUV: counters.WUV, isMJ: counters.MJ, isXJ: counters.XJ, isWJ: counters.WJ, isM20: counters.M20, isX20: counters.X20, isW20: counters.W20, isM23: counters.M23, isX23: counters.X23, isW23: counters.W23
				});
			});
		});
	});
});

app.get('/login', function(req, res) {
	res.render('login', {identity: req.user, message: req.flash('error')});
});

app.post('/login', passport.authenticate('local', {failureRedirect: '/login', failureFlash: true}), function(req, res) {
	res.redirect('/');
});

app.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

app.listen(app.get('port'), function() {
	console.log('Started app on port %d', app.get('port'));
});