const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { spawn } = require('child_process');
const assert = require('chai').assert;
const parser = require('../lib/parser.js');

describe('migrat-postgres', function() {
	describe('parser', function() {
		it('should parse psql sections properly', function(done) {
			const content = fs.readFileSync(__dirname + '/fixtures/valid.psql', 'utf8');
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
			const content = fs.readFileSync(__dirname + '/fixtures/invalid.psql', 'utf8');
			parser(content, function(err, queries) {
				assert.instanceOf(err, Error);
				done();
			});
		});
	});
	if (process.env.TRAVIS_CI) {
		it('should migrate', function(done) {
			const root = path.resolve(__dirname, './travisci');
			const migratBin = path.resolve(__dirname, '../node_modules/.bin/migrat');
			const config = require(path.resolve(root, './migrat.config.js'));
			console.log('');
			const proc = spawn(migratBin, ['up'], { cwd: root, stdio: 'inherit' });
			proc.on('exit', (code) => {
				console.log('');
				if (code !== 0) return done(new Error('migrat up exited with code ' + code));
				client = new Client({
					user: 'postgres',
					host: 'localhost',
					database: 'testdb',
					password: '',
					port: 5432,
				})
				client.connect();
				client.query('SELECT * FROM myservice_user', (err, result) => {
					if (err) return done();
					assert.deepEqual(result.rows, [
						{ id: 1, username: 'testuser' },
						{ id: 2, username: 'testuser2' },
					]);
					done();
				});
			});
		});
	}
});
