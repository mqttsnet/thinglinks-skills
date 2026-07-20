# Build and Release

`.thinglinks-product.env` is the compatibility/version source for the component,
BifroMQ SPI, SLF4J, Logback, ThingLinks Util, and Java. It must not contain
credentials.

## Product Commands

| Change | Command |
| --- | --- |
| read-only consistency check | `scripts/product-config.sh check` |
| plugin component version | `scripts/product-config.sh set-version <version>` |
| BifroMQ compatibility | `scripts/product-config.sh set-bifromq-version <version>` |
| logging compatibility pair | `scripts/product-config.sh set-logging-versions <slf4j> <logback>` |
| ThingLinks Util dependency | `scripts/product-config.sh set-util-version <version>` |
| Java target | `scripts/product-config.sh set-java-version <major>` |

SLF4J and Logback change as one compatibility pair. Do not edit the four plugin
POMs independently. The product check verifies the manifest and all parent POM
properties, including the BifroMQ 3.x package boundary.

## Release Gate

Run from the repository root:

```bash
scripts/tests/product-config-test.sh
scripts/tests/logging-security-test.sh
scripts/product-config.sh check
mvn --batch-mode -DskipTests clean package
scripts/tests/package-content-test.sh
git diff --check
git status --short
```

`-DskipTests` does not run the shell safety gates. The package-content test must
find exactly one ZIP for each plugin, verify each archive, and require the only
non-directory entries under `conf/` to be:

```text
conf/config.yaml
conf/logback.xml
```

Do not publish archives containing formatted copies, editor files, temporary
files, credentials, or extra environment configuration.
