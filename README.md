<div align="center">
  <img src="./build/512x512.png" width="96px" height="96px"/>
</div>

<h1 align="center">
  Bookwise Reader
</h1>

<h3 align="center">
  A modern | free | cross-platform | beautiful themes  e-book reader
</h3>

<div align="center">

**English** · [简体中文](./README.zh_CN.md) · <a href="https://buzhifanji.github.io/BookWise/" target="_blank">Oneline</a> · [Download](https://github.com/Buzhifanji/BookWise/releases/latest)

</div>

## Preview

<div align="center">
  <br>
  <p>
    <kbd>
      <img src="./doc/image/en/home.png" width="800px"/>
    </kbd>
  </p>
  <br>
  <p>
    <kbd>
      <img src="./doc/image/en/reader-toolbar.png" width="800px"/>
    </kbd>
  </p>
  <br>
  <p>
    <kbd>
      <img src="./doc/image/en/reader-edit-note.png" width="800px"/>
    </kbd>
  </p>
  <br>
  <p>
    <kbd>
      <img src="./doc/image/en/reader-theme-dark.png" width="800px"/>
    </kbd>
  </p>
  <p>
    <kbd>
      <img src="./doc/image/en/reader-theme-lemonade.png" width="800px"/>
    </kbd>
  </p>
  <p>
    <kbd>
      <img src="./doc/image/en/reader-theme-winter.png" width="800px"/>
    </kbd>
  </p>
  <br>
</div>

## Feature

## Features

- Supported Reading Formats:
  - EPUB (**.epub**)
  - PDF (**.pdf**)
  - DRM-free Mobipocket (**.mobi**) and Kindle (**.azw3**, **.azw**)
  - FictionBook (**.fb2**)
  - TXT: <kbd>Upcoming</kbd>
  - HTML: <kbd>Upcoming</kbd>
  - DOC: <kbd>Under Consideration</kbd>
- Supported Platforms: **Windows**, **macOS**, **Linux**, and **Web**
- Themes: 32 built-in themes

- Reader
  - Reading Modes: Scrolling mode, Section mode, Two-column mode
  - [Auto Typesetting](https://github.com/tailwindlabs/tailwindcss-typography), Customizable font size, margins
  - Custom fonts: <kbd>Upcoming</kbd>
  - Copy functionality
  - Translation feature: <kbd>Upcoming</kbd>
  - Auto-scroll reading: <kbd>Under Consideration</kbd>
  - Text-to-speech: <kbd>Upcoming</kbd>
  - Page-turning features
    - Previous page: Left arrow; Next page: Right arrow
    - Scroll up slightly: Up arrow; Scroll down slightly: Down arrow
      - Scroll up or down by one paragraph: <kbd>Needs Improvement</kbd>
  - Table of contents: Automatically records the current reading table of contents
  - Word highlighting
    - Auto-highlight: Default on, can be turned off
    - Double-click to highlight an entire paragraph
    - Marker, Straight line, Wavy line
  - Notes
    - Add (supporting multiple), Edit, Delete, View
    - Note list displays notes corresponding to the current table of contents: <kbd>Upcoming</kbd>
    - Note count statistics
  - Tags: Support for multiple tags
  - Record reading position: Default on, can be turned off
  - Record reading count
  - Record reading duration:
    - Detailed record of each reading session, accurate to minutes
    - Total reading time
  - Search
    - Book content search: <kbd>Upcoming</kbd>
    - Search engine search: <kbd>Upcoming</kbd>
- Book Management
  - Modes: Bookshelf mode, Card mode, List mode
  - Search
  - Sorting: adding time, reading time, reading progress, reading duration, book title, author, rating
  - Filtering: bookshelf
  - Support for editing book title, author, cover
  - Custom ratings
  - Custom bookshelf categories
  - Favorite collection feature
  - Recycle bin feature: Default on, can be turned off
  - Book status: <kbd>Upcoming</kbd>
  - Review feature: <kbd>Upcoming</kbd>
  - Shortcut keys: <kbd>Upcoming</kbd>
- Note Management
  - Search
  - Sorting: Time-based sorting, Book title sorting
  - Filtering
    - Book title filter (single book)
    - Tag filter (multiple tags): <kbd>Upcoming</kbd>
  - Modes:Card mode, List mode
  - Jump to source
  - Shortcut keys: <kbd>Upcoming</kbd>
- Upload: Supports drag and drop, multi-file upload
- Tag Management
  - One-click clear for tags not bound to notes
  - Rename, Delete
  - Nested tags: <kbd>Under Consideration</kbd>
- Bookshelf Management
  - One-click clear for empty bookshelves
  - Rename, Delete
- Idle mode: <kbd>Upcoming</kbd>
- Cloud synchronization feature: <kbd>Upcoming</kbd>
- Backup feature: <kbd>Upcoming</kbd>
- Global search

## Development & Build

### Prerequisites

- Node.js >= 20.11.1
- npm >= 10.8.0

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Build

#### Standard Build (with TypeScript checking)

```bash
# Build for all platforms
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

#### Quick Build (skip TypeScript checking)

If you encounter TypeScript errors during build but the app works fine in development, you can skip type checking:

```bash
# Build for macOS (skip TypeScript checking)
npx electron-vite build && npx electron-builder --mac

# Build for Windows (skip TypeScript checking)
npx electron-vite build && npx electron-builder --win

# Build for Linux (skip TypeScript checking)
npx electron-vite build && npx electron-builder --linux
```

> **Note**: The quick build method skips TypeScript type checking which may hide potential issues. Use it only when you're confident the code works correctly in development mode.