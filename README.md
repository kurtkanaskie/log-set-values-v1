# log-set-values-v1
Apigee X Shared Flow to capture logging information at each of the flow hook locations.
Doesn't actuall log message, intended to be use with Shared Flows that log to various destinations (e.g. logging-mock proxy, Cloud Logging (via Service Callout or Message Logging).

Now with masking for all and masking per proxy. 
Can be used as Shared Flow at each Flow Hook location.
Can be used discretely in Target and Proxy DefaultFaultRule. 


Expects "currentstep.flowstate" to be set by calling Flow Callout in Flow Hook Shared Flows (e.g. pre-proxy).

For example:
```
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<FlowCallout continueOnError="false" enabled="true" name="FC-log-set-values-v1">
  <DisplayName>FC-log-set-values-v1</DisplayName>
  <Parameters>
    <!-- Need to set currentstep.flowstate, its empty otherwise -->
    <Parameter name="currentstep.flowstate">{currentstep.flowstate}</Parameter>
  </Parameters>
  <SharedFlowBundle>log-set-values-v1</SharedFlowBundle>
</FlowCallout>
```

Handles non-json responses from targets.

## Disclaimer

This example is not an official Google product, nor is it part of an official Google product.

## Notice and License

[NOTICE](NOTICE) this material is copyright 2020, Google LLC. and [LICENSE](LICENSE) is under the Apache 2.0 license. This code is open source.


## To install

Update the profiles to reflect your org / env and credentials.

Then install using maven:
* mvn -P test install

## Test
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

