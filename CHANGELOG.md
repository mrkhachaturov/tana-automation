# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-12-09

### Added

- **Kanban Watcher** - Watch Kanban boards for status changes and auto-click buttons
- **Universal button support** - Configure any button by text or CSS selector
- **Docker deployment** - Full Docker support with x86 Chrome
- **OAuth authentication** - Microsoft/Google login via persistent Chrome profile
- **Interactive login** - `npm run login` auto-detects successful login
- **Environment configuration** - All settings via `.env` file
- **Webhook notifications** - Slack/Discord alerts for session expiry
- **Auto-restart** - Docker container auto-restarts on failure
- **Profile lock handling** - Auto-clears Chrome profile locks

### Documentation

- Full deployment guide for servers
- Kanban watcher example with configuration
- Troubleshooting guide

### Docker

- GitHub Container Registry publishing
- Multi-platform build support (linux/amd64)
- Automated releases via GitHub Actions

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2024-12-09 | Initial release with Kanban watcher |

[Unreleased]: https://github.com/mrkhachaturov/tana-automation/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/mrkhachaturov/tana-automation/releases/tag/v1.0.0

