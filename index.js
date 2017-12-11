"use strict";

const express = require('express');
const path = require('path');
const fs = require('fs');
const url = require('url');
const db = require('./db')

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const crypto = require('crypto');

const Router = require('express-promise-router');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const router = new Router();

const sha1 = function(d) {
	return crypto.createHash('sha1').update(d).digest('hex');
};

function increment(obj, alpha, beta) {
	if(!obj.hasOwnProperty(alpha)) {
		obj[alpha] = {};
	}
	if(!obj[alpha].hasOwnProperty(beta)) {
		obj[alpha][beta] = 0;
	}
	return ++obj[alpha][beta];
}

passport.serializeUser(function(user, done) {
	done(null, user.id);
});
passport.deserializeUser(async function(id, done) {
	let result = await db.query('select * from "user" where "id"=$1', [id]);
	if(result.rowCount === 0) {
		done(null, false);
	}

	let user = result.rows[0];
	done(null, user);
});


// thisisdangerous
passport.use(new LocalStrategy(
	function(email, password, done) {
		process.nextTick(function () {
			db.query('select * from "user" where "email"=$1', [email]).then(result => {
				if(result.rowCount === 0) {
					done(null, false, {message: 'Unknown user ' + email});
				}
				let user = result.rows[0];
				if(user.password != sha1(password+user.salt)) {
					done(null, false, {message: 'Invalid password'});
				}
				done(null, user);
			});
		});
	}
));

const hbs = require('express-handlebars');

const helpers = require('./helpers');

const publicDir = path.join(__dirname, 'public');

const app = express();

const allowCrossDomain = function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');

	next();
}

app.set('views', path.join(__dirname, 'view'));
app.set('port', process.env.PORT || 5000);
const serveStatic = require('serve-static');
app.engine('hbs', hbs({defaultLayout: 'layout', extname: '.hbs', layoutsDir: 'view', partialsDir: path.join(__dirname, 'view', 'partial'), helpers: helpers}));
app.set('view engine', 'hbs');

app.use(require('cookie-parser')());

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

const multipart = require('connect-multiparty');

app.use(require('method-override')());
app.use(session({
	store: new pgSession({pool: db.pool}),
	secret: 'too much to bear',
	resave: true,
	saveUninitialized: true,
	cookie: {maxAge: 30 * 24 * 60 * 60 * 1000}
}));
app.use(require('express-flash')());
app.use(passport.initialize());
app.use(passport.session());

app.use(require('serve-favicon')(__dirname + '/public/favicon.ico'));
app.use(allowCrossDomain);
app.use(serveStatic(publicDir));
app.use('/bower_components', serveStatic(path.join(__dirname, 'bower_components')));

const env = process.env.NODE_ENV || 'development';
if(env === 'development') {
	app.use(require('morgan')('common'));
}

function addEventLinks(links, events) {
	events.forEach(event => {
		event.links = links.filter(link => link.event_id === event.id);
	});
}

router.post('/api/update/add', async function(req, res) {
	if(!req.user) {
		return res.status(403).send('User not logged in.').end();
	}
	if(!req.body.content || req.body.content.trim() === '') {
		return res.status(400).send('Empty update text.').end();
	}

	try {
		let data = await db.query('insert into update(text, user_id, timestamp) values($1, $2, $3) returning id', [req.body.content, req.user.id, new Date()]);
		return res.status(200).send(data.rows[0].id.toString()).end();
	} catch (err) {
		console.error(err);
		return res.status(500).end();
	}
});

router.post('/api/update/edit', async function(req, res) {
	if(!req.user) {
		return res.status(403).send('User not logged in.').end();
	}
	if(!req.body.id || isNaN(parseInt(req.body.id))) {
		return res.status(400).send('Invalid or mising id.').end();
	}
	const id = parseInt(req.body.id);

	if(!req.body.content || req.body.content.trim() === '') {
		return res.status(400).send('Empty update text.').end();
	}

	try {
		await db.query('update update set text = $1 where id = $2', [req.body.content, req.body.id]);
		return res.status(200).end();
	} catch (err) {
		console.error(err);
		return res.status(500).end();
	}
});

const updatesRoute = require('./route/updates');

router.get('/', async function(req, res) {
	let updates = await db.query('select * from update order by timestamp desc limit 5');
	let links = await db.query('select * from link');
	links = links.rows;
	let eventsQuery = await db.query('select * from event left join (select event_id from team group by event_id) as team on team.event_id = event.id where level=\'world\' order by start asc');
	addEventLinks(links, eventsQuery.rows);
	let events = eventsQuery.rows;
	res.render('index', {updates: updates.rows, events: events, identity: req.user, last: true});
});

router.get('/archive', updatesRoute.archive);

const eventsRoute = require('./route/events');

router.get('/events', async function(req, res) {
	let links = await db.query('select * from link');
	links = links.rows;
	let eventsQuery = await db.query('with latest as (select *, row_number() over(partition by level order by start desc) as rk from event where "end" > \'2013-01-01\') select * from latest left join (select event_id from team group by event_id) as team on team.event_id = latest.id where rk <= 2 order by level=\'world\' desc, level::text like \'regional%\' desc, level::text like \'national%\' desc, start desc');
	addEventLinks(links, eventsQuery.rows);
	let events = eventsQuery.rows;
	let pastEventsQuery = await db.query('with latest as (select *, row_number() over(partition by level order by start desc) as rk from event) select * from latest left join (select event_id from team group by event_id) as team on team.event_id = latest.id where rk > 2 or "end" <= \'2013-01-01\' order by level=\'world\' desc, level::text like \'regional%\' desc, level::text like \'national%\' desc, start desc');
	addEventLinks(links, pastEventsQuery.rows);
	let pastEvents = pastEventsQuery.rows;
	res.render('events', {events: {events: events}, pastEvents: {events: pastEvents}, identity: req.user});
});

router.get('/events/add', eventsRoute.add);
router.post('/events/add', eventsRoute.add);

router.get('/events/:event/upload', eventsRoute.upload);
router.post('/events/:event/upload', multipart(), eventsRoute.upload);

function pushQualified(qualified, type, criterion, criterion_qualified, eventIds) {
	for(member in criterion_qualified.rows) {
		if(criterion_qualified.rows.hasOwnProperty(member)) {
			let member = criterion_qualified.rows[member];
			if(!qualified[type].hasOwnProperty(member.country_code)) {
				qualified[type][member.country_code] = {};
			}
			if(!qualified[type][member.country_code].hasOwnProperty(member.person_id)) {
				qualified[type][member.country_code][member.person_id] = {firstname: member.firstname, lastname: member.lastname, country_code: member.country_code, reasons: []};
			}
			if(criterion === '1.1' || criterion === '1.3') {
				let reason = {
					criterion: criterion,
					event: eventIds[member.event_id].slug,
					gender: member.gender,
					position: member.position,
					age: 'open'
				};
				qualified[type][member.country_code][member.person_id].reasons.push(reason);
			} else if(criterion === '1.4') {
				qualified[type][member.country_code][member.person_id].reasons.push({criterion: criterion});
			} else {
				let starWarning = criterion === '2.1' ? member.star_warning : false;
				if(member.prequalified_uv) {
					let reason = {
						criterion: criterion,
						event: eventIds[member.event_id].slug,
						gender: member.gender,
						position: member.position_uv,
						age: 'ultraveteran',
						starWarning: starWarning
					};
					qualified[type][member.country_code][member.person_id].reasons.push(reason);
				}
				if(member.prequalified_sv) {
					let reason = {
						criterion: criterion,
						event: eventIds[member.event_id].slug,
						gender: member.gender,
						position: member.position_sv,
						age: 'superveteran',
						starWarning: starWarning
					};
					qualified[type][member.country_code][member.person_id].reasons.push(reason);
				}
				if(member.prequalified_v) {
					let reason = {
						criterion: criterion,
						event: eventIds[member.event_id].slug,
						gender: member.gender,
						position: member.position_v,
						age: 'veteran',
						starWarning: starWarning
					};
					qualified[type][member.country_code][member.person_id].reasons.push(reason);
				}
				if(member.prequalified_o) {
					let reason = {
						criterion: criterion,
						event: eventIds[member.event_id].slug,
						gender: member.gender,
						position: member.position_o,
						age: 'open',
						starWarning: starWarning
					};
					qualified[type][member.country_code][member.person_id].reasons.push(reason);
				}
				if(member.prequalified_j) {
					let reason = {
						criterion: criterion,
						event: eventIds[member.event_id].slug,
						gender: member.gender,
						position: member.position_j,
						age: 'youth',
						starWarning: starWarning
					};
					qualified[type][member.country_code][member.person_id].reasons.push(reason);
				}
			}
		}
	}
}

function unaccent(text) {
	return text.replace(this.re, function(a){return this.replacemets[a]||a;});
}
unaccent.prototype = {
	replacemets: {'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A', 'Æ': 'A', 'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'a', 'Ā': 'A', 'ā': 'a', 'Ă': 'A', 'ă': 'a', 'Ą': 'A', 'ą': 'a', 'Ç': 'C', 'ç': 'c', 'Ć': 'C', 'ć': 'c', 'Ĉ': 'C', 'ĉ': 'c', 'Ċ': 'C', 'ċ': 'c', 'Č': 'C', 'č': 'c', 'Ď': 'D', 'ď': 'd', 'Đ': 'D', 'đ': 'd', 'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'Ē': 'E', 'ē': 'e', 'Ĕ': 'E', 'ĕ': 'e', 'Ė': 'E', 'ė': 'e', 'Ę': 'E', 'ę': 'e', 'Ě': 'E', 'ě': 'e', 'Ĝ': 'G', 'ĝ': 'g', 'Ğ': 'G', 'ğ': 'g', 'Ġ': 'G', 'ġ': 'g', 'Ģ': 'G', 'ģ': 'g', 'Ĥ': 'H', 'ĥ': 'h', 'Ħ': 'H', 'ħ': 'h', 'Ĩ': 'I', 'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I', 'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ĩ': 'i', 'Ī': 'I', 'ī': 'i', 'Ĭ': 'I', 'ĭ': 'i', 'Į': 'I', 'į': 'i', 'İ': 'I', 'ı': 'i', 'Ĳ': 'I', 'ĳ': 'i', 'Ĵ': 'J', 'ĵ': 'j', 'Ķ': 'K', 'ķ': 'k', 'ĸ': 'k', 'Ĺ': 'L', 'ĺ': 'l', 'Ļ': 'L', 'ļ': 'l', 'Ľ': 'L', 'ľ': 'l', 'Ŀ': 'L', 'ŀ': 'l', 'Ł': 'L', 'ł': 'l', 'Ñ': 'N', 'ñ': 'n', 'Ń': 'N', 'ń': 'n', 'Ņ': 'N', 'ņ': 'n', 'Ň': 'N', 'ň': 'n', 'ŉ': 'n', 'Ŋ': 'N', 'ŋ': 'n', 'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'Ō': 'O', 'ō': 'o', 'Ŏ': 'O', 'ŏ': 'o', 'Ő': 'O', 'ő': 'o', 'Œ': 'E', 'œ': 'e', 'Ø': 'O', 'ø': 'o', 'Ŕ': 'R', 'ŕ': 'r', 'Ŗ': 'R', 'ŗ': 'r', 'Ř': 'R', 'ř': 'r', 'ß': 'S', 'Ś': 'S', 'ś': 's', 'Ŝ': 'S', 'ŝ': 's', 'Ş': 'S', 'ş': 's', 'Š': 'S', 'š': 's', 'Ţ': 'T', 'ţ': 't', 'Ť': 'T', 'ť': 't', 'Ŧ': 'T', 'ŧ': 't', 'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U', 'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'Ũ': 'U', 'ũ': 'u', 'Ū': 'U', 'ū': 'u', 'Ŭ': 'U', 'ŭ': 'u', 'Ů': 'U', 'ů': 'u', 'Ű': 'U', 'ű': 'u', 'Ų': 'U', 'ų': 'u', 'Ŵ': 'W', 'ŵ': 'w', 'Ý': 'Y', 'ý': 'y', 'ÿ': 'y', 'Ŷ': 'Y', 'ŷ': 'y', 'Ÿ': 'Y', 'Ź': 'Z', 'ź': 'z', 'Ż': 'Z', 'ż': 'z', 'Ž': 'Z', 'ž': 'z', 'ё': 'е', 'Ё': 'Е'},
	're': new RegExp('[^A-Za-z0-9\\[\\] ]', 'g')
};

function compare_member(a, b) {
	return unaccent((a.lastname + ' ' + a.firstname).toLowerCase()).localeCompare(unaccent((b.lastname + ' ' + b.firstname).toLowerCase()));
}

router.get('/qualified', async function(req, res) {
	let eventIds = {};
	let eventsQuery = await db.query('select * from event');
	eventsQuery.rows.forEach(row => {
		eventIds[row.id] = row;
	});


	try {
		let qualified = {auto: {}, preferred: {}};

		// criterion 1.1
		let criterion_qualified11 = await db.query(
			"with past_event as (select id from event where level = 'world'), past_team as (select *, count(*) over w as \"limit\", row_number() over (w order by score desc, time asc) as position from team where event_id in (select * from past_event) window w as (partition by event_id, gender)), recent_event as (select id from event where level = 'world' and \"end\" < current_date order by \"end\" desc limit 2), recent_event_attendee as (select person_id from member where (event_id, team_id) in (select event_id, id from team where event_id in (select * from recent_event))) select *, true as prequalified_o from member left join past_team on member.event_id = past_team.event_id and member.team_id = past_team.id where position = 1 and person_id in (select person_id from recent_event_attendee);"
		);
		pushQualified(qualified, 'auto', '1.1', criterion_qualified11, eventIds);

		// criterion 1.2a
		let criterion_qualified12a = await db.query(
			"with recent_event as (select id from event where level = 'world' and \"end\" < current_date and \"end\" > '2013-01-01' order by \"end\" desc limit 2), past_team as (select *, 0.5 as coef, 6 as ceiling, position_in_class(age, 'ultraveteran') over (w order by score desc, time asc) as position_uv, count(nullif(is_in_class(age, 'ultraveteran'), false)) over w as limit_uv, position_in_class(age, 'superveteran') over (w order by score desc, time asc) as position_sv, count(nullif(is_in_class(age, 'superveteran'), false)) over w as limit_sv, position_in_class(age, 'veteran') over (w order by score desc, time asc) as position_v, count(nullif(is_in_class(age, 'veteran'), false)) over w as limit_v, position_in_class(age, 'open') over (w order by score desc, time asc) as position_o, count(nullif(is_in_class(age, 'open'), false)) over w as limit_o, position_in_class(age, 'junior') over (w order by score desc, time asc) as position_j, count(nullif(is_in_class(age, 'junior'), false)) over w as limit_j from team where event_id in (select * from recent_event) window w as (partition by event_id, gender)), past_team_crit as (select *, (position_uv <= ceiling and position_uv <= ceil(limit_uv*coef)) as prequalified_uv, (position_sv <= ceiling and position_sv <= ceil(limit_sv*coef)) as prequalified_sv, (position_v <= ceiling and position_v <= ceil(limit_v*coef)) as prequalified_v, (position_o <= ceiling and position_o <= ceil(limit_o*coef)) as prequalified_o, (position_j <= ceiling and position_j <= ceil(limit_j*coef)) as prequalified_j from past_team) select * from member left join past_team_crit on member.event_id = past_team_crit.event_id and member.team_id = past_team_crit.id where prequalified_uv or prequalified_sv or prequalified_v or prequalified_o or prequalified_j;"
		);
		pushQualified(qualified, 'auto', '1.2a', criterion_qualified12a, eventIds);

		// criterion 1.2b
		let criterion_qualified12b = await db.query(
			"with recent_event as (select id from event where level = 'regional-e' and \"end\" < current_date and \"end\" > '2013-01-01' order by \"end\" desc limit 2), past_team as (select *, 0.5 as coef, 3 as ceiling, position_in_class(age, 'ultraveteran') over (w order by score desc, time asc) as position_uv, count(nullif(is_in_class(age, 'ultraveteran'), false)) over w as limit_uv, position_in_class(age, 'superveteran') over (w order by score desc, time asc) as position_sv, count(nullif(is_in_class(age, 'superveteran'), false)) over w as limit_sv, position_in_class(age, 'veteran') over (w order by score desc, time asc) as position_v, count(nullif(is_in_class(age, 'veteran'), false)) over w as limit_v, position_in_class(age, 'open') over (w order by score desc, time asc) as position_o, count(nullif(is_in_class(age, 'open'), false)) over w as limit_o, position_in_class(age, 'junior') over (w order by score desc, time asc) as position_j, count(nullif(is_in_class(age, 'junior'), false)) over w as limit_j from team where event_id in (select * from recent_event) window w as (partition by event_id, gender)), past_team_crit as (select *, (position_uv <= ceiling and position_uv <= ceil(limit_uv*coef)) as prequalified_uv, (position_sv <= ceiling and position_sv <= ceil(limit_sv*coef)) as prequalified_sv, (position_v <= ceiling and position_v <= ceil(limit_v*coef)) as prequalified_v, (position_o <= ceiling and position_o <= ceil(limit_o*coef)) as prequalified_o, (position_j <= ceiling and position_j <= ceil(limit_j*coef)) as prequalified_j from past_team) select * from member left join past_team_crit on member.event_id = past_team_crit.event_id and member.team_id = past_team_crit.id where prequalified_uv or prequalified_sv or prequalified_v or prequalified_o or prequalified_j;"
		);
		pushQualified(qualified, 'auto', '1.2b', criterion_qualified12b, eventIds);

		// criterion 1.2c
		let criterion_qualified12c = await db.query(
			"with recent_event as (select id from event where level = 'regional-na' and \"end\" < current_date and \"end\" > '2013-01-01' order by \"end\" desc limit 2), past_team as (select *, 0.5 as coef, 2 as ceiling, position_in_class(age, 'ultraveteran') over (w order by score desc, time asc) as position_uv, count(nullif(is_in_class(age, 'ultraveteran'), false)) over w as limit_uv, position_in_class(age, 'superveteran') over (w order by score desc, time asc) as position_sv, count(nullif(is_in_class(age, 'superveteran'), false)) over w as limit_sv, position_in_class(age, 'veteran') over (w order by score desc, time asc) as position_v, count(nullif(is_in_class(age, 'veteran'), false)) over w as limit_v, position_in_class(age, 'open') over (w order by score desc, time asc) as position_o, count(nullif(is_in_class(age, 'open'), false)) over w as limit_o, position_in_class(age, 'junior') over (w order by score desc, time asc) as position_j, count(nullif(is_in_class(age, 'junior'), false)) over w as limit_j from team where event_id in (select * from recent_event) window w as (partition by event_id, gender)), past_team_crit as (select *, (position_uv <= ceiling and position_uv <= ceil(limit_uv*coef)) as prequalified_uv, (position_sv <= ceiling and position_sv <= ceil(limit_sv*coef)) as prequalified_sv, (position_v <= ceiling and position_v <= ceil(limit_v*coef)) as prequalified_v, (position_o <= ceiling and position_o <= ceil(limit_o*coef)) as prequalified_o, (position_j <= ceiling and position_j <= ceil(limit_j*coef)) as prequalified_j from past_team) select * from member left join past_team_crit on member.event_id = past_team_crit.event_id and member.team_id = past_team_crit.id where prequalified_uv or prequalified_sv or prequalified_v or prequalified_o or prequalified_j;"
		);
		pushQualified(qualified, 'auto', '1.2c', criterion_qualified12c, eventIds);

		// criterion 1.2d
		let criterion_qualified12d = await db.query(
			"with recent_event as (select id from event where level = 'regional-a' and \"end\" < current_date and \"end\" > '2013-01-01' order by \"end\" desc limit 2), past_team as (select *, 0.5 as coef, 2 as ceiling, position_in_class(age, 'ultraveteran') over (w order by score desc, time asc) as position_uv, count(nullif(is_in_class(age, 'ultraveteran'), false)) over w as limit_uv, position_in_class(age, 'superveteran') over (w order by score desc, time asc) as position_sv, count(nullif(is_in_class(age, 'superveteran'), false)) over w as limit_sv, position_in_class(age, 'veteran') over (w order by score desc, time asc) as position_v, count(nullif(is_in_class(age, 'veteran'), false)) over w as limit_v, position_in_class(age, 'open') over (w order by score desc, time asc) as position_o, count(nullif(is_in_class(age, 'open'), false)) over w as limit_o, position_in_class(age, 'junior') over (w order by score desc, time asc) as position_j, count(nullif(is_in_class(age, 'junior'), false)) over w as limit_j from team where event_id in (select * from recent_event) window w as (partition by event_id, gender)), past_team_crit as (select *, (position_uv <= ceiling and position_uv <= ceil(limit_uv*coef)) as prequalified_uv, (position_sv <= ceiling and position_sv <= ceil(limit_sv*coef)) as prequalified_sv, (position_v <= ceiling and position_v <= ceil(limit_v*coef)) as prequalified_v, (position_o <= ceiling and position_o <= ceil(limit_o*coef)) as prequalified_o, (position_j <= ceiling and position_j <= ceil(limit_j*coef)) as prequalified_j from past_team) select * from member left join past_team_crit on member.event_id = past_team_crit.event_id and member.team_id = past_team_crit.id where prequalified_uv or prequalified_sv or prequalified_v or prequalified_o or prequalified_j;"
		);
		pushQualified(qualified, 'auto', '1.2d', criterion_qualified12d, eventIds);

		// criterion 1.3
		let criterion_qualified13 = await db.query(
			"with national as (select id, \"end\", row_number() over (partition by level order by \"end\" desc) as position from event where level in ('national-c', 'national-f', 'national-lv', 'national-r', 'national-nz', 'national-a', 'national-uk', 'national-us')), qualifying_national as (select id from national where \"end\" > '2013-01-01' and position <= 2), past_team as (select *, 0.5 as coef, 2 as ceiling, count(*) over w as \"limit\", row_number() over (w order by score desc, time asc) as position from team where event_id in (select * from qualifying_national) window w as (partition by event_id, gender)), past_team_crit as (select *, (position <= ceiling and position <= ceil(\"limit\"*coef)) as prequalified_o from past_team) select * from member left join past_team_crit on member.event_id = past_team_crit.event_id and member.team_id = past_team_crit.id where prequalified_o;"
		);
		pushQualified(qualified, 'auto', '1.3', criterion_qualified13, eventIds);

		// criterion 1.4
		let criterion_qualified14 = await db.query(
			"select * from councillor;"
		);
		pushQualified(qualified, 'auto', '1.4', criterion_qualified14);

		// criterion 2.1
		let criterion_qualified21 = await db.query(
			"with past_event as (select id from event where level = 'world'), past_team as (select *, count(*) over w as \"limit\", row_number() over (w order by score desc, time asc) as position from team where event_id in (select * from past_event) window w as (partition by event_id, gender)), recent_event as (select id from event where level = 'world' and \"end\" < current_date order by \"end\" desc limit 2), recent_event_attendee as (select person_id from member where (event_id, team_id) in (select event_id, id from team where event_id in (select * from recent_event))), all_recent_event as (select id from event where \"end\" > (current_date - INTERVAL '2 years') and \"end\" < current_date), all_recent_event_attendee as (select person_id from member where event_id in (select id from all_recent_event)) select *, (person_id not in (select * from all_recent_event_attendee)) as star_warning, true as prequalified_o from member left join past_team on member.event_id = past_team.event_id and member.team_id = past_team.id where position = 1 and person_id not in (select person_id from recent_event_attendee); "
		);
		pushQualified(qualified, 'preferred', '2.1', criterion_qualified21, eventIds);

		// criterion 2.2
		let criterion_qualified22 = await db.query(
			"with recent_event as (select id from event where level = 'world' and \"end\" < current_date order by \"end\" desc limit 2), past_team as (select *, 0.3 as coef, 7 as floor, 10 as ceiling, position_in_class(age, 'ultraveteran') over (w order by score desc, time asc) as position_uv, count(nullif(is_in_class(age, 'ultraveteran'), false)) over w as limit_uv, position_in_class(age, 'superveteran') over (w order by score desc, time asc) as position_sv, count(nullif(is_in_class(age, 'superveteran'), false)) over w as limit_sv, position_in_class(age, 'veteran') over (w order by score desc, time asc) as position_v, count(nullif(is_in_class(age, 'veteran'), false)) over w as limit_v, position_in_class(age, 'open') over (w order by score desc, time asc) as position_o, count(nullif(is_in_class(age, 'open'), false)) over w as limit_o, position_in_class(age, 'junior') over (w order by score desc, time asc) as position_j, count(nullif(is_in_class(age, 'junior'), false)) over w as limit_j from team where event_id in (select * from recent_event) window w as (partition by event_id, gender)), past_team_crit as (select *, (position_uv >= floor and position_uv <= ceiling and position_uv <= ceil(limit_uv*coef)) as prequalified_uv, (position_sv >= floor and position_sv <= ceiling and position_sv <= ceil(limit_sv*coef)) as prequalified_sv, (position_v >= floor and position_v <= ceiling and position_v <= ceil(limit_v*coef)) as prequalified_v, (position_o >= floor and position_o <= ceiling and position_o <= ceil(limit_o*coef)) as prequalified_o, (position_j >= floor and position_j <= ceiling and position_j <= ceil(limit_j*coef)) as prequalified_j from past_team) select * from member left join past_team_crit on member.event_id = past_team_crit.event_id and member.team_id = past_team_crit.id where prequalified_uv or prequalified_sv or prequalified_v or prequalified_o or prequalified_j;"
		);
		pushQualified(qualified, 'preferred', '2.2', criterion_qualified22, eventIds);

		// criterion 2.3
		let criterion_qualified23 = await db.query(
			"with recent_event as (select id from event where level = 'regional-e' and \"end\" < current_date and \"end\" > '2013-01-01' order by \"end\" desc limit 2), past_team as (select *, 0.3 as coef, 4 as floor, 5 as ceiling, position_in_class(age, 'ultraveteran') over (w order by score desc, time asc) as position_uv, count(nullif(is_in_class(age, 'ultraveteran'), false)) over w as limit_uv, position_in_class(age, 'superveteran') over (w order by score desc, time asc) as position_sv, count(nullif(is_in_class(age, 'superveteran'), false)) over w as limit_sv, position_in_class(age, 'veteran') over (w order by score desc, time asc) as position_v, count(nullif(is_in_class(age, 'veteran'), false)) over w as limit_v, position_in_class(age, 'open') over (w order by score desc, time asc) as position_o, count(nullif(is_in_class(age, 'open'), false)) over w as limit_o, position_in_class(age, 'junior') over (w order by score desc, time asc) as position_j, count(nullif(is_in_class(age, 'junior'), false)) over w as limit_j from team where event_id in (select * from recent_event) window w as (partition by event_id, gender)), past_team_crit as (select *, (position_uv >= floor and position_uv <= ceiling and position_uv <= ceil(limit_uv*coef)) as prequalified_uv, (position_sv >= floor and position_sv <= ceiling and position_sv <= ceil(limit_sv*coef)) as prequalified_sv, (position_v >= floor and position_v <= ceiling and position_v <= ceil(limit_v*coef)) as prequalified_v, (position_o >= floor and position_o <= ceiling and position_o <= ceil(limit_o*coef)) as prequalified_o, (position_j >= floor and position_j <= ceiling and position_j <= ceil(limit_j*coef)) as prequalified_j from past_team) select * from member left join past_team_crit on member.event_id = past_team_crit.event_id and member.team_id = past_team_crit.id where prequalified_uv or prequalified_sv or prequalified_v or prequalified_o or prequalified_j;"
		);
		pushQualified(qualified, 'preferred', '2.3', criterion_qualified23, eventIds);

		// criterion 2.4a
		let criterion_qualified24a = await db.query(
			"with recent_event as (select id from event where level = 'regional-na' and \"end\" < current_date and \"end\" > '2013-01-01' order by \"end\" desc limit 2), past_team as (select *, 0.3 as coef, 3 as ceiling, position_in_class(age, 'ultraveteran') over (w order by score desc, time asc) as position_uv, count(nullif(is_in_class(age, 'ultraveteran'), false)) over w as limit_uv, position_in_class(age, 'superveteran') over (w order by score desc, time asc) as position_sv, count(nullif(is_in_class(age, 'superveteran'), false)) over w as limit_sv, position_in_class(age, 'veteran') over (w order by score desc, time asc) as position_v, count(nullif(is_in_class(age, 'veteran'), false)) over w as limit_v, position_in_class(age, 'open') over (w order by score desc, time asc) as position_o, count(nullif(is_in_class(age, 'open'), false)) over w as limit_o, position_in_class(age, 'junior') over (w order by score desc, time asc) as position_j, count(nullif(is_in_class(age, 'junior'), false)) over w as limit_j from team where event_id in (select * from recent_event) window w as (partition by event_id, gender)), past_team_crit as (select *, (position_uv = ceiling and position_uv <= ceil(limit_uv*coef)) as prequalified_uv, (position_sv = ceiling and position_sv <= ceil(limit_sv*coef)) as prequalified_sv, (position_v = ceiling and position_v <= ceil(limit_v*coef)) as prequalified_v, (position_o = ceiling and position_o <= ceil(limit_o*coef)) as prequalified_o, (position_j = ceiling and position_j <= ceil(limit_j*coef)) as prequalified_j from past_team) select * from member left join past_team_crit on member.event_id = past_team_crit.event_id and member.team_id = past_team_crit.id where prequalified_uv or prequalified_sv or prequalified_v or prequalified_o or prequalified_j;"
		);
		pushQualified(qualified, 'preferred', '2.4a', criterion_qualified24a, eventIds);

		// criterion 2.4b
		let criterion_qualified24b = await db.query(
			"with recent_event as (select id from event where level = 'regional-a' and \"end\" < current_date and \"end\" > '2013-01-01' order by \"end\" desc limit 2), past_team as (select *, 1 as coef, 3 as ceiling, position_in_class(age, 'ultraveteran') over (w order by score desc, time asc) as position_uv, count(nullif(is_in_class(age, 'ultraveteran'), false)) over w as limit_uv, position_in_class(age, 'superveteran') over (w order by score desc, time asc) as position_sv, count(nullif(is_in_class(age, 'superveteran'), false)) over w as limit_sv, position_in_class(age, 'veteran') over (w order by score desc, time asc) as position_v, count(nullif(is_in_class(age, 'veteran'), false)) over w as limit_v, position_in_class(age, 'open') over (w order by score desc, time asc) as position_o, count(nullif(is_in_class(age, 'open'), false)) over w as limit_o, position_in_class(age, 'junior') over (w order by score desc, time asc) as position_j, count(nullif(is_in_class(age, 'junior'), false)) over w as limit_j from team where event_id in (select * from recent_event) window w as (partition by event_id, gender)), past_team_crit as (select *, (position_uv = ceiling and position_uv <= ceil(limit_uv*coef)) as prequalified_uv, (position_sv = ceiling and position_sv <= ceil(limit_sv*coef)) as prequalified_sv, (position_v = ceiling and position_v <= ceil(limit_v*coef)) as prequalified_v, (position_o = ceiling and position_o <= ceil(limit_o*coef)) as prequalified_o, (position_j = ceiling and position_j <= ceil(limit_j*coef)) as prequalified_j from past_team) select * from member left join past_team_crit on member.event_id = past_team_crit.event_id and member.team_id = past_team_crit.id where prequalified_uv or prequalified_sv or prequalified_v or prequalified_o or prequalified_j;"
		);
		pushQualified(qualified, 'preferred', '2.4b', criterion_qualified24b, eventIds);

		let types = ['auto', 'preferred'];
		for(let type in types) {
			let type = types[type];
			let countries = Object.keys(qualified[type]).sort();
			let temporary = {};
			for(let country in countries) {
				if(countries.hasOwnProperty(country)) {
					let country = countries[country];
					let persons = [];
					for(let person in qualified[type][country]) {
						if(qualified[type][country].hasOwnProperty(person)) {
							persons.push(qualified[type][country][person]);
						}
					}
					persons.sort(compare_member);
					temporary[country] = persons;
				}
			}
			qualified[type] = temporary;
		}

		res.render('qualified', {title: 'List of pre-qualifying entrants', qualified: qualified, identity: req.user, datetime: (new Date()).toUTCString()});
	} catch (err) {
		console.log(err);
	}
});

function addMembers(members, teams) {
	teams.forEach(team => {
		team.members = members.filter(member => member.team_id === team.id);
	});
}

router.get('/events/:event/results', async function(req, res) {
	let eventdata = await db.query('select * from event where slug=$1 limit 1', [req.params.event]);

	if(eventdata.rowCount === 0) {
		res.status(404);
		res.render('error/404', {body: 'Sorry, this event is not in our database, we may be working on it.'});
		return;
	}
	let event = eventdata.rows[0];
	if(!event.complete) {
		res.status(404);
		res.render('error/404', {body: 'Sorry, this event has no results (yet). We are working on it in this very moment.'});
		return;
	}

	let members = await db.query('select * from member where event_id=$1', [event.id]);
	members = members.rows;
	let openCategories = helpers.getCategoryDescendants('open').join('\',\'');
	let moquery = await db.query('select * from team where event_id=$1 and gender=$2 and age in (\''+openCategories+'\') order by status=\'finished\' desc, score desc, time asc limit 3', [event.id, 'men']);
	addMembers(members, moquery.rows);
	let mo = moquery.rows;
	let xoquery = await db.query('select * from team where event_id=$1 and gender=$2 and age in (\''+openCategories+'\') order by status=\'finished\' desc, score desc, time asc limit 3', [event.id, 'mixed']);
	addMembers(members, xoquery.rows);
	let xo = xoquery.rows;
	let woquery = await db.query('select * from team where event_id=$1 and gender=$2 and age in (\''+openCategories+'\') order by status=\'finished\' desc, score desc, time asc limit 3', [event.id, 'women']);
	addMembers(members, woquery.rows);
	let wo = woquery.rows;

	let counters = {};
	let durations = [];
	let categories = [];
	let usedCategories = [];

	let defaultDuration = 24;

	let teamquery = await db.query('select * from team where event_id=$1 order by status=\'finished\' desc, score desc, time asc', [event.id]);
	if(teamquery.rowCount === 0) {
		res.status(404);
		res.render('error/404', {body: 'Sorry, this event has no results (yet). We are working on it in this very moment.'});
		return;
	}

	teamquery.rows.forEach(row => {
		let gender = helpers.genderclass(row.gender);
		let age = helpers.ageclass(row.age);
		row.category = gender+age;

		if(durations.indexOf(row.duration) < 0) {
			durations.push(row.duration);
		}
		if(categories.indexOf(row.category) < 0) {
			categories.push(row.category);
		}

		let countToCategories = helpers.getCategoryParents(row.age, row.gender);
		for(let i = 0; i < countToCategories.length; i++) {
			let countToCategory = countToCategories[i];
			row[countToCategory] = increment(counters, row.duration, countToCategory);
		}
		row['place'] = increment(counters, row.duration, 'all');

		if(req.query.category) {
			let categoryDescendants = helpers.getCategoryDescendants(helpers.categoriesToObject[req.query.category].age, helpers.categoriesToObject[req.query.category].gender);
			let availableCategories = categoryDescendants.slice();
			Array.prototype.push.apply(availableCategories, helpers.getCategoryParents(helpers.categoriesToObject[req.query.category].age, helpers.categoriesToObject[req.query.category].gender));
			let currentCategoryIsActive = (categoryDescendants.indexOf(row.category) > -1);
		} else {
			let currentCategoryIsActive = true;
		}
		let currentDurationIsDefault = (!req.query.duration && defaultDuration === row.duration);
		let currentDurationIsActive = (parseInt(req.query.duration) === row.duration);
		if((!req.query.category || currentCategoryIsActive) && (currentDurationIsDefault || currentDurationIsActive)) {
			if (usedCategories.indexOf(row.category) < 0) {
				usedCategories.push(row.category);
			}
		}
	});
	addMembers(members, teamquery.rows);
	let teams = teamquery.rows;

	let isCategoryInvalid = (req.query.hasOwnProperty('category') && categories.indexOf(req.query.category) < 0);
	let isDurationInvalid = (req.query.hasOwnProperty('duration') && durations.indexOf(parseInt(req.query.duration)) < 0);
	let isCategoryDefault = (req.query.hasOwnProperty('category') && req.query.category === '');
	let isDurationDefault = (req.query.hasOwnProperty('duration') && parseInt(req.query.duration) === defaultDuration);

	let displayedCategories = {};
	usedCategories.forEach(function(cat) {
		cat = helpers.decodeCategory(cat);
		let parents = helpers.getCategoryParents(cat.age, cat.gender);
		parents.forEach(function(parent) {
			if (!displayedCategories.hasOwnProperty(parent)) {
				displayedCategories[parent] = 1;
			}
		});
	});

	let allCategories = [];
	categories.forEach(function(cat) {
		cat = helpers.decodeCategory(cat);
		let parents = helpers.getCategoryParents(cat.age, cat.gender);
		parents.forEach(function(parent) {
			if (allCategories.indexOf(parent) < 0) {
				allCategories.push(parent);
			}
		});
	});

	let query = {};
	if(isCategoryDefault || isDurationDefault) {
		if(req.query.hasOwnProperty('duration') && !isDurationDefault) {
			query.duration = req.query.duration;
		}
		if(req.query.hasOwnProperty('category') && !isCategoryDefault) {
			query.category = req.query.category;
		}
		res.redirect(url.format({pathname: req._parsedUrl.pathname, query: query}));
		return;
	}
	if(isDurationInvalid || isCategoryInvalid) {
		res.status(404);
		res.render('error/404');
		return;
	}

	let activeDuration = req.query.hasOwnProperty('duration') ? parseInt(req.query.duration) : defaultDuration;
	res.render('results', {
		title: 'Results of ' + event.name,
		event: event,
		teams: teams,
		mo: {teams: mo},
		xo: {teams: xo},
		wo: {teams: wo},
		identity: req.user,
		is: displayedCategories,
		activeCategory: req.query.hasOwnProperty('category') && req.query.category != '' ? req.query.category : null,
		categories: allCategories.sort(function(a, b) {
			if (a[0] === b[0]) {
				let aAge = helpers.ageclassReverse[a.substr(1)];
				let bAge = helpers.ageclassReverse[b.substr(1)];

				if (aAge === bAge) {
					return 0;
				} else if (helpers.categorySorting[aAge].indexOf(bAge) < 0) {
					return 1;
				} else {
					return -1;
				}
			} else {
				return a[0] < b[0] ? -1 : 1;
			}
		}),
		counters: JSON.stringify(counters),
		activeDuration: activeDuration,
		durations: durations.length > 1 ? durations : null
	});
});

router.get('/login', function(req, res) {
	res.render('login', {identity: req.user, values: req.body});
});

router.post('/login', passport.authenticate('local', {successRedirect: '/', failureFlash: true, failWithError: true}), function(err, req, res, next) {
	console.log(err);
	return res.render('login', {identity: req.user, values: req.body});
});

router.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

app.use(router);

app.listen(app.get('port'), function() {
	console.log('Started app on port %d', app.get('port'));
});
