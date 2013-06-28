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
	var event = {id: 3, name: 'WRC 1996'};
	pg.connect(_dbUri, function(err, client) {
		var query = client.query('select * from member where event_id=$1', [event.id]);
		var members = [];
		query.on('row', function(row) {
			members.push(row);
		});

		query.on('end', function(result) {
			var query = client.query('select * from team where event_id=$1', [event.id]);
			var teams = [];
			query.on('row', function(row) {
				row.members = [];
				var mcache = [];
				for(var i = 0; i < members.length; i++) {
					if(members[i].team_id == row.id) {
						row.members.push(members[i]);
						mcache.push(i);
					}
				};
				for(var i = 0; i < mcache.length; i++) {
					members.splice(mcache[i], 1);
				};
				mcache = [];
				teams.push(row);
			});

			query.on('end', function(result) {
				res.render('results', {title: 'Results of ' + event.name, event: event, teams: teams, identity: req.user});
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

app.get('/:deck', function(req, res) {
	var deck = null;
	
	if(deck) {
		res.render('card', {title: deck.name, deck: deck});
	} else {
		res.send(404);
	}
});

app.listen(app.get('port'), function() {
	console.log('Started app on port %d', app.get('port'));
});