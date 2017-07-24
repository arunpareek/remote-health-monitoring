/**
 * The ExpressJS namespace.
 * @external ExpressApplicationObject
 * @see {@link http://expressjs.com/3x/api.html#app}
 */ 

/**
 * Mobile Cloud custom code service entry point.
 * @param {external:ExpressApplicationObject}
 * service 
 */
module.exports = function(service) {


	/**
	 *  The file samples.txt in the archive that this file was packaged with contains some example code.
	 */


	service.post('/mobile/custom/myhealth/notify', function(req,res) {
			
		/**
		 *  oracleMobile.connectors namespace example:
		 * 
		 */
		var body = {
			Header: {
				"Authorization:key=AIzaSyCpjFa6iWYp5Llkh9s91tdPashW655s8X0",
				"Content-Type":"application/json"
			},
			Body: {
				{
					"to":"APA91bGRlUSoET8SJqfQA_9_77G6dizpc5aDAzIimdH4hQCaLanDFGgYjREHpUzGlfreOtJSaA_2vzquY20fVO50fWz97UgDQZvV8ENku-0a67z2PfKl_bdvKTvfrhlr5G0XUZ7ItqjFk4rnEbLaZGwaXlq0M78gsw",
					"data":{
						"alert":"Test notification",
						"description":"Notification desc",
						"sound":{},
						"action":"REMINDER"
					}
				}
			}
		};
		console.info(JSON.stringify(body));
		req.oracleMobile.connectors.post('GCM', 'GCM', body,
			{
				inType: 'json', 
				versionToInvoke: '1.0'
			}
		).then(
			function (result) {
				console.info("result is: " + result.statusCode);
				res.send(result.statusCode, result.result);
			},
			function (error) {
				console.info("error is: " + error.statusCode);        
				res.send(500, error.error);
			}
		);
		
		var result = {"status":"success notify"};
		var statusCode = 200;
		res.send(statusCode, result);
	});

	service.post('/mobile/custom/myhealth/beacon', function(req,res) {
		var result = {"status":"success beacon"};
		var statusCode = 200;
		res.send(statusCode, result);
	});

};
