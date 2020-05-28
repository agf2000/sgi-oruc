exports.config = {
	user: 'sa',
	password: 'sa',
	server: '192.168.25.170\\sqlexpress',
	database: 'decoteped',
	port: '1433',
	connectionTimeout: 500000,
	requestTimeout: 500000,
	pool: {
		idleTimeoutMillis: 500000,
		max: 100,
	},
	encrypt: false,
};