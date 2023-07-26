/* globals print */
/* globals context */
/* jslint latedef:false */
var flow = context.getVariable('currentstep.flowstate');
var logging_log = context.getVariable('logging_log');
var logging_level = context.getVariable('logging_level');
var logging_mask_character = context.getVariable('logging_mask_character');
var logging_mask_fields = context.getVariable('logging_mask_fields');
// var logging_host = context.getVariable('logging_host');
// var logging_path = context.getVariable('logging_path');
var perproxy_logging_log = context.getVariable('perproxy_logging_log');
var perproxy_logging_level = context.getVariable('perproxy_logging_level');
var perproxy_logging_mask_character = context.getVariable('perproxy_logging_mask_character');
var perproxy_logging_mask_fields = context.getVariable('perproxy_logging_mask_fields');

/* Outputs: 
    logging_message - for use in other shared flows that use a logging policy (MessageLogging, ServiceCallout)
    logging_level - INFO, DEBUG, ERROR
    logging_log - true | false
*/

/*  To work within a nested Shared Flow, set currentstep.flowstate via parameter returns SHARED_FLOW otherwise
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

/* Override general with perproxy values, except for mask characters and mask fields
    Karnaugh map GLEV = global, plev = per proxy
        logging_log logging_level perproxy_logging_log perproxy_logging_level = logging_log     logging_level
            true        GLEV        not set             not set                 true                GLEV
            true        GLEV        true                plev                    true                plev
            true        GLEV        false               plev                    false               plev (doesn't matter)
            false       GLEV        not set             not set                 false               GLEV (doesn't matter)
            false       GLEV        true                plev                    true                plev
            false       GLEV        false               plev                    false               plev (doesn't matter)
*/
// print( "INCOMING: " + logging_log + "-" + logging_level + "-" + perproxy_logging_log + "-" + perproxy_logging_level + "\n");
logging_log = perproxy_logging_log ? perproxy_logging_log : logging_log;
logging_level = perproxy_logging_level ? perproxy_logging_level : logging_level;
// print( "RESULT: " + logging_log + "-" + logging_level + "-" + perproxy_logging_log + "-" + perproxy_logging_level + "\n");


var flow = String(context.getVariable("currentstep.flowstate"));

// Work around FlowHook issue where its RESP_SENT for both happy and error flows
var isError = (context.getVariable( 'error' ) !== null );
if( isError ) {
    // Set here for later and for other logging Flow Callouts
    logging_level = "ERROR";
    flow = "ERROR";
} else if ( flow === "RESP_SENT" ) {
    flow = "PROXY_RESP_FLOW";
}
context.setVariable("logging_log",logging_log);
context.setVariable("logging_level",logging_level);

// Flow hook locations
if( logging_log === 'true' ) {
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
            context.setVariable( 'logging_request_trace_context',context.getVariable('request.header.X-Cloud-Trace-Context'));
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
            // print( "TARGET_RESP_FLOW JSON LENGTH: " + context.getVariable('message.header.content-length'));
            break;
            
        case 'PROXY_RESP_FLOW':
        case 'PROXY_POST_RESP_SENT':
            // print( "PROXY_RESP_FLOW or PROXY_POST_RESP_SENT" );
            context.setVariable( 'logging_response_status_code', context.getVariable("message.status.code"));
            context.setVariable( 'logging_response_reason_phrase', context.getVariable("message.reason.phrase"));
            context.setVariable( 'logging_response_headers', getMessageHeaders());
            context.setVariable( 'logging_response_content', getMessageContent());
            // print( "PROXY_RESP_FLOW JSON LENGTH: " + context.getVariable('message.header.content-length'));
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
            // print( "ERROR JSON LENGTH: " + context.getVariable('message.header.content-length'));
            break;
        default:
            // print( "FLOW uncaught flowstate: " + flow );
    }
    
    // Build the logging_message for use in logging Shared Flows
    // If happy response then PROXY_RESP_FLOW
    // If error response then ERROR
    // If used in FlowHook, then RESP_SENT for both - so workaround at top and use PROXY_RESP_FLOW
    if( flow === 'PROXY_RESP_FLOW' || flow === 'PROXY_POST_RESP_SENT' || flow === 'ERROR' ) {
        var request_start_time = context.getVariable('client.received.start.timestamp');
        var target_start_time  = context.getVariable('target.sent.start.timestamp');
        var target_end_time    = context.getVariable('target.received.end.timestamp');
        // client.sent.end.timestamp is only available in PostClientFlow and this will not run there
        var request_end_time   = context.getVariable('system.timestamp');
        var total_time = request_end_time-request_start_time;
        var total_target_time  = target_end_time-target_start_time;
        var total_client_time  = total_time-total_target_time;
        var logObject = {
            "logLevel" : logging_level,
            "messageId": context.getVariable("messageid"),
            "messageProcessorId": context.getVariable('system.uuid'),
            "logging_request_trace_context":context.getVariable('logging_request_trace_context'),
            "organization": context.getVariable("organization.name"),
            "environment": context.getVariable("environment.name"),
            "region": context.getVariable("system.region.name"),
            "appName": context.getVariable("developer.app.name"),
            "apiProduct": context.getVariable("apiproduct.name"),
            "proxyName": context.getVariable("apiproxy.name"),
            "receivedTimestamp":request_start_time,
            "sentTimestamp":request_end_time,
            "receivedTimestampISO":new Date(request_start_time).toISOString(),
            "sentTimestampISO":new Date(request_end_time).toISOString(),
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
        if( logging_level === "DEBUG" || logging_level === "ERROR" ) {
            logObject.proxyRequest.headers = context.getVariable('logging_request_headers');
            logObject.proxyRequest.content = context.getVariable('logging_request_content');
            
            logObject.targetRequest.headers = context.getVariable('logging_target_request_headers');
            logObject.targetRequest.content = context.getVariable('logging_target_request_content');
                        
            logObject.targetResponse.headers = context.getVariable('logging_target_response_headers');
            logObject.targetResponse.content = context.getVariable('logging_target_response_content');
                        
            logObject.proxyResponse.headers = context.getVariable('logging_response_headers');
            logObject.proxyResponse.content = context.getVariable('logging_response_content');
        }
    
        var str = JSON.stringify(logObject);
        print("SIZE: " + str.length + " MSG: " + str);
        context.setVariable('logging_message', JSON.stringify(logObject) );
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
            var headerString = 'message.header.'+ headerNamesArr[i].toLowerCase() + '.values.string';
            // print("HEADER: " + headerNamesArr[i] + ":" + context.getVariable(headerString)); 
            headersObj[headerNamesArr[i]] = context.getVariable(headerString);
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
            // General logging and masking
            logging_mask_character = logging_mask_character ? logging_mask_character : '*';
            if( logging_mask_fields ) {
                logging_mask_fields.split(',').forEach(function(f) {
                    // print( "logging mask " + f + " " + typeof content[f]);
                    if( content.hasOwnProperty(f) && typeof content[f] === 'string') {
                        content[f] = String(content[f]).replace(/./g,logging_mask_character);
                    }
                    if( content.hasOwnProperty(f) && typeof content[f] === 'number') {
                        content[f] = Number(String(content[f]).replace(/./g,9));
                    }
                });
            }

            // Per proxy logging and masking
            if( perproxy_logging_log === 'true' && perproxy_logging_mask_fields ) {
                perproxy_logging_mask_character = perproxy_logging_mask_character ? perproxy_logging_mask_character : '#';
                perproxy_logging_mask_fields.split(',').forEach(function(f) {
                    // print( "per-proxy mask " + f + " " + typeof content[f]);
                    if( content.hasOwnProperty(f) && typeof content[f] === 'string') {
                        content[f] = String(content[f]).replace(/./g,logging_mask_character);
                    }
                    if( content.hasOwnProperty(f) && typeof content[f] === 'number') {
                        content[f] = Number(String(content[f]).replace(/./g,9));
                    }
                });
            }
            return content;
        } catch(e) {
            // If not JSON stringify into contentAsText
            var contentText = {};
            contentText.contentAsText = contentString;
            return contentText;
        }
    }
}

