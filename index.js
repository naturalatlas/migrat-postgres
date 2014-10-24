/**
 * Migrat Postgres Adapter
 *
 * Options:
 *   - `host` {string}: PostgreSQL database host.
 *   - `port` {int}: PostgreSQL port.
 *   - `database` {string}: PostgreSQL database name to connect to.
 *   - `schema` {string}: PostgreSQL schema
 *
 *   - `migratSchema` {string}: The schema to place the state table in (default: "public")
 *   - `migratTable` {string}: The name of the table to store migrat state / lock data in.
 *
 *   - `user` {string}: PostgreSQL user.
 *   - `password` {string}: PostgreSQL user password.
 *
 *   - `enableLocking` {boolean}: Use PostgreSQL to facilitate migrat locking (default: true)
 *   - `enableState` {boolean}: Use PostgresSQL to store global migration state (default: true)
 */

var fs = require('fs');
var pg = require('pg');
var util = require('util');
var loader = require('./lib/loader.js');

module.exports = function(options) {
	function queryExecutor(sql) {
		if (!sql) return null;
		return function(context, callback) {
			pg.connect(connectionString, function(err, client, done) {
				if (err) return callback(err);
				client.query(sql, function(err) {
					done();
					callback(err);
				});
			});
		};
	}

	function initializeSchema(callback) {
		// CREATE SCHEMA IF NOT EXISTS options.migratSchema
		// CREATE TABLE IF NOT EXISTS options.migratSchema.options.migratTable
	}

	var connectionString = util.format('postgres://%s:%s@%s:%d/%s',
		encodeURIComponent(options.user),
		encodeURIComponent(options.password),
		options.host,
		options.port,
		options.database
	);

	return function(migrat) {
		migrat.registerLoader('*.psql', function(file, callback) {
			fs.readFile(file, 'utf8', function(err, source) {
				if (err) return callback(err);
				parser(source, function(err, queries) {
					if (err) return callback(err);
					callback(null, {
						up: queryExecutor(queries.up),
						down: queryExecutor(queries.down),
						check: queryExecutor(queries.check)
					});
				});
			});
		});

		migrat.registerTemplate('psql', function(details, callback) { });

		migrat.registerLocker({
			lock: function(callback) {},
			unlock: function(callback) {}
		});

		migrat.registerStore({
			get: function(callback) {},
			set: function(state, callback) {}
		});
	};
};