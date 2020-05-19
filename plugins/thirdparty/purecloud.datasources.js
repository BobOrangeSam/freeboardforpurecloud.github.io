// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ Copyright © 2020 Orange Business Services                          │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Version 1.0                                                        │ \\
// └────────────────────────────────────────────────────────────────────┘ \\

(function () {
	// ========= Genesys PureCloud notifications - OAuth credentials for this instance (Token Implicit Grant (Browser)) ============
	// OAuth scope in Genesys cloud: alerting, analytics, authorization, conversations, presence, routing, users
	const clientId = '45cadcce-c84d-42e5-bd42-b4c62a5357ca';
	const redirectUri = 'http://localhost:8080/purecloudfreeboard/purecloud.html';
	
	// En ligne
	//const clientId = '67bef101-b25f-4f8f-9cf3-510793a92540';
	//const redirectUri = 'https://www.audaciel.com/avv/purecloudfreeboard/purecloud.html';
	//const redirectUri = 'http://avv-audaciel.epizy.com/purecloudfreeboard/purecloud.html'; // Backup
	
	const clientEnvironment = 'mypurecloud.ie';
	const appName = 'test_app';
	
	// ================= Genesys PureCloud notifications - status of an edge =========================
	var edgeStatusDatasource = function (settings, updateCallback) {
		var self = this;
		var updateTimer = null;
		var currentSettings = settings;

		function updateRefresh(refreshTime) {
			if (updateTimer) {
				clearInterval(updateTimer);
			}

			updateTimer = setInterval(function () {
				self.updateNow();
			}, refreshTime);
		}

		updateRefresh(currentSettings.refresh * 1000);

		this.updateNow = function () {
			const platformClient = require("platformClient");
			const client = platformClient.ApiClient.instance;
			client.setPersistSettings(true);
			client.setEnvironment(clientEnvironment);
			var apiInstance = new platformClient.TelephonyProvidersEdgeApi();
			
			client
				.loginImplicitGrant(clientId, redirectUri)
				.then(function() {
					console.log("logged in");
				})
				.then(() => {
					return apiInstance.getTelephonyProvidersEdge(currentSettings.edgeId, { 'expand': []	});
				})
				.then((data) => {
					// Handle successful result
					console.log('getTelephonyProvidersEdge data: %s',JSON.stringify(data));
					updateCallback(data);
				})
				.catch(function(err) {
				  console.log(err);
				});
		}

		this.onDispose = function () {
			clearInterval(updateTimer);
			updateTimer = null;
		}

		this.onSettingsChanged = function (newSettings) {
			currentSettings = newSettings;
			self.updateNow();
			updateRefresh(currentSettings.refresh * 1000);
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name: "edgeStatus",
		display_name: "Status of an edge",
		settings: [
			{
				name: "edgeId",
				display_name: "Edge ID in PureCloud",
				type: "text"
			},
			{
				name: "refresh",
				display_name: "Refresh Every",
				type: "number",
				suffix: "seconds",
				default_value: 600
			}
		],
		newInstance: function (settings, newInstanceCallback, updateCallback) {
			newInstanceCallback(new edgeStatusDatasource(settings, updateCallback));
		}
	});
	
	// ================= Genesys PureCloud notifications - routing status of agents in a queue =========================
	var agentsRoutingStatusInQueueDatasource = function (settings, updateCallback) {
		var self = this;
		var updateTimer = null;
		var currentSettings = settings;

		function updateRefresh(refreshTime) {
			if (updateTimer) {
				clearInterval(updateTimer);
			}

			updateTimer = setInterval(function () {
				self.updateNow();
			}, refreshTime);
		}

		updateRefresh(currentSettings.refresh * 1000);

		this.updateNow = function () {
			const platformClient = require("platformClient");
			const client = platformClient.ApiClient.instance;
			client.setPersistSettings(true);
			client.setEnvironment(clientEnvironment);
			var apiInstance = new platformClient.RoutingApi();
			
			var opts = { 
				'pageSize': 25, // Number | Page size
				'pageNumber': 1, // Number | Page number
				'sortBy': "name", // String | Sort by
				'expand': ["routingStatus"], // [String] | Which fields, if any, to expand.
				'joined': true, // Boolean | Filter by joined status
				'name': "", // String | Filter by queue member name
				'profileSkills': [], // [String] | Filter by profile skill
				'skills': [], // [String] | Filter by skill
				'languages': [], // [String] | Filter by language
				'routingStatus': [], // [String] | Filter by routing status
				'presence': [] // [String] | Filter by presence
			};

			client
				.loginImplicitGrant(clientId, redirectUri)
				.then(function() {
					console.log("logged in");
				})
				.then(() => {
					return apiInstance.getRoutingQueueUsers(currentSettings.queueId, opts);
				})
				.then((data) => {
					// Handle successful result
					console.log('getRoutingQueueUsers data: %s',JSON.stringify(data));
					var response = [];
					var pieData = {}; // [{ label: 'one', data: 1}, { label: 'two', data: 3}]
					var differentStatuses = ["OFF_QUEUE","INTERACTING","COMMUNICATING","NOT_RESPONDING","IDLE"]
					
					differentStatuses.forEach(function (item, index) {
						pieData[item] = 0;
					});
					
					data.entities.forEach(function (item, index) {
						if (item.hasOwnProperty('name')) {
							response[item.name] = '';
							if (item.hasOwnProperty('routingStatus')) {
								response[item.name] = item.routingStatus;
								pieData[item.routingStatus["status"]] +=1;
							}
						}
					});
					
					response["pie"] = [];
					differentStatuses.forEach(function (item, index) {
						//var elementPie = {"label":item,"data":pieData[item]};
						response["pie"].push( {"label":item,"data":pieData[item]} );
					});
					
					updateCallback(response);
				})
				.catch(function(err) {
				  console.log(err);
				});
		}
		
		this.onDispose = function () {
			clearInterval(updateTimer);
			updateTimer = null;
		}

		this.onSettingsChanged = function (newSettings) {
			currentSettings = newSettings;
			self.updateNow();
			updateRefresh(currentSettings.refresh * 1000);
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name: "agentsRoutingStatusInQueue",
		display_name: "Routing status of agents in a queue",
		settings: [
			{
				name: "queueId",
				display_name: "Queue ID in PureCloud",
				type: "text"
			},
			{
				name: "refresh",
				display_name: "Refresh Every",
				type: "number",
				suffix: "seconds",
				default_value: 10
			}
		],
		newInstance: function (settings, newInstanceCallback, updateCallback) {
			newInstanceCallback(new agentsRoutingStatusInQueueDatasource(settings, updateCallback));
		}
	});
	
	// ================= Genesys PureCloud notifications - status of an edge by name =========================
	var edgeByNameStatusDatasource = function (settings, updateCallback) {
		var self = this;
		var updateTimer = null;
		var currentSettings = settings;

		function updateRefresh(refreshTime) {
			if (updateTimer) {
				clearInterval(updateTimer);
			}

			updateTimer = setInterval(function () {
				self.updateNow();
			}, refreshTime);
		}

		updateRefresh(currentSettings.refresh * 1000);

		this.updateNow = function () {
			const platformClient = require("platformClient");
			const client = platformClient.ApiClient.instance;
			client.setPersistSettings(true);
			client.setEnvironment(clientEnvironment);
			var apiInstance = new platformClient.TelephonyProvidersEdgeApi();
			var optsName = { 
				'pageSize': 25, // Number | Page size
				'pageNumber': 1, // Number | Page number
				'name': currentSettings.edgeName, // String | Name
				'siteId': "", // String | Filter by site.id
				'edgeGroupId': "", // String | Filter by edgeGroup.id
				'sortBy': "name", // String | Sort by
				'managed': false // Boolean | Filter by managed
			};
			
			client
				.loginImplicitGrant(clientId, redirectUri)
				.then(function() {
					// Wait for PageReload.
					console.log("logged in");
				})
				.then(() => {
					// Make request
					return apiInstance.getTelephonyProvidersEdges(optsName)
				})
				.then((data) => {
					// Handle successful result
					console.log('getTelephonyProvidersEdgeS data: %s',JSON.stringify(data));
					updateCallback(data.entities[0]);
				})
				.catch(function(err) {
				  console.log(err);
				});
		}

		this.onDispose = function () {
			clearInterval(updateTimer);
			updateTimer = null;
		}

		this.onSettingsChanged = function (newSettings) {
			currentSettings = newSettings;
			self.updateNow();
			updateRefresh(currentSettings.refresh * 1000);
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name: "edgeByNameStatus",
		display_name: "Status of an edge by name",
		settings: [
			{
				name: "edgeName",
				display_name: "Exact name of the edge in PureCloud",
				type: "text"
			},
			{
				name: "refresh",
				display_name: "Refresh Every",
				type: "number",
				suffix: "seconds",
				default_value: 60
			}
		],
		newInstance: function (settings, newInstanceCallback, updateCallback) {
			newInstanceCallback(new edgeByNameStatusDatasource(settings, updateCallback));
		}
	});
	
	// ================= Genesys PureCloud notifications - status of edges in the current org =========================
	var edgeInOrgStatusDatasource = function (settings, updateCallback) {
		var self = this;
		var updateTimer = null;
		var currentSettings = settings;

		function updateRefresh(refreshTime) {
			if (updateTimer) {
				clearInterval(updateTimer);
			}

			updateTimer = setInterval(function () {
				self.updateNow();
			}, refreshTime);
		}

		updateRefresh(currentSettings.refresh * 1000);

		this.updateNow = function () {
			const platformClient = require("platformClient");
			const client = platformClient.ApiClient.instance;
			client.setPersistSettings(true);
			client.setEnvironment(clientEnvironment);
			var apiInstance = new platformClient.TelephonyProvidersEdgeApi();
			var optsName = { 
				'pageSize': 25, // Number | Page size
				'pageNumber': 1, // Number | Page number
				'name': "", // String | Name
				'siteId': "", // String | Filter by site.id
				'edgeGroupId': "", // String | Filter by edgeGroup.id
				'sortBy': "name", // String | Sort by
				'managed': false // Boolean | Filter by managed
			};
			
			client
				.loginImplicitGrant(clientId, redirectUri)
				.then(function() {
					// Wait for PageReload.
					console.log("logged in");
				})
				.then(() => {
					// Make request
					return apiInstance.getTelephonyProvidersEdges(optsName)
				})
				.then((data) => {
					// Handle successful result
					console.log('getTelephonyProvidersEdgeS data: %s',JSON.stringify(data));
					//updateCallback(data.entities[0]);
					var response = {};
					data.entities.forEach(function (item, index) {
						if (item.hasOwnProperty('name')) {
							response[item.name] = {};
							if (item.hasOwnProperty('statusCode')) response[item.name]["statusCode"] = item.statusCode;
							if (item.hasOwnProperty('onlineStatus')) response[item.name]["onlineStatus"] = item.onlineStatus;
							if (item.hasOwnProperty('healthStatus')) response[item.name]["healthStatus"] = item.healthStatus;
						}
					});
					updateCallback(response);
				})
				.catch(function(err) {
				  console.log(err);
				});
		}

		this.onDispose = function () {
			clearInterval(updateTimer);
			updateTimer = null;
		}

		this.onSettingsChanged = function (newSettings) {
			currentSettings = newSettings;
			self.updateNow();
			updateRefresh(currentSettings.refresh * 1000);
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name: "edgeInOrgStatus",
		display_name: "Status of edges in the current org",
		settings: [
			{
				name: "refresh",
				display_name: "Refresh Every",
				type: "number",
				suffix: "seconds",
				default_value: 60
			}
		],
		newInstance: function (settings, newInstanceCallback, updateCallback) {
			newInstanceCallback(new edgeInOrgStatusDatasource(settings, updateCallback));
		}
	});
	
	// ================= Genesys PureCloud notifications - user presence =========================
	var UserPresenceDatasource = function(settings, updateCallback)
	{
		var self = this;
		var currentSettings = settings;
		var ws;
		
		// Set purecloud objects
		const platformClient = require('platformClient');
		const client = platformClient.ApiClient.instance;
		const notificationsApi = new platformClient.NotificationsApi();
		const presenceApi = new platformClient.PresenceApi();
		const usersApi = new platformClient.UsersApi();

		// Set PureCloud settings
		client.setEnvironment(clientEnvironment);
		client.setPersistSettings(true, appName);

		// Local vars
		let presences = {};
		let webSocket = null;
		let me, notificationChannel;
		
		var onOpen=function()
		{
			console.info("WebSocket Opened");
			updateCallback('...');
		}
		
		var onClose=function()
		{
			console.info("WebSocket Closed");
		}
		
		var onMessage=function(event)
		{
			var data=event.data;
			
			console.info("WebSocket received %s",data);
			var objdata=JSON.parse(data);
			
			if(typeof objdata == "object")
			{
				if (objdata.eventBody.hasOwnProperty('presenceDefinition')) {
					if (objdata.eventBody.presenceDefinition.hasOwnProperty('systemPresence')) {
						updateCallback(objdata.eventBody.presenceDefinition.systemPresence);
					} 
				}
			}
		}
		
		function createWebSocket()
		{
			if(ws) ws.close();
			
			// Authenticate with PureCloud
			client.loginImplicitGrant(clientId, redirectUri)
				.then(() => {
					console.log('Logged in');

					// Get presences
					return presenceApi.getPresencedefinitions({ pageSize: 100 });
				})
				.then((presenceListing) => {
					console.log(`Found ${presenceListing.entities.length} presences`);

					// List each presence
					presenceListing.entities.forEach((presence) => {
						presences[presence.id] = presence;
					});

					// Get authenticated user's data, including current presence
					return usersApi.getUsersMe({ expand: ['presence'] });
				})
				.then((userMe) => {
					me = userMe;

					// Create notification channel
					return notificationsApi.postNotificationsChannels();
				})
				.then((channel) => {
					notificationChannel = channel;
					/*
					console.log('url: ', notificationChannel.connectUri);
					console.log('id: ', notificationChannel.id);
					console.log('my user ID: ', `${me.id}`);
					*/
					// Set up web socket
					webSocket = new WebSocket(notificationChannel.connectUri);
					webSocket.onopen=onOpen;
					webSocket.onclose=onClose;
					webSocket.onmessage=onMessage;

					// Subscribe to authenticated user's presence
					const body = [ { id: `v2.users.${currentSettings.userid}.presence` } ];
					return notificationsApi.putNotificationsChannelSubscriptions(notificationChannel.id, body);
				})
				.then((channel) => {
					console.log('Channel subscriptions set successfully');
				})
				.catch((err) => console.error(err));
		}
		
		createWebSocket();

		this.updateNow = function()
		{
			createWebSocket();
		}

		this.onDispose = function()
		{
			ws.close();
		}

		this.onSettingsChanged = function(newSettings)
		{
			currentSettings = newSettings;
			
			createWebSocket();
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name  : "userpresence",
		display_name : "User presence",
		description : "Genesys PureCloud notification through WebSocket",
		settings   : [
			{
				name: "userid",
				display_name: "User ID in PureCloud",
				type: "text"
			}
		],
		newInstance: function(settings, newInstanceCallback, updateCallback)
		{
			newInstanceCallback( new UserPresenceDatasource(settings, updateCallback));
		}
	});
	
	// ================= Genesys PureCloud notifications - Active users in a queue =========================
	var ActiveUsersDatasource = function(settings, updateCallback)
	{
		var self = this;
		var currentSettings = settings;
		var ws;
		
		// Set purecloud objects
		const platformClient = require('platformClient');
		const client = platformClient.ApiClient.instance;
		const notificationsApi = new platformClient.NotificationsApi();
		
		// Set PureCloud settings
		client.setEnvironment(clientEnvironment);
		client.setPersistSettings(true, appName);

		// Local vars
		let presences = {};
		let webSocket = null;
		let me, notificationChannel;
		
		var onOpen=function()
		{
			console.info("WebSocket Opened");
			updateCallback('...');
		}
		
		var onClose=function()
		{
			console.info("WebSocket Closed");
		}
		
		var onMessage=function(event)
		{
			var data=event.data;
			
			//console.info("WebSocket received %s",data);
			var objdata=JSON.parse(data);
			
			if(typeof objdata == "object")
			{
				var rootData = [];
				if (objdata.eventBody.hasOwnProperty('data')) rootData = objdata.eventBody.data[0].metrics;
				if (typeof(rootData) !== 'undefined') {
					rootData.forEach(function (item, index) {
						if (item.hasOwnProperty('metric')) {
							if ('oActiveUsers'==item.metric) {
								if (item.stats.hasOwnProperty('count')) updateCallback(item.stats.count);
							}
						}
					});
					
				}
			}			
		}
		
		function createWebSocket()
		{
			if(ws) ws.close();
			
			// Authenticate with PureCloud
			client.loginImplicitGrant(clientId, redirectUri)
				.then(() => {
					console.log('Logged in');

					// Create notification channel
					return notificationsApi.postNotificationsChannels();
				})
				.then((channel) => {
					notificationChannel = channel;
					
					// Set up web socket
					webSocket = new WebSocket(notificationChannel.connectUri);
					webSocket.onopen=onOpen;
					webSocket.onclose=onClose;
					webSocket.onmessage=onMessage;

					// Subscribe to authenticated user's presence
					const body = [ { id: `v2.analytics.queues.${currentSettings.queueid}.observations` } ];
					return notificationsApi.putNotificationsChannelSubscriptions(notificationChannel.id, body);
				})
				.then((channel) => {
					console.log('Channel subscriptions set successfully');
				})
				.catch((err) => console.error(err));
		}
		
		createWebSocket();

		this.updateNow = function()
		{
			createWebSocket();
		}

		this.onDispose = function()
		{
			ws.close();
		}

		this.onSettingsChanged = function(newSettings)
		{
			currentSettings = newSettings;
			
			createWebSocket();
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name  : "activeusers",
		display_name : "Number of active users in a queue",
		description : "Genesys PureCloud notification through WebSocket",
		settings   : [
			{
				name: "queueid",
				display_name: "Queue ID in PureCloud",
				type: "text"
			}
		],
		newInstance: function(settings, newInstanceCallback, updateCallback)
		{
			newInstanceCallback( new ActiveUsersDatasource(settings, updateCallback));
		}
	});
	
	// ================= Genesys PureCloud notifications - Number of members in a queue =========================
	var MemberUsersDatasource = function(settings, updateCallback)
	{
		var self = this;
		var currentSettings = settings;
		var ws;
		
		// Set purecloud objects
		const platformClient = require('platformClient');
		const client = platformClient.ApiClient.instance;
		const notificationsApi = new platformClient.NotificationsApi();
		
		// Set PureCloud settings
		client.setEnvironment(clientEnvironment);
		client.setPersistSettings(true, appName);

		// Local vars
		let presences = {};
		let webSocket = null;
		let me, notificationChannel;
		
		var onOpen=function()
		{
			console.info("WebSocket Opened");
			updateCallback('...');
		}
		
		var onClose=function()
		{
			console.info("WebSocket Closed");
		}
		
		var onMessage=function(event)
		{
			var data=event.data;
			
			//console.info("WebSocket received %s",data);
			var objdata=JSON.parse(data);
			
			if(typeof objdata == "object")
			{
				var rootData = [];
				if (objdata.eventBody.hasOwnProperty('data')) rootData = objdata.eventBody.data[0].metrics;
				if (typeof(rootData) !== 'undefined') {
					rootData.forEach(function (item, index) {
						if (item.hasOwnProperty('metric')) {
							if ('oMemberUsers'==item.metric) {
								if (item.stats.hasOwnProperty('count')) updateCallback(item.stats.count);
							}
						}
					});
					
				}
			}			
		}
		
		function createWebSocket()
		{
			if(ws) ws.close();
			
			// Authenticate with PureCloud
			client.loginImplicitGrant(clientId, redirectUri)
				.then(() => {
					console.log('Logged in');

					// Create notification channel
					return notificationsApi.postNotificationsChannels();
				})
				.then((channel) => {
					notificationChannel = channel;
					
					// Set up web socket
					webSocket = new WebSocket(notificationChannel.connectUri);
					webSocket.onopen=onOpen;
					webSocket.onclose=onClose;
					webSocket.onmessage=onMessage;

					// Subscribe to authenticated user's presence
					const body = [ { id: `v2.analytics.queues.${currentSettings.queueid}.observations` } ];
					return notificationsApi.putNotificationsChannelSubscriptions(notificationChannel.id, body);
				})
				.then((channel) => {
					console.log('Channel subscriptions set successfully');
				})
				.catch((err) => console.error(err));
		}
		
		createWebSocket();

		this.updateNow = function()
		{
			createWebSocket();
		}

		this.onDispose = function()
		{
			ws.close();
		}

		this.onSettingsChanged = function(newSettings)
		{
			currentSettings = newSettings;
			
			createWebSocket();
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name  : "memberusers",
		display_name : "Number of members in a queue",
		description : "Genesys PureCloud notification through WebSocket",
		settings   : [
			{
				name: "queueid",
				display_name: "Queue ID in PureCloud",
				type: "text"
			}
		],
		newInstance: function(settings, newInstanceCallback, updateCallback)
		{
			newInstanceCallback( new MemberUsersDatasource(settings, updateCallback));
		}
	});
	
	// ================= Genesys PureCloud notifications - On queue users in a queue =========================
	var OnQueueUsersDatasource = function(settings, updateCallback)
	{
		var self = this;
		var currentSettings = settings;
		var ws;
		
		// Set purecloud objects
		const platformClient = require('platformClient');
		const client = platformClient.ApiClient.instance;
		const notificationsApi = new platformClient.NotificationsApi();
		
		// Set PureCloud settings
		client.setEnvironment(clientEnvironment);
		client.setPersistSettings(true, appName);

		// Local vars
		let presences = {};
		let webSocket = null;
		let me, notificationChannel;
		
		var onOpen=function()
		{
			console.info("WebSocket Opened");
			updateCallback('...');
		}
		
		var onClose=function()
		{
			console.info("WebSocket Closed");
		}
		
		var onMessage=function(event)
		{
			var data=event.data;
			
			//console.info("WebSocket received %s",data);
			var objdata=JSON.parse(data);
			
			if(typeof objdata == "object")
			{
				var rootData = [];
				if (objdata.eventBody.hasOwnProperty('data')) rootData = objdata.eventBody.data[0].metrics;
				if (typeof(rootData) !== 'undefined') {
					rootData.forEach(function (item, index) {
						if (item.hasOwnProperty('metric')) {
							if (('oOnQueueUsers'==item.metric)&&(currentSettings.state==item.qualifier)) {
								if (item.stats.hasOwnProperty('count')) {
									updateCallback(item.stats.count);
								}
							}
						}
					});
					
				}
			}			
		}
		
		function createWebSocket()
		{
			if(ws) ws.close();
			
			// Authenticate with PureCloud
			client.loginImplicitGrant(clientId, redirectUri)
				.then(() => {
					console.log('Logged in');

					// Create notification channel
					return notificationsApi.postNotificationsChannels();
				})
				.then((channel) => {
					notificationChannel = channel;
					
					// Set up web socket
					webSocket = new WebSocket(notificationChannel.connectUri);
					webSocket.onopen=onOpen;
					webSocket.onclose=onClose;
					webSocket.onmessage=onMessage;

					// Subscribe to authenticated user's presence
					const body = [ { id: `v2.analytics.queues.${currentSettings.queueid}.observations` } ];
					return notificationsApi.putNotificationsChannelSubscriptions(notificationChannel.id, body);
				})
				.then((channel) => {
					console.log('Channel subscriptions set successfully');
				})
				.catch((err) => console.error(err));
		}
		
		createWebSocket();

		this.updateNow = function()
		{
			createWebSocket();
		}

		this.onDispose = function()
		{
			ws.close();
		}

		this.onSettingsChanged = function(newSettings)
		{
			currentSettings = newSettings;
			
			createWebSocket();
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name  : "onqueueusers",
		display_name : "Number of users in different ready states in a queue",
		description : "Genesys PureCloud notification through WebSocket",
		settings   : [
			{
				name: "queueid",
				display_name: "Queue ID in PureCloud",
				type: "text"
			},
			{
				"name"        : "state",
				"display_name": "state",
				"type"        : "option",
				"options"     : [
					{
						"name" : "INTERACTING"
					},
					{
						"name" : "COMMUNICATING"
					},
					{
						"name" : "NOT_RESPONDING"
					},
					{
						"name" : "IDLE"
					}
				]
			}
		],
		newInstance: function(settings, newInstanceCallback, updateCallback)
		{
			newInstanceCallback( new OnQueueUsersDatasource(settings, updateCallback));
		}
	});
	
	// ================= Genesys PureCloud notifications - User routing statuses in a queue =========================
	var UserRoutingStatusesDatasource = function(settings, updateCallback)
	{
		var self = this;
		var currentSettings = settings;
		var ws;
		
		// Set purecloud objects
		const platformClient = require('platformClient');
		const client = platformClient.ApiClient.instance;
		const notificationsApi = new platformClient.NotificationsApi();
		
		// Set PureCloud settings
		client.setEnvironment(clientEnvironment);
		client.setPersistSettings(true, appName);

		// Local vars
		let presences = {};
		let webSocket = null;
		let me, notificationChannel;
		
		var onOpen=function()
		{
			console.info("WebSocket Opened");
			updateCallback('...');
		}
		
		var onClose=function()
		{
			console.info("WebSocket Closed");
		}
		
		var onMessage=function(event)
		{
			var data=event.data;
			
			//console.info("WebSocket received %s",data);
			var objdata=JSON.parse(data);
			
			if(typeof objdata == "object")
			{
				var rootData = [];
				if (objdata.eventBody.hasOwnProperty('data')) rootData = objdata.eventBody.data[0].metrics;
				if (typeof(rootData) !== 'undefined') {
					rootData.forEach(function (item, index) {
						if (item.hasOwnProperty('metric')) {
							if (('oUserRoutingStatuses'==item.metric)&&(currentSettings.state==item.qualifier)) {
								if (item.stats.hasOwnProperty('count')) updateCallback(item.stats.count);
							}
						}
					});
					
				}
			}			
		}
		
		function createWebSocket()
		{
			if(ws) ws.close();
			
			// Authenticate with PureCloud
			client.loginImplicitGrant(clientId, redirectUri)
				.then(() => {
					console.log('Logged in');

					// Create notification channel
					return notificationsApi.postNotificationsChannels();
				})
				.then((channel) => {
					notificationChannel = channel;
					
					// Set up web socket
					webSocket = new WebSocket(notificationChannel.connectUri);
					webSocket.onopen=onOpen;
					webSocket.onclose=onClose;
					webSocket.onmessage=onMessage;

					// Subscribe to authenticated user's presence
					const body = [ { id: `v2.analytics.queues.${currentSettings.queueid}.observations` } ];
					return notificationsApi.putNotificationsChannelSubscriptions(notificationChannel.id, body);
				})
				.then((channel) => {
					console.log('Channel subscriptions set successfully');
				})
				.catch((err) => console.error(err));
		}
		
		createWebSocket();

		this.updateNow = function()
		{
			createWebSocket();
		}

		this.onDispose = function()
		{
			ws.close();
		}

		this.onSettingsChanged = function(newSettings)
		{
			currentSettings = newSettings;
			
			createWebSocket();
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name  : "userroutingstatuses",
		display_name : "Number of users in different routing states in a queue",
		description : "Genesys PureCloud notification through WebSocket",
		settings   : [
			{
				name: "queueid",
				display_name: "Queue ID in PureCloud",
				type: "text"
			},
			{
				"name"        : "state",
				"display_name": "state",
				"type"        : "option",
				"options"     : [
					{
						"name" : "INTERACTING"
					},
					{
						"name" : "OFF_QUEUE"
					},
					{
						"name" : "COMMUNICATING"
					},
					{
						"name" : "NOT_RESPONDING"
					},
					{
						"name" : "IDLE"
					}
				]
			}
		],
		newInstance: function(settings, newInstanceCallback, updateCallback)
		{
			newInstanceCallback( new UserRoutingStatusesDatasource(settings, updateCallback));
		}
	});
	
	// ================= Genesys PureCloud notifications - Statutes in a queue per media =========================
	var MediaStatusesDatasource = function(settings, updateCallback)
	{
		var self = this;
		var currentSettings = settings;
		var ws;
		
		// Set purecloud objects
		const platformClient = require('platformClient');
		const client = platformClient.ApiClient.instance;
		const notificationsApi = new platformClient.NotificationsApi();
		
		// Set PureCloud settings
		client.setEnvironment(clientEnvironment);
		client.setPersistSettings(true, appName);

		// Local vars
		let presences = {};
		let webSocket = null;
		let me, notificationChannel;
		
		var onOpen=function()
		{
			console.info("WebSocket Opened");
		}
		
		var onClose=function()
		{
			console.info("WebSocket Closed");
		}
		
		var onMessage=function(event)
		{
			var data=event.data;
			
			//console.info("WebSocket received %s",data);
			var objdata=JSON.parse(data);
			
			if(typeof objdata == "object")
			{
				var rootData = [];
				var response = {};
				if (objdata.eventBody.hasOwnProperty('group')) {
					if (objdata.eventBody.group.hasOwnProperty('mediaType')) {
						if (objdata.eventBody.group.mediaType == currentSettings.mediaType) {
							if (objdata.eventBody.hasOwnProperty('data')) rootData = objdata.eventBody.data[0].metrics;
							if (typeof(rootData) !== 'undefined') {
								rootData.forEach(function (item, index) {
									if (item.hasOwnProperty('metric')) {
										if (item.stats.hasOwnProperty('count')) {
											response[item.metric] = item.stats.count;
										}
									}
								});
								//console.info("response %s",JSON.stringify(response));
								updateCallback(response);
							}
						}
					}
				}
			}			
		}
		
		function createWebSocket()
		{
			if(ws) ws.close();
			
			// Initialisation
			initObject = {};
			switch(currentSettings.mediaType) {
				case 'voice':
					initObject = {"oInteracting":"...","oWaiting":"..."};
					break;
				case 'chat':
					initObject = {"tAlert":"...","tAcw":"...","nOffered":"...","tHandle":"...","tAnswered":"...","tTalk":"...","tAcd":"...","tTalkComplete":"...","tWait":"..."};
					break;
				case 'email':
					initObject = {"oInteracting":"...","oWaiting":"..."};
					break;
				case 'callback':
					initObject = {"oInteracting":"...","oWaiting":"..."};
					break;
				case 'message':
					initObject = {"oInteracting":"...","oWaiting":"..."};
					break;
				default:
					break;
			}
			updateCallback(initObject);
			
			
			// Authenticate with PureCloud
			client.loginImplicitGrant(clientId, redirectUri)
				.then(() => {
					console.log('Logged in');

					// Create notification channel
					return notificationsApi.postNotificationsChannels();
				})
				.then((channel) => {
					notificationChannel = channel;
					
					// Set up web socket
					webSocket = new WebSocket(notificationChannel.connectUri);
					webSocket.onopen=onOpen;
					webSocket.onclose=onClose;
					webSocket.onmessage=onMessage;

					// Subscribe to authenticated user's presence
					const body = [ { id: `v2.analytics.queues.${currentSettings.queueid}.observations` } ];
					return notificationsApi.putNotificationsChannelSubscriptions(notificationChannel.id, body);
				})
				.then((channel) => {
					console.log('Channel subscriptions set successfully');
				})
				.catch((err) => console.error(err));
		}
		
		createWebSocket();

		this.updateNow = function()
		{
			createWebSocket();
		}

		this.onDispose = function()
		{
			ws.close();
		}

		this.onSettingsChanged = function(newSettings)
		{
			currentSettings = newSettings;
			
			createWebSocket();
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name  : "mediastatuses",
		display_name : "Number of interactions in different routing states in a queue",
		description : "Genesys PureCloud notification through WebSocket",
		settings   : [
			{
				"name": "queueid",
				"display_name": "Queue ID in PureCloud",
				"type": "text"
			},
			{
				"name"        : "mediaType",
				"display_name": "Media type",
				"type"        : "option",
				"options"     : [
					{
						"name" : "voice"
					},
					{
						"name" : "chat"
					},
					{
						"name" : "email"
					},
					{
						"name" : "callback"
					},
					{
						"name" : "message"
					}
				]
			}
		],
		newInstance: function(settings, newInstanceCallback, updateCallback)
		{
			newInstanceCallback( new MediaStatusesDatasource(settings, updateCallback));
		}
	});
	
	// ================= Genesys PureCloud notifications - Statutes in a queue (by name) per media =========================
	var MediaStatusesQueueByNameDatasource = function(settings, updateCallback)
	{
		var self = this;
		var currentSettings = settings;
		var ws;
		
		// Set purecloud objects
		const platformClient = require('platformClient');
		const client = platformClient.ApiClient.instance;
		const notificationsApi = new platformClient.NotificationsApi();
		
		// Set PureCloud settings
		client.setEnvironment(clientEnvironment);
		client.setPersistSettings(true);
		
		// Local vars
		let webSocket = null;
		let notificationChannel;
		
		var onOpen=function()
		{
			console.info("WebSocket Opened");
		}
		
		var onClose=function()
		{
			console.info("WebSocket Closed");
		}
		
		var onMessage=function(event)
		{
			var data=event.data;
			
			//console.info("WebSocket received %s",data);
			var objdata=JSON.parse(data);
			
			if(typeof objdata == "object")
			{
				var rootData = [];
				var response = {};
				if (objdata.eventBody.hasOwnProperty('group')) {
					if (objdata.eventBody.group.hasOwnProperty('mediaType')) {
						if (objdata.eventBody.group.mediaType == currentSettings.mediaType) {
							if (objdata.eventBody.hasOwnProperty('data')) rootData = objdata.eventBody.data[0].metrics;
							if (typeof(rootData) !== 'undefined') {
								rootData.forEach(function (item, index) {
									if (item.hasOwnProperty('metric')) {
										if (item.stats.hasOwnProperty('count')) {
											response[item.metric] = item.stats.count;
										}
									}
								});
								//console.info("response %s",JSON.stringify(response));
								updateCallback(response);
							}
						}
					}
				}
			}			
		}
		
		function createWebSocket()
		{
			if(ws) ws.close();
			
			// Initialisation
			initObject = {"oInteracting":"...","oWaiting":"...","tAlert":"...","tAcw":"...","nOffered":"...","tHandle":"...","tAnswered":"...","tTalk":"...","tAcd":"...","tTalkComplete":"...","tWait":"..."};
			updateCallback(initObject);
			
			var opts = { 
				'pageSize': 25, // Number | Page size
				'pageNumber': 1, // Number | Page number
				'sortBy': "name", // String | Sort by
				'name': currentSettings.queuename, // String | Name
				'id': [], // [String] | ID(s)
				'divisionId': [] // [String] | Division ID(s)
			};
			var apiInstance = new platformClient.RoutingApi();
			var queueid = '';
			
			// Authenticate with PureCloud
			client.loginImplicitGrant(clientId, redirectUri)
				.then(() => {
					console.log('Logged in');
					return apiInstance.getRoutingQueues(opts);
				})
				.then((data) => {
					// Handle successful result
					console.log('getRoutingQueues data: %s',JSON.stringify(data));
					if (data.hasOwnProperty('entities')) queueid = data.entities[0].id;
					
					// Create notification channel
					return notificationsApi.postNotificationsChannels();
				})
				.then((channel) => {
					notificationChannel = channel;
					
					// Set up web socket
					webSocket = new WebSocket(notificationChannel.connectUri);
					webSocket.onopen=onOpen;
					webSocket.onclose=onClose;
					webSocket.onmessage=onMessage;

					// Subscribe to authenticated user's presence
					const body = [ { id: `v2.analytics.queues.${queueid}.observations` } ];
					return notificationsApi.putNotificationsChannelSubscriptions(notificationChannel.id, body);
				})
				.then((channel) => {
					console.log('Channel subscriptions set successfully');
				})
				.catch((err) => console.error(err));
		}
		
		createWebSocket();

		this.updateNow = function()
		{
			createWebSocket();
		}

		this.onDispose = function()
		{
			if(ws) ws.close();
		}

		this.onSettingsChanged = function(newSettings)
		{
			currentSettings = newSettings;
			
			createWebSocket();
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name  : "mediastatusesqueuebyname",
		display_name : "Number of interactions in different routing states in a queue (by name)",
		description : "Genesys PureCloud notification through WebSocket",
		settings   : [
			{
				"name": "queuename",
				"display_name": "Exact name of the queue in PureCloud",
				"type": "text"
			},
			{
				"name"        : "mediaType",
				"display_name": "Media type",
				"type"        : "option",
				"options"     : [
					{
						"name" : "voice"
					},
					{
						"name" : "chat"
					},
					{
						"name" : "email"
					},
					{
						"name" : "callback"
					},
					{
						"name" : "message"
					}
				]
			}
		],
		newInstance: function(settings, newInstanceCallback, updateCallback)
		{
			newInstanceCallback( new MediaStatusesQueueByNameDatasource(settings, updateCallback));
		}
	});
	
	// ================= Genesys PureCloud notifications - Statutes in a queue (by name) per media =========================
	// MARCHE PAS car le résultat si on ne précise pas le queueId n'est pas sous la même forme
	/*
	var MediaStatusesInQueuesDatasource = function(settings, updateCallback)
	{
		var self = this;
		var currentSettings = settings;
		var ws;
		
		// Set purecloud objects
		const platformClient = require('platformClient');
		const client = platformClient.ApiClient.instance;
		const notificationsApi = new platformClient.NotificationsApi();
		
		// Set PureCloud settings
		client.setEnvironment(clientEnvironment);
		client.setPersistSettings(true, appName);
		
		// Local vars
		let webSocket = null;
		let notificationChannel;
		var queueid = [];
		
		var onOpen=function()
		{
			console.info("WebSocket Opened");
		}
		
		var onClose=function()
		{
			console.info("WebSocket Closed");
		}
		
		var onMessage=function(event)
		{
			var data=event.data;
			
			//console.info("WebSocket received %s",data);
			var objdata=JSON.parse(data);
			
			if(typeof objdata == "object")
			{
				var rootData = [];
				var response = {};
				if (objdata.eventBody.hasOwnProperty('group')) {
					if (objdata.eventBody.group.hasOwnProperty('mediaType')) {
						if (objdata.eventBody.group.mediaType == currentSettings.mediaType) {
							if (objdata.eventBody.hasOwnProperty('data')) rootData = objdata.eventBody.data[0].metrics;
							if (typeof(rootData) !== 'undefined') {
								rootData.forEach(function (item, index) {
									if (item.hasOwnProperty('metric')) {
										if (item.stats.hasOwnProperty('count')) {
											response[item.metric] = item.stats.count;
										}
									}
								});
								//console.info("response %s",JSON.stringify(response));
								updateCallback(response);
							}
						}
					}
				}
			}			
		}
		
		function createWebSocket()
		{
			if(ws) ws.close();
			
			// Initialisation
			initObject = {"oInteracting":"...","oWaiting":"...","tAlert":"...","tAcw":"...","nOffered":"...","tHandle":"...","tAnswered":"...","tTalk":"...","tAcd":"...","tTalkComplete":"...","tWait":"..."};
			updateCallback(initObject);
			
			var opts = { 
				'pageSize': 25, // Number | Page size
				'pageNumber': 1, // Number | Page number
				'sortBy': "name", // String | Sort by
				'name': "", // String | Name
				'id': [], // [String] | ID(s)
				'divisionId': [] // [String] | Division ID(s)
			};
			var apiInstance = new platformClient.RoutingApi();
			var subscriptionBody = [];
			
			// Authenticate with PureCloud
			client.loginImplicitGrant(clientId, redirectUri)
				.then(() => {
					console.log('Logged in');
					return apiInstance.getRoutingQueues(opts);
				})
				.then((data) => {
					// Handle successful result
					console.log('getRoutingQueues data: %s',JSON.stringify(data));
					if (data.hasOwnProperty('entities')) {
						entities.forEach(function (item, index) {
							queueid[item.id] = item.name;
							subscriptionBody[index] = { id: `v2.analytics.queues.${item.id}.observations` };
						});
					}
					
					// Create notification channel
					return notificationsApi.postNotificationsChannels();
				})
				.then((channel) => {
					notificationChannel = channel;
					
					// Set up web socket
					webSocket = new WebSocket(notificationChannel.connectUri);
					webSocket.onopen=onOpen;
					webSocket.onclose=onClose;
					webSocket.onmessage=onMessage;

					// Subscription
					//var body = [ { id: `v2.analytics.queues.${queueid}.observations` } ];
					return notificationsApi.putNotificationsChannelSubscriptions(notificationChannel.id, subscriptionBody);
				})
				.then((channel) => {
					console.log('Channel subscriptions set successfully');
				})
				.catch((err) => console.error(err));
		}
		
		createWebSocket();

		this.updateNow = function()
		{
			createWebSocket();
		}

		this.onDispose = function()
		{
			if(ws) ws.close();
		}

		this.onSettingsChanged = function(newSettings)
		{
			currentSettings = newSettings;
			
			createWebSocket();
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name  : "mediastatusesinqueues",
		display_name : "Number of interactions in different routing states in queues",
		description : "Genesys PureCloud notification through WebSocket",
		settings   : [
			{
				"name"        : "mediaType",
				"display_name": "Media type",
				"type"        : "option",
				"options"     : [
					{
						"name" : "voice"
					},
					{
						"name" : "chat"
					},
					{
						"name" : "email"
					},
					{
						"name" : "callback"
					},
					{
						"name" : "message"
					}
				]
			}
		],
		newInstance: function(settings, newInstanceCallback, updateCallback)
		{
			newInstanceCallback( new MediaStatusesInQueuesDatasource(settings, updateCallback));
		}
	});
*/
}());

