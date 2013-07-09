(function() {
	"use strict";
	exports.dabin = function() {
		if(arguments.length == 3) {
			var client = arguments[0], query = arguments[1], callback = arguments[2];
			var query = client.query(query, function(){});
		} else if(arguments.length == 4) {
			var client = arguments[0], query = arguments[1], params = arguments[2], callback = arguments[3];
			var query = client.query(query, params, function(){});
		}
		query.on('end', callback);
		return query;

	}
}).call(this);