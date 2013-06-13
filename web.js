"use strict";

var express = require('express');
var path = require('path');

var passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	crypto = require('crypto'),
	flash = require('connect-flash'),
	sha1 = function(d) {
		return crypto.createHash('sha1').update(d).digest('hex');
	};


passport.serializeUser(function(user, done) {
	done(null, user.id);
});
passport.deserializeUser(function(id, done) {
	pg.connect(process.env.DATABASE_URL, function(err, client) {
		if(err) { return done(err, false); }

		var query = client.query('select * from "user" where "id"=$1', [id]);
		var rows = [];
		query.on('row', function(row) {
			rows.push(row);
		});

		query.on('end', function(result) {
			if(result.rowCount == 0) { return done(err, false); }
			var user = rows[0];
			return done(err, user);
		});
	});
});


// thisisdangerous
passport.use(new LocalStrategy(
	function(email, password, done) {
		process.nextTick(function () {
			pg.connect(process.env.DATABASE_URL, function(err, client) {
				if(err) { return done(err); }

				var query = client.query('select * from "user" where "email"=$1', [email]);
				var rows = [];
				query.on('row', function(row) {
					rows.push(row);
				});

				query.on('end', function(result) {
					if(result.rowCount == 0) { return done(null, false, { message: 'Unknown user ' + email }); }
					console.log(result);
					var user = rows[0];
					if(user.password != sha1(password+user.salt)) { return done(null, false, { message: 'Invalid password' }); }
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

	block.push(context.fn(this)); // for older versions of handlebars, use block.push(context(this));
});

hbs.registerHelper('block', function(name) {
	var val = (blocks[name] || []).join('\n');

	// clear the block
	blocks[name] = [];
	return val;
});

hbs.registerHelper('title', function(value, context){
	blocks.title = [value];
	return value;
});

hbs.registerPartials(path.join(__dirname, 'view', 'partial'));

var pg = require('pg');
var moment = require('moment');

var publicDir = path.join(__dirname, 'public');

var app = express();


app.configure(function(){
	app.set('views', path.join(__dirname, 'view'));
	app.set('port', process.env.PORT || 5000);
	app.set('view engine', 'hbs');


	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.session({ secret: 'too much to bear' }));
	app.use(flash());
	app.use(passport.initialize());
	app.use(passport.session());

	app.use(express.compress());
	app.use(express.favicon());
	app.use(express.static(publicDir));
});

app.configure('development', function(){
	app.use(express.logger());
});


app.get('/', function(req, res){
	pg.connect(process.env.DATABASE_URL, function(err, client) {
		var query = client.query('select * from update order by timestamp desc limit 10');
		var updates = [];
		query.on('row', function(row) {
			updates.push(row);
		});

		query.on('end', function(result) {
			console.log(result.rowCount + ' news were received');
			var query = client.query('select * from event order by start asc');
			var events = [];
			query.on('row', function(row) {
				events.push(row);
			});

			query.on('end', function(result) {
				console.log(result.rowCount + ' events were received');
				res.render('index', {updates: updates, events: events, identity: req.user});
			});
		});
	});
});

app.get('/events', function(req, res){
	res.render('events', { identity: req.user });
});

app.get('/login', function(req, res){
	res.render('login', { identity: req.user, message: req.flash('error') });
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }), 	function(req, res) {
	res.redirect('/');
});

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});

app.get('/:deck', function(req, res){
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