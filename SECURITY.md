# Security Policy

## Supported Versions

Security updates are handled on the latest public Spark release.

## Reporting A Vulnerability

Please report suspected vulnerabilities privately through GitHub security advisories for this repository, or through your normal Next Commerce support contact if you are a platform customer.

Do not open public issues or pull requests that include exploit details, API keys, store credentials, customer data, or merchant-specific configuration.

## Secrets And Store Configuration

Spark themes use `config.yml` for local `ntk` credentials. That file is intentionally gitignored and must never be committed.

Use `ntk init` to create your local config, or copy `config.example.yml` to `config.yml` and replace the placeholder values with credentials for a store you control.
