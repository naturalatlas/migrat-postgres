module.exports = function(source, callback) {
	var match, section;
	var regex = /(?:^|\n|\r)--\s+(up|down|check):\r?\n/gi;
	var queries = {};

	function terminateActiveSection(index) {
		if (typeof sectionBegin !== 'number') return;
		var section = source.substring(sectionBegin, index).trim();
		if (!section) return;
		queries[sectionType] = section;
	}

	var sectionBegin, sectionType;
	while ((match = regex.exec(source)) != null) {
		terminateActiveSection(match.index);
		sectionType = match[1];
		sectionBegin = match.index;
	}
	terminateActiveSection(source.length);

	if (!queries.up) return callback(new Error('No "up" section found'));
	if (!queries.down) return callback(new Error('No "down" section found'));

	callback(null, queries);
};