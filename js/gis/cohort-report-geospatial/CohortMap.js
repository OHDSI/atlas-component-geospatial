define([
	'../const.js',
	'../Utils.js',
	'numeral',
], (constants, { httpCheckStatus, httpQuery, addQueryParams }, numeral) => {
	return class CohortMap {

		constructor({
			gisServiceUrl,
			tilesServerUrl,
			mapContainerEl,
			setLoading,
			setNoGeodataInSource
		}) {
			this.gisServiceUrl = gisServiceUrl;
			this.tilesServerUrl = tilesServerUrl;
			this.mapContainerEl = mapContainerEl;
			this.setLoading = setLoading;
			this.setNoGeodataInSource = setNoGeodataInSource;
		}

		setParams(cohortId, sourceKey) {
			this.cohortId = cohortId;
			this.sourceKey = sourceKey;
		}

		checkIfSourceHasGeodata() {
			return httpCheckStatus(this.gisServiceUrl + `/source/check/${this.sourceKey}`);
		}

		loadCohortBounds() {
			return httpQuery(this.gisServiceUrl + `/cohort/${this.cohortId}/bounds/${this.sourceKey}`);
		}

		async refresh() {
			this.setLoading(true);
			this.setNoGeodataInSource(false);
			if (!await this.checkIfSourceHasGeodata()) {
				this.setLoading(false);
				this.setNoGeodataInSource(true);
				return;
			}

			const bounds = await this.loadCohortBounds();
			if (!this.mapInitiated) {
				this.initiateMap(this.mapContainerEl);
			}
			this.map.fitBounds(
				[
					// <LatLng> southWest, <LatLng> northEast
					[bounds.southLatitude, bounds.westLongitude],
					[bounds.northLatitude, bounds.eastLongitude],
				],
				{
					padding: [50, 50]
				}
			);
			this.setLoading(false);
		}

		getDensityUrl(cohortId, sourceKey, bounds) {
			return addQueryParams(this.gisServiceUrl + `/cohort/${cohortId}/density/${sourceKey}`, bounds);
		}

		getClustersUrl(cohortId, sourceKey, bounds) {
			return addQueryParams(this.gisServiceUrl + `/cohort/${cohortId}/clusters/${sourceKey}`, bounds);
		}

		initiateMap(containerEl) {
			this.map = L.map(containerEl);

			this.osmLayer = L.tileLayer(this.tilesServerUrl + '/{z}/{x}/{y}.png', {
				id: 'osm_tiles',
				maxZoom: 18,
			});

			this.map.addLayer(this.osmLayer);

			this.mapInitiated = true;
		}

		getMapBounds() {
			const bounds = this.map.getBounds();
			const neBounds = bounds.getNorthEast();
			const swBounds = bounds.getSouthWest();
			return {
				northLatitude: neBounds.lat,
				westLongitude: swBounds.lng,
				southLatitude: swBounds.lat,
				eastLongitude: neBounds.lng
			};
		}

		clearLayers() {
			this.map.eachLayer(layer => layer !== this.osmLayer && this.map.removeLayer(layer));
		}

		getDensityColor(d) {
			return d >= 10000 ? '#800026' :
				d >= 1000 ? '#BD0026' :
					d >= 100 ? '#E31A1C' :
						d >= 10 ? '#FC4E2A' :
							d >= 1 ? '#FD8D3C' :
								d >= 0.1 ? '#FEB24C' :
									d >= parseFloat("1e-08") ? '#FED976' :
										d > 0 ? '#fff7d4' :
											'rgba(0,0,0,0)';
		}

		getDensityStyle(feature) {
			return {
				fill: true,
				fillColor: this.getDensityColor(parseFloat(feature.properties.level)),
				weight: 2,
				opacity: 1,
				color: 'red',
				dashArray: '3',
				fillOpacity: 0.5,

				fillRule: 'nonzero'
			};
		}

		async loadDensityMap() {
			this.setLoading(true);
			const url = this.getDensityUrl(this.cohortId, this.sourceKey, this.getMapBounds());
			const res = await httpQuery(url);
			this.setLoading(false);
			return res;
		}

		async loadClusters() {
			this.setLoading(true);
			const url = this.getClustersUrl(this.cohortId, this.sourceKey, this.getMapBounds());
			const res = await httpQuery(url);
			this.setLoading(false);
			return res;
		}

		async updateClusterMap() {
			const geoJson = await this.loadClusters();
			this.clearLayers();
			if (geoJson.features.length === 0) {
				alert('No geo-location data available');
				return;
			}
			const clusters = L.geoJSON(geoJson, {
				pointToLayer: (feature, latlng) => {
					if (feature.properties.size <= 1) {
						return new L.Marker(latlng, {icon: constants.DefaultIcon}).bindPopup(
							`Person ID: <a href="#/profiles/${this.sourceKey}/${feature.properties.subject_id}">${feature.properties.subject_id}</a>`
						);
					} else {
						return new L.Marker(latlng, {
							icon: new L.DivIcon({
								iconSize: [35, 35],
								className: 'cluster-icon',
								html: '<span class="cluster-label">' + numeral(feature.properties.size).format('0a') + '</span>'
							})
						}).on('click', (e) => {
							this.map.setView(e.latlng, this.map.getZoom() + 1);
							this.loadClusters().then(dm => this.updateClusterMap(dm));
						});
					}
				}
			});
			clusters.addTo(this.map);
		}

		async updateDensityMap() {
			const geoJson = await this.loadDensityMap();
			this.clearLayers();
			if (geoJson.features.length === 0) {
				alert('No geo-location data available');
				return;
			}
			const geojsonLayer = L.geoJSON(geoJson, {
				style: this.getDensityStyle.bind(this)
			});
			geojsonLayer.addTo(this.map);
		}
	}
});