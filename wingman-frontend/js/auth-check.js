(function() {
    function checkAuth() {
        const authToken = localStorage.getItem('authToken');
        const appContent = document.getElementById('app-content');
        
        if (!authToken) {
            window.location.href = '/auth.html';
        } else {
            appContent.style.display = 'block';
        }
    }

    document.addEventListener('DOMContentLoaded', checkAuth);
})();
