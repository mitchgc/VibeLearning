document.addEventListener('DOMContentLoaded', function() {
    // Display extension info
    const extensionId = chrome.runtime.id;
    document.getElementById('extensionId').textContent = extensionId;
    document.getElementById('origin').textContent = `chrome-extension://${extensionId}`;
    
    // Test button handler
    document.getElementById('testButton').addEventListener('click', async function() {
        const resultsDiv = document.getElementById('results');
        const button = this;
        
        // Show loading state
        button.disabled = true;
        button.textContent = 'Testing...';
        resultsDiv.innerHTML = '<div class="result loading">Running tests...</div>';
        
        try {
            // Send message to background script
            const result = await chrome.runtime.sendMessage({
                type: 'TEST_OLLAMA'
            });
            
            // Display results
            displayResults(result);
            
        } catch (error) {
            resultsDiv.innerHTML = `<div class="result error">Error: ${error.message}</div>`;
        } finally {
            button.disabled = false;
            button.textContent = 'Test Ollama GET & POST';
        }
    });
});

function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    let html = '';
    
    // GET results
    if (results.get) {
        const getClass = results.get.success ? 'success' : 'error';
        html += `<div class="result ${getClass}">
            <strong>GET /api/tags:</strong><br>
            Status: ${results.get.status || 'N/A'}<br>
            ${results.get.success ? 
                `Models: ${results.get.modelCount}` : 
                `Error: ${results.get.error || 'Unknown error'}`
            }
        </div>`;
    }
    
    // POST results  
    if (results.post) {
        const postClass = results.post.success ? 'success' : 'error';
        html += `<div class="result ${postClass}">
            <strong>POST /api/generate:</strong><br>
            Status: ${results.post.status || 'N/A'}<br>
            ${results.post.success ? 
                `Response: ${results.post.response}` : 
                `Error: ${results.post.error || 'Unknown error'}`
            }
        </div>`;
    }
    
    resultsDiv.innerHTML = html;
}