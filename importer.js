"use strict";

var _dbUri = process.env.HEROKU_POSTGRESQL_COPPER_URL;

var pg = require('pg');
var fs = require('fs');

var moment = require('moment');
var parseString = require('xml2js').parseString;

var event = { id: 11 };
var teamI = 0;
var memberI = 0;

function recursive(teams, client, done) {
	var team = teams[teamI].$;
	team.event_id = event.id;
	team.duration = team.duration ? team.duration : 24;
	var members = teams[teamI].member;
	client.query('insert into team(id, event_id, score, time, penalty, duration, gender, age, status) values($1, $2, $3, $4, $5, $6, $7, $8, $9)', [team.id, team.event_id, team.score, team.time, team.penalty, team.duration, team.gender, team.age, team.status || 'finished'], function() {
		memberI = 0;
		if(teamI < teams.length) {
			return mrecursive(teams, client, done, team, members);
		}
	});
}
function mrecursive(teams, client, done, team, members) {
	var member = members[memberI].$;
	member.team_id = team.id;
	member.event_id = event.id;
	client.query('insert into member(team_id, event_id, firstname, lastname, country_code) values($1, $2, $3, $4, $5)', [member.team_id, member.event_id, member.firstname, member.lastname, member.country], function() {
		if(memberI < members.length-1) {
			memberI++;
			return mrecursive(teams, client, done, team, members);
		} else if(teamI < teams.length-1) {
			teamI++;
			memberI = 0;
			return recursive(teams, client, done, team, members);
		} else {
			client.query('commit');
			done();
			return;
		}
	});
}

pg.connect(_dbUri, function(err, client, done) {
	client.query('begin');

	fs.readFile(__dirname + '/resultsbroumy.xml', function(err, data) {
		parseString(data, function(err, results) {
			var teams = results.results.team;
			return recursive(teams, client, done);
		});
	});
});
pg.end();