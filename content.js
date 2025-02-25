// Content script to extract page content using Readability

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(message);
  if (message.action === "extractContent") {
    extractPageContent();
  }
});

// Function to extract content using Readability and convert to markdown
function extractPageContent() {
  try {
    // Clone the document to avoid modifying the original
    const documentClone = document.cloneNode(true);
    
    // Create a new Readability object
    const reader = new Readability(documentClone);
    
    // Parse the content
    const article = reader.parse();
    
    // Convert HTML to markdown (assuming we have a conversion function)
    // For now, we'll just send the article content as HTML
    const content = {
      title: article.title,
      content: article.content,
      url: window.location.href,
      siteName: article.siteName || document.domain
    };
    
    // Send the extracted content to the sidebar
    chrome.runtime.sendMessage({
      action: "pageContentExtracted",
      data: content
    });
  } catch (error) {
    chrome.runtime.sendMessage({
      action: "extractionError",
      error: error.message
    });
  }
}
