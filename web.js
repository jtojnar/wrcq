"use strict";

var express = require('express');
var path = require('path');
var hbs = require('hbs');
var publicDir = path.join(__dirname, 'public');

var app = express();

app.configure(function(){
	app.set('views', path.join(__dirname, 'view'));
	app.set('port', process.env.PORT || 5000);
	app.set('view engine', 'hbs');

	app.use(express.compress());
	app.use(express.favicon());
	app.use(express.static(publicDir));
	app.use('/components', express.static(path.join(__dirname, 'components')));
});
app.configure('development', function(){
	app.use(express.logger());
});

// var blocks = {};

// hbs.registerHelper('extend', function(name, context) {
// 	var block = blocks[name];
// 	if(!block) {
// 		block = blocks[name] = [];
// 	}

// 	block.push(context.fn(this)); // for older versions of handlebars, use block.push(context(this));
// });

// hbs.registerHelper('block', function(name) {
// 	var val = (blocks[name] || []).join('\n');

// 	// clear the block
// 	blocks[name] = [];
// 	return val;
// });


app.get('/', function(req, res){
	res.render('index', {title: 'News'});
});
app.get('/events', function(req, res){
	res.render('events', {title: 'Events'});
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