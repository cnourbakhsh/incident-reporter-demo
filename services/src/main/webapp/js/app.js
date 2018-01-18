(function () {
	'use strict';

	angular.module('bpmsFlowApp', ['bpmsFlowApp.controllers']);

	angular.module('bpmsFlowApp').config(['$httpProvider', function ($httpProvider) {
		// Basic auth formed from KIE_SERVER_USER and KIE_SERVER_PASSWORD environment variables in Process server
		$httpProvider.defaults.headers.common['Authorization'] = 'Basic cHJvY2Vzc29yOnByb2Nlc3NvciM5OQ==';
	}]);

})();