import * as db from '../db.js';
import sql from "sql-template-tag";

export async function archive(req, res) {
	let data = await db.query(sql`select * from update order by timestamp desc`);
	res.render('updates_archive', {updates: data.rows, identity: req.user, first: true, last: true});
};
