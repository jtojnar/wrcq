var pg;
var fs;
var _dbUri;
var sql = require('sql');
var model = require('../model')(sql);

module.exports.inject = function(_pg, _fs, __dbUri) {
	pg = _pg;
	fs = _fs;
	_dbUri = __dbUri;
}

module.exports.add = function(req, res) {
	if(!req.user) {
		res.redirect('/login');
	} else {
		var levels = [
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

		var formSent = req.method.toLowerCase() === 'post';
		var values = req.body;

		if(formSent) {
			values[req.body.level] = true;
			values.complete = values.hasOwnProperty('complete');

			pg.connect(_dbUri, function(err, client, done) {
				if(err) {
					console.error(err);
					req.flash('danger', err);
					res.render('events_add', {identity: req.user, values: values, levels: levels});
				} else {
					client.query('insert into event(name, start, "end", location, organizer, level, website, results, media, slug, complete) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)', [values.name, values.start, values.end, values.location, values.organizer, values.level, values.website, values.results, values.media, values.slug, values.complete], function(err) {
						if(err) {
							console.error(err);
							if(err.code == 23505) {
								req.flash('danger', 'Event with this slug already exists. Please consult with the list of events.');
							} else {
								req.flash('danger', err);
							}
						} else {
							req.flash('success', 'Event was successfully created.');
							return res.redirect('/events');
						}
						res.render('events_add', {identity: req.user, values: values, levels: levels});
					});
				}
				done();
			});
		} else {
			res.render('events_add', {identity: req.user, values: values, levels: levels});
		}
	}
}


module.exports.upload = function(req, res) {
	if(!req.user) {
		res.redirect('/login');
	} else {
		pg.connect(_dbUri, function(err, client, done) {
			if(err) {
				console.error(err);
				req.flash('danger', err);
				res.render('events_add', {identity: req.user, values: values, levels: levels});
			} else {
				client.query('select * from event where slug=$1 limit 1', [req.params.event], function defer(err, eventdata) {
					if(eventdata.rows.length == 0) {
						done();
						res.status(404);
						res.render('error/404', {body: 'Sorry, this event is not in our database, we may be working on it.'});
						return;
					}

					var formSent = req.method.toLowerCase() === 'post';
					var values = req.body;

					values.data_type_csv = !formSent || req.body.data_type === 'csv';
					values.data_type_irf = formSent && req.body.data_type === 'irf';
					values.data_type_iof = formSent && req.body.data_type === 'iof';

					if(formSent) {
						if(req.body.data_type === 'csv') {
							var xml = ['<results xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="results.xsd">'];

							fs.createReadStream(req.files.data.path).pipe(require('fast-csv').parse({headers: true})).on('data', function(data) {
								if(Object.keys(data).length > 0) {
									xml.push('	<team id="' + data.id + '" score="' + data.score + '" time="' + data.time + '" penalty="' + data.penalty + '" gender="' + data.gender + '" age="' + data.age + '" name="' + data.name + '"' + (data.hasOwnProperty('status') ? ' status="' + data.status + '"' : '') + '>');

									var i = 1;
									while(true) {
										if(!data.hasOwnProperty('member' + i + 'firstname')) {
											break;
										}
										xml.push('		<member firstname="' + data['member' + i + 'firstname'] + '" lastname="' + data['member' + i + 'firstname'] + '" country="' + data['member' + i + 'country'] + '" />');
										i++;
									}
									xml.push('	</team>');
								}
							}).on('end', function() {
								xml.push('</results>');
								xml = xml.join('\n');

								processXML(eventdata.rows[0], xml, client, done, function(err) {
									if(err) {
										req.flash('danger', err);
										res.render('events_upload', {identity: req.user, values: values});
									} else {
										res.redirect('/events/' + req.params.event + '/results');
									}
								});
							});
						} else if(req.body.data_type === 'irf') {
							fs.readFile(req.files.data.path, function(err, data) {
								if (err) {
									done();
									throw err;
								}
								processXML(eventdata.rows[0], data, client, done, function(err) {
									if(err) {
										req.flash('error', err);
										res.render('events_upload', {identity: req.user, values: values});
									} else {
										req.flash('success', 'Results were updated.');
										res.redirect('/events/' + req.params.event + '/results');
									}
								});
							});
						}
					} else {
						res.render('events_upload', {identity: req.user, values: values});
					}
				});
			}
			done();
		});
	}
}

var parseString = require('xml2js').parseString;

function processXML(event, data, client, done, cb) {
	parseString(data, function(err, results) {
		if(err) {
			done();
			return cb(err);
		}

		var teams = [];
		var members = [];

		var team;
		var member;
		for(var i = 0; i < results.results.team.length; i++) {
			team = results.results.team[i].$;
			team.event_id = event.id;
			team.duration = team.duration ? team.duration : 24;
			teams.push(team);

			for(var j = 0; j < results.results.team[i].member.length; j++) {
				member = results.results.team[i].member[j].$;
				member.team_id = team.id;
				member.event_id = event.id;
				member.country_code = member.country;
				delete member.country;

				members.push(member);
			}
		}

		client.query('delete from team where event_id = $1', [event.id], function(err) {
			if(err) {
				done();
				return cb(err);
			} else {
				client.query(model.team.insert(teams).toQuery(), function(err) {
					if(err) {
						done();
						return cb(err);
					} else {
						client.query(model.member.insert(members).toQuery(), function(err) {
							if(err) {
								done();
								return cb(err);
							} else {
								client.query(model.event.update({complete: true}).where(model.event.id.equals(event.id)).toQuery(), function(err) {
									if(err) {
										done();
										return cb(err);
									} else {
										done();
										return cb(null);
									}
								});
							}
						});
					}
				});
			}
		});
	});
}
