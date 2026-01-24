// Configuration - update this array with your blog post filenames
const BLOG_POSTS = [
    'posts/example-post.md',
    'posts/getting-started.md',
    // Add more posts here
];

// Pagination settings
const POSTS_PER_PAGE = 5;
let currentPage = 1;
let allPosts = [];

// Parse front matter from markdown content
function parseFrontMatter(content) {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);
    
    if (!match) {
        return {
            metadata: {},
            content: content
        };
    }
    
    const frontMatterText = match[1];
    const markdownContent = match[2];
    
    const metadata = {};
    const lines = frontMatterText.split('\n');
    
    lines.forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();
            
            // Remove quotes if present
            value = value.replace(/^["']|["']$/g, '');
            
            // Handle tags (comma-separated or array format)
            if (key === 'tags') {
                if (value.startsWith('[') && value.endsWith(']')) {
                    // Array format: [tag1, tag2, tag3]
                    value = value.slice(1, -1)
                        .split(',')
                        .map(tag => tag.trim().replace(/^["']|["']$/g, ''))
                        .filter(tag => tag.length > 0);
                } else {
                    // Comma-separated format
                    value = value.split(',')
                        .map(tag => tag.trim())
                        .filter(tag => tag.length > 0);
                }
            }
            
            metadata[key] = value;
        }
    });
    
    return {
        metadata: metadata,
        content: markdownContent
    };
}

// Extract first paragraph from markdown content
function getFirstParagraph(content) {
    // Remove any leading whitespace or newlines
    const trimmed = content.trim();
    
    // Find the first paragraph (text before double newline)
    const paragraphMatch = trimmed.match(/^(.*?)(\n\n|\n#|$)/s);
    
    if (paragraphMatch) {
        return paragraphMatch[1].trim();
    }
    
    return trimmed;
}

// Format date string
function formatDate(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    } catch (e) {
        return dateString;
    }
}

// Render pagination controls
function renderPagination() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            ← Previous
        </button>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        // Show first page, last page, current page, and pages around current
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            paginationHTML += `
                <button onclick="goToPage(${i})" class="${i === currentPage ? 'active' : ''}">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            paginationHTML += '<span class="page-info">...</span>';
        }
    }
    
    // Next button
    paginationHTML += `
        <button onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            Next →
        </button>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

// Go to specific page
function goToPage(page) {
    const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
    
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayPosts();
    renderPagination();
    
    // Scroll to top of blog list
    const blogList = document.getElementById('blog-list');
    if (blogList) {
        window.scrollTo({
            top: blogList.offsetTop - 100,
            behavior: 'smooth'
        });
    }
}

// Display posts for current page
function displayPosts() {
    const blogList = document.getElementById('blog-list');
    if (!blogList) return;
    
    blogList.innerHTML = '';
    
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const postsToDisplay = allPosts.slice(startIndex, endIndex);
    
    postsToDisplay.forEach(post => {
        const article = document.createElement('article');
        article.className = 'blog-preview';
        
        const title = post.metadata.title || 'Untitled Post';
        const publishDate = formatDate(post.date);
        const updatedDate = formatDate(post.metadata.updated || post.metadata['updated date']);
        const tags = post.metadata.tags || [];
        
        let metaHTML = '';
        if (publishDate) {
            metaHTML += `<span class="publish-date">${publishDate}</span>`;
        }
        if (updatedDate && updatedDate !== publishDate) {
            metaHTML += `<span class="separator">•</span><span class="updated-date">Updated: ${updatedDate}</span>`;
        }
        
        let tagsHTML = '';
        if (tags.length > 0) {
            tagsHTML = '<div class="post-tags">';
            tags.forEach(tag => {
                tagsHTML += `<span class="tag">${tag}</span>`;
            });
            tagsHTML += '</div>';
        }
        
        // Convert preview markdown to HTML
        const previewHTML = marked.parse(post.preview);
        
        article.innerHTML = `
            <h2><a href="post.html?post=${encodeURIComponent(post.file)}">${title}</a></h2>
            ${metaHTML ? `<div class="post-meta">${metaHTML}</div>` : ''}
            <div class="preview-content">${previewHTML}</div>
            <a href="post.html?post=${encodeURIComponent(post.file)}" class="read-more">Read more →</a>
            ${tagsHTML}
        `;
        
        blogList.appendChild(article);
    });
}

// Load and display blog post list
async function loadBlogList() {
    const blogList = document.getElementById('blog-list');
    
    if (!blogList) return;
    
    blogList.innerHTML = '<div class="loading">Loading posts...</div>';
    
    allPosts = [];
    
    for (const postFile of BLOG_POSTS) {
        try {
            const response = await fetch(postFile);
            if (!response.ok) continue;
            
            const content = await response.text();
            const { metadata, content: markdownContent } = parseFrontMatter(content);
            
            // Get first paragraph for preview
            const preview = getFirstParagraph(markdownContent);
            
            allPosts.push({
                file: postFile,
                metadata: metadata,
                preview: preview,
                date: metadata.date || metadata['publish date'] || ''
            });
        } catch (error) {
            console.error(`Error loading ${postFile}:`, error);
        }
    }
    
    // Sort posts by date (newest first)
    allPosts.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
    });
    
    if (allPosts.length === 0) {
        blogList.innerHTML = '<p>No posts found.</p>';
        return;
    }
    
    // Display first page
    currentPage = 1;
    displayPosts();
    renderPagination();
}

// Load and display full blog post
async function loadFullPost() {
    const postContent = document.getElementById('post-content');
    
    if (!postContent) return;
    
    // Get post filename from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const postFile = urlParams.get('post');
    
    if (!postFile) {
        postContent.innerHTML = '<p>Post not found.</p>';
        return;
    }
    
    postContent.innerHTML = '<div class="loading">Loading post...</div>';
    
    try {
        const response = await fetch(postFile);
        if (!response.ok) {
            throw new Error('Post not found');
        }
        
        const content = await response.text();
        const { metadata, content: markdownContent } = parseFrontMatter(content);
        
        const title = metadata.title || 'Untitled Post';
        const publishDate = formatDate(metadata.date || metadata['publish date']);
        const updatedDate = formatDate(metadata.updated || metadata['updated date']);
        const tags = metadata.tags || [];
        
        // Update page title
        document.title = title;
        
        // Convert markdown to HTML
        const htmlContent = marked.parse(markdownContent);
        
        let metaHTML = '';
        if (publishDate) {
            metaHTML += `<span class="publish-date">${publishDate}</span>`;
        }
        if (updatedDate && updatedDate !== publishDate) {
            metaHTML += `<span class="separator">•</span><span class="updated-date">Updated: ${updatedDate}</span>`;
        }
        
        let tagsHTML = '';
        if (tags.length > 0) {
            tagsHTML = '<div class="post-tags">';
            tags.forEach(tag => {
                tagsHTML += `<span class="tag">${tag}</span>`;
            });
            tagsHTML += '</div>';
        }
        
        postContent.innerHTML = `
            <h1 class="post-title">${title}</h1>
            ${metaHTML ? `<div class="post-meta">${metaHTML}</div>` : ''}
            ${tagsHTML}
            <div class="post-content">${htmlContent}</div>
        `;
        
    } catch (error) {
        console.error('Error loading post:', error);
        postContent.innerHTML = '<p>Error loading post. <a href="index.html">Return to blog list</a></p>';
    }
}

// Hamburger menu toggle
function initMobileMenu() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close menu when clicking on a link
        const navLinks = document.querySelectorAll('.nav-menu a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }
}

// Initialize based on current page
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    
    if (document.getElementById('blog-list')) {
        loadBlogList();
    } else if (document.getElementById('post-content')) {
        loadFullPost();
    }
});
