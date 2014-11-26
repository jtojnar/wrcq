function create(sql) {
	return {
		event: sql.define({
			name: 'event',
			columns: ['id', 'name', 'start', 'end', 'location', 'organizer', 'level', 'website', 'results', 'media', 'slug', 'complete']
		}),
		team: sql.define({
			name: 'team',
			columns: ['id', 'event_id', 'score', 'time', 'penalty', 'duration', 'gender', 'age', 'status', 'name']
		}),
		member: sql.define({
			name: 'member',
			columns: ['id', 'team_id', 'event_id', 'firstname', 'lastname', 'country_code']
		})
	};
}

module.exports = create;
