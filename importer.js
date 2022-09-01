'use strict';

if (process.argv.length < 4) {
	console.log('Please provide sufficient number of arguments:̈́');
	console.log('node importer <event_id> <xml_file>');
	return;
}

const _dbUri = process.env.DATABASE_URL;

const db = require('./db');
const fs = require('fs-extra');

const moment = require('moment');
const { parseStringPromise } = require('xml2js');

async function main() {
	const eventId = parseInt(process.argv[2], 10);

	await db.query('begin');

	try {
		const data = await fs.readFile(process.cwd() + '/' + process.argv[3]);

		const results = await parseStringPromise(data);
		const teams = results.results.team;

		for (const teamElement of teams) {
			const team = teamElement.$;
			const duration = team.duration ? team.duration : 24;
			const members = teamElement.member;

			await db.query('insert into team(id, event_id, score, time, penalty, duration, gender, age, status, name) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [team.id, eventId, team.score, team.time, team.penalty, duration, team.gender, team.age, team.status || 'finished', team.name || '']);

			for (const memberElement of members) {
				const member = memberElement.$;

				await db.query('insert into member(team_id, event_id, firstname, lastname, country_code) values($1, $2, $3, $4, $5)', [team.id, eventId, member.firstname, member.lastname, member.country]);
			}
		}

		db.query('commit');
	} catch(err) {
		console.log(err);
		db.query('rollback');
	}
}

main();
