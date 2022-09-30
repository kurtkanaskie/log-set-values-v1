# log-set-values-v1
Apigee Shared Flow to capture logging information at each of the flow hook locations.
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
Set logging_log = false
Set logging_log = true
Set logging_level = INFO, DEBUG, ERROR
Call 200, 400
Call 200 with non JSON target
Call with non-json request
Call with formparam
Create test proxy (logging-test) with sensitive response to check masking in logging-mock and logging


WIP:
* testing non-json responses with proper error handling, no hacks!
* interaction between logging in general and per-proxy logging - ensure per-proxy overrides general
	* DEBUG and general is INFO.
	* per-proxy false
* masking only works at first level - make work for nexted objects.

