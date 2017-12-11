'use strict';

if (process.argv.length < 4) {
	console.log('Please provide sufficient number of arguments:̈́');
	console.log('node importer <event_id> <xml_file>');
	return;
}

const _dbUri = process.env.DATABASE_URL;

const pg = require('pg');
const fs = require('fs');

const moment = require('moment');
const parseString = require('xml2js').parseString;

let event = { id: process.argv[2] };
let teamI = 0;
let memberI = 0;

function recursive(teams, client, done) {
	let team = teams[teamI].$;
	team.event_id = event.id;
	team.duration = team.duration ? team.duration : 24;
	let members = teams[teamI].member;
	client.query('insert into team(id, event_id, score, time, penalty, duration, gender, age, status, name) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [team.id, team.event_id, team.score, team.time, team.penalty, team.duration, team.gender, team.age, team.status || 'finished', team.name || ''], function(err) {
		if (err) {
			console.log(err);
			client.query('rollback');
			return done();
		}
		memberI = 0;
		if (teamI < teams.length) {
			return mrecursive(teams, client, done, team, members);
		}
	});
}
function mrecursive(teams, client, done, team, members) {
	let member = members[memberI].$;
	member.team_id = team.id;
	member.event_id = event.id;
	client.query('insert into member(team_id, event_id, firstname, lastname, country_code) values($1, $2, $3, $4, $5)', [member.team_id, member.event_id, member.firstname, member.lastname, member.country], function(err) {
		if (err) {
			console.log(err);
			client.query('rollback');
			return done();
		}
		if (memberI < members.length - 1) {
			memberI++;
			return mrecursive(teams, client, done, team, members);
		} else if (teamI < teams.length - 1) {
			teamI++;
			memberI = 0;
			return recursive(teams, client, done, team, members);
		} else {
			client.query('commit');
			return done();
		}
	});
}

pg.connect(_dbUri, function(err, client, done) {
	client.query('begin');

	fs.readFile(process.cwd() + '/' + process.argv[3], function(err, data) {
		if (err) {
			console.log(err);
			return done();
		}
		parseString(data, function(err, results) {
			if (err) {
				console.log(err);
				return done();
			}
			let teams = results.results.team;
			return recursive(teams, client, done);
		});
	});
});
pg.end();
