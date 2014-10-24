var fs = require('fs');
var assert = require('chai').assert;
var parser = require('../lib/parser.js');

describe('Parser', function() {
	it('should parse psql sections properly', function(done) {
		var content = fs.readFileSync(__dirname + '/fixtures/valid.psql', 'utf8');
		parser(content, function(err, queries) {
			assert.isNull(err);
			assert.deepEqual(queries, {
				check: "-- check:\nSELECT EXISTS(\n    SELECT *\n    FROM information_schema.tables\n    WHERE\n        table_schema = 'public' AND\n        table_name = 'users'\n);",
				down: "-- down:\nDROP TABLE user;",
				up: "-- up:\nCREATE TABLE user (\n    id serial,\n    username text\n);\nINSERT INTO user (username) VALUES (' -- up: ');"
			});
			done();
		});
	});
	it('should return error if it cannot parse', function(done) {
		var content = fs.readFileSync(__dirname + '/fixtures/invalid.psql', 'utf8');
		parser(content, function(err, queries) {
			assert.instanceOf(err, Error);
			done();
		});
	});
});