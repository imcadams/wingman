// Replace SERVER_URLS with a single API_URL
const API_URL = CONFIG.API_URL;// Store job requirements and authentication token

let jobRequirements = {};
let authToken = localStorage.getItem('authToken');

// Function to initialize the app
async function initApp() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    const jobRequirementsForm = document.getElementById('job-requirements');
    if (jobRequirementsForm) {
        jobRequirementsForm.addEventListener('submit', handleJobRequirements);
    }

    const chatForm = document.getElementById('chat-form');
    const recruiterMessageInput = document.getElementById('recruiter-message');
    const sendIcon = document.getElementById('send-message');

    if (chatForm) {
        chatForm.addEventListener('submit', handleChatSubmission);
    }

    if (recruiterMessageInput) {
        recruiterMessageInput.addEventListener('keydown', handleTextareaKeydown);
    }

    if (sendIcon) {
        sendIcon.addEventListener('click', handleSendIconClick);
    }

    // Add event listener for the toggle button
    const toggleRequirementsBtn = document.getElementById('toggle-requirements-btn');
    if (toggleRequirementsBtn) {
        toggleRequirementsBtn.addEventListener('click', toggleRequirementsForm);
    }    

    await loadJobRequirements();

    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    })
}

async function handleLogout() {
    localStorage.removeItem('authToken');
    window.location.href = '/auth.html';
}

async function handleJobRequirements(event) {
    event.preventDefault();
    const jobRequirements = {
        jobTitle: document.getElementById('job-title').value,
        salaryRange: document.getElementById('salary-range').value,
        workArrangement: document.getElementById('work-arrangement').value,
        vacationTime: document.getElementById('vacation-time').value,
        additionalInstructions: document.getElementById('additional-instructions').value
    };

    try {
        await saveJobRequirements(jobRequirements);
        showMessage('Job requirements saved successfully', 'success');
    } catch (error) {
        console.error('Error saving job requirements:', error);
        showMessage('Failed to save job requirements', 'danger');
    }
}

function showMessage(message, type) {
    // Implement this function to show a message to the user
    // For example, you could use a Bootstrap alert
    console.log(`${type.toUpperCase()}: ${message}`);
}

async function saveJobRequirements(jobRequirements) {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        throw new Error('No authentication token found');
    }

    try {
        const response = await fetch(`${API_URL}/api/job-requirements`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(jobRequirements)
        });

        if (!response.ok) {
            throw new Error('Failed to save job requirements');
        }

        const data = await response.json();
        
        // Update localStorage with the new job requirements
        localStorage.setItem('jobRequirements', JSON.stringify(data.jobRequirements));
        
        return data;
    } catch (error) {
        console.error('Error saving job requirements:', error);
        throw error;
    }
}

async function loadJobRequirements() {
    const jobRequirementsString = localStorage.getItem('jobRequirements');
    
    if (jobRequirementsString) {
        try {
            const jobRequirements = JSON.parse(jobRequirementsString);
            populateJobRequirementsForm(jobRequirements);
        } catch (error) {
            console.error('Error parsing job requirements:', error);
        }
    }
}

function populateJobRequirementsForm(jobRequirements) {
    document.getElementById('job-title').value = jobRequirements.jobTitle || '';
    document.getElementById('salary-range').value = jobRequirements.salaryRange || '';
    document.getElementById('work-arrangement').value = jobRequirements.workArrangement || '';
    document.getElementById('vacation-time').value = jobRequirements.vacationTime || '';
    document.getElementById('additional-instructions').value = jobRequirements.additionalInstructions || '';
}

// Add this new function to toggle the requirements form
function toggleRequirementsForm() {
    const requirementsForm = document.getElementById('requirements-form');
    if (requirementsForm.style.display === 'none') {
        requirementsForm.style.display = 'block';
    } else {
        requirementsForm.style.display = 'none';
    }
}

// Run initApp when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);

// Function to add a message to the chat area
function addMessageToChat(sender, message) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    
    const userName = localStorage.getItem('userName') || 'User';
    
    if (sender === 'User') {
        messageElement.classList.add('user-message');
        sender = userName; // Use the stored username
    } else if (sender === 'JobReplyAI') {
        messageElement.classList.add('ai-message');
    } else {
        messageElement.classList.add('system-message');
    }
    
    // Create a wrapper for the message content
    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('message-content');
    
    // Use innerText to preserve line breaks, then replace them with <br> tags
    contentWrapper.innerHTML = message.replace(/\n/g, '<br>');
    
    messageElement.innerHTML = `<strong>${sender}:</strong> `;
    messageElement.appendChild(contentWrapper);
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Updated function to get AI response from the backend server
async function getAIResponse(recruiterMessage, jobRequirements) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        window.location.href = '/auth.html';
        return;
    }

    const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            recruiterMessage,
            jobRequirements
        })
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('authToken');
            window.location.href = '/auth.html';
            return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response; // Return the 'response' property of the data
}

// Function to handle textarea keydown event
function handleTextareaKeydown(event) {
    // Check if the pressed key is Enter and the Shift key is not held down
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // Prevent the default action (newline)
        handleChatSubmission(event);
    }
}

// Handle chat form submission
async function handleChatSubmission(event) {
    event.preventDefault();
    
    const recruiterMessage = document.getElementById('recruiter-message').value;
    
    if (!recruiterMessage.trim()) {
        // If the message is empty or only whitespace, don't submit
        return;
    }

    const jobRequirements = JSON.parse(localStorage.getItem('jobRequirements') || '{}');
    
    // Display user's message in chat
    addMessageToChat('User', recruiterMessage);

    // Get AI response
    try {
        const aiResponse = await getAIResponse(recruiterMessage, jobRequirements);
        // Display AI response in chat
        addMessageToChat('JobReplyAI', aiResponse);
    } catch (error) {
        addMessageToChat('System', `Error: ${error.message}`);
    }

    // Clear the input
    document.getElementById('recruiter-message').value = '';
}

// Add this new function to handle send icon click
function handleSendIconClick(event) {
    event.preventDefault();
    handleChatSubmission(event);
}

// Make sure this is the only place where initApp is called
document.addEventListener('DOMContentLoaded', initApp);

// Remove any other calls to initApp or duplicate definitions