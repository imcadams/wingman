// Replace SERVER_URLS with a single API_URL
const API_URL = CONFIG.API_URL;// Store job requirements and authentication token

let jobRequirements = {};
let authToken = localStorage.getItem('authToken');

// Logout functionality
function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('authToken');
            window.location.href = '/auth.html';
        });
    } else {
        console.error('Logout button not found');
    }
}

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
    if (chatForm) {
        chatForm.addEventListener('submit', handleChatSubmission);
    }

    // Add event listener for the toggle button
    const toggleRequirementsBtn = document.getElementById('toggle-requirements-btn');
    if (toggleRequirementsBtn) {
        toggleRequirementsBtn.addEventListener('click', toggleRequirementsForm);
    }

    await loadJobRequirements();
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

// Handle job requirements form submission
document.getElementById('job-requirements').addEventListener('submit', handleJobRequirements);

// Handle chat form submission
async function handleChatSubmission(e) {
    e.preventDefault();
    
    const recruiterMessage = document.getElementById('recruiter-message').value;
    const jobRequirements = JSON.parse(localStorage.getItem('jobRequirements'));
    
    // Display recruiter's message in chat
    addMessageToChat('Recruiter', recruiterMessage);

    // Get AI response
    try {
        const aiResponse = await getAIResponse(recruiterMessage, jobRequirements);
        // Display AI response in chat
        addMessageToChat('Wingman', aiResponse);
    } catch (error) {
        addMessageToChat('System', `Error: ${error.message}`);
    }

    // Clear the textarea
    document.getElementById('recruiter-message').value = '';
}

// Function to add a message to the chat area
function addMessageToChat(sender, message) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
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