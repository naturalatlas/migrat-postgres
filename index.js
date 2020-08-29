/**
 * Migrat Postgres Adapter
 *
 * Options:
 *   - `user` {string}: PostgreSQL user.
 *   - `password` {string}: PostgreSQL user password.
 *   - `host` {string}: PostgreSQL database host.
 *   - `port` {int}: PostgreSQL port.
 *   - `database` {string}: PostgreSQL database name to connect to.
 *
 *   - `migratSchema` {string}: The schema to place the state table in (default: "public")
 *   - `migratTable` {string}: The name of the table to store migrat state / lock data in.
 *
 *   - `enableLocking` {boolean}: Use PostgreSQL to facilitate migrat locking (default: true)
 *   - `enableStateStorage` {boolean}: Use PostgresSQL to store global migration state (default: true)
 */

const fs = require('fs');
const async = require('async');
const { Client } = require('pg');
const escape = require('pg-escape');
const parser = require('./lib/parser.js');
const pkg = require('./package.json');

module.exports = function(options) {
	options.port = options.port || 5432;
	options.host = options.host || 'localhost';

	return function(migrat) {
		let client;
		const clients = [];
		const migratTable = options.migratSchema + '.' + options.migratTable;

		function createClient(callback) {
			const _client = new Client({
				user: options.user,
				host: options.host,
				database: options.database,
				password: options.password,
				port: options.port,
			})
			_client.connect(err => {
				if (err) return callback(new Error('Unable to connect to Postgres server (message: "' + (err.message || err) + '")'));
				clients.push(_client);
				callback(null, _client);
			});
		}
		function queryExecutor(sql) {
			if (!sql) return null;
			return function(context, callback) {
				client.query(sql, function(err) {
					if (err) return callback(new Error('Postgres query failed: ' + (err.message || err)));
					callback();
				});
			};
		}
		function checkExecutor(sql) {
			if (!sql) return null;
			return function(context, callback) {
				client.query(sql, function(err, result) {
					if (err) return callback(err);
					if (!result.rows.length) {
						return callback(new Error('Postgres check failed (query returned zero rows)'));
					}
					callback();
				});
			};
		}
		function setValue(key, value, callback) {
			const escaped_key = escape.literal(key);
			const escaped_value = escape.literal(value);
			const sql = [
				'UPDATE ' + migratTable + ' SET value=' + escaped_value + ' WHERE key=' + escaped_key,
				'INSERT INTO ' + migratTable + ' (key, value) SELECT ' + escaped_key + ', ' + escaped_value + ' WHERE NOT EXISTS (SELECT 1 FROM ' + migratTable + ' WHERE key=' + escaped_key + ' AND value=' + escaped_value + ')'
			].join(';');

			client.query(sql, function(err) {
				if (err) return callback('Unable to set Postgres value (message: "' + (err.message || err) + '")');
				callback();
			});
		}

		migrat.setPluginName('postgres');
		migrat.setPluginVersion(pkg.version);

		migrat.registerHook('initialize', function(callback) {
			createClient(function(err, _client) {
				if (err) return callback(err);

				client = _client;
				client.query('CREATE SCHEMA IF NOT EXISTS ' + options.migratSchema, function(err) {
					if (err) return callback(new Error('Unable to create Postgres schema: ' + options.migratSchema + ' (message: "' + (err.message || err) + '")'));
					client.query('CREATE TABLE IF NOT EXISTS ' + migratTable + ' (key varchar(22) PRIMARY KEY, value text)', function(err) {
						if (err) return callback(new Error('Unable to create Postgres table: ' + migratTable + ' (message: "' + (err.message || err) + '")'));
						callback();
					});
				});
			});
		});

		migrat.registerHook('terminate', function(callback) {
			async.each(clients, (client, callback) => {
				client.end(err => {
					if (err) console.error(err.message);
					callback();
				});
			}, callback);
		});

		migrat.registerLoader('*.psql', function(file, callback) {
			fs.readFile(file, 'utf8', function(err, source) {
				if (err) return callback(err);
				parser(source, function(err, queries) {
					if (err) return callback(err);
					callback(null, {
						up: queryExecutor(queries.up),
						down: queryExecutor(queries.down),
						check: checkExecutor(queries.check)
					});
				});
			});
		});

		migrat.registerTemplate('psql', function(details, callback) {
			fs.readFile(__dirname + '/lib/template.psql', 'utf8', function(err, source) {
				if (err) return callback(err);
				callback(null, source
					.replace('{{date}}', (new Date(details.timestamp)).toString())
					.replace('{{attribution}}', details.user ? ' by ' + details.user : '')
				);
			});
		});
		if (options.enableLocking) {
			migrat.registerLocker({
				lock: function(callback) {
					function attemptLock() {
						createLock(function(err, acquired) {
							if (err) return callback(err);
							if (acquired === true) return callback();
							setTimeout(attemptLock, 500);
						});
					}

					function createLock(callback) {
						createClient((err, client) => {
							if (err) return callback(err);
							const rollback = callback => client.query('ROLLBACK', callback);
							client.query('BEGIN', function(err) {
								if (err) return rollback(() => callback(new Error('Failed to begin transaction')));
								client.query('SELECT * FROM ' + migratTable + ' WHERE key = \'lock\'', (err, result) => {
									if (err) return rollback(() => callback(err));
									if (result.rows.length) {
										return rollback(() => callback(null, false));
									}
									client.query('INSERT INTO ' + migratTable + ' (key, value) VALUES ($1, $2)', ['lock', String((new Date()).getTime())], err => {
										if (err) return rollback(() => callback(err));
										client.query('COMMIT', err => {
											if (err) {
												callback(err);
											} else {
												callback(null, true);
											}
										});
									});
								});
							});
						});
					}

					attemptLock();
				},
				unlock: function(callback) {
					client.query('DELETE FROM ' + migratTable + ' WHERE key=\'lock\'', callback);
				}
			});
		}

		if (options.enableStateStorage) {
			migrat.registerGlobalStateStore({
				get: function(callback) {
					client.query('SELECT * FROM ' + migratTable + ' WHERE key = \'state\'', function(err, result) {
						if (err) return callback(err);
						if (!result.rows.length) return callback();
						callback(null, result.rows[0].value);
					});
				},
				set: function(state, callback) {
					setValue('state', state, callback);
				}
			});
		}
	};
};
