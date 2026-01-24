# Markdown Blog for GitHub Pages

A clean, mobile-first blog system that loads markdown files with front matter. No build process required - just pure HTML, CSS, and JavaScript.

## Features

- 📱 Mobile-first responsive design with hamburger menu
- 📄 Pagination support (5 posts per page by default)
- 📝 Custom front matter parsing (no dependencies)
- 🎨 Clean black & white design for readability
- 🚀 Works directly on GitHub Pages
- ✂️ Automatic post previews (first paragraph only)
- 🏷️ Tag support
- 📅 Publish and update date tracking
- 🦶 Professional footer with multiple sections
- 🍔 Mobile-friendly hamburger navigation menu

## Setup Instructions

### 1. Create a GitHub Repository

1. Create a new repository on GitHub
2. Upload all files from this project to your repository

### 2. Enable GitHub Pages

1. Go to your repository Settings
2. Navigate to "Pages" in the left sidebar
3. Under "Source", select your main branch
4. Click Save
5. Your site will be published at `https://yourusername.github.io/your-repo-name/`

### 3. Add Your Blog Posts

1. Create markdown files in the `posts/` directory
2. Each file must start with front matter (see format below)
3. Update the `BLOG_POSTS` array in `blog.js` to include your new posts

## Front Matter Format

Each blog post must start with front matter in this format:

```markdown
---
title: Your Post Title
date: 2024-01-15
updated: 2024-01-20
tags: [tag1, tag2, tag3]
---

Your content goes here...
```

### Front Matter Fields

- `title` (required): The title of your post
- `date` or `publish date` (recommended): The publication date (YYYY-MM-DD format)
- `updated` or `updated date` (optional): The last update date
- `tags` (optional): Array of tags or comma-separated list

## Adding New Posts

1. Create a new `.md` file in the `posts/` directory
2. Add front matter at the top
3. Write your content below the front matter
4. Open `blog.js` and add your new file to the `BLOG_POSTS` array:

```javascript
const BLOG_POSTS = [
    'posts/example-post.md',
    'posts/getting-started.md',
    'posts/your-new-post.md',  // Add your new post here
];
```

## Customization

### Pagination

Change the number of posts per page by editing the `POSTS_PER_PAGE` constant in `blog.js`:

```javascript
const POSTS_PER_PAGE = 5; // Change this number
```

### Navigation Menu

Edit the navigation links in both `index.html` and `post.html`:

```html
<ul class="nav-menu">
    <li><a href="index.html">Home</a></li>
    <li><a href="#about">About</a></li>
    <li><a href="#archive">Archive</a></li>
    <li><a href="#contact">Contact</a></li>
</ul>
```

### Footer Content

Customize the footer in both `index.html` and `post.html`. Update the social links and content:

```html
<footer class="site-footer">
    <div class="footer-content">
        <!-- Customize these sections -->
    </div>
</footer>
```

### Styling

Edit `styles.css` to customize:
- Colors
- Fonts
- Spacing
- Layout widths

### Site Title

Edit the `<h1>` tags in `index.html` and `post.html` to change your blog title.

### Date Format

Modify the `formatDate()` function in `blog.js` to change how dates are displayed.

## File Structure

```
.
├── index.html          # Main blog listing page
├── post.html           # Individual post page
├── styles.css          # All styling
├── blog.js             # Blog functionality
├── posts/              # Your blog posts
│   ├── example-post.md
│   └── getting-started.md
└── README.md           # This file
```

## Markdown Support

The blog uses [marked.js](https://marked.js.org/) for markdown parsing, which supports:

- Headers
- Bold and italic text
- Links
- Lists (ordered and unordered)
- Code blocks
- Blockquotes
- Images
- And more standard markdown syntax

## Tips

- The first paragraph of each post is used as the preview on the main page
- Posts are automatically sorted by date (newest first)
- Keep post filenames simple and URL-friendly
- Add images to an `images/` directory and reference them in your markdown
- The site works entirely client-side, so no build process is needed

## Browser Support

Works in all modern browsers that support ES6+ JavaScript.

## License

Free to use and modify for your own projects.
