"use strict";

var _dbUri = process.env.HEROKU_POSTGRESQL_COPPER_URL;

var pg = require('pg');
var fs = require('fs');

var moment = require('moment');
var parseString = require('xml2js').parseString;

var event = { id: 11 };

pg.connect(_dbUri, function(err, client, done) {
	if(err) { return console.log(err); }
	client.query('begin');

	fs.readFile(__dirname + '/resultsbroumy.xml', function(err, data) {
		parseString(data, function (err, results) {
			var teams = results.results.team;
			for(var i = 0, j = teams.length; i<j; i++) {
				var team = teams[i].$;
				team.event_id = event.id;
				team.duration = team.duration ? team.duration : 24;

				var query = client.query('insert into team(id, event_id, score, time, penalty, duration, gender, age, status) values($1, $2, $3, $4, $5, $6, $7, $8, $9)', [team.id, team.event_id, team.score, team.time, team.penalty, team.duration, team.gender, team.age, team.status || 'finished']);

				var members = teams[i].member;
				for(var k = 0, l = members.length; k<l; k++) {
					var member = members[k].$;
					member.team_id = team.id;
					member.event_id = event.id;
					var query = client.query('insert into member(team_id, event_id, firstname, lastname, country_code) values($1, $2, $3, $4, $5)', [member.team_id, member.event_id, member.firstname, member.lastname, member.country]);
				}
			}
			client.query('commit');
			done();
		});
	});
});
pg.end();