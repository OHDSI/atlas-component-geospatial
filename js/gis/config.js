define(['optional!appConfig'], (appConfig) => {
	return {
		gisServiceUrl: appConfig.gisServiceUrl || appConfig.api.url + 'gis',
		tilesServerUrl: appConfig.tilesServerUrl || 'https://{s}.tile.openstreetmap.org',
	}
});