# Contributing to AnimeSync

Thank you for your interest in contributing to AnimeSync! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please be respectful and constructive in all interactions.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Screenshots** (if applicable)
- **Browser and OS information**

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- **Clear description** of the enhancement
- **Use case** and benefits
- **Possible implementation** approach (optional)

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the code style** used throughout the project
3. **Write clear commit messages**
4. **Test your changes** thoroughly
5. **Update documentation** if needed
6. **Submit the pull request** with a clear description

## Development Setup

\`\`\`bash
# Clone your fork
git clone https://github.com/yourusername/animesync.git
cd animesync

# Install dependencies
npm install

# Run development server
npm run dev

# Run type checking
npm run typecheck

# Run linting
npm run lint
\`\`\`

## Code Style Guidelines

### TypeScript

- Use TypeScript for all new files
- Define proper types and interfaces
- Avoid using `any` type
- Use optional chaining (`?.`) and nullish coalescing (`??`)

### React

- Use functional components with hooks
- Follow React best practices
- Use meaningful component and variable names
- Keep components focused and reusable
- Use proper prop types

### Styling

- Use Tailwind CSS utility classes
- Follow the existing design system
- Ensure responsive design (mobile-first)
- Use semantic color tokens from the theme

### File Organization

- Place components in appropriate directories
- Use index files for barrel exports
- Keep related files together
- Name files using kebab-case

## Commit Messages

Follow conventional commit format:

\`\`\`
type(scope): subject

body (optional)

footer (optional)
\`\`\`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
\`\`\`
feat(search): add Arabic translation support
fix(notifications): resolve duplicate notification bug
docs: update installation instructions
\`\`\`

## Testing

- Test your changes in different browsers
- Verify responsive design on various screen sizes
- Check Arabic and English language support
- Test with different data scenarios

## Questions?

Feel free to open an issue for any questions about contributing!

Thank you for contributing to AnimeSync!
