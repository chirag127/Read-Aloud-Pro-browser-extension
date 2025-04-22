/**
 * A simplified version of Mozilla's Readability library
 * Modified for Read Aloud Pro extension
 * Based on: https://github.com/mozilla/readability
 */

class Readability {
  constructor(document, options = {}) {
    this._document = document;
    this._options = Object.assign({
      debug: false,
      maxElemsToParse: 0,
      nbTopCandidates: 5,
      charThreshold: 500,
      classesToPreserve: []
    }, options);
    
    this._articleTitle = null;
    this._articleContent = null;
    this._isProbablyReaderable = null;
  }

  /**
   * Run the extraction algorithm and return the article content
   */
  parse() {
    if (!this._isProbablyReaderable()) {
      return {
        title: this._getArticleTitle(),
        content: this._document.body.cloneNode(true),
        textContent: this._document.body.textContent,
        length: this._document.body.textContent.length,
        excerpt: this._getExcerpt(),
        byline: null,
        dir: null,
        siteName: this._getSiteName(),
        lang: this._document.documentElement.lang
      };
    }

    const articleContent = this._grabArticle();
    if (!articleContent) {
      return null;
    }

    return {
      title: this._getArticleTitle(),
      content: articleContent,
      textContent: articleContent.textContent,
      length: articleContent.textContent.length,
      excerpt: this._getExcerpt(),
      byline: this._getByline(),
      dir: this._getDirection(),
      siteName: this._getSiteName(),
      lang: this._document.documentElement.lang
    };
  }

  /**
   * Check if the page is probably readerable
   */
  _isProbablyReaderable() {
    if (this._isProbablyReaderable !== null) {
      return this._isProbablyReaderable;
    }

    // Check for common article elements
    const articleElements = this._document.querySelectorAll('article, [role="article"], .article, .post, .content, .entry, .hentry, .main, .page, .post-content, .post-body, .post-entry, .post-text, .entry-content, .entry-body');
    if (articleElements.length > 0) {
      this._isProbablyReaderable = true;
      return true;
    }

    // Check for a reasonable amount of paragraphs
    const paragraphs = this._document.querySelectorAll('p');
    if (paragraphs.length >= 5) {
      let textLength = 0;
      let contentParagraphs = 0;

      for (let i = 0; i < paragraphs.length; i++) {
        const paraText = paragraphs[i].textContent.trim();
        if (paraText.length > 100) {
          contentParagraphs++;
          textLength += paraText.length;
        }
      }

      if (contentParagraphs >= 3 && textLength > 500) {
        this._isProbablyReaderable = true;
        return true;
      }
    }

    // Check for common content containers
    const contentContainers = this._document.querySelectorAll('#content, #main, #main-content, #page, .content, .main');
    if (contentContainers.length > 0) {
      for (let i = 0; i < contentContainers.length; i++) {
        const containerParagraphs = contentContainers[i].querySelectorAll('p');
        if (containerParagraphs.length >= 3) {
          this._isProbablyReaderable = true;
          return true;
        }
      }
    }

    this._isProbablyReaderable = false;
    return false;
  }

  /**
   * Get the article title
   */
  _getArticleTitle() {
    if (this._articleTitle !== null) {
      return this._articleTitle;
    }

    // First, look for the article title in schema.org metadata
    const jsonLd = this._document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
      try {
        const jsonLdData = JSON.parse(jsonLd.textContent);
        if (jsonLdData.headline) {
          this._articleTitle = jsonLdData.headline;
          return this._articleTitle;
        }
      } catch (e) {
        // JSON parsing failed, continue with other methods
      }
    }

    // Look for the article title in meta tags
    const metaTags = this._document.querySelectorAll('meta[property="og:title"], meta[name="twitter:title"], meta[name="title"]');
    for (let i = 0; i < metaTags.length; i++) {
      const content = metaTags[i].getAttribute('content');
      if (content && content.length > 0) {
        this._articleTitle = content;
        return this._articleTitle;
      }
    }

    // Look for the article title in the document title
    if (this._document.title && this._document.title.length > 0) {
      this._articleTitle = this._document.title;
      return this._articleTitle;
    }

    // Look for the article title in heading elements
    const headings = this._document.querySelectorAll('h1, h2');
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const headingText = heading.textContent.trim();
      if (headingText.length > 10 && headingText.length < 100) {
        this._articleTitle = headingText;
        return this._articleTitle;
      }
    }

    // Default to an empty title
    this._articleTitle = '';
    return this._articleTitle;
  }

  /**
   * Get the article excerpt
   */
  _getExcerpt() {
    // Look for the article excerpt in meta tags
    const metaTags = this._document.querySelectorAll('meta[property="og:description"], meta[name="twitter:description"], meta[name="description"]');
    for (let i = 0; i < metaTags.length; i++) {
      const content = metaTags[i].getAttribute('content');
      if (content && content.length > 0) {
        return content;
      }
    }

    // Try to get the first paragraph
    const paragraphs = this._document.querySelectorAll('p');
    for (let i = 0; i < paragraphs.length; i++) {
      const paraText = paragraphs[i].textContent.trim();
      if (paraText.length > 50) {
        return paraText;
      }
    }

    return '';
  }

  /**
   * Get the article byline
   */
  _getByline() {
    // Look for the article byline in schema.org metadata
    const jsonLd = this._document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
      try {
        const jsonLdData = JSON.parse(jsonLd.textContent);
        if (jsonLdData.author && jsonLdData.author.name) {
          return jsonLdData.author.name;
        }
      } catch (e) {
        // JSON parsing failed, continue with other methods
      }
    }

    // Look for common byline elements
    const bylineElements = this._document.querySelectorAll('.byline, .author, .meta-author, [rel="author"], [itemprop="author"]');
    for (let i = 0; i < bylineElements.length; i++) {
      const bylineText = bylineElements[i].textContent.trim();
      if (bylineText.length > 0 && bylineText.length < 100) {
        return bylineText;
      }
    }

    return null;
  }

  /**
   * Get the content direction
   */
  _getDirection() {
    return this._document.documentElement.getAttribute('dir') || 'ltr';
  }

  /**
   * Get the site name
   */
  _getSiteName() {
    // Look for the site name in meta tags
    const metaTags = this._document.querySelectorAll('meta[property="og:site_name"]');
    if (metaTags.length > 0) {
      return metaTags[0].getAttribute('content');
    }

    // Try to extract from the domain name
    const hostname = this._document.location.hostname;
    if (hostname) {
      // Remove www. and .com/.org/etc.
      const parts = hostname.split('.');
      if (parts.length > 1) {
        if (parts[0] === 'www') {
          return parts[1];
        }
        return parts[0];
      }
      return hostname;
    }

    return null;
  }

  /**
   * Extract the main article content
   */
  _grabArticle() {
    // First, look for an article element
    const articleElements = this._document.querySelectorAll('article, [role="article"]');
    if (articleElements.length === 1) {
      return articleElements[0].cloneNode(true);
    }

    // Look for common content containers
    const contentSelectors = [
      '.post-content',
      '.post-body',
      '.entry-content',
      '.entry-body',
      '.article-content',
      '.article-body',
      '.content-body',
      '.content-article',
      '#content-body',
      '#content-article',
      '.story-body',
      '.story-content',
      '.main-content',
      '.main-article',
      '.entry',
      '.post',
      '.content',
      '#content',
      '#main',
      '.main',
      '.article'
    ];

    for (const selector of contentSelectors) {
      const elements = this._document.querySelectorAll(selector);
      if (elements.length === 1) {
        const element = elements[0];
        const paragraphs = element.querySelectorAll('p');
        if (paragraphs.length >= 3) {
          return element.cloneNode(true);
        }
      }
    }

    // If we couldn't find a good container, create one with all paragraphs
    const paragraphs = this._document.querySelectorAll('p');
    if (paragraphs.length >= 5) {
      const container = this._document.createElement('div');
      
      // Find paragraphs that are likely part of the main content
      const contentParagraphs = Array.from(paragraphs).filter(p => {
        const text = p.textContent.trim();
        return text.length > 50 && 
               !this._isElementHidden(p) &&
               !this._isElementInHeader(p) &&
               !this._isElementInFooter(p) &&
               !this._isElementInSidebar(p);
      });
      
      if (contentParagraphs.length >= 3) {
        // Group paragraphs that are close to each other
        const groups = this._groupParagraphs(contentParagraphs);
        
        // Find the largest group
        let largestGroup = [];
        for (const group of groups) {
          if (group.length > largestGroup.length) {
            largestGroup = group;
          }
        }
        
        // Add the paragraphs to the container
        for (const p of largestGroup) {
          container.appendChild(p.cloneNode(true));
        }
        
        return container;
      }
    }

    // If all else fails, return the body
    return this._document.body.cloneNode(true);
  }

  /**
   * Check if an element is hidden
   */
  _isElementHidden(element) {
    const style = window.getComputedStyle(element);
    return style.display === 'none' || 
           style.visibility === 'hidden' || 
           style.opacity === '0' ||
           element.offsetHeight === 0;
  }

  /**
   * Check if an element is in the header
   */
  _isElementInHeader(element) {
    let node = element;
    while (node && node !== this._document.body) {
      if (node.tagName === 'HEADER' || 
          node.id === 'header' || 
          node.className.includes('header')) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }

  /**
   * Check if an element is in the footer
   */
  _isElementInFooter(element) {
    let node = element;
    while (node && node !== this._document.body) {
      if (node.tagName === 'FOOTER' || 
          node.id === 'footer' || 
          node.className.includes('footer')) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }

  /**
   * Check if an element is in the sidebar
   */
  _isElementInSidebar(element) {
    let node = element;
    while (node && node !== this._document.body) {
      if (node.tagName === 'ASIDE' || 
          node.id === 'sidebar' || 
          node.className.includes('sidebar') ||
          node.className.includes('side-bar')) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }

  /**
   * Group paragraphs that are close to each other
   */
  _groupParagraphs(paragraphs) {
    const groups = [];
    let currentGroup = [];
    
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      
      if (currentGroup.length === 0) {
        currentGroup.push(p);
      } else {
        const lastP = currentGroup[currentGroup.length - 1];
        
        // Check if the paragraphs are close to each other
        if (this._areElementsClose(lastP, p)) {
          currentGroup.push(p);
        } else {
          groups.push(currentGroup);
          currentGroup = [p];
        }
      }
    }
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }

  /**
   * Check if two elements are close to each other
   */
  _areElementsClose(elem1, elem2) {
    const rect1 = elem1.getBoundingClientRect();
    const rect2 = elem2.getBoundingClientRect();
    
    // Check if the elements are in the same column
    const horizontalOverlap = !(rect1.right < rect2.left || rect1.left > rect2.right);
    
    if (horizontalOverlap) {
      // Check if the vertical distance is reasonable
      const verticalDistance = Math.abs(rect2.top - rect1.bottom);
      return verticalDistance < 100; // 100px threshold
    }
    
    return false;
  }
}

// Export the Readability class
if (typeof module !== 'undefined') {
  module.exports = Readability;
}
