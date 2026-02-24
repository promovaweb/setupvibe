# SetupVibe

> The ultimate cross-platform development environment setup script

## Overview

**SetupVibe** is a comprehensive, automated setup script that transforms your development environment into a powerful, modern workspace. It installs and configures a complete development stack in one command, supporting both macOS and various Linux distributions.

Perfect for developers, DevOps engineers, and system administrators who want a fully configured development environment without the hassle of manual setup.

## What Gets Installed

SetupVibe (v2.3) sets up a complete development ecosystem with:

### **Web Development Frameworks**
- PHP 8.4 & Laravel
- Ruby & Rails
- Node.js, Bun & PNPM

### **Programming Languages**
- Go
- Rust
- Python (with `uv` package manager)
- JavaScript/TypeScript ecosystem

### **DevOps & Containerization**
- Docker & Docker Compose
- Ansible
- GitHub CLI

### **Modern Unix Tools**
- Latest command-line utilities and productivity tools
- Network and monitoring tools

### **Shell Configuration**
- ZSH with advanced configuration
- Starship prompt (beautiful terminal styling)

## System Requirements

### Supported Operating Systems
- **macOS** 12 and newer
- **Ubuntu** 24.04+
- **Debian** 12+
- **Zorin OS** 18+

### Supported Architectures
- x86_64 (amd64)
- ARM64 (aarch64/arm64)

## Installation

Run the following command in your terminal:


#### For your Desktop

```bash
curl -sL https://raw.githubusercontent.com/promovaweb/setupvibe/refs/heads/main/server.sh | bash
```

The script will:
1. Detect your OS and architecture
2. Install all prerequisites and build tools
3. Set up each component with proper configuration
4. Initialize your shell with advanced configurations
5. Perform cleanup and validation

The entire process may take 20-60 minutes depending on your internet connection and system specifications.

## How It Works

SetupVibe follows a step-by-step installation process:

1. **Prerequisites & Architecture Check** - Validates system compatibility
2. **Base System & Build Tools** - Installs essential development tools
3. **Homebrew** - Sets up the package manager (macOS/Linux)
4. **PHP 8.4 Ecosystem** - Installs PHP and Laravel
5. **Ruby Ecosystem** - Sets up Ruby and Rails
6. **Languages** - Installs Go, Rust, Python, and uv
7. **JavaScript** - Configures Node.js, Bun, and PNPM
8. **DevOps** - Installs Docker, Ansible, and GitHub CLI
9. **Modern Unix Tools** - Adds productivity utilities
10. **Network & Monitoring** - Sets up monitoring tools
11. **Shell Configuration** - Configures ZSH and Starship
12. **Finalization & Cleanup** - Validates installation and cleans up

## License

This project is licensed under the **GNU General Public License v3.0** - see the [LICENSE](LICENSE) file for details.

## Credits

**Courtesy:** promovaweb.com  
**Contact:** contato@promovaweb.com

## Support & Issues

For issues, questions, or contributions, please visit the project repository or contact the development team at contato@promovaweb.com

---

**SetupVibe** - Your ultimate development environment, automated. 🚀
