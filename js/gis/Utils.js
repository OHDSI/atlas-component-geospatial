"use strict";

define([], () => {

	function getAuthToken() {
		return localStorage.bearerToken;
	}

	async function httpQuery(url) {
		const request = prepareRequest(url);

		const response = await fetch(request);
		const result = await response.json();

		return result;
	}

	async function httpCheckStatus(url) {
		const request = prepareRequest(url);

		const response = await fetch(request);

		return response.status === 200;
	}

	function prepareRequest(url) {
		const headers = new Headers({
			'Authorization': `Bearer ${getAuthToken()}`,
			'Action-Location': location
		});

		return new Request(url, {
			method: 'GET',
			headers,
		});
	}

	function addQueryParams(url, params) {
		const queryLine = Object.keys(params).reduce((acc, key) => {
			return (acc ? (acc + "&") : "") + key + "=" + params[key];
		}, "");
		return url + (url.includes("?") ? "&" : "?") + queryLine;
	}

	return {
		httpCheckStatus,
		httpQuery,
		addQueryParams,
	}
});


