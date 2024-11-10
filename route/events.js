import * as model from '../model.js';
import * as helpers from '../helpers.js';
import * as db from '../db.js';
import fs from 'fs-extra';
import neatCsv from 'neat-csv';
import sanitizer from 'sanitizer';
import sql from "sql-template-tag";
import xml2js from 'xml2js';

export async function add(req, res) {
	if (!req.user) {
		res.status(403);
		req.flash('danger', 'You need to be logged in to create an event.');
		res.render('login');
	} else {
		const levels = [
			{name: 'world', label: 'World'},
			{label: 'Regional', open: true},
			{name: 'regional', label: 'General'},
			{name: 'regional-a', label: 'Australia and Asia'},
			{name: 'regional-e', label: 'Europe'},
			{name: 'regional-na', label: 'Northern America'},
			{close: true},
			{label: 'National', open: true},
			{name: 'national', label: 'General'},
			{name: 'national-a', label: 'Australia'},
			{name: 'national-c', label: 'Czech'},
			{name: 'national-f', label: 'Finland'},
			{name: 'national-us', label: 'United States'},
			{name: 'national-r', label: 'Russia'},
			{name: 'national-nz', label: 'New Zealand'},
			{name: 'national-lv', label: 'Latvia'},
			{name: 'national-uk', label: 'Ukraine'},
			{close: true}
		];

		const formSent = req.method.toLowerCase() === 'post';
		let values = req.body;

		if (formSent) {
			values[values.level] = true;
			values.complete = values.hasOwnProperty('complete');

			try {
				await db.query(sql`insert into event(name, start, "end", location, organizer, level, website, results, media, slug, complete) values(${values.name}, ${values.start}, ${values.end}, ${values.location}, ${values.organizer}, ${values.level}, ${values.website}, ${values.results}, ${values.media}, ${values.slug}, ${values.complete})`);

				req.flash('success', 'Event was successfully created.');
				return res.redirect('/events');
			} catch (err) {
				console.error(err);
				if (err.code == 23505) {
					req.flash('danger', 'Event with this slug already exists. Please consult with the list of events.');
				} else {
					req.flash('danger', err);
				}

				res.render('events_add', {identity: req.user, values: values, levels: levels});
			}
		} else {
			res.render('events_add', {identity: req.user, values: values, levels: levels});
		}
	}
};


export async function upload(req, res) {
	if (!req.user) {
		res.status(403);
		req.flash('danger', 'You need to be logged in to upload an event results.');
		res.render('login');
	} else {
		let eventdata = await db.query(sql`select * from event where slug=${req.params.event} limit 1`);
		if (eventdata.rows.length == 0) {
			res.status(404);
			res.render('error/404', {body: 'Sorry, this event is not in our database, we may be working on it.'});
			return;
		}

		const formSent = req.method.toLowerCase() === 'post';
		let values = req.body;

		values.data_type_csv = !formSent || values.data_type === 'csv';
		values.data_type_ssv = formSent && values.data_type === 'ssv';
		values.data_type_irf = formSent && values.data_type === 'irf';
		values.data_type_iof = formSent && values.data_type === 'iof';

		if (formSent) {
			if (req.files.hasOwnProperty('data') && req.files.data.size > 0) {
				if (values.data_type === 'csv' || values.data_type === 'ssv') {
					try {
						let options = {};
						if (values.data_type === 'ssv') {
							options.separator = ';';
						}

						let xml = ['<results xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="results.xsd">'];

						let lineno = 2;
						let teamData = await fs.createReadStream(req.files.data.path);
						let teams = await neatCsv(teamData, options);

						teams.forEach(data => {
							if (Object.keys(data).length > 0) {
								for (let field of ['id', 'score', 'time', 'penalty', 'gender', 'age']) {
									if (!data.hasOwnProperty(field) || data[field] === '') {
										throw Error('Missing value on line ' + lineno + ': ' + field);
									}
								}
								for (let field of ['id', 'score', 'penalty']) {
									if (isNaN(data[field])) {
										throw Error('Value is not a number on line ' + lineno + ': ' + field);
									}
								}
								for (let field of ['name']) {
									if (!data.hasOwnProperty(field) || data[field] === '') {
										data[field] = '';
									}
								}

								xml.push('	<team id="' + sanitizer.escape(data.id) + '" score="' + sanitizer.escape(data.score) + '" time="' + sanitizer.escape(data.time) + '" penalty="' + sanitizer.escape(data.penalty) + '" gender="' + sanitizer.escape(data.gender) + '" age="' + sanitizer.escape(data.age) + '" name="' + sanitizer.escape(data.name) + '"' + (data.hasOwnProperty('status') && data.status !== '' && data.status !== undefined ? ' status="' + sanitizer.escape(data.status) + '"' : '') + '>');

								let i = 1;
								while (true) {
									if (!data.hasOwnProperty('member' + i + 'firstname') || data['member' + i + 'firstname'] === '' || data['member' + i + 'firstname'] === undefined) {
										break;
									}
									xml.push('		<member firstname="' + sanitizer.escape(data['member' + i + 'firstname']) + '" lastname="' + sanitizer.escape(data['member' + i + 'lastname']) + '" country="' + sanitizer.escape(data['member' + i + 'country']) + '" />');
									i++;
								}
								xml.push('	</team>');
							}
							lineno++;
						});

						xml.push('</results>');
						xml = xml.join('\n');

						await processIRF(eventdata.rows[0], xml);
						res.redirect('/events/' + req.params.event + '/results');
					} catch (err) {
						req.flash('danger', err.detail ? `${err} (${err.detail})` : `${err}`);
						res.render('events_upload', {identity: req.user, values: values});
					}
				} else if (values.data_type === 'irf' || values.data_type === 'iof') {
					fs.readFile(req.files.data.path, async function(err, data) {
						if (err) {
							throw err;
						}
						const processXML = values.data_type === 'irf' ? processIRF : processIOF;
						try {
							await processXML(eventdata.rows[0], data);
							req.flash('success', 'Results were updated.');
							res.redirect('/events/' + req.params.event + '/results');
						} catch (err) {
							console.error(err);
							req.flash('danger', err.detail ? `${err} (${err.detail})` : `${err}`);
							res.render('events_upload', {identity: req.user, values: values});
						}
					});
				} else {
					req.flash('danger', 'Please provide a valid file type.');
					res.render('events_upload', {identity: req.user, values: values});
				}
			} else {
				req.flash('danger', 'Please provide a file.');
				res.render('events_upload', {identity: req.user, values: values});
			}
		} else {
			res.render('events_upload', {identity: req.user, values: values});
		}
	}
};

const parseString = function(data) {
	return new Promise((resolve, reject) => {
		xml2js.parseString(data, (err, res) => {
			if (err) {
				reject(err);
			} else {
				resolve(res);
			}
		});
	});
};

async function processIRF(event, data) {
	let results = await parseString(data);

	let teams = [];
	let members = [];

	for (let teamEl of results.results.team) {
		const teamMembers = teamEl.member;
		const team = teamEl.$;
		team.event_id = event.id;
		team.name = team.name || '';
		team.status = team.status || 'finished';
		team.duration = team.duration ? team.duration : 24;
		teams.push(team);

		for (let memberEl of teamMembers) {
			const member = memberEl.$;
			member.team_id = team.id;
			member.event_id = event.id;
			member.country_code = member.country;
			delete member.country;

			members.push(member);
		}
	}

	await db.query(sql`delete from team where event_id = ${event.id}`);
	await db.query(model.team.insert(teams).toQuery());
	await db.query(model.member.insert(members).toQuery());
	await db.query(model.event.update({complete: true}).where(model.event.id.equals(event.id)).toQuery());
}


async function processIOF(event, data) {
	let results = await parseString(data);
	let teams = [];
	let members = [];

	const classes = results.ResultList.ClassResult;
	if (!classes) {
		throw Error('Missing ResultList.ClassResult');
	}
	for (let i = 0; i < classes.length; i++) {
		let classTeams = classes[i].TeamResult;
		let classAbbr = classes[i].Class[0].Name[0];
		let classDecoded = helpers.decodeCategory(classAbbr);
		if (!classTeams) {
			console.log('Skipping import of an empty class: ' + classAbbr);
			continue;
		}
		for (let j = 0; j < classTeams.length; j++) {
			let currentTeam = classTeams[j];

			let team = {};
			team.event_id = event.id;
			team.id = currentTeam.BibNumber[0];
			team.gender = classDecoded.gender;
			team.age = classDecoded.age;
			team.name = currentTeam.Name[0] || '';
			team.duration = 24;

			if (!currentTeam.TeamMemberResult) {
				throw Error('Missing ResultList.ClassResult[' + i + '].TeamResult[' + j + '].TeamMemberResult');
			}
			for (let m = 0; m < currentTeam.TeamMemberResult.length; m++) {
				let currentMember = currentTeam.TeamMemberResult[m].Person[0];
				if (currentMember.Name[0].Family[0] === 'TEAMTOTAL') {
					let result = currentTeam.TeamMemberResult[m].Result[0];
					team.time = helpers.printSeconds(parseInt(result.Time[0]));
					team.status = helpers.iofStatus(result.Status[0]);
					team.penalty = 0;
					let totalPointsAvailable = false;

					if (!result.Score) {
						throw Error('Missing ResultList.ClassResult[' + i + '].TeamResult[' + j + '].TeamMemberResult[' + m + '] > Score');
					}

					for (let s = 0; s < result.Score.length; s++) {
						let sc = result.Score[s];
						if (!totalPointsAvailable && sc.$.type === 'Points') {
							team.score = sc._;
						} else if (sc.$.type === 'TotalPoints') {
							totalPointsAvailable = true;
							team.score = sc._;
						} else if (sc.$.type === 'PenaltyPoints') {
							team.penalty = sc._;
						}
					}

					if (!totalPointsAvailable) {
						team.score -= team.penalty;
					}
					continue;
				}

				let member = {};
				member.team_id = team.id;
				member.event_id = event.id;
				member.firstname = currentMember.Name[0].Given[0];
				member.lastname = currentMember.Name[0].Family[0];
				member.country_code = currentMember.Nationality[0].$.code;
				members.push(member);
			}

			teams.push(team);
		}
	}

	await db.query(sql`delete from team where event_id = ${event.id}`);
	await db.query(model.team.insert(teams).toQuery());
	await db.query(model.member.insert(members).toQuery());
	await db.query(model.event.update({complete: true}).where(model.event.id.equals(event.id)).toQuery());
}
