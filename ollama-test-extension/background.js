console.log('Ollama Test Extension background script loaded');

// Initialize declarativeNetRequest rules
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed, declarativeNetRequest rules should be active');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TEST_OLLAMA') {
    testOllama().then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep the message channel open for async response
  }
});

async function testOllama() {
  console.log('🔄 Starting Ollama test...');
  console.log('🔍 Extension ID:', chrome.runtime.id);
  console.log('🔍 Extension Origin:', `chrome-extension://${chrome.runtime.id}`);
  
  const results = {
    get: null,
    post: null
  };
  
  // Test GET request
  try {
    console.log('🧪 Testing GET /api/tags...');
    const getResponse = await fetch('http://localhost:11434/api/tags');
    console.log('✅ GET status:', getResponse.status);
    
    if (getResponse.ok) {
      const getData = await getResponse.json();
      results.get = { 
        success: true, 
        status: getResponse.status, 
        modelCount: getData.models?.length || 0 
      };
    } else {
      results.get = { 
        success: false, 
        status: getResponse.status, 
        error: await getResponse.text() 
      };
    }
  } catch (error) {
    console.error('❌ GET failed:', error);
    results.get = { success: false, error: error.message };
  }
  
  // Test POST request (Origin should be modified by declarativeNetRequest)
  try {
    console.log('🧪 Testing POST /api/generate...');
    console.log('🔧 declarativeNetRequest should modify Origin to http://localhost');
    const postResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gemma2:2b',
        prompt: 'Hello world',
        stream: false
      })
    });
    
    console.log('✅ POST status:', postResponse.status);
    
    if (postResponse.ok) {
      const postData = await postResponse.json();
      results.post = { 
        success: true, 
        status: postResponse.status, 
        response: postData.response?.substring(0, 50) + '...' || 'No response' 
      };
    } else {
      results.post = { 
        success: false, 
        status: postResponse.status, 
        error: await postResponse.text() 
      };
    }
  } catch (error) {
    console.error('❌ POST failed:', error);
    results.post = { success: false, error: error.message };
  }
  
  console.log('🔍 Test results:', results);
  return results;
}