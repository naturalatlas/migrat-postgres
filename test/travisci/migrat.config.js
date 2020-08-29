const postgres = require('../../index');

module.exports = {
	migrationsDir: './migrations',
	plugins: [
		postgres({
			host: 'localhost',
			port: 5432,
			user: 'postgres',
			password: '',
			database: 'testdb',
			migratSchema: 'migrat',
			migratTable: 'migrat',
			enableLocking: true,
			enableStateStorage: true
		}),
	]
};
