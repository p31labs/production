# codemods — the migration layer

Every **major** release of `design-core` ships with a codemod here. The codemod
is the contract, not the changelog: it rewrites consumer code (the shell, the
emitters, the generated projects) from the old API to the new one, so a breaking
change never leaves a consumer broken.

## Layout

```
codemods/
  <from>-to-<to>/          one directory per breaking change
    transform.cjs          a jscodeshift transform
    README.md              what it does + before/after + how to run
```

## How to run a codemod

```bash
npx jscodeshift -t codemods/<from>-to-<to>/transform.cjs \
  --parser=tsx \
  --extensions=tsx,ts \
  /path/to/consumer/src
```

## Template

`template.cjs` is the canonical starting point — a prop/import rename. Copy it,
replace the mapping, and add a `README.md` with the before/after.

## The rule

A `major` bump without a codemod is a release blocker. The changelog's
`Migration` section names the exact codemod directory.