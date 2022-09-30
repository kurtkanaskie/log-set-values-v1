var flow = context.getVariable('currentstep.flowstate');
var logging = context.getVariable('logging_log');
var logging_level = context.getVariable('logging_level');
var logging_mask_character = context.getVariable('logging_mask_character');
var logging_mask_fields = context.getVariable('logging_mask_fields');
var logging_host = context.getVariable('logging_host');
var logging_path = context.getVariable('logging_path');
var perproxy_logging_log = context.getVariable('perproxy_logging_log');
var perproxy_logging_level = context.getVariable('perproxy_logging_level');
var perproxy_logging_mask_character = context.getVariable('perproxy_logging_mask_character');
var perproxy_logging_mask_fields = context.getVariable('perproxy_logging_mask_fields');


// Output: "logging_message" for use in other shared flows that use a logging policy (MessageLogging, ServiceCallout)
// in a PostClientFlow in a specific proxy.

// print( "logging " + logging);
// print( "logging_level " + logging_level);
// print( "logging_mask_character " + logging_mask_character);
// print( "logging_host " + logging_host);
// print( "logging_path " + logging_path);
// print( "perproxy_logging_log " + perproxy_logging_log);
// print( "perproxy_logging_level " + perproxy_logging_level);

// To work within a nested Shared Flow, set currentstep.flowstate via parameter returns SHARED_FLOW otherwise
/*
For example in a post-proxy Shared Flow with multiple Flow Callouts use:
    <FlowCallout async="false" continueOnError="false" enabled="true" name="FC-GetLogValues">
        <DisplayName>FC-GetLogValues</DisplayName>
        <Parameters>
            <!-- Nneed to set currentstep.flowstate, its empty otherwise -->
            <Parameter name="currentstep.flowstate">{currentstep.flowstate}</Parameter>
        </Parameters>
        <SharedFlowBundle>GetLogValues</SharedFlowBundle>
    </FlowCallout>
*/
var flow = String(context.getVariable("currentstep.flowstate"));
// print( "currentstep.flowstate " + flow);
// print( "current.flow.name " + context.getVariable("current.flow.name"));

// Work around FlowHook issue where its RESP_SENT for both happy and error flows
var isError = (context.getVariable( 'error' ) !== null );
// print( "ERROR: " + isError);
if( isError ) {
    context.setVariable("logging_level","ERROR");
    flow = "ERROR";
    // print( "workaround error flow " + flow);
} else if ( flow === "RESP_SENT" ) {
    flow = "PROXY_RESP_FLOW";
    // print( "workaround resp_sent flow " + flow);
}

// Flow hook locations
if( logging == "true" ) {
    switch (flow) {
        case 'PROXY_REQ_FLOW':
            // print( "PROXY_REQ_FLOW" );
            var req_verb = context.getVariable('request.verb');
            var req_scheme = context.getVariable('client.scheme');
            var req_host = context.getVariable('request.header.host');
            var req_request_uri = context.getVariable('request.uri');
            var req_url = req_scheme + "://" + req_host + req_request_uri;
            context.setVariable( 'logging_request_messageid', context.getVariable('messageid'));
            context.setVariable( 'logging_request_method', req_verb);
            context.setVariable( 'logging_request_url', req_url);
            context.setVariable( 'logging_request_headers', getMessageHeaders());
            context.setVariable( 'logging_request_content', getMessageContent());
            break;
    
        case 'TARGET_REQ_FLOW':
            // print( "TARGET_REQ_FLOW" );
            context.setVariable( 'logging_target_request_method', context.getVariable('request.verb'));
            // context.setVariable( 'logging_target_request_url', context.getVariable('target.url')); // does not work here, works in TARGET_RESP_FLOW
            // print( "TARGET_REQ_FLOW target.url " + context.getVariable('target.url') );
            context.setVariable( 'logging_target_request_headers', getMessageHeaders());
            context.setVariable( 'logging_target_request_content', getMessageContent());
            break;
    
        case 'TARGET_RESP_FLOW':
            // How do I get the response details when its a 4xx or greater
            // For FH it happens before error flow, so don't do it in ERROR
            // print( "TARGET_RESP_FLOW" );
            context.setVariable( 'logging_target_request_url', context.getVariable('request.url')); // should work in TARGET_REQ_FLOW
            context.setVariable( 'logging_target_response_status_code', context.getVariable("message.status.code"));
            context.setVariable( 'logging_target_response_reason_phrase', context.getVariable("message.reason.phrase"));
            context.setVariable( 'logging_target_response_headers', getMessageHeaders());
            context.setVariable( 'logging_target_response_content', getMessageContent());
            break;
            
        case 'PROXY_RESP_FLOW':
        case 'PROXY_POST_RESP_SENT':
            // print( "PROXY_RESP_FLOW or PROXY_POST_RESP_SENT" );
            context.setVariable( 'logging_response_status_code', context.getVariable("message.status.code"));
            context.setVariable( 'logging_response_reason_phrase', context.getVariable("message.reason.phrase"));
            context.setVariable( 'logging_response_headers', getMessageHeaders());
            context.setVariable( 'logging_response_content', getMessageContent());
            break;
            
            
        /* Need to test message content:
            error in proxy request
            error in target request
            error in target response
            error in proxy response
        */ 
        case 'ERROR':
            var error_state = context.getVariable("error.state");
            var faultrule_name = context.getVariable("faultrule.name");
            // print( "ERROR error.state: " + error_state);
            // print( "ERROR faultrule.name: " + faultrule_name);
            
            // For FC requires this SF to be put in a FaultRule in the Target not named DefaultFaultRule
            // For FH error state happens after FH executes, so logging_target gets set above in TARGET_RESP_FLOW
            if( (error_state === 'TARGET_RESP_FLOW' || error_state === 'TARGET_REQ_FLOW') && faultrule_name !== 'DefaultFaultRule') {
                    // print( "ERROR TARGET RESP " + error_state + " " + faultrule_name);
                    context.setVariable( 'logging_target_request_url', context.getVariable('request.url')); // should work in TARGET_REQ_FLOW
                    context.setVariable( 'logging_target_response_status_code', context.getVariable("message.status.code"));
                    context.setVariable( 'logging_target_response_reason_phrase', context.getVariable("message.reason.phrase"));
                    context.setVariable( 'logging_target_response_headers', getMessageHeaders());
                    context.setVariable( 'logging_target_response_content', getMessageContent());
            } 
            // Still need to set logging_response
            // print( "ERROR PROXY " + error_state + " " + faultrule_name);
            context.setVariable( 'logging_response_status_code', context.getVariable("message.status.code"));
            context.setVariable( 'logging_response_reason_phrase', context.getVariable("message.reason.phrase"));
            context.setVariable( 'logging_response_headers', getMessageHeaders());
            context.setVariable( 'logging_response_content', getMessageContent());
            break;
        default:
            // print( "FLOW uncaught flowstate: " + flow );
    }
    
    // Build the logging_message for use in logging Shared Flows
    // If happy response then PROXY_RESP_FLOW
    // If error response then ERROR
    // If used in FlowHook, then RESP_SENT for both
    if( flow === 'PROXY_RESP_FLOW' || flow === 'PROXY_POST_RESP_SENT' || flow === 'ERROR' ) {
        var request_start_time = context.getVariable('client.received.start.timestamp');
        var target_start_time  = context.getVariable('target.sent.start.timestamp');
        var target_end_time    = context.getVariable('target.received.end.timestamp');
        if( flow == 'PROXY_POST_RESP_SENT' ) {
            // client.sent.end.timestamp is only available in PostClientFlow
            var request_end_time   = context.getVariable('client.sent.end.timestamp');
        } else {
            var request_end_time   = context.getVariable('system.timestamp');
        }
        var total_time = request_end_time-request_start_time;
        var total_target_time  = target_end_time-target_start_time;
        var total_client_time  = total_time-total_target_time;
    
        var logObject = {
            "logLevel" : logging_level,
            "messageId": context.getVariable("messageid"),
            "messageProcessorId": context.getVariable('system.uuid'),
            "organization": context.getVariable("organization.name"),
            "environment": context.getVariable("environment.name"),
            "appName": context.getVariable("developer.app.name"),
            "apiProduct": context.getVariable("apiproduct.name"),
            "proxyName": context.getVariable("apiproxy.name"),
            "receivedTimestamp":request_start_time,
            "sentTimestamp":request_end_time,
            "receivedTimestamp":new Date(request_start_time).toISOString(),
            "sentTimestamp":new Date(request_end_time).toISOString(),
            "clientLatency": total_client_time,
            "targetLatency": total_target_time,
            "totalLatency": total_time,
            "proxyRequest": { 
                "method": context.getVariable('logging_request_method'),
                "url": context.getVariable('logging_request_url'),
                "oasRequestFlow": context.getVariable("oas_request_flow")
            },
            "targetRequest": { 
                "method": context.getVariable('logging_target_request_method'),
                "url": context.getVariable('logging_target_request_url')
            },
            "targetResponse": { 
                "status": context.getVariable('logging_target_response_status_code'),
                "reason": context.getVariable('logging_target_response_reason_phrase')
            },
            "proxyResponse": { 
                "status": context.getVariable("logging_response_status_code"),
                "reason": context.getVariable("logging_response_reason_phrase")
            }
        };
        
        // Log the content of the requests and responses if DEBUG or ERROR
        // If not JSON stringify into contentAsText
        if( logging_level == "DEBUG" || logging_level == "ERROR") {
            logObject.proxyRequest.headers = context.getVariable('logging_request_headers');
            var reqContent = context.getVariable('logging_request_content');
            print( "CONTENT TYPE: " + context.getVariable('message.header.content-type'));
            if( reqContent !== "" && reqContent !== undefined && reqContent !== null ) {
                // OK if( context.proxyRequest.headers['Content-Type'] != 'application/json') {
                // Hack to test for JSON
                if( reqContent[0] != '{' ) {
                    reqContent = '{"contentAsText":' + JSON.stringify(reqContent) + '}';
                }
                logObject.proxyRequest.content = JSON.parse(reqContent);
            }
            
            logObject.targetRequest.headers = context.getVariable('logging_target_request_headers');
            var reqContent = context.getVariable('logging_target_request_content');
            if( reqContent !== "" && reqContent !== undefined && reqContent !== null ) {
                // Hack to test for JSON
                if( reqContent[0] != '{' ) {
                    reqContent = '{"contentAsText":' + JSON.stringify(reqContent) + '}';
                }
                logObject.targetRequest.content = JSON.parse(reqContent);
            }
            
            logObject.targetResponse.headers = context.getVariable('logging_target_response_headers');
            var respContent = context.getVariable('logging_target_response_content');
            if( respContent !== "" && respContent !== undefined && respContent !== null ) {
                // OK if( context.proxyResponse.headers['Content-Type'] != 'application/json') {
                // Hack to test for JSON
                if( respContent[0] != '{' ) {
                    respContent = '{"contentAsText":' + JSON.stringify(respContent) + '}';
                }
                logObject.targetResponse.content = JSON.parse(respContent);
            }
            
            logObject.proxyResponse.headers = context.getVariable('logging_response_headers');
            var respContent = context.getVariable('logging_response_content');
            // logObject.proxyResponse.headers = getMessageHeaders();
            // var respContent = context.getVariable('message.content');
            if( respContent !== "" && respContent !== undefined && respContent !== null ) {
                // Hack to test for JSON
                if( respContent[0] != '{' ) {
                    respContent = '{"text":' + JSON.stringify(respContent) + '}';
                }
                logObject.proxyResponse.content = JSON.parse(respContent);
            }
        }
    
        var headers = {
            'Content-Type': 'application/json'
        };
        
        // print('LOGGING OBJECT ' + JSON.stringify(logObject));
        context.setVariable( 'logging_message', JSON.stringify(logObject) );
        context.setVariable('response.header.x-latency-total', total_time);
        context.setVariable('response.header.x-latency-proxy', total_client_time);
        context.setVariable('response.header.x-latency-target', total_target_time);
    }
}

function getMessageHeaders() {
    // print( 'CONTEXT.PROXYRESPONSE.HEADERS ' + context.proxyResponse.headers);
    // print( 'RESPONSE.HEADERS ' + response.headers);
    var headerNames = context.getVariable('message.headers.names');
    var headerNamesArr = headerNames.toArray();
    var headersObj = {};
    for (var i=0; i < headerNamesArr.length; i++) {
        // print("HEADER: " + headerNamesArr[i] + ":" + context.getVariable('message.header.'+headerNamesArr[i].toLowerCase())); 
        headersObj[headerNamesArr[i]] = context.getVariable('message.header.' + headerNamesArr[i]);
    }
    return headersObj;
}

//
// Mask specific fields for specific proxies if its JSON
function getMessageContent() {
    var contentString = context.getVariable('message.content');
    // Parse and mask
    if( contentString ) {
        try {
            var content = JSON.parse( contentString );
            logging_mask_character = logging_mask_character ? logging_mask_character : '*';
            print( 'logging_mask_character ' + logging_mask_character );

            // Per proxy logging and masking
            print( 'perproxy_logging_log ' + perproxy_logging_log + ' perproxy_logging_mask_character ' + perproxy_logging_mask_character);
            if( perproxy_logging_log === 'true' ) {
              perproxy_logging_mask_character = perproxy_logging_mask_character ? perproxy_logging_mask_character : '#';
            }

            return JSON.stringify( content );
        } catch(e) {
            print( "ERROR: " + e);
        }
    }
    return contentString;
}