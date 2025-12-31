# AnimeSync - Advanced Anime & Manga Tracker

<div align="center">

![AnimeSync Logo](public/icon.png)

A comprehensive, modern anime and manga tracking application built with Next.js 14, featuring AI-powered recommendations, bilingual support (Arabic/English), and advanced search capabilities.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/animesync)

</div>

## Features

### Core Features
- Track anime and manga across multiple custom lists (Watching, Plan to Watch, Completed, Dropped, etc.)
- Comprehensive anime/manga details including synopsis, staff, characters, reviews, and recommendations
- Episode and chapter update notifications with customizable reminders
- Advanced search with automatic Arabic-to-English translation
- Scene search using image recognition
- Export/import your data for backup and portability

### AI-Powered Features
- AI-powered anime advisor with character-based recommendations
- Intelligent genre filtering and sensitive content controls

### Customization
- Customizable home page layout with drag-and-drop sections
- Dark/Light theme support
- Bilingual interface (Arabic and English)
- Responsive design for all devices

### News & Updates
- Latest anime news from the community
- Pin and favorite important news
- Stay updated with trending series

## Tech Stack

- **Framework**: Next.js 14.2.4 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **UI Components**: Radix UI + shadcn/ui
- **State Management**: React Hooks + Context API
- **Data Sources**: 
  - AniList GraphQL API (primary)
  - Jikan v4 API (MyAnimeList wrapper)
  - trace.moe API (scene search)
- **Storage**: IndexedDB (client-side, persistent)
- **Deployment**: Vercel
- **Analytics**: Vercel Analytics

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/yourusername/animesync.git
cd animesync
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
# or
yarn install
# or
pnpm install
\`\`\`

3. Run the development server:
\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
\`\`\`

4. Open [http://localhost:9002](http://localhost:9002) in your browser

### Environment Variables (Optional)

Create a `.env.local` file in the root directory for optional configurations:

\`\`\`env
# Optional: Google Translate API key for translation features
GOOGLE_TRANSLATE_API_KEY=your_api_key_here

# The app works without environment variables using client-side APIs
\`\`\`

## Deployment

### Deploy to Vercel (Recommended)

The easiest way to deploy AnimeSync is using the Vercel Platform:

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Import the project into [Vercel](https://vercel.com)
3. Vercel will automatically detect Next.js and configure build settings
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manual Deployment

\`\`\`bash
npm run build
npm run start
\`\`\`

## Project Structure

\`\`\`
animesync/
├── app/                      # Next.js 14 App Router pages
│   ├── anime/[id]/          # Anime details page
│   ├── character/[id]/      # Character details page
│   ├── list/[type]/         # List pages (trending, popular, etc.)
│   ├── news/                # Latest news page
│   ├── search/              # Search results page
│   └── settings/            # User settings page
├── src/
│   ├── components/          # React components
│   │   ├── anime/          # Anime-specific components
│   │   ├── layout/         # Layout components (header, footer)
│   │   ├── notifications/  # Notification system
│   │   ├── search/         # Search components
│   │   └── ui/             # Reusable UI components (shadcn/ui)
│   ├── hooks/              # Custom React hooks
│   │   ├── use-auth.tsx   # Authentication and data management
│   │   ├── use-logger.tsx # Logging system
│   │   └── use-translation.tsx # Internationalization
│   ├── i18n/               # Translation files
│   ├── lib/                # Utility functions and API clients
│   │   ├── anilist/       # AniList API integration
│   │   │   ├── requests/  # API request modules (organized by feature)
│   │   │   ├── queries.ts # GraphQL queries
│   │   │   └── utils.ts   # Helper functions
│   │   ├── jikan-api.ts   # Jikan API integration
│   │   ├── types.ts       # TypeScript type definitions
│   │   └── utils.ts       # General utilities
│   └── manga/              # Manga-specific pages and components
├── public/                  # Static assets
└── styles/                  # Global styles
\`\`\`

## Key Features Explained

### Anime Advisor (AI-Powered)
Search for your favorite characters and get personalized anime recommendations based on character appearances, voice actors, and related media.

### Arabic Search Translation
Automatically detects and translates Arabic search queries to English for seamless API integration, making the app accessible to Arabic-speaking users.

### Update Notifications
Intelligent notification system that checks for new episodes/chapters for your "Currently Watching/Reading" titles and alerts you when new content is available.

### Scene Search (Image Recognition)
Upload anime screenshots to identify the source anime and episode using trace.moe's powerful image recognition technology.

### Data Management
- Export your entire collection to JSON for backup
- Import data from backups or other sources
- All data stored locally in IndexedDB for privacy and offline access

## API Usage

This project integrates with multiple anime databases:

- **AniList API**: Primary data source for anime/manga information, recommendations, and character data
- **Jikan API** (v4): Secondary source and fallback for additional metadata from MyAnimeList
- **trace.moe API**: Scene search and image recognition

All APIs are free and do not require authentication keys for basic usage.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Performance

- Lighthouse Score: 95+ (Performance, Accessibility, Best Practices, SEO)
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Client-side caching for optimal performance
- Lazy loading for images and components

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the existing code style and includes appropriate tests.

## Development

### Scripts

\`\`\`bash
npm run dev       # Start development server on port 9002
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
npm run typecheck # Run TypeScript type checking
\`\`\`

### Code Organization

- Use TypeScript for type safety
- Follow React best practices and hooks guidelines
- Implement responsive design using Tailwind CSS
- Use semantic HTML and ARIA attributes for accessibility
- Keep components small and focused on single responsibility

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Data**: [AniList](https://anilist.co/) and [MyAnimeList](https://myanimelist.net/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) and [shadcn/ui](https://ui.shadcn.com/)
- **Image Recognition**: [trace.moe](https://trace.moe/)
- **Fonts**: [Geist Font Family](https://vercel.com/font)

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/animesync/issues) page
2. Create a new issue with detailed information
3. For deployment issues, refer to [Vercel Documentation](https://vercel.com/docs)

## Roadmap

- [ ] User authentication and cloud sync
- [ ] Social features (friends, sharing lists)
- [ ] Advanced statistics and analytics
- [ ] Mobile app (React Native)
- [ ] Integration with more anime databases
- [ ] Manga reader integration

---

<div align="center">

Made with ❤️ by the AnimeSync Team

[Website](https://animesync.vercel.app) · [Report Bug](https://github.com/yourusername/animesync/issues) · [Request Feature](https://github.com/yourusername/animesync/issues)

</div>
