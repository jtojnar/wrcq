var pg;
var _dbUri;

module.exports.inject = function(_pg, __dbUri) {
	pg = _pg;
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
