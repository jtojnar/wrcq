const db = require('../db');

module.exports.archive = async function(req, res) {
	let data = await db.query('select * from update order by timestamp desc');
	res.render('updates_archive', {updates: data.rows, identity: req.user, first: true, last: true});
};
