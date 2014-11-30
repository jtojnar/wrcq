var pg;
var fs;
var _dbUri;
var sql = require('sql');
var model = require('../model')(sql);

module.exports.inject = function(_pg, __dbUri) {
	pg = _pg;
	_dbUri = __dbUri;
}


module.exports.archive = function(req, res) {
	pg.connect(_dbUri, function(err, client, done) {
		if(err) {
			console.error(err);
			res.status(500).end();
		} else {
			client.query('select * from update order by timestamp desc', function(err, data) {
				if(err) {
					console.error(err);
					res.status(500).end();
				} else {
					res.render('updates_archive', {updates: data.rows, identity: req.user, first: true, last: true});
				}
			});
		}
		done();
	});
}
