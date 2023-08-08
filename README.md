# log-set-values-v1
Apigee X Shared Flow to capture logging information at each of the Flow Hook locations.
It doesn't actually log the information, it builds a "logging_message" flow variable that is intended to be used with a Shared Flow that logs to various destinations using a Service Callout or Message Logging policy.

Features:
* Uses a single Shared Flow with a JavaScript policy to capture request and response information. 
* Can be used as Shared Flow at each Flow Hook location, either in the proxy or via Flow Hooks.
* Can be used discretely in a proxy in each flow hook location and in Target and Proxy DefaultFaultRules. 
* Configurable via KVM for logging in general and loggingh levels
  * INFO - minimal information, proxy and target request URLs, response status and latencies
  * DEBUG - full information including headers, request and response content
  * ERROR - same as DEBUG but with logLevel set to ERROR
* Supports field level masking for all proxies or for specific proxies via KVM values. 
* Handles non-json responses from targets.

Requires "currentstep.flowstate" to be passed as a parameter in the Flow Callout when used in Flow Hook shared flows (pre-proxy, pre-target, post-target and post-proxy).

For example in `pre-proxy-v1` Shared Flow for that Flow Hook:
```
<SharedFlow name="default">
    <Step>
        <Name>FC-log-set-values-v1</Name>
    </Step>
    <!-- Other Shared Flow Flow Callouts -->
</SharedFlow>
```

```
<FlowCallout continueOnError="false" enabled="true" name="FC-log-set-values-v1">
  <DisplayName>FC-log-set-values-v1</DisplayName>
  <Parameters>
    <!-- Need to set currentstep.flowstate, its empty otherwise -->
    <Parameter name="currentstep.flowstate">{currentstep.flowstate}</Parameter>
  </Parameters>
  <SharedFlowBundle>log-set-values-v1</SharedFlowBundle>
</FlowCallout>
```


## Disclaimer

This example is not an official Google product, nor is it part of an official Google product.

## Notice and License

[NOTICE](NOTICE) this material is copyright 2020, Google LLC. and [LICENSE](LICENSE) is under the Apache 2.0 license. This code is open source.


## To install

Update the profiles to reflect your org / env and credentials.

Then install using maven:
* mvn -P test install

## Test checklist
- X Set logging_log = false
- X Set logging_log = true
- X Set logging_level = INFO, DEBUG, ERROR
- X Call 200, 400
- X Call 200 with non JSON target
- X Call with non-json request
- X Call with formparam
- X Create test proxy (logging-test) with sensitive response to check masking in logging-mock and logging
* X testing non-json responses with proper error handling, no hacks!
  * X XML 
  * X Invalid json input - this throws a JS fault in the backend - OK
* interaction between logging in general and per-proxy logging - ensure per-proxy overrides general
  * X general is true per-proxy false
	* X per-proxy DEBUG and general is INFO, sends debug payload but INFO level
  * X per-proxy true general false
* masking
  * X only works at first level - make work for nexted objects via json path
  * X for numbers
* bug
  * perproxy_logging_level sets logging_level when perproxy_logging_log is false, that's OK. perproxy values override general values.

