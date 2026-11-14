# Diagnosing a rejected request

Four failures look similar and mean different things. The gateway checks the token's scopes before Jira validates anything, so a scope shortfall is reported before any permission or payload error.

| Response                                                            | `reason`     | Meaning                                                                                           |
| ------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------- |
| `401` `{"code":401,"message":"Unauthorized; scope does not match"}` | `scope`      | The credential is good and the token lacks a scope required by the endpoint                       |
| `401` `{"code":401,"message":"Unauthorized"}`                       | `credential` | The credential itself was rejected                                                                |
| `403`                                                               | `permission` | The acting user lacks a Jira permission required by the call                                      |
| `404`                                                               | `not-found`  | The resource does not exist, or no credential reached the gateway and the request ran anonymously |

The `403` comes from Jira rather than the gateway, and reports a permission that the acting user lacks rather than a scope that the token lacks.

`JiraRequestError` has the matching row as `reason` and states it, with the remedy, in its message. A status outside the table, a 5xx included, leaves `reason` undefined and the message without a remedy. ["Errors"](../README.md#errors) in the README lists the error's other fields.
