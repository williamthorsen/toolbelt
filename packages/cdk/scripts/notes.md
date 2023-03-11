# AWS SDK notes

---

`build:cdk`

Creates a CloudFormation template in `.cdk.out/` from the instructions in `cdk.json` -- in particular, the entrypoint:

```json
{
  "app": "ts-node --transpile-only --type-check src/bin/AppStack.cdk.ts"
}
```

TODO: Consider renaming the entrypoint to `{stack name}.cdk.ts`.

---

`build:cdk:sam`

Creates a SAM template in `.aws-sam/` from the template in `cdk.out/`.
